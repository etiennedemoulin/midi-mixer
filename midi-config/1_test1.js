import ssl from '../tables/ssl.js';
import { linearScale } from '@ircam/sc-utils';
const scale = linearScale(0, 1, -12, 12);

export default {
  tracks: [
    {
      channel: [1, 8],
      name: channel => `Track ${channel}`,
      mapping: {
        knob: "volume",
        fader: "azim",
      },
      parameters: {
        volume: {
          scale: ssl,
          osc: (channel, name, key) => `/track/${channel}/gain`,
          max: (channel, name, key) => `${channel}_${key}`,
          default: 0,
        },
        azim: {
          scale: scale,
          osc: (channel, name, key) => `/track/${channel}/${key}`,
          max: (channel, name, key) => `${channel}_${key}`,
          default: -12,
        },
        entrypoint3: {
          name: "wow",
          scale: x => x * 10,
          osc: (channel) => `/wow/${channel}`,
          default: -100
        }
      },
    },
    {
      channel: 2,
      name: "pouet",
      parameters: {
        volume: {
          default: -111
        },
      }
    },
    {
      channel: 3,
      parameters: {
        volume: {
          scale: scale
        }
      }
    },
    {
      channel: 12,
      name: "oh",
      parameters: {
        volume: {
          scale: ssl,
          osc: (channel, name, key) => `/track/${channel}/${key}`,
          max: (channel, name, key) => `${channel}_${key}`,
          default: 0,
        }
      }
    }
  ]
};
