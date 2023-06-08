import * as MCU from './mackie-control.cjs';

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
export async function setMixerView(activePage, tracks) {
  const tracksId = tracks.map(t => t.get('trackId')).sort();
  const lastBankId = Math.ceil((tracksId[tracksId.length - 1] / 8) * 8);

  tracks.forEach(track => {
    const absIndex = track.get('id');
    const relIndex = (absIndex - 1) % 8 + 1;

    if (absIndex > (activePage * 8) && absIndex <= ((activePage + 1) * 8) && absIndex !== 0) {
      if (track.get('trackId') !== null) {
        MCU.setFader(`CH${relIndex}`, track.get('faderBytes'));
      } else {
        MCU.setFader(`CH${relIndex}`, 0);
      }
    }
  });

  // update display
  const displayValue = getValuesFromPage(activePage, tracks.map(t => t.get('faderUser')));
  const displayName = getNamesFromPage(activePage, tracks.map(t => t.get('name')));
  MCU.setFaderDisplay(displayName, 'top');
  MCU.setFaderDisplay(displayValue, 'bottom');

}

export function setFaderView(trackId, activePage, tracks) {
  const relIndex = (trackId - 1) % 8 + 1;
  const faderBytes = tracks.map(t => t.get('faderBytes'))[trackId]; // retrieve track value
  // console.log(faderBytes);

  if (relIndex + (activePage * 8) === trackId) {
    MCU.setFader(`CH${relIndex}`, faderBytes);
    const displayValue = getValuesFromPage(activePage, tracks.map(t => t.get('faderUser')));
    MCU.setFaderDisplay(displayValue, 'bottom');
  } else if (trackId === 0) {
    MCU.setFader('MAIN', faderBytes);
  }
}

