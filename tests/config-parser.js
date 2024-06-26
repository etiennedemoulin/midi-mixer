import { isFunction } from '@ircam/sc-utils';


export default function configParser(config) {
  const { tracks } = config;
  const parsedTracks = [];

  tracks.forEach(track => {
    // replace with isNumber
    if (!Array.isArray(track.channel) && !Number.isInteger(track.channel)) {
      throw new Error('channel is required');
    }

    const channels = Array.isArray(track.channel)
      ? track.channel
      : [track.channel];

    let [min, max] = channels;

    if (max === undefined) {
      max = min;
    }

    for (let i = min; i <= max; i++) {
      let parsedTrack = parsedTracks.find(t => t.channel === i);

      if (!parsedTrack) {
        parsedTrack =  { channel: i };
        parsedTracks.push(parsedTrack);
      }

      if ('name' in track) {
        parsedTrack.name = isFunction(track.name)
          ? track.name(parsedTrack)
          : track.name;
      }

      if ('fader' in track) {
        if (!parsedTrack.fader) {
          parsedTrack.fader = {};
        }

        if ('name' in track.fader) {
          parsedTrack.fader.name = isFunction(track.fader.name)
            ? track.fader.name(parsedTrack)
            : track.fader.name;
        }

        if ('scale' in track.fader) {
          parsedTrack.fader.scale = track.fader.scale
        }

        if ('osc' in track.fader) {
          parsedTrack.fader.osc = isFunction(track.fader.osc)
            ? track.fader.osc(parsedTrack)
            : track.fader.osc;
        }

        if ('max' in track.fader) {
          parsedTrack.fader.max = isFunction(track.fader.max)
            ? track.fader.max(parsedTrack)
            : track.fader.max;
        }

        if ('default' in track.fader) {
          parsedTrack.fader.default = isFunction(track.fader.default)
            ? track.fader.default(parsedTrack)
            : track.fader.default;
        }
      }
    }

    // channels.forEach(channel => {
    //   // find the track if exists or create new one
    //   const track = parsedTracks.find(t => t.channel)
    // });
  });

  parsedTracks.sort((a, b) => a.channel < b.channel ? -1 : 1);

  return { tracks: parsedTracks };
}
