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
      flex-orientation: horizontal;

      height: 400px;
      background-color: #232323;
    }

    .track {
      width: 100px;
      border: 2px solid #343434;
      background-color: #121212;
      padding: 4px;
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
      height: 200px;
    }

    sc-number {
      margin-top: 2px;
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

      return html`
        <div class="${classMap(classes)}">
          <p>channel: ${track.get('channel')}</p>
          <p class="name">${track.get('name') ? track.get('name') : '...'}</p>
          <sc-slider
            ?disabled=${track.get('disabled')}
            .value=${track.get('faderRaw')}
            orientation="vertical"
            @input=${e => track.set({ faderRaw: e.detail.value }, { source: 'web' })}
          ></sc-slider>
          <sc-number
            ?disabled=${track.get('disabled')}
            min=${track.get('faderRange') ? track.get('faderRange')[1][0] : 0}
            max=${track.get('faderRange') ? track.get('faderRange')[1][1] : 1}
            .value=${track.get('faderUser')}
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
