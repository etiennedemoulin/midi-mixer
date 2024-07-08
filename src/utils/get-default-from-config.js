import { userToRaw } from './basis-conversions.js';


export default function getDefaultFromConfig(config, channel) {
  const defaultsValues = {};
  const track = config.tracks.find(f => f.channel === channel);

  Object.keys(track).forEach(key => {
    if (key === 'name') {
      defaultsValues.name = track.name;
    }

    if (key === 'mapping') {
      defaultsValues.mapping = track.mapping;
    }

    if (key === 'entrypoints') {
      const entrypoints = Object.keys(track.entrypoints);
      entrypoints.forEach(entrypoint => {
        if ('scale' in track.entrypoints[entrypoint]) {
          defaultsValues[`${entrypoint}_scale`] = track.entrypoints[entrypoint].scale;
          // console.log(entrypoint);
        }

        if ('osc' in track.entrypoints[entrypoint]) {
          defaultsValues[`${entrypoint}_osc`] = track.entrypoints[entrypoint].osc;
          // console.log(entrypoint);
        }

        if ('max' in track.entrypoints[entrypoint]) {
          defaultsValues[`${entrypoint}_max`] = track.entrypoints[entrypoint].max
        }

        if ('default' in track.entrypoints[entrypoint]) {
          // default value in config is used based
          const userDefaultValue = track.entrypoints[entrypoint].default;
          defaultsValues[`${entrypoint}_raw`] = userToRaw(userDefaultValue, track.entrypoints[entrypoint].scale);
        }
      })
    }
  });
  return defaultsValues;
}
