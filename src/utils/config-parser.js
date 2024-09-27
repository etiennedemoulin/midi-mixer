import { isFunction } from '@ircam/sc-utils';
import cloneDeep from 'clone-deep';

function sampleFunction(func) {
  const size = 512;
  const table = [];

  for (let i = 0; i < size; i++) {
    table[i] = func(i/size);
  }

  return table;
}

export function parseTrackConfig(config) {
  const { parameters, mapping, tracks } = config;

  if (!parameters || !mapping || !tracks) {
    throw new Error('Invalid config file: "parameters", "mapping" and "tracks" are mandatory');
  }

  const parsedParameters = {};
  const parsedTracks = [];

  for (let name in parameters) {
    parsedParameters[name] = {};

    if ('scale' in parameters[name]) {
      if (isFunction(parameters[name].scale)) {
        parsedParameters[name].scale = sampleFunction(parameters[name].scale);
      } else if (Array.isArray(parameters[name].scale)) {
        parsedParameters[name].scale = parameters[name].scale;
      } else {
        throw new Error('Invalid scale: should be either a function or an array');
      }
    } else {
      parsedParameters[name].scale = [0, 1];
    }

    if ('max' in parameters[name]) {
      parsedParameters[name].max = parameters[name].max;
    }

    if ('osc' in parameters[name]) {
      parsedParameters[name].osc = parameters[name].osc;
    }

    if ('value' in parameters[name]) {
      parsedParameters[name].value = parameters[name].value;
    }
  }

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
        const mergedMapping = Object.assign({}, mapping, track.mapping);
        parsedTrack.mapping = mergedMapping
      } else {
        parsedTrack.mapping = mapping;
      }

      let clonedParameters = cloneDeep(parameters);

      if ('parameters' in track) {
        for (let name in track.parameters) {
          Object.assign(clonedParameters[name], track.parameters[name]);
        }
      }

      for (let name in clonedParameters) {
        const parameter = clonedParameters[name];

        if ('scale' in parameter) {
          if (isFunction(parameter.scale)) {
            parameter.scale = sampleFunction(parameter.scale);
          }
        }

        if ('osc' in parameter) {
          parameter.osc = isFunction(parameter.osc)
            ? parameter.osc(parsedTrack.channel, parsedTrack.name, name)
            : parameter.osc;
        }

        if ('max' in parameter) {
          parameter.max = isFunction(parameter.max)
            ? parameter.max(parsedTrack.channel, parsedTrack.name, name)
            : parameter.max;
        }

        if ('value' in parameter) {
          parameter.value = isFunction(parameter.value)
            ? parameter.value(parsedTrack.channel, parsedTrack.name, name)
            : parameter.value;

          console.log(name, parsedTrack.channel, parameter.value);
        }
      }

      parsedTrack.parameters = clonedParameters;
    }
  });

  parsedTracks.sort((a, b) => a.channel < b.channel ? -1 : 1);

  return parsedTracks;
}
