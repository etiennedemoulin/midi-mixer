import JZZ from 'jzz';
import { getMidiDeviceList } from '../../utils/get-midi-device-list.js';
import { bytesToRaw, rawToBytes, rawToUser, relToAbsChannel, absToRelChannel } from '../../utils/basis-conversions.js';
import _ from 'lodash';

const FADER_TOUCH_MSG = [104, 105, 106, 107, 108, 109, 110, 111];
const FADER_CONTROL_MSG = [224, 225, 226, 227, 228, 229, 230, 231];

class MidiService {
  constructor(node) {
    this.node = node;
    this.tracks;
    this.globals;


    this.init();
    this.midiIn;
    this.midiOut;
    this.onGlobalsUpdate = this.onGlobalsUpdate.bind(this);
    this.onMidiUpdate = _.throttle(
      this.onMidiUpdate.bind(this),
      20,
      { 'trailing': true }
    );
    this.onTrackUpdate = this.onTrackUpdate.bind(this);
  }

  async init() {
    this.tracks = await this.node.stateManager.getCollection('tracks');
    this.globals = await this.node.stateManager.attach('globals');

    const midiDeviceList = getMidiDeviceList();
    this.globals.set({ availableMidiPorts: midiDeviceList });

    this.globals.onUpdate(this.onGlobalsUpdate, true);
    this.tracks.onUpdate(this.onTrackUpdate);

    // init with default values
    this.globals.set({
      midiInPort: midiDeviceList.inputs[31],
      midiOutPort: midiDeviceList.outputs[32]
    });

  }

  async close() {
    await this.tracks.detach();
    await this.globals.detach();

    if (this.midiIn) {
      await this.midiIn.close();
    }

    if (this.midiOut) {
      await this.resetMixer();
      await this.midiOut.close();
    }
  }

  async onGlobalsUpdate(updates) {
    if ('midiInPort' in updates && updates.midiInPort) {
      if (this.midiIn) {
        await this.midiIn.close();
      }

      this.midiIn = await JZZ({ sysex: true })
        .openMidiIn(updates.midiInPort)
        .or(() => { throw new Error("> Error: fail opening midi in"); })

      this.midiIn.connect(JZZ.Widget({ _receive: this.onMidiUpdate }));
      console.log(`- Midi Input Device: ${this.midiIn.name()}`);
    }

    if ('midiOutPort' in updates && updates.midiOutPort) {
      if (this.midiOut) {
        await this.resetMixer();
        await this.midiOut.close();
      }

      this.midiOut = await JZZ({ sysex: true })
        .openMidiOut(updates.midiOutPort)
        .or(() => { throw new Error("> Error: fail opening midi out"); });

      console.log(`- Midi Output Device: ${this.midiOut.name()}`);
      this.setMixerView();
    }

    if ('activePage' in updates) {
      this.setMixerView();
    }
  }

  onMidiUpdate(msg) {
    if (FADER_TOUCH_MSG.includes(msg.getNote())) {
      const relChannel = msg.getNote() - 103;
      const absChannel = relToAbsChannel(relChannel, this.globals.get('activePage'));
      const track = this.tracks.find(t => t.get('channel') === absChannel);

      if (track && track.get('disabled') === false) {
        track.set({
          touched: msg.isNoteOn() ? true : false,
        }, { source: 'midi' });
      }
    }

    if (FADER_CONTROL_MSG.includes(msg[0])) {
      // parse fader value
      const relChannel = msg[0] - 223
      const absChannel = relToAbsChannel(
        relChannel,
        this.globals.get('activePage')
      );
      const track = this.tracks.find(t => t.get('channel') === absChannel);

      if (track && track.get('disabled') === false) {
        // compute fader
        const faderName = track.get('mapping').fader;

        track.set({
          [`${faderName}_raw`]: bytesToRaw(msg[1], msg[2]),
        }, { source: 'midi' });
      }
    }

    if (msg.isNoteOn() && msg.getNote() === 46) {
      this.pageUp();
    }

    if (msg.isNoteOn() && msg.getNote() === 47) {
      this.pageDown();
    }

  }

  pageUp() {
    const channels = this.tracks.map(t => t.get('channel'));
    const lastFader = channels[channels.length - 1];
    const activePage = this.globals.get('activePage');
    const lastPage = Math.floor((lastFader - 1) / 8);

    if (activePage < lastPage) {
      this.globals.set({
        activePage: activePage + 1
      }, { source: 'midi' });
    }
  }

  pageDown() {
    const activePage = this.globals.get('activePage');

    if (activePage > 0) {
      this.globals.set({
        activePage: activePage - 1
      }, { source: 'midi' });
    }
  }

