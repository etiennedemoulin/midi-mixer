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

function renderEmptyTrack(track) {
  return html`
    <sc-text
      value="track ${track.get('channel')} : empty"
      width="1050"
      readonly
    ></sc-text>
    </br>
  `;
}

function renderTrack(track) {
  const _setTrack = _.throttle((...args) => track.set(...args), 50, { 'trailing': true });

  return html`
    <sc-text
      value=${`track ${track.get('channel')} : ${track.get('name')}`}
      width="500"
      readonly
    ></sc-text>
    <sc-slider
      min=${track.getSchema().faderRaw.min}
      max=${track.getSchema().faderRaw.max}
      value=${track.get('faderRaw')}
      @input=${e => _setTrack({
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
      @input=${e => _setTrack({faderUser: e.detail.value}, {source:'web'})}
    ></sc-number>
    <sc-toggle
      ?active=${track.get('mute')}
      @change=${e => _setTrack({mute: e.detail.value}, {source:'web'})}
    ></sc-toggle>
    </br>
  `;
}

function renderParams(globals) {
  return html`
    <sc-text
      value="midi input device"
      readonly
    ></sc-text>
    <select
      @change=${e => globals.set({midiInName: e.target.value}, {source:'web'})}
    >
      ${globals.get('selectMidiIn').map(name => {
        return html`
          <option value="${name}" ?selected="${name === globals.get('midiInName')}">
            ${name}
          </option>`;
      })}
    </select>
    <sc-text
      value="midi output device"
      readonly
    ></sc-text>
    <select
      @change=${e => globals.set({midiOutName: e.target.value}, {source:'web'})}
    >
      ${globals.get('selectMidiOut').map(name => {
        return html`
          <option value="${name}" ?selected="${name === globals.get('midiOutName')}">
            ${name}
          </option>`;
      })}
    </select>
    <sc-text
      value="controller"
      readonly
    ></sc-text>
    <select
      @change=${e => globals.set({controllerName: e.target.value}, {source: 'web'})}
    >
      ${globals.get('selectControllers').map(name => {
        return html`
          <option value="${name}" ?selected="${name === globals.get('controllerName')}">
            ${name}
          </option>`;
      })}
    </select>
  `;
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

  const $layout = createLayout(client, $container);

  const tracks = await client.stateManager.getCollection('track');
  const globals = await client.stateManager.attach('globals');

  tracks.onUpdate(() => $layout.requestUpdate());
  tracks.onAttach(() => $layout.requestUpdate());
  tracks.onDetach(() => $layout.requestUpdate());

  $layout.addComponent(renderParams(globals));
  $layout.addComponent({
    render() {
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
