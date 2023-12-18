import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
// import filesystemPlugin from '@soundworks/plugin-filesystem/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

// import fs from 'fs-extra';
// import path from 'path';

// import JZZ from 'jzz';

// import { Server as OscServer, Client as OscClient, Bundle } from 'node-osc';

// import _ from 'lodash'; // please import only needed things from lodash
// import JSON5 from 'json5';

// import { userToRaw, rawToUser, getFaderRange, parseTrackConfig, rawToBytes, bytesToRaw, relToAbsChannel, absToRelChannel, dBtoRaw } from './helpers.js';
// import { trackSchema } from './schemas/tracks.js';
// import { globalsSchema } from './schemas/globals.js';
// import { midiSchema } from './schemas/midi.js';
// import { onMidiOutFail, onMidiInFail, getMidiDeviceList, displayUserFader, setFaderView, setMixerView, resetMixerView, sendFader, sendMute } from './midiCommunicator.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const globals = {
  oscEngine: null,
  midiEngine: null,
  tracks: null,
}

(async function() {

  const config = loadConfig(process.env.ENV);

  console.log(`
  --------------------------------------------------------
  - launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
  - [pid: ${process.pid}]
  --------------------------------------------------------
  `);

  const server = new Server(config);
  // configure the server for usage within this application template
  server.useDefaultApplicationTemplate();

  await server.start();

  console.log("coucououuuuuu " + process.env);

}());