  onTrackUpdate(track, updates, context) {
    // console.log(`update LCD screen`);
    const mapping = track.get('mapping');
    const activePage = this.globals.get('activePage');

    // update channel values
    const values = [];
    this.tracks.forEach(track => {
      const mapping = track.get('mapping');
      if (mapping && mapping.fader) {
        const raw = track.get(`${mapping.fader}_raw`);
        const scale = track.get(`${mapping.fader}_scale`);
        const value = rawToUser(raw, scale);
        values.push(value);
      } else {
        values.push(null);
      }
    })

    const updatedValues = [];

    for (let i = 0; i < values.length; i++) {
      if (i > (activePage * 8) && i <= ((activePage + 1) * 8)) {
          updatedValues.push(values[i]);
      }
    };
    if (updatedValues.length === 0 || updatedValues.every(r => r === null)) {
      return null;
    } else {
      this.updateDisplay(updatedValues, 'bottom');
    }


    if (context.source === 'midi') {
      return;
    }

    if (!this.midiIn || !this.midiOut) {
      throw new Error("midi is not initialised");
      return;
    }

    const absChannel = track.get('channel');
    const relChannel = absToRelChannel(absChannel);

    if (relChannel + (activePage * 8) === absChannel) {
      // parse parameter
      const parameterNames = this.globals.get('parameterNames');
      const parameterName = Object.keys(updates)[0].split('_')[0];
      if (!parameterNames.includes(parameterName)) {
        return;
      }

      const mapping = track.get('mapping');
      const parameterMapping = Object.keys(mapping).find(key =>
        mapping[key] === parameterName);

      switch (parameterMapping) {
        case 'fader':
          this.updateFader(relChannel, updates[`${parameterName}_raw`]);
          break;
        default:
          console.log(`${parameterName} is not implemented`);
      }
    }

  }

  setMixerView() {
    if (!this.midiOut) {
      return;
    }

    const activePage = this.globals.get('activePage');
    for (let absChannel = (activePage * 8) + 1; absChannel <= (activePage + 1) * 8; absChannel++) {
      const track = this.tracks.find(t => t.get('channel') === absChannel);
      const relChannel = absToRelChannel(absChannel);

      if (track) {
        const mapping = track.get('mapping');
        if (mapping && mapping.fader) {
          const faderValue = track.get(`${mapping.fader}_raw`);
          this.updateFader(relChannel, faderValue);
        } else {
          this.updateFader(relChannel, 0);
        }
      } else {
        this.updateFader(relChannel, 0);
      }
    }

    // update display

    // update channel names
    const names = this.tracks.map(t => t.get('name'));
    const updatedNames = [];

    for (let i = 0; i < names.length; i++) {
      if (i > (activePage * 8) && i <= ((activePage + 1) * 8)) {
          updatedNames.push(names[i]);
      }
    };
    if (updatedNames.length === 0 || updatedNames.every(r => r === null)) {
      return null;
    } else {
      this.updateDisplay(updatedNames, 'top');
    }

    // update channel values
    const values = [];
    this.tracks.forEach(track => {
      const mapping = track.get('mapping');
      if (mapping && mapping.fader) {
        const raw = track.get(`${mapping.fader}_raw`);
        const scale = track.get(`${mapping.fader}_scale`);
        const value = rawToUser(raw, scale);
        values.push(value);
      } else {
        values.push(null);
      }
    })

    const updatedValues = [];

    for (let i = 0; i < values.length; i++) {
      if (i > (activePage * 8) && i <= ((activePage + 1) * 8)) {
          updatedValues.push(values[i]);
      }
    };
    if (updatedValues.length === 0 || updatedValues.every(r => r === null)) {
      return null;
    } else {
      this.updateDisplay(updatedValues, 'bottom');
    }

  }

  updateChannelNames(activePage) {
    // this function return array of names for the active page
    const names = this.tracks.map(t => t.get('name'));
    const returnArray = [];

    for (let i = 0; i < names.length; i++) {
      if (i > (activePage * 8) && i <= ((activePage + 1) * 8)) {
          returnArray.push(names[i]);
      }
    };
    if (returnArray.length === 0 || returnArray.every(r => r === null)) {
      return null;
    } else {
      // here send
      this.updateDisplay(returnArray, 'top');
      return returnArray;
    }

  }

  updateFader(channel, value) {
    const faderBytes = rawToBytes(value);
    this.midiOut.send([channel + 223, faderBytes[0], faderBytes[1]]);
  }

  updateDisplay(array, line = 'bottom') {
    // line is top / bottom

    const formattedArray = [];
    const data = [];
    array = array.map(e => e !== null ? e : '');
    if (array.length <= 8) {
      for (let i = array.length; i < 8; i++) {
        array.push('');
      }
      // prepare list as string
      array.forEach(char => {
        if (typeof char === 'string') {
          const formattedChar = char.split('');
          for (let i = formattedChar.length; i < 7; i++) {
            formattedChar.push(' ');
          }
          formattedArray.push(formattedChar);
        } else if (typeof char === 'number') {
          const formattedChar = char.toFixed(2).toString().split('');
          for (let i = formattedChar.length; i < 7; i++) {
            formattedChar.push(' ');
          }
          formattedArray.push(formattedChar);
        }
      });
      // compute ascii codes
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 7; j++) {
          data.push(formattedArray[i][j].charCodeAt(0));
        }
      }
    } else {
      throw new Error("> more than 8 elements to display, abort");
    }

    let mcu;
    switch (line) {
      case 'top':
        mcu = [240, 0, 0, 102, 20, 18, 0];
        break;
      case 'bottom':
        mcu = [240, 0, 0, 102, 20, 18, 56];
        break;
    }

    this.midiOut.send(mcu.concat(data).concat([247]));
  }

  async resetMixer() {
    // clean screen
    const emptyDisplay = new Array(8).fill(null);
    this.updateDisplay(emptyDisplay, 'top');
    this.updateDisplay(emptyDisplay, 'bottom');
    // reset faders
    for (let i = 0; i < 8; i++) {
      await this.midiOut.send([i + 224, 0, 0]);
    }

    // let's wait a bit so that we don't mixup message when config is updated
    // await new Promise(resolve => setTimeout(resolve, 200));
  }
}


export default MidiService;
