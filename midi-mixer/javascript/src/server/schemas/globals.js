export const globalsSchema = {
  activePage: {
    type: 'integer',
    min: 0,
    max: Infinity,
    default: 0,
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
  config: {
    type: 'any',
    default: null,
    nullable: true,
  },
  configFilename: {
    type: 'any',
    default: null,
    nullable: true,
  }
};
