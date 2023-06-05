import * as MCU from './mackie-control.cjs';

// total update : 8 faders + 2 displays
export async function setMixerView(activePage) {
  console.log();
  // what do I need
  // 8 faders values
  // 8 faders name
  //
  // console.log(currentValues);
  // need to compute the 8


}

// update only a fader
export function setFaderView(track, value, page) {
  if (typeof track === 'number') {
    const relIndex = (track - 1) % 8 + 1;
    if ( relIndex + (page * 8) === track ) {
      MCU.setFader(`CH${relIndex}`, value);
      MCU.setFaderDisplay(
        ['', '', '', '', '', '', '', ''], 'bottom');
    }
  } else if (track === 'MAIN') {
    // console.log(value);
    MCU.setFader('MAIN', value);
  }
}

