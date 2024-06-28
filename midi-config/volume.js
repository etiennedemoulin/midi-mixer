import ssl from '../tables/ssl.js';

export default {
  tracks: [
    {
      channel: [0, 8],
      name: channel => `Track ${channel}`,
      mapping: {
        fader: "volume",
      },
      entrypoints: {
        volume: {
          scale: ssl,
          osc: (channel, name, key) => `/track/${channel}/${key}`,
          max: (channel, name, key) => `${channel}_lvl`,
          default: 0,
        }
      },
    },
    {
      channel: 0,
      name: "Master"
    },
  ]
};
