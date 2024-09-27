import '../utils/catch-unhandled-errors.js';
import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
import pluginScriptingFactory from '@soundworks/plugin-scripting/server.js';
import { loadConfig } from '@soundworks/helpers/node.js';

import { globalsSchema } from './schemas/globals.js';
import updateTracks from './update-tracks.js';

import OSCService from './services/OSCService.js';
import MidiService from './services/MidiService.js';
import MaxService from './services/MaxService.js';

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

/**
 * Register plugins and schemas
 */
server.pluginManager.register('scripting', pluginScriptingFactory, {
  dirname: 'midi-config'
});
server.stateManager.registerSchema('globals', globalsSchema);

await server.start();

const scripting = await server.pluginManager.get('scripting');
const globals = await server.stateManager.create('globals', {
  config: scripting.getList()[0]
});

let currentScript = null;
let oscService = null;
let midiService = null;

async function loadAppConfig() {
  if (currentScript) {
    await currentScript.detach();
  }

  currentScript = await scripting.attach(globals.get('config'));
  // not very subtle...
  currentScript.onUpdate(() => loadAppConfig());
  const mod = await currentScript.import();
  const appConfig = mod.default;

  const tracks = await updateTracks(server, globals, appConfig);

  // create the services only once
  if (oscService) { await oscService.close(); }
  if (midiService) { await midiService.close(); }

  oscService = new OSCService(server);
  midiService = new MidiService(server);

  // try {
  //   const Max = require('max-api');
  //   new MaxService(server, Max);
  // } catch (err) {

  // }
}

globals.onUpdate(async (updates) => {
  if ('config' in updates) {
    await loadAppConfig();
  }
}, true);

// executed when a script is created or deleted
scripting.onUpdate(async function () {

});



// @TODO
// unable to change config file on the fly, update are not recognized

