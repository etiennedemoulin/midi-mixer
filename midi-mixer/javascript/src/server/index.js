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

import { userToRaw, rawToUser, getFaderRange, parseTrackConfig, rawToBytes, bytesToRaw, relToAbsChannel, absToRelChannel } from './helpers.js';
import { trackSchema } from './schemas/tracks.js';
import { globalsSchema } from './schemas/globals.js';
import { midiSchema } from './schemas/midi.js';
import { onMidiOutFail, onMidiInFail, getMidiDeviceList, displayUserFader, setFaderView, setMixerView, resetMixerView } from './midiCommunicator.js';

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
process.on('uncaughtException', function() {
  process.send('error');
});

// catch KILL MAX
// process.on('SIGTERM', );

/**
 * Initialisation process
 */
const server = new Server(config);
const tracks = [];

let createdSymlinkFile;

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

const controllersFolder = fs.readdirSync(path.resolve(process.cwd(),'./src/server/controllers'));
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

// Create an osc UDP Port listening on port 3333.
const oscServer = new OscServer(3333, '0.0.0.0', () => {
  console.log('OSC Server is listening on 3333');
});

// ---------------------------------

globals.onUpdate(async (updates, oldValues, context) => {
  if ('controllerName' in updates) {
    const { fader } = await import (`./controllers/${updates.controllerName}.js`);
    controllerFader = fader;
    console.log(`- Updated controller ${updates.controllerName}`);
  }

  if ('configFilename' in updates) {
    updateTracks();
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
        // create max track
      }
      // create track, disabled or enabled
      createMaxTrack(tracks[i]);

    }
  } else {
    // console.log(`- delete track from ${maxTrackIndex + 1} to ${tracks.length - 1}`);
    for (let i = tracks.length - 1; i > maxTrackIndex; i--) {
      const track = tracks.find(s => s.get('channel') === i);
      // delete tracks if state is deleted
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
      // set name to null to pass from enabled -> disabled state
      nameMaxTrack(track);
    }
  });

  // apply updates on changed state
  channels.forEach(async channel => {
    const track = tracks.find(s => s.get('channel') === channel);
    // console.log(`update channel ${track.get('channel')}`);
    const midiConfigLine = midiConfig.find(f => f.channel === channel);
    const updates = parseTrackConfig(midiConfigLine);
    await track.set(updates, { source:'config' });
    // set state from disabled -> enabled
    if (track.get('disabled') === false) {
      nameMaxTrack(track);
    }

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
  });
  if (midiOutPort) {
    setMixerView(globals.get('activePage'), midiOutPort, tracks);
  };
}

filesystem.onUpdate(updateTracks, true);
filesystem.onUpdate(updates => {
  const { events } = updates;
  if (events[0] && events[0].type === 'create') {
    console.log("update config");
    globals.set({ configFilename: events[0].node }, { source:'config' });
  }
});

// --------------------------------
// hook
// --------------------------------
server.stateManager.registerUpdateHook('track', async (updates, currentValues, context) => {
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
    }
  }
});

// _______________________________
// listening for incoming soundworks updates
// _______________________________
function onTrackUpdate(newValues, oldValues, context, track) {
  // send midi side
  if (midiOutPort) {
    if (context.source !== 'midi') {
      setFaderView(track.get('channel'), globals.get('activePage'), tracks, midiOutPort);
    } else {
      // update display values
      displayUserFader(globals.get('activePage'), midiOutPort, tracks);
      // send fader value on release
      if (track.get('faderTouched') === false && track.get('faderBytes')) {
        const absChannel = track.get('channel');
        const relChannel = absToRelChannel(absChannel) + 223;
        const bytes = track.get('faderBytes');
        midiOutPort.send([relChannel, bytes[1], bytes[0]])
      }
    }
  }
  // send osc side
  if (context.source !== 'osc') {
    const bundle = new Bundle(
      [`/track/${track.get('channel')}/fader/user`, track.get('faderUser')],
      [`/track/${track.get('channel')}/fader/raw`, track.get('faderRaw')],
      [`/track/${track.get('channel')}/fader/bytes`, track.get('faderBytes')]
    );

    const oscClient = new OscClient('127.0.0.1', 3334);
    oscClient.send(bundle, () => oscClient.close());
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
      createdSymlinkFile = destPath;
      // create symlink to watch for changes
      await fs.remove(destPath);
      await fs.symlink(sourcePath, destPath);
      // console.log("create symlink " + destPath);
    } else if (command === 'port') {
      // make sure received port is in selectMidiIn list and in selectMidiOut list !
      const selectMidiIn = midi.get('selectMidiIn');
      const selectMidiOut = midi.get('selectMidiOut');
      const receivedPort = msg[1];
      if (selectMidiIn.find(e => e === receivedPort) !== -1
        && selectMidiOut.find(e => e === receivedPort)) {
        midi.set({
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

function onMidiReceive(msg) {
  if ((msg.isNoteOn() || msg.isNoteOff()) &&
    [104, 105, 106, 107, 108, 109, 110, 111].includes(msg.getNote())) {
    // parse touched flag
    const relChannel = msg.getNote() - 103;
    const absChannel = relToAbsChannel(relChannel, globals.get('activePage'));
    const faderTouched = msg.getVelocity() > 0;
    const track = tracks.find(t => t.get('channel') === absChannel);
    if (track && track.get('disabled') === false) {
      track.set({
        faderBytes: track.get('faderBytes'),
        faderTouched: faderTouched
      }, { source: 'midi' });
    }
  } else if ([224, 225, 226, 227, 228, 229, 230, 231].includes(msg[0])) {
    // parse fader value
    const relChannel = msg[0] - 223;
    const absChannel = relToAbsChannel(relChannel, globals.get('activePage'));
    const faderBytes = [msg[2], msg[1]]; // msb, lsb
    const track = tracks.find(t => t.get('channel') === absChannel);
    if (track && track.get('disabled') === false) {
      track.set({
        faderBytes: faderBytes,
        faderTouched: track.get('faderTouched')
      }, { source: 'midi' });
    }
  } else if (msg.isNoteOn() && [46, 47].includes(msg.getNote())) {
    // parse fader bank left / right
    if (msg.getNote() === 46) {
      let activePage = globals.get('activePage');
      if (activePage > 0) {
        activePage = activePage - 1;
        globals.set({ activePage: activePage }, { source: 'midi' });
        setMixerView(activePage, midiOutPort, tracks);
      }
    } else {
      const channels = tracks.map(t => t.get('channel'));
      const lastFader = channels[channels.length - 1];
      let activePage = globals.get('activePage');
      const lastPage = Math.floor((lastFader - 1) / 8);
      if (activePage < lastPage) {
        activePage = activePage + 1;
        globals.set({ activePage: activePage }, {source:'midi'});
        setMixerView(activePage, midiOutPort, tracks);
      }
    }
  }
}

const oscClient = new OscClient('127.0.0.1', 3334);
oscClient.send(new Bundle(['/ready', 0]), () => oscClient.close());

// remove created symlink on close
process.on('SIGTERM', async function() {
  if (createdSymlinkFile) {
    await fs.remove(createdSymlinkFile);
  }
  process.exit();
});

