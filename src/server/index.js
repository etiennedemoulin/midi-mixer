import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';

import { trackSchema } from './schemas/tracks.js';
import { coreSchema } from './schemas/core.js';
import { midiSchema } from './schemas/midi.js';
import { oscSchema } from './schemas/osc.js';

import fs from 'node:fs';
import path from 'node:path';

import { createMaxEnvironment } from './max.js';

import { propagateValues, onConfigUpdate } from './handlers.js';
// import { getMidiInDeviceList, getMidiOutDeviceList} from './midi.js';

const app = {
  core: null, // soundworks schema
  tracks: [], // soundworks schema
  midi: {
    schema: null, // soundworks schema
    in: null, // JZZ engine
    out: null // JZZ engine
  },
  osc: {
    schema: null, // soundworks schema
    server: null, // OSC server
    client: null, // OSC client
  },
  max: {
    id: null, // max ID
    boxes: null, // max created boxes
    api: null, // MaxAPI
  },
  env: {
    osc: process.env.OSC,
    max: process.env.MAX_ENV,
    midi: process.env.MIDI
  }
};

(async function() {

const config = loadConfig(process.env.ENV);

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
 * Launch application (init plugins, http server, etc.)
 */
await server.start();

/**
 * Register plugins and schemas
 */
server.stateManager.registerSchema('track', trackSchema);
server.stateManager.registerSchema('core', coreSchema);
server.stateManager.registerSchema('midi', midiSchema);
server.stateManager.registerSchema('osc', oscSchema);

/**
 * Create schemas
 */
app.core = await server.stateManager.create('core', {
  table: {
    list: fs.readdirSync(path.resolve(process.cwd(),'./public/tables')).map(e => e.split('.').shift()),
    active: 'mackie',
    target: await import (path.resolve(process.cwd(),`./public/tables/mackie.js`))
  }
})

/**
 * Handle updates
 */
app.core.onUpdate(async updates => {
  if ('table' in updates) {
    const { fader, meter } = await import (path.resolve(process.cwd(),`./public/tables/${updates.table.active}.js`));
    const table = app.core.get('table');
    table.target = {
        meter: meter,
        fader: fader
    };
    app.core.set({ table: table });
  }
  if ('config' in updates) {
    onConfigUpdate(updates.config.target, app, server);
  }
});

/**
 * Hook updates
 */
server.stateManager.registerUpdateHook('track', async(updates, values, context) => {
  if (context.source !== 'hook') {
    propagateValues(updates, values, app);
  }
});

/**
 * Start Max
 */
if (app.env.max) {
  createMaxEnvironment(app);
}

}());
