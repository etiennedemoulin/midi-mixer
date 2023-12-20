import { getUserFromRawFader, getRawFromUserFader, getBytesFromRawFader, getRawFromBytesFader, getRawFromUserMeter, getBytesFromRawMeter, getFaderRange } from './helpers.js';

import { sendMaxUpdates } from './max.js';

export function onMidiUpdate(updates, app) {

}

export function propagateValues(updates, values, app) {
  if ('fader' in updates) {
    const table = app.core.get('table').target;
    if (updates.fader.raw !== values.fader.raw) {
      updates.fader.user = getUserFromRawFader(updates.fader, table.fader);
      updates.fader.bytes = getBytesFromRawFader(updates.fader);
    } else if (updates.fader.user !== values.fader.user) {
      updates.fader.raw = getRawFromUserFader(updates.fader, table.fader);
      updates.fader.bytes = getBytesFromRawFader(updates.fader);
    } else if (updates.fader.bytes !== values.fader.bytes) {
      updates.fader.raw = getRawFromBytesFader(updates.fader);
      updates.fader.user = getUserFromRawFader(updates.fader, table.fader);
    }
    return updates;
  } else if ('meter' in updates) {
    const input = updates.meter.user;
    updates.meter.raw = getRawFromUserMeter(updates.meter, table.meter);
    updates.meter.bytes = getBytesFromRawMeter(updates.meter, table.meter);
    return updates;
  }
}

export function onTrackUpdate(updates, values, context, track, app) {
  if (app.env.max && context.source !== 'max') {
    sendMaxUpdates(updates, track, app);
  }
  // console.log(updates);
  // here is the function to send soundworks update on differents connections (max, osc, midi)
}

export async function onConfigUpdate(config, app, server) {

  const channels = config
    .map(tracks => parseInt(tracks.channel))
    .sort((a, b) => a < b ? -1 : 1);

  const maxChannelIndex = Math.max(...channels);

  if (maxChannelIndex + 1 > app.tracks.length) {
    // console.log(`- create track from ${tracks.length} to ${maxTrackIndex}`);

    for (let i = app.tracks.length; i < maxChannelIndex + 1; i++) {
      app.tracks[i] = await server.stateManager.create('track');
      app.tracks[i].onUpdate((updates, values, context) => {
        onTrackUpdate(updates, values, context, app.tracks[i], app);
      });

      if (!channels.includes(i)) {
        // create disabled track
        await app.tracks[i].set({
          channel: i,
          disabled: true
        }, { source: 'config' });
      } else {
        // create enabled track
        await app.tracks[i].set({
          channel: i,
          disabled: false
        }, { source: 'config' });
      }
    }
  } else {
    // console.log(`- delete track from ${maxTrackIndex + 1} to ${tracks.length - 1}`);
    for (let i = app.tracks.length - 1; i > maxChannelIndex; i--) {
      const track = app.tracks.find(s => s.get('channel') === i);
      await track.delete();
      app.tracks.pop();
    }
  }

  // remove old state
  app.tracks.forEach(async track => {
    const channel = track.get('channel');
    if (track.get('disabled') === true) { return };
    if (!channels.includes(channel)) {
      // console.log('- disable track:', channel);
      await track.set({
        disabled: true,
        name: null,
        fader: null,
        meter: null,
        mute: null,
      }, {source:'config'});
    }
  });

  // apply updates on changed state
  channels.forEach(async channel => {
    const track = app.tracks.find(s => s.get('channel') === channel);
    const trackConfig = config.find(f => f.channel === channel);
    const updates = track.getValues();

    // set from config
    updates.name = trackConfig.name;
    updates.fader.type = trackConfig.type;
    updates.fader.range = getFaderRange(trackConfig);


    if ([undefined, -Infinity, null].includes(trackConfig.default)) {
      if (trackConfig.type === 'volume') {
        updates.fader.user = app.core.get('table').target.fader[0];
      } else {
        updates.fader.user = updates.fader.range[0][0]
      }
    } else {
      // @TODO need to check if default value is in range
      updates.fader.user = trackConfig.default;
    }

    updates.fader.oscAddress = trackConfig.faderAddress ? trackConfig.faderAddress : `/fader/${channel}/user`;
    updates.meter.oscAddress = trackConfig.meterAddress ? trackConfig.meterAddress : `/meter/${channel}/user`;
    updates.mute.oscAddress = trackConfig.muteAddress ? trackConfig.muteAddress : `/mute/${channel}`;

    await track.set(updates, { source: 'config' });

  });

}
