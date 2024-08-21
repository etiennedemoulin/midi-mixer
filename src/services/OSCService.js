import { Server as OscServer, Client as OscClient, Bundle } from 'node-osc';
import { rawToUser, userToRaw } from '../utils/basis-conversions.js';

class OSCService {
  constructor(node) {
    this.node = node;
    this.tracks;
    this.globals;


    this.init();
    this.oscServer;
    this.createOSCServer = this.createOSCServer.bind(this);
    this.onOscUpdate = this.onOscUpdate.bind(this);
    this.onTrackUpdate = this.onTrackUpdate.bind(this);
  }

  async init() {
    this.tracks = await this.node.stateManager.getCollection('tracks');
    this.globals = await this.node.stateManager.attach('globals');
    this.globals.onUpdate(this.createOSCServer, true);
    this.tracks.forEach(track => {
      track.onUpdate((updates, values, context) => {
        this.onTrackUpdate(updates, track, context);
      });
    });
  }

  createOSCServer(updates) {
    if ('oscServerPort' in updates) {
      const values = this.globals.getValues();
      if (this.oscServer) {
        this.oscServer.close();
      }
      const oscServerAddress = '0.0.0.0';
      this.oscServer = new OscServer(values.oscServerPort, oscServerAddress, () => {
        console.log(`OSC Server is listening on ${oscServerAddress}:${values.oscServerPort}`);
      });
      this.oscServer.on('message', this.onOscUpdate);
    }
  }

  onOscUpdate(msg) {
    const oscAddress = msg[0];
    this.tracks.forEach(track => {
      // find corresponding entrypoint
      const values = track.getValues();
      Object.keys(values).forEach(key => {
        if (values[key] === oscAddress) {
          // key is entrypoint_osc
          // need to set entrypoint_raw
          const entrypointName = key.split('_')[0];
          const oscValue = parseFloat(msg[1]);
          const table = track.get(`${entrypointName}_scale`);
          track.set({
            [`${entrypointName}_raw`]: userToRaw(oscValue, table),
          }, { source: "osc" });
        }
      })
    })
  }

  onTrackUpdate(updates, track, context) {
    if (context.source === 'osc') {
      return;
    }

    if (!this.oscServer) {
      return;
    }

    const oscClient = new OscClient(this.globals.get('oscClientAddress'), this.globals.get('oscClientPort'));

    // each update should be sent
    const entrypointName = Object.keys(updates)[0].split('_')[0];
    const oscValue = updates[`${entrypointName}_raw`];
    const table = track.get(`${entrypointName}_scale`);
    try {
      oscClient.send(track.get(`${entrypointName}_osc`), rawToUser(oscValue, table), () => oscClient.close());
      } catch(err) {
        throw new Error(`no osc address defined for entrypoint ${entrypointName}`);
      }
  }

}


export default OSCService;
