export const midiSchema = {
  in: {
    type: 'any',
    default: {
      name: null,
      list: null
    }
  },
  out: {
    type: 'any',
    default: {
      name: null,
      list: null
    }
  },
  page: {
    type: 'integer',
    min: 0,
    max: Infinity,
    default: 0,
  }
};
