const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const md5 = require('md5');
const easymidi = require('easymidi');

let cwd = null;
let patchPath = null;
let dict = {};

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
    createPatchConnection(config);
    //dostuff

    fs.watchFile(configFilename, () => {
      config = JSON5.parse(fs.readFileSync(configFilename));
      createPatchConnection(config);
      //dostuffagain
    });
  } else {
    console.log(`no config file found, please create "${configFilename}" file and relaunch`);
    process.exit();
  }
}

async function createPatchConnection(config) {
  dict = Object.assign({}, config.controls);
  for (i in dict) {
    dict[i].value = 0;
  }
  await Max.setDict('midiMaxDict',dict);
  initInputModule();
}

function initInputModule() {
  const midiInput = new easymidi.Input(config.config.midiDevice);
  midiInput.on('cc', async function (msg) {
    thisIndex = msg.controller - 1;
    dict[thisIndex].value = msg.value;
    await Max.setDict('midiMaxDict', dict);
    Max.outlet(`forward ${dict[thisIndex].patch} ${dict[thisIndex].value}`);
    // refreshDict(dict);
    // console.log(msg);
  });

}
