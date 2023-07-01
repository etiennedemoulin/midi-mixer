import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
import filesystemPlugin from '@soundworks/plugin-filesystem/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import fs from 'fs-extra';
import path from 'path';

import JZZ from 'jzz';
import { removeMaxTrack, createMaxTrack, nameMaxTrack, dumpMaxTrack } from './maxCommunicator.js';
import { Server as OscServer, Client as OscClient, Bundle } from 'node-osc';
import _ from 'lodash';
import JSON5 from 'json5';

import { userToRaw, rawToUser, getFaderRange, parseTrackConfig, rawToBytes, bytesToRaw } from './helpers.js';
import { trackSchema } from './schemas/tracks.js';
import { globalsSchema } from './schemas/globals.js';
import { onMidiOutFail, onMidiInFail, getMidiDeviceList, onFaderMove, displayUserFader, setFaderView, setMixerView } from './midiCommunicator.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = loadConfig(process.env.ENV, import.meta.url);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

/**
 * Initialisation process
 */
const server = new Server(config);
const tracks = [];

// configure the server for usage within this application template
server.useDefaultApplicationTemplate();

server.pluginManager.register('filesystem', filesystemPlugin, {
  dirname: 'midi-config',
});

// register schemas
server.stateManager.registerSchema('track', trackSchema);
server.stateManager.registerSchema('globals', globalsSchema);

await server.start();

const filesystem = await server.pluginManager.get('filesystem');

const controllersFolder = fs.readdirSync(path.resolve(process.cwd(),'./src/server/controllers'));
const selectControllers = controllersFolder.map(e => e.split('.').shift());
// register globals
const globals = await server.stateManager.create('globals', {
  selectControllers: selectControllers,
  controllerName: selectControllers[0],
  configFilename: filesystem.getTree().children[0],
});

// initialise controllers
// this is globals variable for the transfert table of fader values
// updated value on 235 and used as a table on 130
let controllerFader;

// Create an osc UDP Port listening on port 3333.
const oscServer = new OscServer(3333, '0.0.0.0', () => {
  console.log('OSC Server is listening on 3333');
});

// --------------------------------- move to it's own file
// initialise midi lib
let midiInPort;
let midiOutPort;

function onMidiInSuccess() {
  if (midiInPort) {
    midiInPort.close();
  }
  midiInPort = this;
  const midiInName = this.name();
  globals.set({ midiInName: midiInName }, {source:'server'});
  console.log(`- Midi Input Device: ${midiInName}`);
}

function onMidiOutSuccess() {
  if (midiOutPort) {
    midiOutPort.close();
  }
  midiOutPort = this;
  const midiOutName = this.name();
  globals.set({ midiOutName: midiOutName }, {source:'server'});
  console.log(`- Midi Output Device: ${midiOutName}`);
}

JZZ().and(function() {
  const info = this.info();
  getMidiDeviceList(info, globals);
});

// ---------------------------------

globals.onUpdate(async (updates, oldValues, context) => {
  if ('midiInName' in updates) {
    let name = updates.midiInName;
    if (name === null) {
      name = updates.selectMidiIn[0]
    }
    JZZ().openMidiIn(name).or(onMidiInFail).and(onMidiInSuccess);
    midiInPort.connect(JZZ.Widget({ _receive: onMidiReceive }));
  }

  if ('midiOutName' in updates) {
    let name = updates.midiOutName;
    if (name === null) {
      name = updates.selectMidiOut[0]
    }
    JZZ().openMidiOut(name).or(onMidiOutFail).and(onMidiOutSuccess);
  }

  if ('controllerName' in updates) {
    const { fader } = await import (`./controllers/${updates.controllerName}.js`);
    controllerFader = fader;
    console.log(`- Updated controller ${updates.controllerName}`);
  }

  if ('configFilename' in updates) {
    updateTracks();
  }
}, true);

// _____________________

