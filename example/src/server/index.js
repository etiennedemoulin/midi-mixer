import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
import filesystemPlugin from '@soundworks/plugin-filesystem/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import fs from 'fs';

import { setFaderView, setMixerView, onFaderMove, displayUserFader } from './faderCommunicator.js';
import { userToRaw, rawToUser, getFaderRange, parseTrackConfig, initMidiDevice, getMidiDeviceList, getControllerList } from './helpers.js';
import { trackSchema } from './schemas/tracks.js';
import { globalsSchema } from './schemas/globals.js';
import * as MCU from './mackie-control.cjs';
// import midiConfig from './midiConfig.js';

import _ from 'lodash';
import JSON5 from 'json5';

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

// register tracks
server.stateManager.registerSchema('track', trackSchema);
server.stateManager.registerSchema('globals', globalsSchema);
// register globals
const globals = await server.stateManager.create('globals');

globals.onUpdate(async updates => {
  const midiDeviceList = getMidiDeviceList();
  globals.set({ midiDeviceList: midiDeviceList });

  if (updates.midiDeviceSelected) {
    const midiDevice = globals.get('midiDeviceSelected');
    initMidiDevice(midiDevice);
  }

  const controllerList = await getControllerList();
  globals.set({ controllerList: controllerList });

}, true);

server.stateManager.registerUpdateHook('globals', async(updates) => {
  if (updates.selectedController) {
    const { fader, meter } = await import(`./controllers/${controller}.js`);
    globals.set({ controllerFaderValues: fader });
  }
}, true);

// grab config file an init states
const filesystem = await server.pluginManager.get('filesystem');
const tree = filesystem.getTree();
const midiConfigFilename = tree.children.find(f => f.name === 'example-1.json').path;

// update on config file update
filesystem.onUpdate(async updates => {
  const midiConfigFilename = tree.children.find(f => f.name === 'example-1.json').path;
  const midiConfig = JSON5.parse(fs.readFileSync(midiConfigFilename));

  const trackIds = Object.keys(midiConfig)
    .map(name => name === 'MAIN' ? 0 : parseInt(name))
    .sort((a, b) => a < b ? -1 : 1);

  const maxTrackIndex = Math.max(...trackIds);

  if (maxTrackIndex + 1 > tracks.length) {
    console.log(`- create track from ${tracks.length} to ${maxTrackIndex}`);
  }

  // create states that do not yet exists until maxTrackIndex
  for (let i = tracks.length; i < maxTrackIndex + 1; i++) {
    tracks[i] = await server.stateManager.create('track');

    if (!trackIds.includes(i)) {
      await tracks[i].set({ id: i }, { source: 'config-file' });
    } else {
      await tracks[i].set({
        id: i,
        trackId: i,
      }, { source: 'config-file' });
    }
  }

  // check tracks taht may have been removed
  tracks.forEach(async track => {
    const trackId = track.get('trackId');

    // already disabled
    if (trackId === null) {
      return;
    }

    if (!trackIds.includes(trackId)) {
      console.log('- disable track:', trackId);

      await track.set({
        trackId: null,
        patch: null,
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
  trackIds.forEach(async trackId => {
    const track = tracks.find(s => s.get('trackId') === trackId);
    // console.log(trackId, track);
    const updates = parseTrackConfig(midiConfig[trackId === 0 ? 'MAIN' : `${trackId}`]);
    await track.set(updates, { source: 'config-file' });
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

    const controller = globals.get('selectedController');

    if (key === 'faderRaw') {
      user = rawToUser(input, fader, currentValues);
      bytes = parseInt(input * (Math.pow(2,14) - 1));
      raw = input;
    } else if (key === 'faderUser') {
      raw = userToRaw(input, fader, currentValues);
      bytes = parseInt(raw * (Math.pow(2,14) - 1));
      user = input;
    } else if (key === 'faderBytes') {
      raw = input / (Math.pow(2, 14) - 1);
      user = rawToUser(raw, fader, currentValues);
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
// updates client side
// _______________________________
tracks.forEach(track => {
  track.onUpdate((newValues, oldValues, context) => {
    if (context.source !== 'midi') {
      setFaderView(track.get('trackId'), globals.get('activePage'), tracks);
    };
  });
});

// _______________________
// updates midi side
// _______________________
MCU.controlMap({
  'button': {
    'down': {
      'FADER BANK RIGHT': function() {
        const idMap = tracks.map(t => t.get('trackId'));
        const lastFader = idMap[idMap.length - 1];
        const activePage = globals.get('activePage');
        const lastPage = Math.floor((lastFader - 1) / 8);
        if (activePage < lastPage) {
          globals.set({ activePage: activePage + 1 });
          setMixerView(globals.get('activePage'), tracks);
        }
       },
      'FADER BANK LEFT': function() {
        const activePage = globals.get('activePage');
        if (activePage > 0) {
          globals.set({ activePage: activePage - 1 });
          setMixerView(globals.get('activePage'), tracks);
        }
      },
    },
  },
  'fader': function(name, state) {
    onFaderMove(name, state, globals.get('activePage'), tracks);
    displayUserFader(globals.get('activePage'), tracks);
  },
});

MCU.on('debug', (e) => {
  // console.log(e);
});

// @TODO
// send ping every seconds

