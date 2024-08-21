import { LitElement, html, css, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import JSON5 from 'json5';

import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-number.js';
import '@ircam/sc-components/sc-toggle.js';

import { rawToUser, userToRaw } from '../../../utils/basis-conversions.js';

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
        active: track.get('touched'),
      };

      const mapping = track.get('mapping');


      const faderTable = mapping.fader ? track.get(`${mapping.fader}_scale`) : [0,1];

      const faderTableBoundaries = [faderTable[0], faderTable[faderTable.length - 1]];
      faderTableBoundaries.sort((a, b) => a - b);

      return html`
        <div class="${classMap(classes)}">
          <div>
            <p>channel: ${track.get('channel')}</p>
            <p class="name">${track.get('name') ? track.get('name') : '...'}</p>
          </div>
          ${mapping.fader ? html`
            <sc-slider
              relative
              ?disabled=${track.get('disabled')}
              .value=${track.get(`${mapping.fader}_raw`)}
              orientation="vertical"
              @input=${e => track.set({ [`${mapping.fader}_raw`]: e.detail.value }, { source:"web" })}
            ></sc-slider>
          ` : html`
            <sc-slider
              ?disabled=${true}
              .value=${0}
              orientation="vertical"
            ></sc-slider>
          `
          }
          <div>
            ${mapping.fader ? html`
              <sc-number
                ?disabled=${track.get('disabled')}
                min=${faderTableBoundaries[0]}
                max=${faderTableBoundaries[1]}
                .value=${rawToUser(track.get(`${mapping.fader}_raw`), faderTable)}
                @input=${e => track.set({ [`${mapping.fader}_raw`]: userToRaw(e.detail.value, faderTable) }, { source: "web" })}
              ></sc-number>
            ` : html`
              <sc-number
                ?disabled=${true}
                .value=${0}
              ></sc-number>
            `}
            <div class="mute">
              <p>mute:</p>
              ${mapping.mute ? html`
              <sc-toggle
                ?disabled=${track.get('disabled')}
                ?active=${track.get(`${mapping.mute}_raw`)}
                @change=${e => track.set({ [`${mapping.fader}_raw`]: e.detail.value }, { source: "web" })}
              ></sc-toggle>` : html`
              <sc-toggle
                ?disabled=${true}
                ?active=${false}
              ></sc-toggle>
              `
            }
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
