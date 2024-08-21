import JZZ from 'jzz';
import { getMidiDeviceList } from '../utils/get-midi-device-list.js';

class MidiService {
  constructor(node) {
    this.node = node;
    this.tracks;
    this.globals;


    this.init();
    this.midiIn;
    this.midiOut;
    this.createMidiServer = this.createMidiServer.bind(this);
    this.onMidiUpdate = this.onMidiUpdate.bind(this);
    this.onTrackUpdate = this.onTrackUpdate.bind(this);
  }

  async init() {
    this.tracks = await this.node.stateManager.getCollection('tracks');
    this.globals = await this.node.stateManager.attach('globals');
    const midiDeviceList = getMidiDeviceList();
    this.globals.set({ availableMidiPorts: midiDeviceList });

    this.globals.onUpdate(this.createMidiServer);
    this.tracks.forEach(track => {
      track.onUpdate((updates, values, context) => {
        this.onTrackUpdate(updates, track, context);
      });
    });

    // init with default values
    this.globals.set({ midiInPort: midiDeviceList.inputs[0], midiOutPort: midiDeviceList.outputs[0]});

  }

  createMidiServer(updates) {
    if ('midiInPort' in updates) {
      this.midiIn = JZZ({ sysex: true }).openMidiIn(updates.midiInPort).or(this.onMidiInFail).and(function() {
        if (this.midiIn) {
          this.midiIn.close();
        }
        console.log(`- Midi Input Device: ${this.name()}`);
      });
      this.midiIn.connect(JZZ.Widget({ _receive: this.onMidiUpdate }));
    }

    if ('midiOutPort' in updates) {
      this.midiOut = JZZ({ sysex: true }).openMidiOut(updates.midiOutPort).or(this.onMidiOutFail).and(function() {
        if (this.midiOut) {
          this.resetMixerView();
          this.midiOut.close();
        }
        console.log(`- Midi Output Device: ${this.name()}`);
      })
    }
  }

  onMidiUpdate(msg) {

  }

  onTrackUpdate(msg) {

  }

  onMidiOutFail() {
    throw new Error("> Error: fail opening midi out");
  }

  onMidiInFail() {
    throw new Error("> Error: fail opening midi in");
  }


}


export default MidiService;
