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
  faderBytes: {
    type:'integer',
    min:0,
    max:16383,
    default:null,
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
  mute: {
    type:'boolean',
    default: false,
    nullable: true,
  },
};
