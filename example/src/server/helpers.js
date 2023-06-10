import * as MCU from './mackie-control.cjs';
import path from 'path';
import fs from 'fs';

function dBtoRaw(dB, transfertTable) {
  const nearestdB = transfertTable.reduce((a, b) => {
    return Math.abs(b - dB) < Math.abs(a - dB) ? b : a;
  });
  const index = transfertTable.findIndex(e => e === nearestdB);
  return (index / transfertTable.length);
}

function rawtodB(raw, transfertTable) {
  const index = parseInt(raw * (transfertTable.length - 1));
  const dB = Math.round(transfertTable[index] * 100) / 100;
  return dB;
}

function rawtoLin(raw, range) {
  const sens = (range[1] > range[0]) ? 1 : -1;
  const amplitude = Math.abs(range[1] - range[0]);
  const lin = range[0] + sens * (raw * amplitude);
  return (Math.round(lin * 100) / 100);
}

function linToRaw(lin, range) {
  const sens = (range[1] > range[0]) ? 1 : -1;
  const amplitude = Math.abs(range[1] - range[0]);
  const raw = sens * (lin - range[0]) / amplitude;
  return raw;
}

export function rawToUser(raw, transfertTable, currentValues) {
  // currentValues.faderType is volume or linear - possibly expand to exponential, polynomial, logarithmic
  switch (currentValues.faderType) {
  case 'volume':
    return rawtodB(raw, transfertTable);
    break;
  case 'linear':
    return rawtoLin(raw, currentValues.faderRange[0]);
    break;
  default:
    throw new Error(`${currentValues.faderType} is not defined`);
  }
}

export function userToRaw(raw, transfertTable, currentValues) {
  // currentValues.faderType is volume or linear - possibly expand to exponential, polynomial, logarithmic
  switch (currentValues.faderType) {
  case 'volume':
    return dBtoRaw(raw, transfertTable);
    break;
  case 'linear':
    return linToRaw(raw, currentValues.faderRange[0]);
    break;
  default:
    throw new Error(`${currentValues.faderType} is not defined`);
  }
}

// return range and normalized range (dans le bon sens..).
export function getFaderRange(config) {
  if (config.range && config.range.length === 2 && config.type !== 'volume') {
    const min = parseFloat(config.range[0]);
    const max = parseFloat(config.range[1]);
    const normRange = (max > min ? [min, max] : [max, min]);
    return [[min, max],normRange];
  } else if (config.type !== 'volume') {
    return [[0, 1], [0, 1]];
  } else if (config.type === 'volume') {
    return [[-144.5, 12], [-144.5, 12]];
  } else {
    throw new Error("Can't parse fader range");
  }
}


export function parseTrackConfig(config) {
  const range = getFaderRange(config);

  return {
    patch: config.patch,
    name: config.name,
    faderType: config.type,
    faderRange: range,
  };
}

export function initMidiDevice(midiDevice) {
  MCU.stop();
  const port = MCU.getPorts().findIndex(e => e === midiDevice);

  if (port !== -1) {
    MCU.start(msg => {
      console.log('Midi Init:', midiDevice);
    }, { port: port });
  } else {
    console.log("[midi.mixer] - Cannot find midi device !");
  }

  // init fader mode
  MCU.setFaderMode('CH1', 'position', 0);
  MCU.setFaderMode('CH2', 'position', 0);
  MCU.setFaderMode('CH3', 'position', 0);
  MCU.setFaderMode('CH4', 'position', 0);
  MCU.setFaderMode('CH5', 'position', 0);
  MCU.setFaderMode('CH6', 'position', 0);
  MCU.setFaderMode('CH7', 'position', 0);
  MCU.setFaderMode('CH8', 'position', 0);
  MCU.setFaderMode('MAIN', 'position', 0);
}


export function getMidiDeviceList() {
  const ports = MCU.getPorts();
  return ports;
}

export function getControllerList() {
  const controllersFolder = fs.readdirSync(path.resolve(process.cwd(),'./src/server/controllers'));
  const controllers = [];
  controllersFolder.forEach(e => {
    controllers.push(e.split('.').shift());
  });
  return controllers;
}