async function updateTracks() {
  // console.log('++++ updates tracks');
  const tree = filesystem.getTree();

  const configFilename = globals.get('configFilename').path;
  const midiConfig = JSON5.parse(fs.readFileSync(configFilename));
  globals.set({ config: midiConfig });

  const channels = midiConfig
    .map(tracks => parseInt(tracks.channel))
    .sort((a, b) => a < b ? -1 : 1);

  const maxTrackIndex = Math.max(...channels);

  if (maxTrackIndex + 1 > tracks.length) {
    // console.log(`- create track from ${tracks.length} to ${maxTrackIndex}`);
    // create new states
    for (let i = tracks.length; i < maxTrackIndex + 1; i++) {
      tracks[i] = await server.stateManager.create('track');
      tracks[i].onUpdate((newValues, oldValues, context) => {
        onTrackUpdate(newValues, oldValues, context, tracks[i]);
      });

      if (!channels.includes(i)) {
        // create disabled track
        await tracks[i].set({
          channel: i,
          disabled: true
        }, { source: 'config' });
      } else {
        // create enabled track
        await tracks[i].set({
          channel: i,
          disabled: false,
        }, { source: 'config' });
        // create max track
      }

      createMaxTrack(tracks[i]);

    }
  } else {
    // console.log(`- delete track from ${maxTrackIndex + 1} to ${tracks.length - 1}`);
    for (let i = tracks.length - 1; i > maxTrackIndex; i--) {
      const track = tracks.find(s => s.get('channel') === i);
      // delete max track
      removeMaxTrack(track);
      await track.delete();
      tracks.pop();
    }
  }

  // remove old states
  tracks.forEach(async track => {
    const channel = track.get('channel');
    if (track.get('disabled') === true) { return };
    if (!channels.includes(channel)) {
      // console.log('- disable track:', channel);
      await track.set({
        name: null,
        disabled: true,
      }, {source:'config'});
      nameMaxTrack(track);
    }
  });

  // apply updates on changed state
  channels.forEach(async channel => {
    // console.log(`update channel ${track.get('channel')}`);
    const track = tracks.find(s => s.get('channel') === channel);
    const midiConfigLine = midiConfig.find(f => f.channel === channel);
    const updates = parseTrackConfig(midiConfigLine);
    await track.set(updates, { source:'config' });

    if ([undefined, -Infinity, null].includes(midiConfigLine.default)) {
      if (midiConfigLine.type === 'volume') {
        if (controllerFader) {
          await track.set({ faderUser: controllerFader[0] }, { source:'config' });
        } else {
          return;
        }
      } else {
        await track.set({ faderUser: updates.faderRange[0][0] }, { source:'config' });
      }
    } else {
      await track.set({ faderUser: midiConfigLine.default }, { source:'config' });
    }

    nameMaxTrack(track);

  });
}

filesystem.onUpdate(updateTracks, true);

// --------------------------------
// hook
// --------------------------------
server.stateManager.registerUpdateHook('track', async (updates, currentValues, context) => {
  // hook compute each fader values
  if (context.source !== 'hook') {
    // will be updated only if 1st entry in updates, please be careful
    const key = Object.keys(updates)[0];
    const input = updates[key];
    const id = currentValues.id;
    let user = null;
    let raw = null;
    let bytes = null;

    if (key === 'faderRaw') {
      user = rawToUser(input, controllerFader, currentValues);
      bytes = rawToBytes(input);
      raw = input;
    } else if (key === 'faderUser') {
      raw = userToRaw(input, controllerFader, currentValues);
      bytes = rawToBytes(raw);
      user = input;
    } else if (key === 'faderBytes') {
      raw = bytesToRaw(input);
      user = rawToUser(raw, controllerFader, currentValues);
      bytes = input;
    }

    return {
      ...updates,
      faderUser: user,
      faderBytes: bytes,
      faderRaw : raw,
    };
  }
});

// _______________________________
// listening for incoming soundworks updates
// _______________________________
function onTrackUpdate(newValues, oldValues, context, track) {
  if (context.source !== 'midi') {
    setFaderView(track.get('channel'), globals.get('activePage'), tracks);
  }
  if (context.source !== 'osc') {
    const bundle = new Bundle(
      [`/track/${track.get('channel')}/fader/user`, track.get('faderUser')],
      [`/track/${track.get('channel')}/fader/raw`, track.get('faderRaw')],
      [`/track/${track.get('channel')}/fader/bytes`, track.get('faderBytes')]
    );

    const oscClient = new OscClient('127.0.0.1', 3334);
    oscClient.send(bundle, () => oscClient.close());
  }
  if (context.source === 'midi') {
    if (track.get('faderTouched') === false) {
      // send fader value on release
      const channel = track.get('channel') + 223;
      const bytes = track.get('faderBytes');
      // midiOutPort.pitchBend(channel, 0, 0)
      // console.log(channel, bytes);
      // console.log(midiOutPort.get);
      midiOutPort.send([channel, bytes[1], bytes[0]])
    }
  }
}


