import { userToRaw } from './basis-conversions.js';


export default function getDefaultFromConfig(config, channel) {
  const defaultsValues = {};
  const track = config.find(f => f.channel === channel);

  defaultsValues.name = track.name || '';
  defaultsValues.mapping = track.mapping;

  for (let name in track.parameters) {
    const parameter = track.parameters[name];

    defaultsValues[`${name}_raw`] = userToRaw(parameter.value, parameter.scale);
    defaultsValues[`${name}_scale`] = parameter.scale;

    if ('osc' in parameter) {
      defaultsValues[`${name}_osc`] = parameter.osc;
    }

    if ('max' in parameter) {
      defaultsValues[`${name}_max`] = parameter.max
    }
  }

  return defaultsValues;
}
