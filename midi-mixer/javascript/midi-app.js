const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const md5 = require('md5');
const XT = require('node-mcu');
const _ = require('lodash');

let configFilename = null;
let cwd = null;
let patchPath = null;
let page = 0;
let bankFaderName = [];
let bankFaderValue = [];
let config = null;
let device;

let boxesDictName = null;

function isEmpty(empty) {
  return (Object.keys(empty).length === 0 && empty.constructor === Object)
}

function computeFaderValue(i) {
  let value;
  switch (config.controls[i].type) {
    case 'linear': {
      const input = config.controls[i].value;
      const range = config.controls[i].range;
      const sens = (range[1] > range[0]) ? 1 : -1;
      const amplitude = Math.abs(range[1] - range[0]);
      const raw = sens * (input - range[0]) / amplitude;
      value = raw * (device.fader.length - 1);
      break;
    }
    case 'volume': {
      const input = config.controls[i].value;
      const valueInList = device.fader.reduce((a, b) => {
        return Math.abs(b - input) < Math.abs(a - input) ? b : a;
      });
      value = device.fader.findIndex( (e) => e === valueInList );
      break;
    }
    default:
      break;
  }
  return value;
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
  let changedControlIndex;
  for (i in config.controls) {
    if (config.controls[i].patch === patch) {
      config.controls[i].value = value;
      changedControlIndex = i;
    }
  }
  if (config.controls[changedControlIndex].state === 'release') {
    updateFaderView(changedControlIndex);
    await Max.setDict('midiMaxDict', config.controls);
  }
}

const throttled = _.throttle(debounce, 20, { 'trailing': true });

Max.addHandler('message', throttled);

Max.addHandler('edit', (filename) => {
  if (configFilename === null) {
    console.log("No configuration file specified, abord.");
    process.exit()
  }
  open(configFilename);
});

Max.addHandler('getDevices', (filename) => {
  console.log(XT.getPorts());
});

// Read configuration file midi.json
function readConfig(name) {
  if (name === 0) {
    throw new Error("No configuration file specified, abort...");
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
    throw new Error(`no config file found, please create "${configFilename}" file and relaunch`);
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

  // Init XT lib
  const port = XT.getPorts().findIndex( (e) => e === config.config.midiDevice );
  if (port !== -1) {
    XT.start(function(msg) {
      console.log('Midi Init: ' + msg);
    },{port:port});
  } else {
    throw new Error("Can't find midi device - abort.");
  }

  // set fader lib
  try {
    device = require(`../Controllers/${config.config.controller}.js`);
  } catch {
    throw new Error("Can't find this midicontroller mapping");
  }

  // init fader mode
  XT.setFaderMode('CH1', 'position', device.fader.length);
  XT.setFaderMode('CH2', 'position', device.fader.length);
  XT.setFaderMode('CH3', 'position', device.fader.length);
  XT.setFaderMode('CH4', 'position', device.fader.length);
  XT.setFaderMode('CH5', 'position', device.fader.length);
  XT.setFaderMode('CH6', 'position', device.fader.length);
  XT.setFaderMode('CH7', 'position', device.fader.length);
  XT.setFaderMode('CH8', 'position', device.fader.length);

  // init fader values
  for (i in config.controls) {
    switch (config.controls[i].type) {
      case 'linear':
        config.controls[i].value = config.controls[i].range[0];
        break;
      case 'volume':
        config.controls[i].value = device.fader[0];
        break;
      default:
        break;
    }
    config.controls[i].state = 'release';
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
  'fader': onFaderMove
});

async function onFaderMove( name, state ) {

  if (config === null) {
    throw new Error("Configuration file is not set");
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
        let value;
        switch (config.controls[absFaderNumber].type) {
          case 'linear':
            const range = config.controls[absFaderNumber].range;
            const sens = (range[1] > range[0]) ? 1 : -1;
            const raw = state / (device.fader.length - 1);
            const amplitude = Math.abs(range[1] - range[0]);
            value = range[0] + sens * (raw * amplitude);
            // console.log(value);
            break;
          case 'volume':
            value = device.fader[state];
            break;
          default:
            break;
        }

        // update DICT
        config.controls[absFaderNumber].value = value;

        // update Display
        bankFaderValue[relFaderNumber-1] = value;
        XT.setFaderDisplay(bankFaderValue,'bottom');

        // send value to Max
        await Max.setDict('midiMaxDict', config.controls);
        Max.outlet('update bang');
      } else if (state === 'touch') {
        config.controls[absFaderNumber].state = 'touch';
      } else if (state === 'release') {
        config.controls[absFaderNumber].state = 'release';
      }
    break;
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
            const value = config.controls[i].value
            const name = config.controls[i].name;

            // set value
            XT.setFader(`CH${faderIndex}`, computeFaderValue(i));

            // subview for displayed faders
            bankFaderValue.push(value);
            bankFaderName.push(name);

          } else {
            // fader has no value
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
  const value = config.controls[i].value;

  // compute relative index
  let relIndex = (i - 1) % 8 + 1;
  if ( relIndex + (page*8) === parseFloat(i) ) {
    // ok
  } else {
    relIndex = null;
  }

  if (relIndex) {
    // set value
    XT.setFader(`CH${relIndex}`, computeFaderValue(i));

    // update sub view
    bankFaderValue[relIndex-1] = value;

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

Max.outlet('bootstraped');
