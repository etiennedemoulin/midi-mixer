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
    default: null,
    nullable: true,
  },
  selectedController: {
    type: 'string',
    default: null,
    nullable: true,
  },
  selectedControllerFaderValues: {
    type: 'any',
    default: null, 
    nullable: true,
  },
  controllerList: {
    type: 'any',
    default: null,
    nullable: true,
  },
};
