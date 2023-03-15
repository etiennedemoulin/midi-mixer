const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const md5 = require('md5');
var XT = require('node-mcu');

let cwd = null;
let patchPath = null;
let page = 0;
let bankFaderName = [];
let bankFaderValue = [];
let config = null;

function isEmpty(empty) {
  return (Object.keys(empty).length === 0 && empty.constructor === Object)
}

// generate matrix is called before
Max.addHandler('init', (name, patchPath) => {
    if (patchPath === '') {
      cwd = process.cwd();
    } else {
      const parts = patchPath.split('/');
      const cleaned = parts.slice(3);
      cleaned.pop();
      cwd = `/${cleaned.join('/')}`;
  }

    readConfig(name);
});


function readConfig(name) {
  if (name === 0) {
    console.log('No config file specified, abort...');
    process.exit();
  }

  // read config file
  configFilename = path.join(cwd, name);

  if (fs.existsSync(configFilename)) {
    config = JSON5.parse(fs.readFileSync(configFilename));
    init(config);
    //dostuff

    fs.watchFile(configFilename, () => {
      config = JSON5.parse(fs.readFileSync(configFilename));
      init(config);
      //dostuffagain
    });
  } else {
    console.log(`no config file found, please create "${configFilename}" file and relaunch`);
    process.exit();
  }
}

async function init(config) {

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

  // initialisation
  page = 0;
  bankFaderName = [];
  bankFaderValue = [];

  // update fader values and display
  updateFaderBank(page);
}


XT.controlMap({
  'button': {
    'down': {
      'FADER BANK RIGHT': function() { updatePage("up") },
      'FADER BANK LEFT': function() { updatePage("down") },
    },
  },
  'fader': function(name, state) { onFaderMove(name, state); },
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
      // console.log(`no control linked to the fader ${absFaderNumber}`);
      XT.setFader(`CH${relFaderNumber}`,0);
      break;
    default:
      // SHOULD INTERPOLATE
      if (typeof state === "number") {
        // update DICT
        config.controls[absFaderNumber].value = state;
        // send value to Max
        await Max.setDict('midiMaxDict', config.controls);
        Max.outlet('update bang');
        // update Display
        bankFaderValue[relFaderNumber-1] = state;
        XT.setFaderDisplay(bankFaderValue,'bottom');
      }

  }

}


function updatePage(sens) {
    bankFaderValue = [];
    bankFaderName = [];
    countKeys = Object.keys(config.controls).length;
    switch (sens) {
        case 'up':
            if (page < Math.floor(countKeys/8)) {
                page += 1;
                console.log(`page ${page}`);
                updateFaderBank(page);
            } else {
                // console.log("cant go up than this")
            }
        break;
        case 'down':
            if (page > 0) {
                page -= 1;
                console.log(`page ${page}`);
                updateFaderBank(page);
            } else {
                // console.log("cant go less than 0")
            }
        break;
        default:
    }
}

function updateFaderBank(page) {
    const keys = Object.keys(config.controls);
    const iMax = Math.ceil(keys.length/8) * 8;
    for (let i=1;i<=iMax;i++) {
        if (i > (page*8) && i <= ((page+1)*8)) {
            if (config.controls[i] !== undefined) {
              const faderIndex = (i - 1) % 8 + 1;
              XT.setFader(`CH${faderIndex}`, config.controls[i].value);
              bankFaderValue.push(config.controls[i].value);
              bankFaderName.push(config.controls[i].name);
            } else {
              const faderIndex = (i - 1) % 8 + 1;
              XT.setFader(`CH${faderIndex}`, 0);
              bankFaderName.push('');
              bankFaderValue.push('');
            }
        }
    }

    XT.setFaderDisplay(bankFaderName,'top');
    XT.setFaderDisplay(bankFaderValue,'bottom');

}



XT.on('debug', function(msg) {
    // console.log(':> ' + msg);
});


XT.start(function(msg) {
    console.log('Midi Init: ' + msg);
},{port:0});


