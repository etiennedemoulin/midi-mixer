const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const MCU = require('node-mcu');

let configFilename = null;
let cwd = null;
let patchPath = null;
let boxesDictName = null;

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

// Init when Max is ready
Max.addHandler('init', (name, patchPath, patchIndex, midiDevice, controller) => {
    if (patchPath === '') {
      cwd = process.cwd();
    } else {
      const parts = patchPath.split('/');
      const cleaned = parts.slice(3);
      cleaned.pop();
      cwd = `/${cleaned.join('/')}`;
  }

  boxesDictName = `${patchIndex}_midi-mixer_existing_boxes`;

  // Init MCU lib
  const port = MCU.getPorts().findIndex( (e) => e === midiDevice );
  if (port !== -1) {
    MCU.start(function(msg) {
      console.log('Midi Init:', midiDevice);
    },{port:port});
  } else {
    console.log("[midi.mixer] - Cannot find midi device !");
  }

  // set fader lib
  try {
    device = require(`../Controllers/${controller}.js`);
    console.log(`[midi.mixer] - Using the ${controller} midi mapping`);
  } catch {
    console.log(`[midi.mixer] - Can't find the ${controller} midi mapping`);
    throw new Error("Can't find this midicontroller mapping");
  }

  readConfig(name);

});

Max.addHandler('edit', (filename) => {
  open(configFilename);
});

Max.addHandler('getPorts', () => {
  XT.getPorts().forEach((e,i) => {
    console.log(`[midi.mixer] - #${i}: ${e}`);
  });
});

Max.addHandler('getDevices', () => {
  const controllers = fs.readdirSync('../Controllers');
  controllers.forEach(e => {
    console.log(`${e.split('.').shift()}`);
  });
});

// Read configuration file midi.json
function readConfig(name) {
  if (name === 0) {
    name = "../help/default.json";
    console.log('[midi.mixer] - Using default configuration file: ', path.resolve(process.cwd(), '../help/default.json'));
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
  for (i in config) {
    const patch = config[i].patch;
    generateBox(`receive-${patch}`, "receive", [`${patch}`], { x: 600+pos, y: 400 }, 0);
    generateBox(`prepend-${patch}`, "prepend", [`${patch}`], { x: 600+pos, y: 430 }, 0);
    generateBox(`speedlim-${patch}`, "speedlim", [100], { x: 600+pos, y: 460 }, 0);
    generateLink(`receive-${patch}`, 0, `prepend-${patch}`, 0);
    generateLink(`prepend-${patch}`, 0, `speedlim-${patch}`, 0);
    generateLink(`speedlim-${patch}`, 0, "toNode", 0);
    pos += 120;
  }

  // update created boxes
  await Max.setDict(boxesDictName, existingBoxes);


}

Max.outlet('bootstraped');
