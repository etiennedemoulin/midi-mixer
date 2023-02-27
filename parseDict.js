/*
  simple example of using MaxobjListeners
*/

inlets = 1;
outlets = 1;

var d = new Dict ('midiMaxDict');


function bang() {
messnamed("L1_lvl",d.get("0::value"));
messnamed("L2_lvl",d.get("1::value"));
messnamed("L3_lvl",d.get("2::value"));
}
