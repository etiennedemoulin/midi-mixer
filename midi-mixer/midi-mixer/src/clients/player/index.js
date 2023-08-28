import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';
import filesystemPlugin from '@soundworks/plugin-filesystem/client.js';

import { html, render } from 'lit';
import './views/mixer-editor.js';
import './views/mixer-tracks.js';
import createLayout from './views/layout.js';

import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-icon.js';
import '@ircam/sc-components/sc-select.js';
import '@ircam/sc-components/sc-number.js';




// import { removeFromArray } from './utils.js';

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

  const tracks = await client.stateManager.getCollection('track');
  const globals = await client.stateManager.attach('globals');
  const midi = await client.stateManager.attach('midi');

  globals.onUpdate(() => {
    $layout.requestUpdate();
  });

  midi.onUpdate(() => {
    $layout.requestUpdate();
  })

  const $layout = createLayout(client, $container);

  let view = 'mixer';

  const mixerView = html`
    <mixer-tracks
      .tracks=${tracks}
    ></mixer-tracks>
  `;
  const editorView = html`
    <mixer-editor
      .globals=${globals}
      .filesystem=${filesystem}
    ></mixer-editor>
  `;

  const header = {
    render() {
      return html`
        <header>
          <sc-icon
            icon="gear"
            @input=${e => {
              view = view === 'editor' ? 'mixer' : 'editor';

              switch (view) {
                case 'editor': {
                  $layout.deleteComponent(mixerView);
                  $layout.addComponent(editorView);
                  break;
                }
              case 'mixer': {
                  $layout.deleteComponent(editorView);
                  $layout.addComponent(mixerView);
                  break;
                }
              }
            }}
          >config</sc-icon>

          <div class="midi-controls">
            <div>
              <sc-text readonly>Midi In</sc-text>
              <sc-select
                value=${midi.get('midiInName')}
                .options=${midi.get('selectMidiIn')}
                @change=${e => midi.set({ midiInName: e.target.value }, { source:'web' })}
              ></sc-select>
            </div>
            <div>
              <sc-text readonly>Midi Out</sc-text>
              <sc-select
                value=${midi.get('midiOutName')}
                .options=${midi.get('selectMidiOut')}
                @change=${e => midi.set({ midiOutName: e.target.value }, { source:'web' })}
              ></sc-select>
            </div>
            <div>
              <sc-text readonly>Mapping</sc-text>
              <sc-select
                value=${globals.get('controllerName')}
                .options=${globals.get('selectControllers')}
                @change=${e => globals.set({ controllerName: e.target.value }, { source: 'web' })}
              ></sc-select>
            </div>
            <div>
              <sc-text readonly>OSC dest</sc-text>
              <sc-text
                value='${globals.get('oscDestination')}'
                @change=${e => globals.set({ oscDestination: e.detail.value }, { source: 'web' })}
              ></sc-text>
            </div>
            <div>
              <sc-text readonly>OSC send</sc-text>
              <sc-number
                integer
                value=${globals.get('oscSendPort')}
                @change=${e => globals.set({ oscSendPort: e.target.value }, { source: 'web' })}
              ></sc-number>
            </div>
            <div>
              <sc-text readonly>OSC recv</sc-text>
              <sc-number
                integer
                value=${globals.get('oscReceivePort')}
                @change=${e => globals.set({ oscReceivePort: e.target.value}, { source: 'web' })}
              ></sc-number>
            </div>
          </div>
        </header>
      `;
    },
  }

  $layout.addComponent(header);

  if (view === 'mixer') {
    $layout.addComponent(mixerView);
  } else {
    $layout.addComponent(editorView);
  }
}

// The launcher enables instanciation of multiple clients in the same page to
// facilitate development and testing.
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
