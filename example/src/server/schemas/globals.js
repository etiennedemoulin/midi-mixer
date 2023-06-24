export const globalsSchema = {
  activePage: {
    type: 'integer',
    min: 0,
    max: Infinity,
    default: 0,
  },
  selectMidiIn: {
    type: 'any',
    default: null,
    nullable: true,
  },
  selectMidiOut: {
    type: 'any',
    default: null,
    nullable: true,
  },
  midiInName: {
    type: 'string',
    default: null,
    nullable: true,
  },
  midiOutName: {
    type: 'string',
    default: null,
    nullable: true,
  },
  selectControllers: {
    type: 'any',
    default: null,
    nullable: true,
  },
  controllerName: {
    type: 'string',
    default: null,
    nullable: true,
  },
};
