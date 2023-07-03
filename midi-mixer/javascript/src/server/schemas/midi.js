export const midiSchema = {
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
    // default: "mioXM HST 1",
    nullable: true,
  },
  midiOutName: {
    type: 'string',
    default: null,
    // default: "mioXM HST 1",
    nullable: true,
  }
};
