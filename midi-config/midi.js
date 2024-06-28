import ssl from '../tables/ssl.js';

export default {
  tracks: [
    {
      channel: 0,
      name: "Master",
      mapping: {
        fader: "volume"
      },
      entrypoints: {
        volume: {
          scale: ssl,
          osc: "/master",
          max: "master_lvl",
          default: 0
        }
      }
    },
    {
      channel: [1, 8],
      name: channel => `Midi ${channel}`,
      mapping: {
        fader: "midi",
      },
      entrypoints: {
        midi: {
          scale: x => x * 127,
          osc: (channel, name, key) => `/${key}/${channel}`,
          max: (channel, name, key) => `${key}-${channel}`,
          default: 0,
        }
      },
    }
  ]
};
