const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const { Client, Server } = require('node-osc');

let configFilename = null;
let cwd = null;
let patchPath = null;
let boxesDictName = null;
let patchIndex = null;

Max.addHandlers({
  [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => onMessage(...args),
  edit: (filename) => open(configFilename),
  getPorts: () => _getPorts(),
  getDevices: () => _getDevices(),
  init: (name, patchPath, patchIndex, midiDevice, controller) => init(name, patchPath, patchIndex, midiDevice, controller),
});

// ____OSC

const server = new Server(3334, '0.0.0.0');

// server.on('listening', () => {
//   console.log('OSC Server is listening.');
// })

server.on('bundle', async (msg) => {
  msg.elements.forEach(async (e) => {
    const address = e[0].split('/');
    address.shift();
    const trackFlag = address[0];
    const trackNumber = 'midi-'+address[1];
    const faderFlag = address[2];
    const dataType = address[3];
    const value = parseFloat(e[1]);

    if (trackFlag === 'track' && faderFlag === 'fader') {
      // this is a fader
      if (dataType === 'user') {
        // propagating user value
        await Max.setDict('midiMaxDict', {patch:trackNumber, value:value});
        await Max.outlet('update bang');
      }
    }
    // Max.outlet(e);
  });
});

// ____OSC

async function onMessage(...args) {
  // if (globals.state === null) {
  //   return;
  // }

  const handledMessages = ['edit', 'getPorts', 'getDevices', 'init'];

  const cmd = args[0];

  if (handledMessages.includes(cmd)) {
    return;
  }

  try {
    // @note - we must accept a list, because array are translated to lists by max
    const key = args.shift();

    const value = args[0];

    try {
      const trackId = key.split('-')[1];
      const client = new Client('127.0.0.1', 3333);
      client.send(`/track/${trackId}/fader/user`, value, () => {
        client.close();
      });

      // await globals.state.set({ [key]: value });
    } catch(err) {
      console.log(err.message);
    }
  } catch(err) {
    console.error(err.message);
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

// Init when Max is ready
function init(name, patchPath, patchIndex, midiDevice, controller) {
  patchIndex = patchIndex;
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
};


function _getPorts() {
  XT.getPorts().forEach((e,i) => {
    Max.post(`[midi.mixer] - #${i}: ${e}`);
  });
}

function _getDevices() {
  const controllers = fs.readdirSync('../Controllers');
  controllers.forEach(e => {
    console.log(`${e.split('.').shift()}`);
  });
};

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
    generateBox(`set-${patch}`, "prepend", ['set'], { x: 600+pos, y: 430 }, 0);
    generateBox(`numbox-${patch}`, "flonum", [''], { x: 600+pos, y: 460 }, 0);
    generateBox(`prepend-${patch}`, "prepend", [`${patch}`], { x: 600+pos, y: 490 }, 0);
    generateBox(`send-${patch}`, "send", [`#0_node`], { x: 600+pos, y: 520 }, 0);
    generateLink(`receive-${patch}`, 0, `set-${patch}`, 0);
    generateLink(`set-${patch}`, 0, `numbox-${patch}`, 0);
    generateLink(`numbox-${patch}`, 0, `prepend-${patch}`, 0);
    generateLink(`prepend-${patch}`, 0, `send-${patch}`, 0);
    pos += 120;
  }

  // update created boxes
  await Max.setDict(boxesDictName, existingBoxes);


}

Max.outlet('bootstraped');
