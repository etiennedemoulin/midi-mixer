import configParser from './config-parser.js';
import util from 'node:util';
import { linearScale } from '@ircam/sc-utils';

const scale = linearScale('linear', 0, 1, -6, 6);


// const scale = val => val;
const ssl = val => val * 2;

const config = {
  tracks: [
    {
      channel: [1, 8],
      name: track => `Track ${track.channel}`,
      fader: {
        name: "volume",
        scale: ssl,
        osc: track => `/track/${track.channel}/${track.fader.name}`,
        max: track => `${track.channel}_${track.fader.name}`,
        default: 0,
      },
      knob: {
        name: "azim",
        scale: scale,
        osc: track => `/track/${track.channel}/${knob.name}`,
        max: track => `${track.channel}_${track.knob.name}`,
        default: 0,
      },
      entrypoint3: {
        name: "pouet",
        scale: scale,
        osc: track => `/track/${track.channel}/${track.entrypoint3.name}`
      }
    },
    {
      channel: 2,
      name: "pouet",
      fader: {
        default: -10
      },
    },
    {
      channel: 3,
      fader: {
        scale: scale
      }
    }
  ]
};

const result = configParser(config);
// console.log(util);
// util.inspect(result, false, null, true);

console.log(util.inspect(result, { depth: null }));


const str = scale.toString();
const test = eval(str);

console.log(str);
