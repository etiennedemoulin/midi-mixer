export default function generateSchemaFromConfig(tracks) {
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
    for (let name in track.parameters) {
      trackSchema[`${name}_raw`] = {
        type: 'float',
        min: 0,
        max: 1,
        default: null,
        nullable: true
      };

      trackSchema[`${name}_scale`] = {
        type: 'any',
        default: [0,1],
        nullable: true
      };

      // these can stay null
      trackSchema[`${name}_osc`] = {
        type: 'string',
        default: null,
        nullable: true
      };

      trackSchema[`${name}_max`] = {
        type: 'string',
        default: null,
        nullable: true
      };
    }
  });

  return trackSchema;

}
