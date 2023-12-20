import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';

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

  /**
   * Launch application
   */
  await client.start();

  const tracks = await client.stateManager.getCollection('track');
  const core = await client.stateManager.attach('core');

  core.onUpdate(() => {
    $layout.requestUpdate();
  });

  const $layout = createLayout(client, $container);

  let view = 'mixer';

  const mixerView = html`
    <mixer-tracks
      .tracks=${tracks}
    ></mixer-tracks>
  `;
  const editorView = html`
    <mixer-editor
      .core=${core}
    ></mixer-editor>
  `;

  const header = {

    importData() {
      const element = document.createElement('div');
      element.innerHTML = '<input type="file">';
      const fileInput = element.firstChild;

      fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];

        if (file.name.match(/\.(txt|json)$/)) {
          const reader = new FileReader();

          reader.onload = function() {
            const config = core.get('config');
            const filename = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
            config.active = filename;
            config.target = JSON.parse(reader.result);
            core.set({ config: config });
          };

          reader.readAsText(file);
        } else {
          console.log("File not supported, .txt or .json files only");
        }
      });
      fileInput.click();
    },

    download(data, filename, type) {
      var file = new Blob([data], {type: type});
      if (window.navigator.msSaveOrOpenBlob) // IE10+
          window.navigator.msSaveOrOpenBlob(file, filename);
      else { // Others
          var a = document.createElement("a"),
                  url = URL.createObjectURL(file);
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(function() {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
          }, 0);
      }
    },


    render() {
      const table = core.get('table');
      const config = core.get('config');
      return html`
        <header>
          <sc-icon
            type="gear"
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
              <sc-text
                style="width:150px;"
              >${config.active}</sc-text>
            </div>
            <div>
              <sc-button
                @input=${e => this.importData()}
              >load</sc-button>
            </div>
            <div>
              <sc-button
                @input=${e => {
                  this.download(
                    JSON.stringify(config.target, null, 2),
                    config.active,
                    'application/json'
                  );
                }}
              >save</sc-button>
            </div>
            <div>
              <sc-text>Table</sc-text>
              <sc-select
                value=${table.active}
                .options=${table.list}
                @change=${e => {
                  table.active = e.target.value;
                  core.set({ table: table });
                }}
              ></sc-select>
            </div>
            <div>

            </div>
            <div>

            </div>
            <div>

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
