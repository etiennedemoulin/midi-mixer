import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import { onFaderMove } from './onFaderMove.js';
import { setFaderView, updateFaderView, updatePage } from './faderView.js';
import { userToRaw, rawToUser, getFaderRange } from './faderHelper.js';
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
const configKeys = Object.keys(midiConfig);
server.stateManager.registerSchema('track', trackSchema);
let tracks = [];

for (let i in configKeys) {
  const trackId = (configKeys[i] !== 'MAIN') ?
    parseInt(configKeys[i]) : configKeys[i];
  const cfg = midiConfig[trackId];
  const range = getFaderRange(cfg);
  tracks[i] = await server.stateManager.create('track');
  tracks[i].set(
    {
      id: parseInt(i),
      trackId: trackId,
      patch: cfg.patch,
      name: cfg.name,
      faderType: cfg.type,
      faderRange: range,
    }
  );
}

server.stateManager.registerUpdateHook('track', (updates, currentValues, context) => {
  if (context.source !== 'hook') {
    const key = Object.keys(updates)[0];
    const input = updates[key];
    const id = currentValues.id;
    let user = null;
    let raw = null;
    let bytes = null;
    let linear = null;
    if (key === 'faderRaw') {
      user = rawToUser(input, device.fader, currentValues);
      bytes = parseInt(input * (Math.pow(2,14) - 1));
      raw = input;
    } else if (key === 'faderUser') {
      raw = userToRaw(input, device.fader, currentValues);
      bytes = parseInt(input * (Math.pow(2,14) - 1));
      user = input;
    } else if (key === 'faderBytes') {
      raw = input / (Math.pow(2, 14) - 1);
      user = rawtoUser(raw, device.fader, currentValues);
      bytes = input;
    }
    tracks[id].set(
    {
      faderUser: user,
      faderBytes: bytes,
      faderRaw : raw,
    }, { source: 'hook' });
  }
});

// Init XT lib
const midiDevice = "IAC Driver Bus 1"
const port = MCU.getPorts().findIndex(e => e === midiDevice);

if (port !== -1) {
  MCU.start(function(msg) {
    console.log('Midi Init:', midiDevice);
    // console.log('Midi Init: ' + msg);
  }, { port: port });
} else {
  console.log("[midi.mixer] - Cannot find midi device !");
  throw new Error("Can't find midi device - abort.");
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
  track.onUpdate(async (updates, oldValues, context) => {
    if (context.source !== 'midi') {
      setFaderView(
        track.getValues().trackId,
        updates.faderBytes,
        activePage);
    };
  });
});

setMixerView(activePage);

MCU.controlMap({
  'button': {
    'down': {
      'FADER BANK RIGHT': function() {
        const idMap = tracks.get('trackId');
        const lastFader = idMap[idMap.length - 1];
        if (activePage < Math.floor(lastFader / 8)) {
          activePage++;
          setMixerView(activePage);
        }
       },
      'FADER BANK LEFT': function() {
        if (activePage > 0) {
          activePage--;
          setMixerView(activePage);
        }
      },
    },
  },
  // 'fader': onFaderMove,
});

MCU.on('debug', (e) => {
  console.log(e);
});
