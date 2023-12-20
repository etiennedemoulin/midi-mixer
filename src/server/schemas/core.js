export const coreSchema = {
  config: {
    type: 'any',
    default: {
      active: "default",
      target: [
{
      "channel": 1,
      "name": "Track 1",
      "type": "volume"
}
      ]
    }
  },
  table: {
    type: 'any',
    default: {
      active: null,
      list: null,
      target: {
        fader: null,
        meter: null
      }
    }
  }
};
