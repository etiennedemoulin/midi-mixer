import JZZ from 'jzz';

export function getMidiDeviceList() {
  const selectMidiOut = [];
  const selectMidiIn = [];
  JZZ().and(function() {
    for (let i = 0; i < this.info().outputs.length; i++) {
      selectMidiOut.push(this.info().outputs[i].name);
    }
    for (let i = 0; i < this.info().inputs.length; i++) {
      selectMidiIn.push(this.info().inputs[i].name);
    }
  });

  return { inputs: selectMidiIn, outputs: selectMidiOut };
}
