import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
import filesystemPlugin from '@soundworks/plugin-filesystem/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import fs from 'fs-extra';
import path from 'path';

import JZZ from 'jzz';

import { Server as OscServer, Client as OscClient, Bundle } from 'node-osc';

import _ from 'lodash';
import JSON5 from 'json5';

import { userToRaw, rawToUser, getFaderRange, parseTrackConfig, rawToBytes, bytesToRaw, relToAbsChannel, absToRelChannel, dBtoRaw } from './helpers.js';
import { trackSchema } from './schemas/tracks.js';
import { globalsSchema } from './schemas/globals.js';
import { midiSchema } from './schemas/midi.js';
import { onMidiOutFail, onMidiInFail, getMidiDeviceList, displayUserFader, setFaderView, setMixerView, resetMixerView, sendFader, sendMute } from './midiCommunicator.js';

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


// catches uncaught exceptions
// process.on('uncaughtException', function() {
//   process.send('error');
// });

// process.on('SIGINT', function() {
//   resetMixerView();
// });

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
server.stateManager.registerSchema('midi', midiSchema);

await server.start();

const filesystem = await server.pluginManager.get('filesystem');

const controllersFolder = fs.readdirSync(path.resolve(process.cwd(),'./public/controllers'));
const selectControllers = controllersFolder.map(e => e.split('.').shift());
// register globals
const globals = await server.stateManager.create('globals', {
  selectControllers: selectControllers,
  controllerName: selectControllers[0],
  configFilename: filesystem.getTree().children[0],
});

// --------------------------------- move to it's own file
// initialise midi lib
let midiInPort;
let midiOutPort;

const { selectMidiIn, selectMidiOut } = getMidiDeviceList();

const midi = await server.stateManager.create('midi', {
  selectMidiIn: selectMidiIn,
  selectMidiOut: selectMidiOut
});
try {
  midi.onUpdate( (updates, oldValues, context) => {
    if ('midiInName' in updates) {
      const name = updates.midiInName ? updates.midiInName : selectMidiIn[0];
      midiInPort = JZZ({ sysex: true }).openMidiIn(name).or(onMidiInFail).and(function() {
        if (midiInPort) {
          midiInPort.close();
        }
        const midiInName = this.name();
        console.log(`- Midi Input Device: ${midiInName}`);
        midi.set({ midiInName: midiInName }, {source:'server'});
      });
      midiInPort.connect(JZZ.Widget({ _receive: onMidiReceive }));
    }

    if ('midiOutName' in updates) {
      const name = updates.midiOutName ? updates.midiOutName : selectMidiOut[0];
      midiOutPort = JZZ({ sysex: true }).openMidiOut(name).or(onMidiOutFail).and(function() {
        if (midiOutPort) {
          resetMixerView(midiOutPort);
          midiOutPort.close();
        }
        const midiOutName = this.name();
        console.log(`- Midi Output Device: ${midiOutName}`);
        midi.set({ midiOutName: midiOutName }, {source:'server'});
        if (tracks) {
          setMixerView(globals.get('activePage'), this, tracks);
        };
      });
    }
  }, true);
} catch (err) {
  console.log(err.message);
}
// ___________________________________

// initialise controllers
// this is globals variable for the transfert table of fader values
// updated value on 235 and used as a table on 130
let controllerFader;
let controllerMeter;

let oscDestination;
let oscSendPort;

// ---------------------------------

globals.onUpdate(async (updates, oldValues, context) => {
  if ('controllerName' in updates) {
    const { fader, meter } = await import (path.resolve(process.cwd(),`./public/controllers/${updates.controllerName}.js`));
    controllerFader = fader;
    controllerMeter = meter;
    console.log(`- Updated controller ${updates.controllerName}`);
  }

  if ('configFilename' in updates) {
    updateTracks();
  }

  if ('oscDestination' in updates || 'oscSendPort' in updates || 'oscReceivePort' in updates) {
    oscDestination = globals.get('oscDestination');
    oscSendPort = globals.get('oscSendPort');
    const oscReceivePort = globals.get('oscReceivePort');
    const oscServer = new OscServer(oscReceivePort, oscDestination, () => {
      console.log(`OSC Server is listening on ${oscDestination}:${oscReceivePort}`);
    });
    // OSC RECEIVE
    oscServer.on('message', async function (msg) {
      const receivedAddress = msg[0];

      tracks.forEach(track => {
        if (track.get('faderAddress') === receivedAddress) {
          const value = parseFloat(msg[1]);
          track.set({ faderUser: value }, { source: 'osc' });
        } else if (track.get('muteAddress') === receivedAddress) {
          const value = parseFloat(msg[1]) === 1 ? true : false;
          track.set({ mute: value }, { source: 'osc' });
        } else if (track.get('meterAddress') === receivedAddress) {
          msg.shift();
          const value = msg.length > 1 ? Math.max(...msg) : msg[0];
          track.set({ meterUser: value }, { source: 'osc' });
        }
      })
    });
  }

}, true);

