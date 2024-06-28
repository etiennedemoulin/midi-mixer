export const globalsSchema = {
  activePage: {
    type: "integer",
    min: 0,
    max: Infinity,
    default:0
  },
  midiInPort: {
    type: "string",
    default: null,
    nullable: true
  },
  midiOutPort: {
    type: "string",
    default: null,
    nullable: true
  },
  oscServerPort: {
    type: "integer",
    min: 0,
    max: Infinity,
    default: 4002
  },
  oscClientPort: {
    type: "integer",
    min: 0,
    max: Infinity,
    default: 4001
  },
  oscServerAddress: {
    type: "string",
    default: '127.0.0.1'
  },
  config: {
    type: "any",
    default: null,
    nullable: true
  }
}
