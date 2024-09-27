import { LitElement, html, css } from 'lit';
import JSON5 from 'json5';

import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-select.js';
import '@ircam/sc-components/sc-editor.js';
import '@ircam/sc-components/sc-filetree.js';

import '@soundworks/plugin-scripting/components/sw-plugin-scripting.js';

class MixerEditor extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: calc(100vh - 30px);
      align-items: stretch;
    }

    p {
      margin: 0;
      height: 30px;
      line-height: 30px;
      text-indent: 8px;
    }

    sw-plugin-scripting {
      height: 500px;
    }

  `;

  constructor() {
    super();

    this.globals = null;
    this.scripting = null;
  }

  render() {
    super.render();

    const height = window.innerHeight;
    // const mod = await import(`../../${globals.get('config').path}`);
    // const appConfig = mod.default;
    const appConfig = "pouet";

    return html`
      <p>${this.globals.get('config').name}</p>
      <div style="padding-bottom: 4px;">
        <sc-text>midi in:</sc-text>
        <sc-select
          .options=${this.globals.get('availableMidiPorts').inputs}
          @change=${e => this.globals.set({midiInPort: e.detail.value})}
          .value=${this.globals.get('midiInPort')}
        ></sc-select>
      </div>
      <div style="padding-bottom: 4px;">
        <sc-text>midi out:</sc-text>
        <sc-select
          .options=${this.globals.get('availableMidiPorts').outputs}
          @change=${e => this.globals.set({midiOutPort: e.detail.value})}
          .value=${this.globals.get('midiOutPort')}
        ></sc-select>
      </div>
      <div style="padding-bottom: 4px;">
        <sc-text>Mapping:</sc-text>
      </div>
      <div>
        <sw-plugin-scripting .plugin=${this.scripting}></sw-plugin-scripting>
      <div>
    `
  }

  connectedCallback() {
    super.connectedCallback();

    this.globals.onUpdate(() => this.requestUpdate());
  }
}

customElements.define('mixer-editor', MixerEditor);