async function updateTracks() {
  // console.log('++++ updates tracks');
  const tree = filesystem.getTree();

  const configFilename = globals.get('configFilename').path;
  const config = fs.readFileSync(configFilename).toString();
  globals.set({ config });

  let midiConfig;

  try {
    midiConfig = JSON5.parse(config);
  } catch(err) {
    console.log(err.message);
    return;
  }

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
      }
    }
  } else {
    // console.log(`- delete track from ${maxTrackIndex + 1} to ${tracks.length - 1}`);
    for (let i = tracks.length - 1; i > maxTrackIndex; i--) {
      const track = tracks.find(s => s.get('channel') === i);
      // delete tracks if state is deleted
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
        faderAddress: null,
        muteAddress: null,
        meterAddress: null,
        faderUser: null,
        mute: false,
        meterUser: null,
        meterRaw: null,
        meterBytes: null,
      }, {source:'config'});
    }
  });

  // apply updates on changed state
  channels.forEach(async channel => {
    const track = tracks.find(s => s.get('channel') === channel);
    // console.log(`update channel ${track.get('channel')}`);
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

    const faderAddress = midiConfigLine.faderAddress ? midiConfigLine.faderAddress : `/fader/${channel}/user`;
    const meterAddress = midiConfigLine.meterAddress ? midiConfigLine.meterAddress : `/meter/${channel}/user`;
    const muteAddress = midiConfigLine.muteAddress ? midiConfigLine.muteAddress : `/mute/${channel}`;

    await track.set({
      faderAddress: faderAddress,
      meterAddress: meterAddress,
      muteAddress: muteAddress
     }, { source: 'config'});
  });

  // https://github.com/etiennedemoulin/midi-mixer/issues/8 is here
  // need to wait for the forEach loop to end
  if (midiOutPort) {
    setMixerView(globals.get('activePage'), midiOutPort, tracks);
  };
}

filesystem.onUpdate(updateTracks, true);
filesystem.onUpdate(updates => {
  const { events } = updates;
  if (events[0] && events[0].type === 'create') {
    globals.set({ configFilename: events[0].node }, { source:'config' });
  }
});

// --------------------------------
// hook
// --------------------------------
server.stateManager.registerUpdateHook('track', async (updates, currentValues, context) => {
  // @TODO add new type : dca
  // @TODO add new type : alias
  // hook compute each fader values
  if (context.source !== 'hook') {
    if ('faderRaw' in updates || 'faderUser' in updates || 'faderBytes' in updates) {
      // will be updated only if 1st entry in updates, please be careful
      const key = Object.keys(updates)[0];
      const input = updates[key];
      const id = currentValues.id;
      let faderUser = null;
      let faderRaw = null;
      let faderBytes = null;

      if (key === 'faderRaw') {
        faderUser = rawToUser(input, controllerFader, currentValues);
        faderBytes = rawToBytes(input);
        faderRaw = input;
      } else if (key === 'faderUser') {
        faderRaw = userToRaw(input, controllerFader, currentValues);
        faderBytes = rawToBytes(faderRaw);
        faderUser = input;
      } else if (key === 'faderBytes') {
        faderRaw = bytesToRaw(input);
        faderUser = rawToUser(faderRaw, controllerFader, currentValues);
        faderBytes = input;
      }

      return {
        ...updates,
        faderUser,
        faderBytes,
        faderRaw,
      };
    } else if ('meterUser' in updates) {
      const meterUser = updates.meterUser;
      const meterRaw = dBtoRaw(updates.meterUser, controllerMeter);
      const meterBytes = Math.floor(meterRaw * controllerMeter.length);
      return {
        ...updates,
        meterUser,
        meterRaw,
        meterBytes,
      };
    }
  }
});

