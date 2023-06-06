import * as MCU from './mackie-control.cjs';

function getNamesFromPage(activePage, names) {
  const returnArray = [];
  for (let i = 0; i < names.length; i++) {
    if (i > (activePage * 8) && absIndex <= ((activePage + 1) * 8) && absIndex !== 0) {
        returnArray.push(names[i]);
    }
  };
  return returnArray;
}

function getValuesFromPage(activePage, faderUser) {
  const returnArray = [];
  for (let i = 0; i < faderUser.length; i++) {
    if (i > (activePage * 8) && absIndex <= ((activePage + 1) * 8) && absIndex !== 0) {
        returnArray.push(faderUser[i]);
    }
  };
  return returnArray;
}



// total update : 8 faders + 2 displays
export async function setMixerView(activePage, trackCollection) {

  const tracksId = trackCollection.get('trackId');
  const lastBankId = Math.ceil((tracksId[tracksId.length - 1] / 8) * 8);

  trackCollection.forEach(track => {
    const absIndex = track.get('id');
    const relIndex = (absIndex - 1) % 8 + 1;
    if (absIndex > (activePage * 8) && absIndex <= ((activePage + 1) * 8) && absIndex !== 0) {
      if (track.get('trackId') !== null) {
        MCU.setFader(`CH${relIndex}`, track.get('fadersBytes'));
      } else {
        MCU.setFader(`CH${relIndex}`, 0);
      }
    }
  });

  // update display
  const displayValue = getValuesFromPage(activePage, trackCollection.get('faderUser'));
  const displayName = getNamesFromPage(activePage, trackCollection.get('name'));
  MCU.setFaderDisplay(displayName, 'top');
  MCU.setFaderDisplay(displayValue, 'bottom');

}


export function setFaderView(updates, activePage, trackCollection) {
  const trackId = updates.trackId;
  const relIndex = (trackId - 1) % 8 + 1;
  if (relIndex + (activePage * 8) === trackId) {
    MCU.setFader(`CH${relIndex}`, updates.faderBytes);
    const displayValue = getValuesFromPage(activePage, trackCollection.get('faderUser'));
    MCU.setFaderDisplay(displayValue, 'bottom');
  } else if (track === 'MAIN') {
    MCU.setFader('MAIN', updates.faderBytes);
  }
}

