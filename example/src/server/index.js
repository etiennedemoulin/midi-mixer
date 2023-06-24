import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
import filesystemPlugin from '@soundworks/plugin-filesystem/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import fs from 'fs';
import path from 'path';

import JZZ from 'jzz';
import osc from 'osc';
import _ from 'lodash';
import JSON5 from 'json5';

import { userToRaw, rawToUser, getFaderRange, parseTrackConfig } from './helpers.js';
import { trackSchema } from './schemas/tracks.js';
import { globalsSchema } from './schemas/globals.js';
import { onMidiOutFail, onMidiInFail, getMidiDeviceList, onFaderMove, displayUserFader, setFaderView, setMixerView } from './midi.js';

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

await server.start();

// Create an osc.js UDP Port listening on port 57121.
const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 3333,
    metadata: true
});

// Open the OSC socket.
udpPort.open();

// register tracks
server.stateManager.registerSchema('track', trackSchema);
server.stateManager.registerSchema('globals', globalsSchema);
// register globals
const globals = await server.stateManager.create('globals');

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

const logger = JZZ.Widget({ _receive: onMidiReceive });

globals.onUpdate((updates, oldValues, context) => {
  if ('midiInName' in updates) {
    let name = updates.midiInName;
    if (name === null) {
      name = updates.selectMidiIn[0]
    }
    const input = JZZ().openMidiIn(name).or(onMidiInFail).and(onMidiInSuccess);
    input.connect(logger);
  };
  if ('midiOutName' in updates) {
    let name = updates.midiOutName;
    if (name === null) {
      name = updates.selectMidiOut[0]
    }
    JZZ().openMidiOut(name).or(onMidiOutFail).and(onMidiOutSuccess);
  };
}, true);

// _____________________

// initialise controllers
let controllerFader;
const controllersFolder = fs.readdirSync(path.resolve(process.cwd(),'./src/server/controllers'));
const selectControllers = [];
controllersFolder.forEach(e => {
  selectControllers.push(e.split('.').shift());
});
globals.set({ selectControllers: selectControllers });
globals.set({ controllerName: selectControllers[0] });


// Config changes from web
globals.onUpdate(async (updates) => {
  if (updates.controllerName) {
    const { fader } = await import (`./controllers/${updates.controllerName}.js`);
    controllerFader = fader;
    console.log(`- Updated controller ${updates.controllerName}`);
  };
}, true);

// grab config file an init states
const filesystem = await server.pluginManager.get('filesystem');
const tree = filesystem.getTree();
const midiConfigFilename = tree.children.find(f => f.name === 'example-1.json').path;

