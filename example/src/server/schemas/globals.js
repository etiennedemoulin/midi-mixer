export const globalsSchema = {
  activePage: {
    type: 'integer',
    min: 0,
    max: Infinity,
    default: 0,
  },
  midiDeviceSelected: {
    type: 'string',
    default: null,
    nullable: true,
  },
  midiDeviceList: {
    type: 'any',
    default: [],
  },
  selectedController: {
    type: 'string',
    default: null,
    nullable: true,
  },
  controllerFaderValues: {
    type: 'any',
    default: [],
  },
  controllerList: {
    type: 'any',
    default: [],
  },
};
