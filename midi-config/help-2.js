import ssl from '../tables/ssl.js';
import { linearScale } from '@ircam/sc-utils';

export default {
  tracks: [
    {
      channel: 2,
      name: "Help Chan 2",
      mapping: {
        fader: "distance"
      },
      entrypoints: {
        distance: {
          scale: linearScale(0, 1, 10, 2),
          max: "help-chan-2",
          default: 2
        }
      }
    }
  ]
};
