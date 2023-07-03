import JZZ from 'jzz';
import _ from 'lodash';
import { relToAbsChannel, absToRelChannel } from './helpers.js';

function log(str) {
  console.log(str);
}

export function onMidiOutFail() {
  throw new Error("> Error: fail opening midi out");
}

export function onMidiInFail() {
  throw new Error("> Error: fail opening midi in");
}

export function getMidiDeviceList() {
  const selectMidiOut = [];
  const selectMidiIn = [];
  JZZ().and(function() {
    for (let i = 0; i < this.info().outputs.length; i++) {
      selectMidiOut.push(this.info().outputs[i].name);
    }
    for (let i = 0; i < this.info().inputs.length; i++) {
      selectMidiIn.push(this.info().inputs[i].name);
    }
  });
  return { selectMidiIn, selectMidiOut };
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

  for (let absChannel = (activePage * 8) + 1; absChannel <= (activePage + 1) * 8; absChannel++) {
    const track = tracks.find(t => t.get('channel') === absChannel);
    const relChannel = absToRelChannel(absChannel);
    if (track && track.get('faderBytes')) {
      const faderBytes = track.get('faderBytes');
      midiOutPort.send([relChannel + 223, faderBytes[1], faderBytes[0]]);
    } else {
      midiOutPort.send([relChannel + 223, 0, 0]);
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
    log(`> names ${displayName}`);
  }
  displayUserFader(activePage, tracks);

}

export function setFaderView(absChannel, activePage, tracks, midiOutPort) {
  const relChannel = absToRelChannel(absChannel);
  const track = tracks.find(t => t.get('channel') === absChannel);
  const faderBytes = track.get('faderBytes');

  if (faderBytes) {
    if (relChannel + (activePage * 8) === absChannel) {
      midiOutPort.send([relChannel+223, faderBytes[1], faderBytes[0]])
      displayUserFader(activePage, tracks);
    } else if (absChannel === 0) {
      log(`> set fader MAIN: ${faderBytes}`);
    }
  }
}

function _displayUserFader(activePage, tracks) {
  const displayValue = getValuesFromPage(activePage, tracks.map(t => t.get('faderUser')));
  if (displayValue) {
    log(`> display dB: ${displayValue}`);
  }

}

export const displayUserFader = _.throttle(_displayUserFader, 50, { 'trailing': true });

export function resetMixerView(midiOutPort) {
  for (let i = 0; i < 7; i++) {
    midiOutPort.send([i+224, 0, 0]);
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


    // const sysEx = 240;
    // const mackieID = [0,0,102];
    // const MCU_ID = 20;
    // const LCD = 18;
    // let element = [];
    // let listText = '';


    // // sanitize textArray
    // textArray = textArray.map(e => (e === null) ? '' : e);


    // // console.log(textArray)

    // switch (line) {
    //     case 'top':
    //         element = [240, 0, 0, 102, 20, 18, 0];
    //         break;
    //     case 'bottom':
    //         element = [240, 0, 0, 102, 20, 18, 56];
    //         break;
    //     default:
    // }

    // if (textArray.length !== 8) {
    //     for (let i=textArray.length;i<8;i++) {
    //         textArray.push('');
    //     }
    // }

    // if (textArray.length !== 8) {
    //     textArray = textArray.slice(0,8);
    //     console.log("attention list will be trimed");
    // }

    // for (i in textArray) {
    //     if (typeof textArray[i] === 'string') {
    //         listText = textArray[i].split('');
    //     } else if (typeof textArray[i] === 'number') {
    //         const thisString = textArray[i].toFixed(2).toString();
    //         listText = thisString.split('')
    //     }
    //     for (let i=0;i<7;i++) {
    //         if (listText[i] !== undefined) {
    //             // console.log(listText[i]);
    //             element.push(listText[i].charCodeAt(0));
    //         }
    //         else {
    //             element.push(32);
    //         }
    //     }
    // }

    // element.push(247);
    // sendMidi(element);
