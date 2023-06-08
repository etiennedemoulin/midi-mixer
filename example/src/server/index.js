import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import { setFaderView, setMixerView } from './faderCommunicator.js';
import { userToRaw, rawToUser, getFaderRange } from './helpers.js';
import { trackSchema } from './schemas/tracks.js';
import * as device from './Controllers/studer.cjs';
import * as MCU from './mackie-control.cjs';
import midiConfig from './midiConfig.js';

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
 * Create the soundworks server
 */
const server = new Server(config);
// configure the server for usage within this application template
server.useDefaultApplicationTemplate();

await server.start();

// generate schema from midiConfig
server.stateManager.registerSchema('track', trackSchema);
const tracks = [];

// replace 'MAIN' key par 0
midiConfig['0'] = midiConfig['MAIN'];
delete midiConfig['MAIN'];

let configKeys = Object.keys(midiConfig);
configKeys = configKeys.map(e => parseInt(e));

for (let i = 0; i < (Math.max(...configKeys) + 1); i++) {
  const trackId = configKeys.find(e => (e === i));
  tracks[i] = await server.stateManager.create('track');

  if (trackId === undefined) {
    tracks[i].set({ id: i });
  } else {
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

server.stateManager.registerUpdateHook('track', (updates, currentValues, context) => {
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

// Init XT lib
const midiDevice = "Euphonix MIDI Euphonix Port 1"
// const midiDevice = "mioXM HST 1"
const port = MCU.getPorts().findIndex(e => e === midiDevice);

if (port !== -1) {
  MCU.start(function(msg) {
    console.log('Midi Init:', midiDevice);
    // console.log('Midi Init: ' + msg);
  }, { port: port });
} else {
  console.log("[midi.mixer] - Cannot find midi device !");
  // throw new Error("Can't find midi device - abort.");
}

let activePage = 0;

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

tracks.forEach(track => {
  track.onUpdate((newValues, oldValues, context) => {
    if (context.source !== 'midi') {
      setFaderView(track.get('trackId'), activePage, tracks);
    };
  });
});

// update all view
setMixerView(activePage, tracks);

MCU.controlMap({
  'button': {
    'down': {
      'FADER BANK RIGHT': function() {
        const idMap = tracks.map(t => t.get('trackId'));
        const lastFader = idMap[idMap.length - 1];
        if (activePage < (Math.floor(lastFader / 8) - 1)) {
          activePage++;
          setMixerView(activePage, tracks);
        }
       },
      'FADER BANK LEFT': function() {
        if (activePage > 0) {
          activePage--;
          setMixerView(activePage, tracks);
        }
      },
    },
  },
  'fader': function(name, state) {
    const relIndex = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'].findIndex(e => e === name);
    const absIndex = (relIndex !== -1) ? (relIndex + 1 + activePage * 8) : 0;
    const track = tracks.find(t => t.get('trackId') === absIndex);
    let value = null;

    if (typeof state === 'number') {
      value = state;
    } else {
      value = track.get('faderBytes');
    }

    if (track !== undefined) {
      track.set({
        faderBytes: value
      }, { source: 'midi' });
    }

    if (state === 'release') {
      setFaderView(track.get('trackId'), activePage, tracks);
      // MCU.setFader(name, value);
    }

  },
});

MCU.on('debug', (e) => {
  // console.log(e);
});