// update on config file update
filesystem.onUpdate(async updates => {
  const midiConfigFilename = tree.children.find(f => f.name === 'example-1.json').path;
  const midiConfig = JSON5.parse(fs.readFileSync(midiConfigFilename));

  const channels = midiConfig.map(tracks => (tracks.channel === 'MAIN') ? 0 : parseInt(tracks.channel))
    .sort((a, b) => a < b ? -1 : 1);

  const maxTrackIndex = Math.max(...channels);

  if (maxTrackIndex + 1 > tracks.length) {
    console.log(`- create track from ${tracks.length} to ${maxTrackIndex}`);
  }

  // create states that do not yet exists until maxTrackIndex
  for (let i = tracks.length; i < maxTrackIndex + 1; i++) {
    tracks[i] = await server.stateManager.create('track');
    // listening for incoming soundworks changes
    tracks[i].onUpdate((newValues, oldValues, context) => {
      onTrackUpdate(newValues, oldValues, context, tracks[i]);
    });

    // const disabled = (midiConfig[i].channel === i+1) ? false : true;
    const disabled = channels.find(f => f === i) === undefined ? true : false;

    await tracks[i].set({ channel: i, disabled: disabled }, { source: 'config-file' });

  }

  // check tracks that may have been removed
  tracks.forEach(async track => {
    const channel = track.get('channel');

    // already disabled
    if (track.get('disabled') === true) {
      return;
    }

    if (!channels.includes(channel)) {
      console.log('- disable track:', channel);

      udpPort.send({
        timeTag: osc.timeTag(0),
        packets: [{
          address: `/track/${channel}/remove`,
          args: [{ type: 's', value: track.get('name')}]
        }],
      }, "127.0.0.1", 3334);

      await track.set({
        channel: null,
        disabled: true,
        name: null,
        faderType: null,
        faderBytes: null,
        faderRaw: null,
        faderUser: null,
        faderRange: null,
        mute: null,
      }, { source: 'config-file' });

    }
  });

  // apply updates if any
  channels.forEach(async channel => {
    const track = tracks.find(s => s.get('channel') === channel);
    const updatedChannel = midiConfig.find(f => f.channel === (channel === 0 ? 'MAIN' : channel));
    // console.log(updatedChannel);
    const updates = parseTrackConfig(updatedChannel);
    console.log(track.get('channel'));
    // await track.set(updates, { source: 'config-file' });

    // udpPort.send({
    //   timeTag: osc.timeTag(0),
    //   packets: [{
    //     address: `/track/${channel}/create`,
    //     args: [{ type: 's', value: track.get('name')}]
    //   }],
    // }, "127.0.0.1", 3334);

  });

  // send infos to mixer
  setMixerView(globals.get('activePage'), tracks);

  console.log('- numTracks:', tracks.length);
}, true);

// ________________________________
// hook
// ________________________________

server.stateManager.registerUpdateHook('track', async (updates, currentValues, context) => {
  // hook compute each fader values
  if (context.source !== 'hook') {
    const key = Object.keys(updates)[0];
    const input = updates[key];
    const id = currentValues.id;
    let user = null;
    let raw = null;
    let bytes = null;

    if (key === 'faderRaw') {
      user = rawToUser(input, controllerFader, currentValues);
      bytes = parseInt(input * (Math.pow(2,14) - 1));
      raw = input;
    } else if (key === 'faderUser') {
      raw = userToRaw(input, controllerFader, currentValues);
      bytes = parseInt(raw * (Math.pow(2,14) - 1));
      user = input;
    } else if (key === 'faderBytes') {
      raw = input / (Math.pow(2, 14) - 1);
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
    udpPort.send({
        timeTag: osc.timeTag(0),
        packets: [
            {
                address: `/track/${track.get('channel')}/fader/user`,
                args: [
                    {
                        type: "f",
                        value: track.get('faderUser')
                    }
                ]
            },
            {
                address: `/track/${track.get('channel')}/fader/raw`,
                args: [
                    {
                        type: "f",
                        value: track.get('faderRaw')
                    }
                ]
            },
            {
                address: `/track/${track.get('channel')}/fader/bytes`,
                args: [
                    {
                        type: "f",
                        value: track.get('faderBytes')
                    }
                ]
            },            
        ]
    }, "127.0.0.1", 3334);
  }
}

// Listen for incoming OSC messages.
udpPort.on("message", function (oscMsg, timeTag, info) {
  const address = oscMsg.address.split('/');
  address.shift();
  const header = address[0];
  if (header === 'track') {
    const track = tracks.find(t => t.get('channel') === channel);
    const channel = parseInt(address[1]);
    if (track !== undefined) {
      if (address[2] === 'fader') {
        const valueType = address[3];
        if (valueType === 'user') {
          const value = parseFloat(oscMsg.value[0]);
          track.set({ faderUser: value }, {source: 'osc'});
        } else if (valueType === 'raw') {
          const value = parseFloat(oscMsg.value[0]);
          track.set({ faderRaw: value }, {source: 'osc'});
        } else if (valueType === 'bytes') {
          const value = parseFloat(oscMsg.value[0]);
          track.set({ faderBytes: value}, {source: 'osc'});
        }
      }
    }
  } else if (header === 'midi') {
    if (address[1] === 'config') {
      console.log(midiConfig);
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
  console.log(msg.toString());
}


