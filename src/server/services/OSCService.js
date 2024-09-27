import { Server as OscServer, Client as OscClient, Bundle } from 'node-osc';
import { rawToUser, userToRaw } from '../../utils/basis-conversions.js';

class OSCService {
  constructor(node) {
    this.node = node;

    this.tracks = null;
    this.globals = null;
    this.oscServer = null;

    this.onGlobalsUpdate = this.onGlobalsUpdate.bind(this);
    this.onOscMessage = this.onOscMessage.bind(this);
    this.onTrackUpdate = this.onTrackUpdate.bind(this);

    this.init();
  }

  async init() {
    this.tracks = await this.node.stateManager.getCollection('tracks');
    this.globals = await this.node.stateManager.attach('globals');
    this.globals.onUpdate(this.onGlobalsUpdate, true);
    this.tracks.onUpdate(this.onTrackUpdate);
  }

  async close() {
    await this.tracks.detach();
    await this.globals.detach();

    this.oscServer.close();
  }

  onGlobalsUpdate(updates) {
    if ('oscServerPort' in updates) {
      const values = this.globals.getValues();
      if (this.oscServer) {
        this.oscServer.close();
      }
      const oscServerAddress = '0.0.0.0';
      this.oscServer = new OscServer(values.oscServerPort, oscServerAddress, () => {
        console.log(`OSC Server is listening on ${oscServerAddress}:${values.oscServerPort}`);
      });
      this.oscServer.on('message', this.onOscMessage);
    }
  }

  onOscMessage(msg) {
    const oscAddress = msg[0];

    this.tracks.forEach(track => {
      // find corresponding parameter
      const values = track.getValues();
      Object.keys(values).forEach(key => {
        if (values[key] === oscAddress) {
          // key is parameter_osc
          // need to set parameter_raw
          const parameterName = key.split('_')[0];
          const oscValue = parseFloat(msg[1]);
          const table = track.get(`${parameterName}_scale`);
          track.set({
            [`${parameterName}_raw`]: userToRaw(oscValue, table),
          }, { source: "osc" });
        }
      })
    })
  }

  onTrackUpdate(track, updates, context) {
    if (context.source === 'osc') {
      return;
    }

    if (!this.oscServer) {
      return;
    }

    const oscClient = new OscClient(
      this.globals.get('oscClientAddress'),
      this.globals.get('oscClientPort')
    );

    // each update should be sent
    const parameterNames = this.globals.get('parameterNames');
    const parameterName = Object.keys(updates)[0].split('_')[0];

    if (!parameterNames.includes(parameterName)) {
      return;
    }

    const oscValue = updates[`${parameterName}_raw`];
    const table = track.get(`${parameterName}_scale`);

    try {
      oscClient.send(
        track.get(`${parameterName}_osc`),
        rawToUser(oscValue, table),
        () => oscClient.close()
      );
    } catch(err) {
      throw new Error(`no osc address defined for parameter ${parameterName}`);
    }
  }

}


export default OSCService;
