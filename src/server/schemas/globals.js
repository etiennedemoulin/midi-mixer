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
    type: 'string',
    default: null,
    nullable: true,
  },
  configFilename: {
    type: 'any',
    default: null,
    nullable: true,
  },
  oscDestination: {
    type: 'any',
    default: '127.0.0.1',
    nullable: false,
  },
  oscSendPort: {
    type: 'integer',
    default: 3334,
    nullable: false,
  },
  oscReceivePort: {
    type: 'integer',
    default: 3333,
    nullable: false,
  }
};
