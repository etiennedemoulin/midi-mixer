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
        active: track.get('fader').touched,
      };

      const fader = track.get('fader');
      const meter = track.get('meter');
      const mute = track.get('mute');
      const faderUser = Math.round(fader.user * 100) / 100;
      const meterUser = Math.round(meter.user * 100) / 100;

      return html`
        <div class="${classMap(classes)}">
          <div>
            <p>channel: ${track.get('channel')}</p>
            <p class="name">${track.get('name') ? track.get('name') : '...'}</p>
            <p class="name">${fader.oscAddress ? fader.oscAddress : '...'}</p>
            <p class="name">${meterUser ? meterUser : '...'}</p>
            <sc-slider
              style="height:20px"
              .value=${meter.raw}
            ></sc-slider>
          </div>
          <div class="mute">
            <p>mute:</p>
            <sc-toggle
              ?disabled=${track.get('disabled')}
              ?active=${mute.user}
              @change=${e => {
                mute.user = e.detail.value;
                track.set({mute: mute}, {source:'web'});
              }}
            ></sc-toggle>
          </div>
          <sc-slider
            relative
            ?disabled=${track.get('disabled')}
            .value=${fader.raw}
            orientation="vertical"
            @input=${e => {
              fader.raw = e.detail.value;
              track.set({fader: fader}, {source:'web'});
            }}
          ></sc-slider>
          <div>
            <sc-number
              ?disabled=${track.get('disabled')}
              min=${fader.range ? fader.range[1][0] : 0}
              max=${fader.range ? fader.range[1][1] : 1}
              .value=${ faderUser }
              @input=${e => {
                fader.user = e.detail.value;
                track.set({fader: fader}, {source:'web'});
              }}
            ></sc-number>
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
