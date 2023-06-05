import * as MCU from './mackie-control.cjs';

export function setFaderView(midiConfig) {
  const keys = Object.keys(midiConfig);
  const filteredKeys = keys.filter(e => { return e !== 'MAIN' });
  const lastIndex = parseInt(filteredKeys.slice(-1)[0]);

  const iMax = Math.ceil(lastIndex/8) * 8;

  // reset sub-view
  bankFaderValue = [];
  bankFaderName = [];

  // special case for Main fader
  if (midiConfig['MAIN'] !== undefined) {
    XT.setFader('MAIN', computeFaderValue('MAIN'));
  } else {
    XT.setFader('MAIN', 0);
  }

  // normal case
  for (let i=1;i<=iMax;i++) {
      if (i > (page*8) && i <= ((page+1)*8)) {
          if (midiConfig[i] !== undefined) {

            // fader has a value
            const faderIndex = (i - 1) % 8 + 1;
            const destination = midiConfig[i].patch;
            const value = midiConfig[i].value
            const name = midiConfig[i].name;

            // set value
            XT.setFader(`CH${faderIndex}`, computeFaderValue(i));

            // subview for displayed faders
            bankFaderValue.push(value);
            bankFaderName.push(name);

          } else {
            // fader has no value
            const faderIndex = (i - 1) % 8 + 1;

            XT.setFader(`CH${faderIndex}`, 0);

            bankFaderName.push('');
            bankFaderValue.push('');
          }
      }
  }
  // update display
  // XT.setFaderDisplay(bankFaderName,'top');
  // XT.setFaderDisplay(bankFaderValue,'bottom');
}

// total update : 8 faders + 2 displays
export function setMixerView(page) {

}

// update only a fader
export function setFaderView(track, value, page) {
  if (typeof track === 'number') {
    const relIndex = (track - 1) % 8 + 1;
    if ( relIndex + (page * 8) === track ) {
      console.log(value);
      MCU.setFader(`CH${relIndex}`, value);
      MCU.setFaderDisplay(
        ['', '', '', '', '', '', '', ''], 'bottom');
    }
  } else if (track === 'MAIN') {
    // console.log(value);
    MCU.setFader('MAIN', value);
  }
}


