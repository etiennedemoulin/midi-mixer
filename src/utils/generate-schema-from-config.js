export default function generateSchemaFromConfig(config) {
  const { tracks } = config;
  const trackSchema = {
    channel: {
      type: 'integer',
      min:0,
      max:Infinity,
      default:null,
      nullable:true
    },
    disabled: {
      type: 'boolean',
      default: true
    },
    touched: {
      type: 'boolean',
      default: false,
    },
    name: {
      type: 'string',
      default: null,
      nullable: true
    },
    mapping: {
      type: 'any',
      default: {}
    }
  };

  if ('entrypoints' in tracks[0]) {
    const entrypoints = Object.keys(tracks[0].entrypoints);
    entrypoints.forEach(entrypoint => {
      if ('scale' in tracks[0].entrypoints[entrypoint]) {
        trackSchema[`${entrypoint}_scale`] = {
          type: 'any',
          default: [0,1],
          nullable: true
        }
      }

      if ('osc' in tracks[0].entrypoints[entrypoint]) {
        trackSchema[`${entrypoint}_osc`] = {
          type: 'string',
          default: null,
          nullable: true
        }
      }

      if ('max' in tracks[0].entrypoints[entrypoint]) {
        trackSchema[`${entrypoint}_max`] = {
          type: 'string',
          default: null,
          nullable: true
        }
      }

      if ('default' in tracks[0].entrypoints[entrypoint]) {
        trackSchema[`${entrypoint}_raw`] = {
          type: 'float',
          min: 0,
          max: 1,
          default: null,
          nullable: true
        }
      }
    })
  }

  return trackSchema;

}
