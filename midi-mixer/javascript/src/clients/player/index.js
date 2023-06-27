import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';
import filesystemPlugin from '@soundworks/plugin-filesystem/client.js';

import { html } from 'lit';
import createLayout from './views/layout.js';
import { renderEmptyTrack, renderTrack, renderParams} from './views/components.js';

import { removeFromArray } from './arrayHelper.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

/**
 * Grab the configuration object written by the server in the `index.html`
 */
const config = window.SOUNDWORKS_CONFIG;

/**
 * If multiple clients are emulated you might to want to share some resources
 */
// const audioContext = new AudioContext();

async function main($container) {
  /**
   * Create the soundworks client
   */
  const client = new Client(config);

  launcher.register(client, { initScreensContainer: $container });

  client.pluginManager.register('filesystem', filesystemPlugin);

  /**
   * Launch application
   */
  await client.start();

  const filesystem = await client.pluginManager.get('filesystem');

  const $layout = createLayout(client, $container);

  const tracks = await client.stateManager.getCollection('track');
  const globals = await client.stateManager.attach('globals');

  tracks.onUpdate(() => $layout.requestUpdate());
  tracks.onAttach(() => $layout.requestUpdate());
  tracks.onDetach(() => $layout.requestUpdate());

  $layout.addComponent(renderParams(globals, filesystem));
  $layout.addComponent({
    render: () => {
      return tracks.map(track => {
        return track.get('disabled') ? renderEmptyTrack(track) : renderTrack(track);
      });
    },
  });



}

// The launcher enables instanciation of multiple clients in the same page to
// facilitate development and testing.
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
