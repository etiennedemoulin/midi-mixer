import { LitElement, html, css } from 'lit';
import JSON5 from 'json5';

import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-select.js';
import '@ircam/sc-components/sc-editor.js';
import '@ircam/sc-components/sc-filetree.js';

class MixerEditor extends LitElement {
  static styles = css`
    :host {
      display: flex;
      min-height: calc(100vh - 30px);
      align-items: stretch;
    }

    :host > div {
      width: 200px;
    }

    p {
      margin: 0;
      height: 30px;
      line-height: 30px;
      text-indent: 8px;
    }

    sc-editor {
      width: calc(100% - 200px);
      height: inherit;
    }

  `;

  constructor() {
    super();

    this.globals = null;
    this.filesystem = null;
  }

  render() {
    super.render();

    const height = window.innerHeight;

    return html`
      <div>
        <p>${this.globals.get('configFilename').name}</p>
        <sc-filetree
          style="width:200px;height:${height - 30 - 30}"
          .value="${this.filesystem.getTree()}"
          @input=${e => this.globals.set({ configFilename: e.detail.value })}
        ></sc-filetree>
      </div>
      <sc-editor
        .value="${ this.globals.get('config') }"
        @change=${e => this.filesystem.writeFile(this.globals.get('configFilename').relPath, e.detail.value)}
        save-button
      ></sc-editor>

    `
  }

  connectedCallback() {
    super.connectedCallback();

    this.globals.onUpdate(() => this.requestUpdate());
  }
}

customElements.define('mixer-editor', MixerEditor);
