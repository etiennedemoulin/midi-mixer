import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';
import { html } from 'lit';
import '@ircam/simple-components/sc-slider.js';
import '@ircam/simple-components/sc-text.js';
import '@ircam/simple-components/sc-toggle.js';
import '@ircam/simple-components/sc-number.js';
import _ from 'lodash';

import createLayout from './views/layout.js';

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

function renderEmptyTrack(num) {
  const component = {
    render: () => {
      return html`
      <sc-text
        value="empty track ${num}"
        width="1050"
        readonly
      ></sc-text>
      </br>
      `;
    }
  };
  return component;
}


function renderTrack(track) {
  const _setTrack = _.throttle(track.set, 1000, { 'trailing': true });
  const component = {
    render: () => {
      const debug = `trackId = ${track.get('trackId')} // swID = ${track.get('id')} // patch = ${track.get('patch')} // name = ${track.get('name')} // ${track.get('faderType')}`;
      return html`
      <sc-text
        value=${debug}
        width="500"
        readonly
      ></sc-text>
      <sc-slider
        min=${track.getSchema().faderRaw.min}
        max=${track.getSchema().faderRaw.max}
        value=${track.get('faderRaw')}
        @input=${e => track.set({
          faderRaw: e.detail.value
        }, {
          source: 'web'
        })}
        width="400"
      ></sc-slider>
      <sc-number
        min=${track.get('faderRange')[1][0]}
        max=${track.get('faderRange')[1][1]}
        value=${track.get('faderUser')}
        @input=${e => track.set({faderUser: e.detail.value}, {source:'web'})}
      ></sc-number>
      <sc-toggle
        ?active=${track.get('mute')}
        @change=${e => track.set({mute: e.detail.value}, {source:'web'})}
      ></sc-toggle>
      </br>
  `;
    }
  };
  return component;
}

async function main($container) {
  /**
   * Create the soundworks client
   */
  const client = new Client(config);

  launcher.register(client, { initScreensContainer: $container });

  /**
   * Launch application
   */
  await client.start();

  const tracks = await client.stateManager.getCollection('track');

  const $layout = createLayout(client, $container);

  tracks.onUpdate(() => $layout.requestUpdate());
  let component = [];

  tracks.forEach(track => {
    if (track.get('trackId') !== null) {
      const comp = renderTrack(track);
      component.push(comp);
    } else {
      const comp = renderEmptyTrack(track.get('id'));
      component.push(comp);
    }
  });

  for (let i in component) {
    $layout.addComponent(component[i]);
  }

}

// The launcher enables instanciation of multiple clients in the same page to
// facilitate development and testing.
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
