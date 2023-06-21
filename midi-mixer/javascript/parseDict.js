/*
  simple example of using MaxobjListeners
*/

inlets = 1;
outlets = 1;

var d = new Dict ('midiMaxDict');

function bang() {
  var patchname = d.get('patch');
  var value = d.get('value');
  messnamed(patchname, value);
}



  // for (i in keys) {
  //   post(keys[i]);post();
  //   post(i);post();
  //   // var patchname = d.get(keys[i]+'::patch');
  //   // var value = d.get(keys[i]+'::value');
  //   // if ( (typeof patchname) === 'string' ) {
  //   //   messnamed(patchname,value);
  //   // }
  // }