oscServer.on('message', async function (msg) {
  const address = msg[0].split('/');
  address.shift();
  const header = address[0];
  if (header === 'track') {
    const channel = parseInt(address[1]);
    const track = tracks.find(t => t.get('channel') === channel);
    if (track !== undefined) {
      if (address[2] === 'fader') {
        const valueType = address[3];
        if (valueType === 'user') {
          const value = parseFloat(msg[1]);
          track.set({ faderUser: value }, {source: 'osc'});
        } else if (valueType === 'raw') {
          const value = parseFloat(msg[1]);
          track.set({ faderRaw: value }, {source: 'osc'});
        } else if (valueType === 'bytes') {
          const value = parseFloat(msg[1]);
          track.set({ faderBytes: value}, {source: 'osc'});
        }
      }
    }
  } else if (header === 'config') {
    const command = address[1];
    if (command === 'filename') {
      const sourcePath = msg[1];
      const filename = sourcePath.split('/').slice(-1)[0];
      const destPath = path.join(process.cwd(), `./midi-config/linked/${filename}`);
      await fs.remove(destPath);
      await fs.symlink(sourcePath, destPath);
      if (globals.get('configFilename').name !== filename) {
        const configFilename = { path: `midi-config/linked/${filename}`, name: filename }
        globals.set({ configFilename: configFilename })
      }
    } else if (command === 'port') {
      // make sure received port is in selectMidiIn list and in selectMidiOut list !
      const selectMidiIn = globals.get('selectMidiIn');
      const selectMidiOut = globals.get('selectMidiOut');
      const receivedPort = msg[1];
      if (selectMidiIn.find(e => e === receivedPort) !== -1
        && selectMidiOut.find(e => e === receivedPort)) {
        globals.set({
          midiInName: receivedPort,
          midiOutName: receivedPort
         });
      }
    } else if (command === 'controller') {
      const selectControllers = globals.get('selectControllers');
      const receivedController = msg[1];
      if (selectControllers.find(e => e === receivedController) !== 1) {
        globals.set({ controllerName: receivedController});
      }
    }
  }
});

// _______________________
// listening for updates on midi side
// _______________________
// MCU.controlMap({
//   'button': {
//     'down': {
//       'FADER BANK RIGHT': function() {
//         const idMap = tracks.map(t => t.get('trackId'));
//         const lastFader = idMap[idMap.length - 1];
//         const activePage = globals.get('activePage');
//         const lastPage = Math.floor((lastFader - 1) / 8);
//         if (activePage < lastPage) {
//           globals.set({ activePage: activePage + 1 }, {source:'midi'});
//           setMixerView(globals.get('activePage'), tracks);
//         }
//        },
//       'FADER BANK LEFT': function() {
//         const activePage = globals.get('activePage');
//         if (activePage > 0) {
//           globals.set({ activePage: activePage - 1 }, {source: 'midi'});
//           setMixerView(globals.get('activePage'), tracks);
//         }
//       },
//     },
//   },
//   'fader': function(name, state) {
//     onFaderMove(name, state, globals.get('activePage'), tracks);
//     displayUserFader(globals.get('activePage'), tracks);
//   },
// });

function onMidiReceive(msg) {
  let faderBytes = null;
  let faderTouched = null;
  let channel = null;
  // parse touched flag
  if (msg.isNoteOn() || msg.isNoteOff()) {
    channel = msg.getNote() - 103;
    faderTouched = msg.getVelocity() > 0;
  } else if ([224, 225, 226, 227, 228, 229, 230, 231].includes(msg[0])) {
    channel = msg[0] - 223;
    faderBytes = [msg[2], msg[1]]; // msb, lsb
  }

  const track = tracks.find(t => t.get('channel') === channel);

  if (!faderBytes) {
    faderBytes = track.get('faderBytes');
  } else if (!faderTouched) {
    faderTouched = track.get('faderTouched');
  }

  track.set({
    faderBytes: faderBytes,
    faderTouched: faderTouched
  }, { source: 'midi' });

}

const oscClient = new OscClient('127.0.0.1', 3334);
oscClient.send(new Bundle(['/ready', 0]), () => oscClient.close());
