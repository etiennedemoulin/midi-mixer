const path = require('path');
const open = require('open');
const JSON5 = require('json5');
const Max = require('max-api');
const { Client, Server } = require('node-osc');
const { fork } = require('child_process');

let configFilename = null;
let cwd = null;
let patchPath = null;
let boxesDictName = null;
let patchIndex = null;
let config = [];
let pos = 0;

Max.addHandlers({
  [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => onMessage(...args),
  edit: (filename) => open(configFilename),
  getPorts: () => _getPorts(),
  getDevices: () => _getDevices(),
  init: (name, patchPath, patchIndex, midiDevice, controller) => init(name, patchPath, patchIndex, midiDevice, controller),
});

// START SOUNDWORKS
const child = fork('./src/server/index.js');

process.on('exit', function() {
  child.kill();
});

process.on('error', function() {
  child.kill();
});


// ____OSC

const server = new Server(3334, '0.0.0.0');

// server.on('listening', () => {
//   console.log('OSC Server is listening.');
// })

server.on('bundle', async (msg) => {
  // console.log(msg);
  msg.elements.forEach(async (e) => {
    const address = e[0].split('/');
    address.shift();
    const trackFlag = address[0];
    if (trackFlag === 'track') {
      if (address[2] === 'create') {
        const channel = parseInt(address[1]);
        config.push({
          channel: channel,
          name: null,
        });
      } else if (address[2] === 'remove') {
        const channel = parseInt(address[1]);
        const index = config.findIndex(e => e.channel === channel);
        if (config[index].name !== null) {
          await deleteTrack([config[index]], true);
        }
        config.splice(index, 1);
      } else if (address[2] === 'name') {
        const channel = parseInt(address[1]);
        const name = e[1];
        const index = config.findIndex(e => e.channel === channel);
        if (config[index].name !== name) {
          await deleteTrack([config[index]], false);
          config[index].name = name;
          if (name !== null) {
            await createTrack([config[index]]);
          }
        }
      } else if (address[2] === 'fader') {
        const channel = parseInt(address[1]);
        const index = config.findIndex(e => e.channel === channel);
        if (index === -1) {
          // not initialized yet
          return;
        }
        const name = config[index].name;
        const dataType = address[3];
        if (name === null || e[1] === null) {
          // not a number of should not be propagated
          return;
        }
        const value = parseFloat(e[1]);

        if (dataType === 'user') {
          await Max.setDict('midiMaxDict', { patch: name, value: value });
          await Max.outlet('update bang');
        }
      }
    }
  });
});

// ____OSC

async function onMessage(...args) {
  // if (globals.state === null) {
  //   return;
  // }
  // console.log(args);

  const [key, value] = args
  const handledMessages = ['edit', 'getPorts', 'getDevices', 'init'];

  if (handledMessages.includes(key)) {
    return;
  }

  try {
    // @note - we must accept a list, because array are translated to lists by max
    try {
      const channel = config.find(e => e.name === key).channel;
      const client = new Client('127.0.0.1', 3333);
      client.send(`/track/${channel}/fader/user`, value, () => client.close());
    } catch(err) {
      console.log(err.message);
    }
  } catch(err) {
    console.error(err.message);
  }

}
function generateBox(varName, boxName, args, position, presentation, presentationPosition = {x:0, y:0}, comment) {
  existingBoxes.list.push(varName);

  const msg = `thispatcher script newobject newobj @text "${boxName} ${args.join(' ')}" @varname ${varName} @patching_position ${position.x} ${position.y} @presentation_position ${presentationPosition.x} ${presentationPosition.y} @presentation ${presentation} @comment ${comment}`;
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
async function init(name, patchPath, patchIndex, midiDevice, controller) {
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

  existingBoxes = await Max.getDict(boxesDictName);

  if (!('list' in existingBoxes)) {
    existingBoxes.list = [];
  }

  // delete previous existing boxes
  existingBoxes.list.forEach(name => {
    deleteBox(name);
  });

  existingBoxes.list = [];

};


function _getPorts() {

}

function _getDevices() {

};

// Create patch boxes and init fader values
async function createTrack(config) {
  // create patch
  for (i in config) {
    const patch = config[i].name;
    generateBox(`receive-${patch}`, "receive", [patch], { x: 600+pos, y: 400 }, 1, { x: 60, y: 10+pos/4});
    generateBox(`prepend-${patch}`, "prepend", [patch], { x: 600+pos, y: 430 }, 0);
    generateBox(`send-${patch}`, "send", [`#0_node`], { x: 600+pos, y: 460 }, 0);
    generateLink(`receive-${patch}`, 0, `prepend-${patch}`, 0);
    generateLink(`prepend-${patch}`, 0, `send-${patch}`, 0);
    pos += 120;
  }
  // update created boxes
  await Max.setDict(boxesDictName, existingBoxes);
}

async function deleteTrack(config, decrement) {
  for (i in config) {
    const patch = config[i].name;
    deleteBox(`receive-${patch}`);
    deleteBox(`set-${patch}`);
    deleteBox(`numbox-${patch}`);
    deleteBox(`prepend-${patch}`);
    deleteBox(`send-${patch}`);

    if (decrement) {
      pos -= 120;
      pos = Math.max(pos, 0);
    }
  }
}

Max.outlet('bootstraped');
