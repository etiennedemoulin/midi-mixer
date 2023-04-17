//---------------------------------------------------------- js setup
autowatch = 1;
inlets = 1;
outlets = 1;

//-------------------------------------------------- global variables
var g_pl = null; // parameter listener object
var d = new Dict ('midiMaxDict');
gc();

//-------------------------------------------------------------------
// create ParameterListener for all our dict
function init() {

  var keys = d.getkeys();
  for (i in keys) {
      var [i] = new ParameterListener(d.get(keys[i]+"::patch"), updateDict);
  }
}


//-------------------------------------------------------------------
// update dict
function updateDict(data) {
  // post("onMyDialChanged: " + data.value + "\n");
  var keys = d.getkeys();
  for (i in keys) {
    if ( d.get(keys[i]+"::patch") === data.name ) {
      d.set( (keys[i]+"::value") , data.value );
    }
  }

  // update model
  // outlet(0, data.value, data.name);
} updateDict.local = 1;

//--------------------------------------------------------------- eof
init();
