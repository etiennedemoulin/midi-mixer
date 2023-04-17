const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const md5 = require('md5');
const XT = require('node-mcu');
const _ = require('lodash');

let cwd = null;
let patchPath = null;
let page = 0;
let bankFaderName = [];
let bankFaderValue = [];
let config = null;

let boxesDictName = null;
let handleMessage = true;

function isEmpty(empty) {
  return (Object.keys(empty).length === 0 && empty.constructor === Object)
}

// Init when Max is ready
Max.addHandler('init', (name, patchPath, patchIndex) => {
    if (patchPath === '') {
      cwd = process.cwd();
    } else {
      const parts = patchPath.split('/');
      const cleaned = parts.slice(3);
      cleaned.pop();
      cwd = `/${cleaned.join('/')}`;
  }

  boxesDictName = `${patchIndex}_midi-mixer_existing_boxes`;

  readConfig(name);

});

async function debounce(patch, value) {
  console.log("debounce function is called");
  let changedControlIndex;
  for (i in config.controls) {
    if (config.controls[i].patch === patch) {
      config.controls[i].value = value;
      changedControlIndex = i;
    }
  }
  updateFaderView(changedControlIndex);
  await Max.setDict('midiMaxDict', config.controls);
}

const throttled = _.throttle(debounce, 20, { 'trailing': true });

Max.addHandler('message', throttled);

// Read configuration file midi.json
function readConfig(name) {
  if (name === 0) {
    console.log('No config file specified, abort...');
    process.exit();
  }

  // read config file
  configFilename = path.join(cwd, name);

  if (fs.existsSync(configFilename)) {
    config = JSON5.parse(fs.readFileSync(configFilename));
    createPatch(config);
    //dostuff

    fs.watchFile(configFilename, () => {
      config = JSON5.parse(fs.readFileSync(configFilename));
      createPatch(config);
      //dostuffagain
    });
  } else {
    console.log(`no config file found, please create "${configFilename}" file and relaunch`);
    process.exit();
  }
}


// Create patch boxes and init fader values
async function createPatch(config) {

  existingBoxes = await Max.getDict(boxesDictName);

  if (!('list' in existingBoxes)) {
    existingBoxes.list = [];
  }

  // delete previous existing boxes
  existingBoxes.list.forEach(name => {
    deleteBox(name);
  });

  existingBoxes.list = [];

  // create patch
  let pos = 0;
  for (i in config.controls) {
    const patch = config.controls[i].patch;
    generateBox(`receive-${patch}`, "receive", [`${patch}`], { x: 600+pos, y: 400 }, 0);
    generateBox(`prepend-${patch}`, "prepend", [`${patch}`], { x: 600+pos, y: 430 }, 0);
    generateLink(`receive-${patch}`, 0, `prepend-${patch}`, 0);
    generateLink(`prepend-${patch}`, 0, "toNode", 0);
    pos += 120;
  }

  // update created boxes
  await Max.setDict(boxesDictName, existingBoxes);

  // init fader mode
  XT.setFaderMode('CH1', 'position', config.config.resolution);
  XT.setFaderMode('CH2', 'position', config.config.resolution);
  XT.setFaderMode('CH3', 'position', config.config.resolution);
  XT.setFaderMode('CH4', 'position', config.config.resolution);
  XT.setFaderMode('CH5', 'position', config.config.resolution);
  XT.setFaderMode('CH6', 'position', config.config.resolution);
  XT.setFaderMode('CH7', 'position', config.config.resolution);
  XT.setFaderMode('CH8', 'position', config.config.resolution);

  // init fader values
  for (i in config.controls) {
    config.controls[i].value = 100;
  }

  // send to max
  await Max.setDict('midiMaxDict', config.controls);
  Max.outlet('update bang');

  // we start on first bank
  page = 0;

  // update fader values and display
  setFaderView();
}

XT.controlMap({
  'button': {
    'down': {
      'FADER BANK RIGHT': function() { updatePage("up") },
      'FADER BANK LEFT': function() { updatePage("down") },
    },
  },
  'fader': onFaderMove,
});

