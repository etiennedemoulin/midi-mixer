import * as MCU from './mackie-control.cjs';
import _ from 'lodash';

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
  const displayName = getNamesFromPage(activePage, tracks.map(t => t.get('name')));
  MCU.setFaderDisplay(displayName, 'top');
  displayUserFader(activePage, tracks);

}

export function setFaderView(trackId, activePage, tracks) {
  const relIndex = (trackId - 1) % 8 + 1;
  const faderBytes = tracks.map(t => t.get('faderBytes'))[trackId]; // retrieve track value

  if (relIndex + (activePage * 8) === trackId) {
    MCU.setFader(`CH${relIndex}`, faderBytes);
    displayUserFader(activePage, tracks);
  } else if (trackId === 0) {
    MCU.setFader('MAIN', faderBytes);
  }
}

export async function onFaderMove(name, state, activePage, tracks) {
  const relIndex = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'].findIndex(e => e === name);
  const absIndex = (relIndex !== -1) ? (relIndex + 1 + activePage * 8) : 0;
  const track = tracks.find(t => t.get('trackId') === absIndex);
  let value = null;

  // handle unmapped faders
  if (track === undefined) {
    MCU.setFader(name, 0);
    return 0;
  }


  if (typeof state === 'number') {
    // this fader move is not a touch / release event
    value = state;
  } else {
    // this fader move is a touch / release event
    value = track.get('faderBytes');
  };

  if (track !== undefined) {
    track.set({
      faderBytes: value
    }, { source: 'midi' });
  };

  if (state === 'release') {
    // do something on release
  } else if (state === 'touch') {
    // do something on touch
  }
}

function _displayUserFader(activePage, tracks) {
  const displayValue = getValuesFromPage(activePage, tracks.map(t => t.get('faderUser')));
  MCU.setFaderDisplay(displayValue, 'bottom');
}

export const displayUserFader = _.throttle(_displayUserFader, 50, { 'trailing': true });
