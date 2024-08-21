import { isFunction } from '@ircam/sc-utils';


export default function configParser(config) {
  const { tracks } = config;
  const parsedTracks = [];
  const stepSize = 512;

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
          ? track.name(parsedTrack.channel)
          : track.name;
      }

      if ('mapping' in track) {
        if (!parsedTrack.mapping) {
          parsedTrack.mapping = {};
        }

        if ("fader" in track.mapping) {
          parsedTrack.mapping.fader = track.mapping.fader;
        }

        if ("knob" in track.mapping) {
          parsedTrack.mapping.knob = track.mapping.knob;
        }

        if ("sel" in track.mapping) {
          parsedTrack.mapping.sel = track.mapping.sel;
        }

        if ("mute" in track.mapping) {
          parsedTrack.mapping.mute = track.mapping.mute;
        }
      }

      if (!track.entrypoints) {
        return;
      }

      Object.keys(track.entrypoints).forEach(entrypoint => {
        if (!parsedTrack.entrypoints) {
          parsedTrack.entrypoints = {};
        }

        if (!parsedTrack.entrypoints[entrypoint]) {
          parsedTrack.entrypoints[entrypoint] = {};
        }

        if ('scale' in track.entrypoints[entrypoint]) {
          if (isFunction(track.entrypoints[entrypoint].scale)) {
            parsedTrack.entrypoints[entrypoint].scale = [];
            for (let i = 0; i < stepSize; i++) {
              parsedTrack.entrypoints[entrypoint].scale[i] = track.entrypoints[entrypoint].scale(i/stepSize);
            }
          } else {
            parsedTrack.entrypoints[entrypoint].scale = track.entrypoints[entrypoint].scale;
          }
        }

        if ('osc' in track.entrypoints[entrypoint]) {
          parsedTrack.entrypoints[entrypoint].osc = isFunction(track.entrypoints[entrypoint].osc)
            ? track.entrypoints[entrypoint].osc(parsedTrack.channel, parsedTrack.name, entrypoint)
            : track.entrypoints[entrypoint].osc;
        }

        if ('max' in track.entrypoints[entrypoint]) {
          parsedTrack.entrypoints[entrypoint].max = isFunction(track.entrypoints[entrypoint].max)
            ? track.entrypoints[entrypoint].max(parsedTrack.channel, parsedTrack.name, entrypoint)
            : track.entrypoints[entrypoint].max;
        }

        if ('default' in track.entrypoints[entrypoint]) {
          parsedTrack.entrypoints[entrypoint].default = isFunction(track.entrypoints[entrypoint].default)
            ? track.entrypoints[entrypoint].default(parsedTrack.channel, parsedTrack.name, entrypoint)
            : track.entrypoints[entrypoint].default;
        }
      });
    }
  });

  parsedTracks.sort((a, b) => a.channel < b.channel ? -1 : 1);

  return { tracks: parsedTracks };
}
