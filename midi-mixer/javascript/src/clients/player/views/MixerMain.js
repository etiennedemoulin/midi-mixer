import { LitElement, html, css } from 'lit';
import JSON5 from 'json5';

import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-select.js';
import '@ircam/sc-components/sc-editor.js';

class MixerMain extends LitElement {
  static styles = css`
    :host {
      display: flex;
    }

    :host > div {
      width: 50%;
    }

    .midi-select h1 {
      margin: 4px 0 74px 0;
    }

    .midi-select > div {
      margin-bottom: 4px;
    }

    sc-editor {
      width: 100%;
    }
  `;

  constructor() {
    super();

    this.globals = null;
    this.filesystem = null;
  }

  render() {
    super.render();

    return html`
      <div class="midi-select">
        <h1>Midi Mixer</h1>
        <div>
          <sc-text readonly>midi input device</sc-text>
          <sc-select
            value=${this.globals.get('midiInName')}
            .options=${this.globals.get('selectMidiIn')}
            @change=${e => this.globals.set({midiInName: e.target.value}, { source:'web' })}
          ></sc-select>
        </div>
        <div>
          <sc-text readonly>midi output device</sc-text>
          <sc-select
            value=${this.globals.get('midiOutName')}
            .options=${this.globals.get('selectMidiOut')}
            @change=${e => this.globals.set({midiOutName: e.target.value}, { source:'web' })}
          ></sc-select>
        </div>
        <div>
          <sc-text readonly>controller</sc-text>
          <sc-select
            value=${this.globals.get('controllerName')}
            .options=${this.globals.get('selectControllers')}
            @change=${e => this.globals.set({controllerName: e.target.value}, { source: 'web' })}
          ></sc-select>
        </div>
      </div>
      <div class="config">
        <sc-editor
          value="${JSON5.stringify(this.globals.get('config'), null, 2)}"
          @change=${e => this.filesystem.writeFile('example-1.json', e.detail.value)}
        ></sc-editor>
      </div>
    `
  }

  connectedCallback() {
    super.connectedCallback();

    this.globals.onUpdate(() => this.requestUpdate());
  }
}

customElements.define('mixer-main', MixerMain);