// _______________________________
// listening for incoming soundworks updates
// _______________________________
function onTrackUpdate(updates, oldValues, context, track) {
  // send midi side
  // @TODO clean this : meter has to be sent EVEN if context is midi :)
  if (midiOutPort) {
    if (context.source !== 'midi') {
      // on soundworks update
      setFaderView(track.get('channel'), globals.get('activePage'), tracks, midiOutPort, updates);
    } else {
      // on loopback
      // update display
      displayUserFader(globals.get('activePage'), midiOutPort, tracks);
      // send fader value on release
      if (updates.faderTouched === false) {
        const relChannel = absToRelChannel(track.get('channel'));
        const bytes = track.get('faderBytes');
        sendFader(relChannel, bytes, midiOutPort);
      }
      // send mute LED
      if (updates.mute !== undefined && track.get('disabled') === false) {
        const relChannel = absToRelChannel(track.get('channel'));
        sendMute(relChannel, updates.mute, midiOutPort);
      }
    }
  }

  // send osc side
  if (context.source !== 'osc' && oscSendPort) {
    let address = null;
    let value = null;
    if (updates.faderUser) {
      // fader is modified
      address = track.get('faderAddress');
      value = updates.faderUser;
    } else if (updates.mute !== undefined) {
      // f*cking boolean
      // mute is modified
      address = track.get('muteAddress');
      value = updates.mute === true ? 1 : 0;
    } else if (updates.meterUser) {
      // meter is modified
      address = track.get('meterAddress');
      value = updates.meterUser;
    }
    if (address) {
      const oscClient = new OscClient(oscDestination, oscSendPort);
      oscClient.send(address, value, () => oscClient.close());
    }
  }

}

function onMidiReceive(msg) {
  if ([224, 225, 226, 227, 228, 229, 230, 231].includes(msg[0])) {
    // parse fader value
    const relChannel = msg[0] - 223;
    const absChannel = relToAbsChannel(relChannel, globals.get('activePage'));
    const faderBytes = [msg[2], msg[1]]; // msb, lsb
    // @TODO try to remove find and replace by forEach loop
    const track = tracks.find(t => t.get('channel') === absChannel);
    if (track && track.get('disabled') === false) {
      track.set({
        faderBytes: faderBytes,
        faderTouched: track.get('faderTouched')
      }, { source: 'midi' });
    }
  } else if (msg.isNoteOn() || msg.isNoteOff()) {
    // parse notes
    const midiNote = msg.getNote();
    if ([104, 105, 106, 107, 108, 109, 110, 111].includes(midiNote)) {
      // parse touched flag
      const relChannel = midiNote - 103;
      const absChannel = relToAbsChannel(relChannel, globals.get('activePage'));
      const faderTouched = msg.getVelocity() > 0;
      // @TODO try to remove find and replace by forEach loop
      const track = tracks.find(t => t.get('channel') === absChannel);
      if (track && track.get('disabled') === false) {
        track.set({
          faderBytes: track.get('faderBytes'),
          faderTouched: faderTouched
        }, { source: 'midi' });
      }
    } else if (midiNote === 46 && msg.isNoteOn()) {
      // fader bank left
      let activePage = globals.get('activePage');
      if (activePage > 0) {
        activePage = activePage - 1;
        globals.set({ activePage: activePage }, { source: 'midi' });
        setMixerView(activePage, midiOutPort, tracks);
      }
    } else if (midiNote === 47 && msg.isNoteOn()) {
      // fader bank right
      const channels = tracks.map(t => t.get('channel'));
      const lastFader = channels[channels.length - 1];
      let activePage = globals.get('activePage');
      const lastPage = Math.floor((lastFader - 1) / 8);
      if (activePage < lastPage) {
        activePage = activePage + 1;
        globals.set({ activePage: activePage }, {source:'midi'});
        setMixerView(activePage, midiOutPort, tracks);
      }
    } else if ([16, 17, 18, 19, 20, 21, 22, 23].includes(midiNote) && msg.isNoteOn()) {
      const relChannel = msg.getNote() - 15;
      const absChannel = relToAbsChannel(relChannel, globals.get('activePage'));
      tracks.forEach(track => {
        if (track.get('channel') === absChannel) {
          const currentValue = track.get('mute');
          track.set({ mute: !currentValue }, { source: 'midi' });
        }
      })
    }
  }
}
