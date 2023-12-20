import JZZ from 'jzz';
import _ from 'lodash';
import { relToAbsChannel, absToRelChannel } from './helpers.js';

let resampling = null;

function log(str) {
  console.log(str);
}

export function onMidiOutFail() {
  throw new Error("> Error: fail opening midi out");
}

export function onMidiInFail() {
  throw new Error("> Error: fail opening midi in");
}

export function getMidiInDeviceList() {
  const selectMidiIn = [];
  JZZ().and(function() {
    for (let i = 0; i < this.info().inputs.length; i++) {
      selectMidiIn.push(this.info().inputs[i].name);
    }
  });
  return selectMidiIn;
}

export function getMidiOutDeviceList() {
  const selectMidiOut = [];
  JZZ().and(function() {
    for (let i = 0; i < this.info().outputs.length; i++) {
      selectMidiOut.push(this.info().outputs[i].name);
    }
  });
  return selectMidiOut;
}


function getNamesFromPage(activePage, names) {
  const returnArray = [];

  for (let i = 0; i < names.length; i++) {
    if (i > (activePage * 8) && i <= ((activePage + 1) * 8)) {
        returnArray.push(names[i]);
    }
  };
  if (returnArray.length === 0 || returnArray.every(r => r === null)) {
    return null;
  } else {
    return returnArray;
  }
}

function getValuesFromPage(activePage, faderUser) {
  const returnArray = [];

  for (let i = 0; i < faderUser.length; i++) {
    if (i > (activePage * 8) && i <= ((activePage + 1) * 8)) {
        returnArray.push(faderUser[i]);
    }
  };
  if (returnArray.length === 0 || returnArray.every(r => r === null)) {
    return null;
  } else {
    return returnArray;
  }
}


// total update : 8 faders + 2 displays
export async function setMixerView(activePage, midiOutPort, tracks) {
  clearTimeout(resampling);
  for (let absChannel = (activePage * 8) + 1; absChannel <= (activePage + 1) * 8; absChannel++) {
    const track = tracks.find(t => t.get('channel') === absChannel);
    const relChannel = absToRelChannel(absChannel);

    // track exist
    if (track && track.get('faderBytes')) {
      // track has fader value
      const faderBytes = track.get('faderBytes');
      sendFader(relChannel, faderBytes, midiOutPort);
    } else {
      sendFader(relChannel, [0, 0], midiOutPort);
    }
    if (track && track.get('mute') !== undefined) {
      const value = track.get('mute');
      sendMute(relChannel, value, midiOutPort);
    } else {
      sendMute(relChannel, false, midiOutPort);
    }
    if (track && track.get('meterBytes')) {
      const value = track.get('meterBytes');
      sendMeter(relChannel, value, midiOutPort);
    } else {
      sendMeter(relChannel, 0x0, midiOutPort);
    }
  }

  // update display
  const displayName = getNamesFromPage(activePage, tracks.map(t => t.get('name')));
  if (displayName) {
    const mcu = [240, 0, 0, 102, 20, 18, 0];
    const data = formatDisplay(displayName);
    const end = [247];
    midiOutPort.send(mcu.concat(data).concat(end));
    // console.log(mcu.concat(data).concat(end))
    // console.log(formatDisplay(displayName).length);
    // log(`> names ${displayName}`);
  }
  displayUserFader(activePage, midiOutPort, tracks);
}

export function setFaderView(absChannel, activePage, tracks, midiOutPort, updates) {
  const relChannel = absToRelChannel(absChannel);
  const track = tracks.find(t => t.get('channel') === absChannel);

  if (relChannel + (activePage * 8) === absChannel) {
    if (updates.faderBytes) {
      // update fader
      sendFader(relChannel, updates.faderBytes, midiOutPort);
      displayUserFader(activePage, midiOutPort, tracks);
    } else if (updates.mute !== undefined) {
      // update mute
      const value = updates.mute;
      sendMute(relChannel, value, midiOutPort);
    } else if (updates.meterBytes) {
      // update meter
      clearTimeout(resampling);
      sendMeter(relChannel, updates.meterBytes, midiOutPort);
      resampling = setInterval(() => {
        if (updates.meterBytes === 0) {
          clearTimeout(resampling);
          resampling = null;
        }
        sendMeter(relChannel, updates.meterBytes, midiOutPort);
      }, 1000);
    }
  } else if (absChannel === 0) {
    console.log(`update fader MAIN is not yet implemented`);
  }
}

function _displayUserFader(activePage, midiOutPort, tracks) {
  const displayValue = getValuesFromPage(activePage, tracks.map(t => t.get('faderUser')));
  if (displayValue) {
    const mcu = [240, 0, 0, 102, 20, 18, 56];
    const data = formatDisplay(displayValue);
    const end = [247];
    midiOutPort.send(mcu.concat(data).concat(end));
    // log(`> display dB: ${displayValue}`);
  }

}

export const displayUserFader = _.throttle(_displayUserFader, 50, { 'trailing': true });

export function resetMixerView(midiOutPort) {
  // @TODO - resetMixerView on quit server
  // faders
  for (let i = 1; i <= 8; i++) {
    sendFader(i, [0, 0], midiOutPort);
  }
  // meters
  for (let i = 1; i <= 8; i++) {
    sendMeter(i, 0x0, midiOutPort);
  }
  // mute
  for (let i = 1; i <= 8; i++) {
    sendMute(i, false, midiOutPort);
  }
}

function formatDisplay(array) {
  const formattedArray = [];
  const output = [];
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
        output.push(formattedArray[i][j].charCodeAt(0));
      }
    }
  } else {
    throw new Error("> more than 8 elements to display, abort");
  }
  return output;
}

export function sendMute(relChannel, value, midiOutPort) {
  if (relChannel > 0 && relChannel <= 8 && typeof value === 'boolean') {
    const cooked = value === true ? 127 : 0;
    midiOutPort.send([144, relChannel + 15, cooked]);
  } else {
    throw new Error('Channel is not in range');
  }
}

export function sendMeter(relChannel, value, midiOutPort) {
  if (relChannel > 0 && relChannel <= 8 && value >= 0x0 && value <= 0xF) {
    const channelBytes = ((relChannel - 1) << 4).toString(2);
    const meterBytes = value.toString(2);
    const cooked = parseInt(channelBytes, 2) + parseInt(meterBytes, 2);
    midiOutPort.send([0xD0, cooked]);
  } else {
    throw new Error('Channel is not in range');
  }
}

export function sendFader(relChannel, value, midiOutPort) {
  if (relChannel > 0 && relChannel <= 8 && value[0] >= 0 && value[0] <= 127 &&
    value[1] >= 0 && value[1] <= 127) {
    midiOutPort.send([relChannel + 223, value[1], value[0]])
  } else {
    throw new Error('Channel is not in range');
  }
}



// send display to MIDI
// f0 00 00 66 14 12 38 20 20 20 20 20 20 20 20 20 20 20 20 20 20 2d 33 35 2e 37 30 20 2d 32 33 2e 36 35 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 20 f7


// 240 0 0 102 20 18 MCU HEADER
// 56 BOTTOM LINE
// 32 32 32 32 32 32 32 32 32 32
// 32 32 32 32 45 51 53 46 55 48
// 32 45 50 51 46 54 53 32 32 32
// 32 32 32 32 32 32 32 32 32 32
// 32 32 32 32 32 32 32 32 32 32
// 32 32 32 32 32 32 (56 characters)
// 247 // end of sysex
