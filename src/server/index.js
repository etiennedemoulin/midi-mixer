import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
import filesystemPlugin from '@soundworks/plugin-filesystem/server.js';
import { loadConfig } from '@soundworks/helpers/node.js';

import fs from 'fs-extra';
import path from 'path';
import JSON5 from 'json5';

import { globalsSchema } from './schemas/globals.js';
import updateTracks from './update-tracks.js';

import '../utils/catch-unhandled-errors.js';

import { rawToUser, userToRaw } from '../utils/basis-conversions.js';

import OSCService from '../services/OSCService.js';


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
server.pluginManager.register('filesystem', filesystemPlugin, { dirname: 'midi-config'});
server.stateManager.registerSchema('globals', globalsSchema);

await server.start();

const filesystem = await server.pluginManager.get('filesystem');
const globals = await server.stateManager.create('globals', {
  config: filesystem.getTree().children[0]
});

let tracks;

async function loadAppConfig() {
  const tree = filesystem.getTree();
  const mod = await import(`../../${globals.get('config').path}`);
  const appConfig = mod.default;
  // globals.set({ config: appConfig });
  await updateTracks(server, appConfig);
  tracks = await server.stateManager.getCollection('tracks');

  console.log(tracks.getValues());
  new OSCService(server);

}

globals.onUpdate(async (updates) => {
  if ('config' in updates) {
    await loadAppConfig();
  }
}, true);

filesystem.onUpdate(async function () {
  await loadAppConfig();
});

