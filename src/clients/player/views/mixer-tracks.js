import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import JSON5 from 'json5';

import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-number.js';
import '@ircam/sc-components/sc-toggle.js';

class MixerTracks extends LitElement {
  static styles = css`
    :host {
      display: flex;
      min-height: calc(100vh - 30px);
      align-items: stretch;
      background-color: #232323;
    }

    .track {
      width: 80px;
      border: 2px solid #343434;
      background-color: #121212;
      padding: 4px;
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      flex-direction: column;
    }

    .track.disabled {
      opacity: 0.6;
    }

    .track.active {
      background-color: pink;
    }

    p {
      margin: 0 0 2px;
      height: 20px;
    }

    .name {
      font-style: italic;
    }

    sc-slider {
      width: 100%;
      height: 100%;
    }

    sc-number {
      margin-top: 2px;
      width: 100%;
    }

    .mute {
      margin-top: 2px;
      display: flex;
    }

    .mute p {
      font-size: 10px;
      width: 60px;
      height: 20px;
      line-height: 20px;
    }

    .mute sc-toggle {
      width: 40px;
      height: 20px;
    }
  `;

  constructor() {
    super();
    this.tracks = null;
  }

  render() {
    return this.tracks.map(track => {
      const classes = {
        track: true,
        disabled: track.get('disabled'),
        active: track.get('faderTouched'),
      };

      const faderUser = Math.round(track.get('faderUser') * 100) / 100;

      return html`
        <div class="${classMap(classes)}">
          <div>
            <p>channel: ${track.get('channel')}</p>
            <p class="name">${track.get('name') ? track.get('name') : '...'}</p>
            <p class="name">${track.get('oscAddress') ? track.get('oscAddress') : '...'}</p>
          </div>
          <sc-slider
            relative
            ?disabled=${track.get('disabled')}
            .value=${track.get('faderRaw')}
            orientation="vertical"
            @input=${e => track.set({ faderRaw: e.detail.value }, { source: 'web' })}
          ></sc-slider>
          <div>
            <sc-number
              ?disabled=${track.get('disabled')}
              min=${track.get('faderRange') ? track.get('faderRange')[1][0] : 0}
              max=${track.get('faderRange') ? track.get('faderRange')[1][1] : 1}
              .value=${ faderUser }
              @input=${e => track.set({ faderUser: e.detail.value }, { source: 'web' })}
            ></sc-number>
            <div class="mute">
              <p>mute:</p>
              <sc-toggle
                ?disabled=${track.get('disabled')}
                ?active=${track.get('mute')}
                @change=${e => track.set({ mute: e.detail.value }, { source: 'web' })}
              ></sc-toggle>
            </div>
          </div>
        </div>
      `;
    });
  }

  connectedCallback() {
    super.connectedCallback();

    this.tracks.onUpdate(() => this.requestUpdate());
    this.tracks.onAttach(() => this.requestUpdate());
    this.tracks.onDetach(() => this.requestUpdate());
  }
}

customElements.define('mixer-tracks', MixerTracks);
