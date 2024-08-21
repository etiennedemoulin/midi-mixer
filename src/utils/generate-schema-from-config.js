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

  tracks.forEach(track => {
    if ('entrypoints' in track) {
      const entrypoints = Object.keys(track.entrypoints);
      entrypoints.forEach(entrypoint => {

        if ('scale' in track.entrypoints[entrypoint]) {
          trackSchema[`${entrypoint}_scale`] = {
            type: 'any',
            default: [0,1],
            nullable: true
          }
        }

        if ('osc' in track.entrypoints[entrypoint]) {
          trackSchema[`${entrypoint}_osc`] = {
            type: 'string',
            default: null,
            nullable: true
          }
        }

        if ('max' in track.entrypoints[entrypoint]) {
          trackSchema[`${entrypoint}_max`] = {
            type: 'string',
            default: null,
            nullable: true
          }
        }

        if ('default' in track.entrypoints[entrypoint]) {
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
  })

  return trackSchema;

}
