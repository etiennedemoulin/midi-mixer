import ssl from '../tables/ssl.js';

export default {
  tracks: [
    {
      channel: 4,
      name: "Help Chan 1",
      mapping: {
        fader: "volume"
      },
      entrypoints: {
        volume: {
          scale: ssl,
          max: "help-chan-12",
          default: -1
        }
      }
    }
  ]
};
