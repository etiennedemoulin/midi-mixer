import JZZ from 'jzz';
import _ from 'lodash';

function log(str) {
  console.log(str);
}

export function onMidiOutFail() {
  throw new Error("> Error: fail opening midi out");
}

export function onMidiInFail() {
  throw new Error("> Error: fail opening midi in");
}

export function getMidiDeviceList(info, globals) {
  const selectMidiOut = [];
  const selectMidiIn = [];
  for (let i = 0; i < info.outputs.length; i++) {
    selectMidiOut.push(info.outputs[i].name);
    // selectMidiOut[i] = new Option(info.outputs[i].name);
  }
  for (let i = 0; i < info.inputs.length; i++) {
    selectMidiIn.push(info.inputs[i].name);
    // selectMidiIn[i] = new Option(info.inputs[i].name);
  }
  globals.set({ selectMidiIn: selectMidiIn });
  globals.set({ selectMidiOut: selectMidiOut });
}


function getNamesFromPage(activePage, names) {
  const returnArray = [];

  for (let i = 0; i < names.length; i++) {
    if (i > (activePage * 8) && i <= ((activePage + 1) * 8)) {
        returnArray.push(names[i]);
    }
  };

  return returnArray;
}

function getValuesFromPage(activePage, faderUser) {
  const returnArray = [];

  for (let i = 0; i < faderUser.length; i++) {
    if (i > (activePage * 8) && i <= ((activePage + 1) * 8)) {
        returnArray.push(faderUser[i]);
    }
  };
  return returnArray;
}


// total update : 8 faders + 2 displays
export async function setMixerView(activePage, midiOutPort, tracks) {
  const channels = tracks.map(t => t.get('channel')).sort();
  // const lastBank = Math.ceil((channels[channels.length - 1] / 8) * 8);

  tracks.forEach(track => {
    const absChannel = track.get('channel');
    const relChannel = (absChannel - 1) % 8 + 1;

    if (absChannel > (activePage * 8) && absChannel <= ((activePage + 1) * 8) && absChannel !== 0) {
      if (track.get('faderBytes') !== null) {
        const faderBytes = track.get('faderBytes');
        midiOutPort.send([relChannel + 223, faderBytes[1], faderBytes[0]]);
      }
    }
  });

  // update display
  const displayName = getNamesFromPage(activePage, tracks.map(t => t.get('name')));
  log(`> names ${displayName}`);
  displayUserFader(activePage, tracks);

}

export function setFaderView(channel, activePage, tracks, midiOutPort) {
  // @todo send 'release' message when no moves
  const relIndex = (channel - 1) % 8 + 1;
  const track = tracks.find(t => t.get('channel') === channel);
  const faderBytes = track.get('faderBytes');

  if (faderBytes) {
    if (relIndex + (activePage * 8) === channel) {
      midiOutPort.send([channel+223, faderBytes[1], faderBytes[0]])
      displayUserFader(activePage, tracks);
    } else if (channel === 0) {
      log(`> set fader MAIN: ${faderBytes}`);
    }
  }
}

function _displayUserFader(activePage, tracks) {
  const displayValue = getValuesFromPage(activePage, tracks.map(t => t.get('faderUser')));
  log(`> display dB: ${displayValue}`);
}

export const displayUserFader = _.throttle(_displayUserFader, 50, { 'trailing': true });




// send display to MIDI
// f0 00 00 66 14 12 38 20 20 20 20 20 20 20 20 20 20 20 20 20 20 2d 33 35 2e 37 30 20 2d 32 33 2e 36 35 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 f7


// set decimal to msb/lsb
    // const msb = value >> 7;
    // const lsb = value & 0b00000001111111;


//     let val = (msb << 7 | lsb);
