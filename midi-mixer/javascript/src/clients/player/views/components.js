import { html } from 'lit';
import '@ircam/sc-components';
import _ from 'lodash';
import JSON5 from 'json5';

export function renderEmptyTrack(track) {
  return html`
    <sc-text readonly>track ${track.get('channel')} : empty</sc-text>
  `;
}

export function renderTrack(track) {
  const _setTrack = _.throttle(value => track.set(value, { source: 'web' }), 50, { 'trailing': true });

  return html`
    <div>
      <sc-text
        readonly
      >${`track ${track.get('channel')} : ${track.get('name')}`}</sc-text>
      <sc-slider
        value=${track.get('faderRaw')}
        @input=${e => _setTrack({ faderRaw: e.detail.value })}
      ></sc-slider>
      <sc-number
        min=${track.get('faderRange')[1][0]}
        max=${track.get('faderRange')[1][1]}
        value=${track.get('faderUser')}
        @input=${e => _setTrack({ faderUser: e.detail.value })}
      ></sc-number>
      <sc-toggle
        ?active=${track.get('mute')}
        @change=${e => track.set({ mute: e.detail.value })}
      ></sc-toggle>
    </div>
  `;
}

export function renderParams(globals, filesystem) {
  return html`
    <sc-text
      value=""
      readonly
    >midi input device</sc-text>
    <select
      @change=${e => globals.set({midiInName: e.target.value}, {source:'web'})}
    >
      ${globals.get('selectMidiIn').map(name => {
        return html`
          <option value="${name}" ?selected="${name === globals.get('midiInName')}">
            ${name}
          </option>`;
      })}
    </select>
    <sc-text
      readonly
    >midi output device</sc-text>
    <select
      @change=${e => globals.set({midiOutName: e.target.value}, {source:'web'})}
    >
      ${globals.get('selectMidiOut').map(name => {
        return html`
          <option value="${name}" ?selected="${name === globals.get('midiOutName')}">
            ${name}
          </option>`;
      })}
    </select>
    <sc-text
      value="controller"
      readonly
    ></sc-text>
    <select
      @change=${e => globals.set({controllerName: e.target.value}, {source: 'web'})}
    >
      ${globals.get('selectControllers').map(name => {
        return html`
          <option value="${name}" ?selected="${name === globals.get('controllerName')}">
            ${name}
          </option>`;
      })}
    </select>
    <sc-editor
      value="${JSON5.stringify(globals.get('config'), null, 2)}"
      @change=${e => filesystem.writeFile('example-1.json', e.detail.value)}
    ></sc-editor>
  `;
}
