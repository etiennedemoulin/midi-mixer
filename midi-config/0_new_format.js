import ssl from '../tables/ssl.js';
// import { linearScale } from '@ircam/sc-utils';
// const scale = linearScale(0, 1, -12, 12);

export default {
  parameters: {
    volume: {
      scale: ssl,
      osc: (channel) => `/track/${channel}/gain`,
      max: (channel, trackName, parameterName) => `track_${channel}_${parameterName}`,
      value: (channel) => (channel - 1) * -8 + 8,
    },
    distance: {
      scale: [1, 10],
      osc: (channel) => `/track/${channel}/dist`,
      max: (channel) => `${channel}_dist`,
      value: 1,
    }
  },
  mapping: {
    fader: 'volume',
    knob: 'distance',
  },

  tracks: [
    {
      channel: [1, 8],
      name: channel => `Track ${channel}`,
    },
    {
      channel: 2,
      name: 'coucou',
      parameters: {
        volume: {
          osc: '/pouet',
          value: -16,
        },
      }
    },
    {
      channel: [9, 10],
      name: channel => `Distance ${channel}`,
      mapping: {
        fader: 'distance',
      }
    },
    // 11 is disabled
    {
      channel: 12,
      name: channel => `Super Track ${channel}`,
    },
  ],
}
