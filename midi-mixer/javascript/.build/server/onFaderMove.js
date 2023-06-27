import { Server } from '@soundworks/core/server.js';
export function onFaderMove(name, state) {
  const chName = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'];
  const index = chName.indexOf(name);
  console.log(name, state);
  const absFaderNumber = index !== -1 ? index + 1 + page * 8 : 'MAIN';
  const relFaderNumber = index !== -1 ? index + 1 : null;
  const tracks = Server.stateManager.getCollection('track');
  console.log('tracks________', tracks);
  if (midiConfig[absFaderNumber] !== undefined) {
    console.log('> send back value to fader', stuff++);
    // XT.setFaderRelease(`CH${relFaderNumber}`, true);
    XT.setFader(`CH${relFaderNumber}`, state);
    if (midiConfig[absFaderNumber].type === "linear") {
      const range = midiConfig[absFaderNumber].range;
      const sens = range[1] > range[0] ? 1 : -1;
      const raw = state / (device.fader.length - 1);
      const amplitude = Math.abs(range[1] - range[0]);
      const value = range[0] + sens * (raw * amplitude);
      if (typeof state === 'number') {
        midiConfig[absFaderNumber].value = value;
      }
    } else if (midiConfig[absFaderNumber].type === "volume") {
      const value = device.fader[state];
      if (typeof state === 'number') {
        midiConfig[absFaderNumber].value = value;
      }
    }
    const value = midiConfig[absFaderNumber].value;
    const patch = midiConfig[absFaderNumber].patch;
    let update = {};
    update[patch] = value;
    globals.set(update, {
      source: 'midi'
    });
  } else {
    XT.setFaderRelease(`CH${relFaderNumber}`, false);
    XT.setFader(`CH${relFaderNumber}`, 0);
  }
}
//# sourceMappingURL=./onFaderMove.js.map