async function onFaderMove( name, state ) {

  if (config === null) {
    console.log("config is undefined");
    return;
  }

  chName = ['CH1','CH2','CH3','CH4','CH5','CH6','CH7','CH8'];

  absFaderNumber = chName.indexOf(name) + 1 + page * 8;
  relFaderNumber = chName.indexOf(name) + 1;

  switch (config.controls[absFaderNumber]) {
    case undefined:
      XT.setFader(`CH${relFaderNumber}`,0);
      break;
    default:
      // SHOULD INTERPOLATE
      if (typeof state === "number") {

        // update DICT
        config.controls[absFaderNumber].value = state;

        // update Display
        bankFaderValue[relFaderNumber-1] = state;
        XT.setFaderDisplay(bankFaderValue,'bottom');

        // send value to Max
        await Max.setDict('midiMaxDict', config.controls);
        Max.outlet('update bang');
      }

  }

}


function updatePage(sens) {

    const keys = Object.keys(config.controls);
    const lastIndex = parseInt(keys.slice(-1)[0]);

    switch (sens) {
        case 'up':

            if (page < Math.floor(lastIndex/8)) {
                page += 1;
                // console.log(`page ${page}`);
                setFaderView();

            } else {
                // console.log("cant go up than this")
            }
        break;
        case 'down':
            if (page > 0) {

                page -= 1;
                // console.log(`page ${page}`);
                setFaderView();

            } else {
                // console.log("cant go less than 0")
            }
        break;
        default:
    }
}


function setFaderView() {
    const keys = Object.keys(config.controls);
    const lastIndex = parseInt(keys.slice(-1)[0]);

    const iMax = Math.ceil(lastIndex/8) * 8;

    // reset sub-view
    bankFaderValue = [];
    bankFaderName = [];


    for (let i=1;i<=iMax;i++) {
        if (i > (page*8) && i <= ((page+1)*8)) {
            if (config.controls[i] !== undefined) {

              // fader has a value
              const faderIndex = (i - 1) % 8 + 1;
              const destination = config.controls[i].patch;
              const value = config.controls[i].value;
              const name = config.controls[i].name;

              // set value
              XT.setFader(`CH${faderIndex}`, value);

              // subview for displayed faders
              bankFaderValue.push(value);
              bankFaderName.push(name);

            } else {
              // fader has not value
              const faderIndex = (i - 1) % 8 + 1;

              XT.setFader(`CH${faderIndex}`, 0);

              bankFaderName.push('');
              bankFaderValue.push('');
            }
        }
    }
    // update display
    XT.setFaderDisplay(bankFaderName,'top');
    XT.setFaderDisplay(bankFaderValue,'bottom');

}

function updateFaderView(i) {
  // retrieve state for index
  const state = config.controls[i];

  // compute relative index
  let relIndex = (i - 1) % 8 + 1;
  if ( relIndex + (page*8) === parseFloat(i) ) {
    // ok
  } else {
    relIndex = null;
  }

  if (relIndex) {
    // set value
    XT.setFader(`CH${relIndex}`, state.value);

    // update sub view
    bankFaderValue[relIndex-1] = state.value;

    // set display
    XT.setFaderDisplay(bankFaderValue,'bottom');
  }

}

function generateBox(varName, boxName, args, position, presentation, comment) {
  existingBoxes.list.push(varName);

  const msg = `thispatcher script newobject newobj @text "${boxName} ${args.join(' ')}" @varname ${varName} @patching_position ${position.x} ${position.y} @presentation ${presentation} @comment ${comment}`;
  Max.outlet(msg);
}

function deleteBox(varName) {
  const msg = `thispatcher script delete ${varName}`;
  Max.outlet(msg);
}

function generateLink(varNameOut, outlet, varNameIn, inlet) {
  const msg = `thispatcher script connect ${varNameOut} ${outlet} ${varNameIn} ${inlet}`;
  Max.outlet(msg);
}



XT.on('debug', function(msg) {
    // console.log(':> ' + msg);
});


XT.start(function(msg) {
    console.log('Midi Init: ' + msg);
},{port:1});


