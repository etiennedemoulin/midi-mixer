export const trackSchema = {
  channel: {
    type:'any',
    min:0,
    max:Infinity,
    default:null,
    nullable: true
  },
  disabled: {
    type: 'boolean',
    default: true,
  },
  name: {
    type: 'string',
    default: null,
    nullable: true,
  },
  fader: {
    type: 'any',
    default: {
      type: null,
      touched: false,
      bytes: [0, 0],
      raw: null,
      user: null,
      range: null,
      oscAddress: null
    }
  },
  meter: {
    type: 'any',
    default: {
      oscAddress: null,
      user: null,
      raw: null,
      bytes: null
    }
  },
  mute: {
    type: 'any',
    default: {
      oscAddress: null,
      user: null
    }
  }
};
