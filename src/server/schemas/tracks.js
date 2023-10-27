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
  faderAddress: {
    type: 'string',
    default: null,
    nullable: true,
  },
  meterAddress: {
    type: 'string',
    default: null,
    nullable: true,
  },
  meterUser: {
    type: 'float',
    default: null,
    nullable: true,
  },
  meterRaw: {
    type: 'float',
    min: 0,
    max: 1,
    default: null,
    nullable: true,
  },
  meterBytes: {
    type: 'integer',
    min: 0,
    max: 15,
    default: null,
    nullable: true,
  },
  mute: {
    type:'boolean',
    default: false,
    nullable: true,
  },
  muteAddress: {
    type: 'string',
    default: null,
    nullable: true,
  },
};
