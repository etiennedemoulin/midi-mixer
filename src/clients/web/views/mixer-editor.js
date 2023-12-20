import { LitElement, html, css } from 'lit';
import JSON5 from 'json5';

import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-select.js';
import '@ircam/sc-components/sc-editor.js';
import '@ircam/sc-components/sc-button.js';

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

    this.core = null;
  }

  render() {
    super.render();

    const height = window.innerHeight;
    const config = this.core.get('config');
    return html`
      <div>
      </div>
      <sc-editor
        value="${ JSON.stringify(config.target, null, 2) }"
        @change="${e => {
          config.target = JSON.parse(e.detail.value);
          this.core.set({ config: config}, { source: 'web' })
        }}"
      ></sc-editor>

    `
  }

  connectedCallback() {
    super.connectedCallback();

    this.core.onUpdate(() => this.requestUpdate());
  }
}

customElements.define('mixer-editor', MixerEditor);
