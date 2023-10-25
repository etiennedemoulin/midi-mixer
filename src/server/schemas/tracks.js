export const trackSchema = {
  channel : {
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
  faderType: {
    type: 'string',
    default: null,
    nullable: true,
  },
  faderTouched:{
    type: 'boolean',
    default: false,
  },
  faderBytes: {
    type:'any',
    default:[0, 0],
    nullable: true,
  },
  faderRaw: {
    type:'float',
    min:0,
    max:1,
    default:null,
    nullable: true,
  },
  faderUser: {
    type: 'float',
    min: -Infinity,
    max: Infinity,
    default: null,
    nullable: true,
  },
  faderRange: {
    type: 'any',
    default: null,
    nullable: true,
  },
  oscAddress: {
    type: 'string',
    default: null,
    nullable: true,
  },
  mute: {
    type:'boolean',
    default: false,
    nullable: true,
  },
};
