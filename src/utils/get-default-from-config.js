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
        const entrypointKey = track.entrypoints[entrypoint];

        if ('scale' in entrypointKey) {
          defaultsValues[`${entrypoint}_scale`] = entrypointKey.scale;
          // console.log(entrypoint);
        }

        if ('osc' in entrypointKey) {
          defaultsValues[`${entrypoint}_osc`] = entrypointKey.osc;
          // console.log(entrypoint);
        }

        if ('max' in entrypointKey) {
          defaultsValues[`${entrypoint}_max`] = entrypointKey.max
        }

        if ('default' in track.entrypoints[entrypoint]) {
          // default value in config is used based
          const userDefaultValue = track.entrypoints[entrypoint].default;
          if (defaultsValues[`${entrypoint}_scale`]) {
            defaultsValues[`${entrypoint}_raw`] = userToRaw(userDefaultValue,
              defaultsValues[`${entrypoint}_scale`]);
            } else {
              throw new Error(`scale is not defined for entrypoint ${entrypoint}`);
            }
        }
      })
    }
  });

  return defaultsValues;
}
