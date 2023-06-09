import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import { setFaderView, setMixerView, onFaderMove, displayUserFader } from './faderCommunicator.js';
import { userToRaw, rawToUser, getFaderRange } from './helpers.js';
import { trackSchema } from './schemas/tracks.js';
import { globalsSchema } from './schemas/globals.js';
import * as device from './Controllers/studer.cjs';
import * as MCU from './mackie-control.cjs';
import midiConfig from './midiConfig.js';
import _ from 'lodash';

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
// configure the server for usage within this application template
server.useDefaultApplicationTemplate();

await server.start();

// register tracks
server.stateManager.registerSchema('track', trackSchema);
const tracks = [];

// register globals
server.stateManager.registerSchema('globals', globalsSchema);
const globals = await server.stateManager.create('globals');

// replace 'MAIN' key par 0 in midiConfig
if (midiConfig['MAIN'] !== undefined) {
  midiConfig['0'] = midiConfig['MAIN'];
  delete midiConfig['MAIN'];
}

// generate schema from midiConfig
const configKeys = Object.keys(midiConfig).map(e => parseInt(e));

for (let i = 0; i < (Math.max(...configKeys) + 1); i++) {
  // create schema for each fader (from 0 -> last midiConfig key)
  const trackId = configKeys.find(e => (e === i));
  tracks[i] = await server.stateManager.create('track');

  if (trackId === undefined) {
    // track is not in midiConfig
    tracks[i].set({ id: i });
  } else {
    // track is in midiConfig
    const cfg = midiConfig[trackId];
    const range = getFaderRange(cfg);

    tracks[i].set(
      {
        id: i,
        trackId: trackId,
        patch: cfg.patch,
        name: cfg.name,
        faderType: cfg.type,
        faderRange: range,
      }
    );
  };
};

console.log('- numTracks', tracks.length);

// ________________________________
// hook
// ________________________________

server.stateManager.registerUpdateHook('track', (updates, currentValues, context) => {
  // hook compute each fader values
  if (context.source !== 'hook') {
    const key = Object.keys(updates)[0];
    const input = updates[key];
    const id = currentValues.id;
    let user = null;
    let raw = null;
    let bytes = null;

    if (key === 'faderRaw') {
      user = rawToUser(input, device.fader, currentValues);
      bytes = parseInt(input * (Math.pow(2,14) - 1));
      raw = input;
    } else if (key === 'faderUser') {
      raw = userToRaw(input, device.fader, currentValues);
      bytes = parseInt(raw * (Math.pow(2,14) - 1));
      user = input;
    } else if (key === 'faderBytes') {
      raw = input / (Math.pow(2, 14) - 1);
      user = rawToUser(raw, device.fader, currentValues);
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

// ______________________
// Init MCU lib
// ______________________
// const midiDevice = "Euphonix MIDI Euphonix Port 1"
// const midiDevice = "mioXM HST 1"
const midiDevice = "iConnectMIDI2+ DIN 1";
// const midiDevice = "IAC Driver Bus 1"
// const midiDevice = "D 400";
const port = MCU.getPorts().findIndex(e => e === midiDevice);
if (port !== -1) {
  MCU.start(function(msg) {
    console.log('Midi Init:', midiDevice);
  }, { port: port });
} else {
  console.log("[midi.mixer] - Cannot find midi device !");
}

// init fader mode
MCU.setFaderMode('CH1', 'position', 0);
MCU.setFaderMode('CH2', 'position', 0);
MCU.setFaderMode('CH3', 'position', 0);
MCU.setFaderMode('CH4', 'position', 0);
MCU.setFaderMode('CH5', 'position', 0);
MCU.setFaderMode('CH6', 'position', 0);
MCU.setFaderMode('CH7', 'position', 0);
MCU.setFaderMode('CH8', 'position', 0);
MCU.setFaderMode('MAIN', 'position', 0);

// update all view
setMixerView(globals.get('activePage'), tracks);

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

