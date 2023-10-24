import fs from 'fs';

// function dBtoRaw(dB, transfertTable) {
//   if (dB === -Infinity) {
//     dB = transfertTable[0]
//   }

//   // find nearest dB value
//   const nearestdB = transfertTable.reduce((prev, curr) => {
//     return Math.abs(curr - dB) < Math.abs(prev - dB) ? curr : prev;
//   });

//   const index = transfertTable.findIndex(e => e === nearestdB);

//   return (index / transfertTable.length);
// }

function dBtoRaw(dB, transfertTable) {
  if (dB === -Infinity) {
    dB = transfertTable[0]
  }

  // find nearest dB value
  const nearestdB = transfertTable.reduce((prev, curr) => {
    return Math.abs(curr - dB) < Math.abs(prev - dB) ? curr : prev;
  });

  const index = transfertTable.findIndex(e => e === nearestdB);
  const deltaWithTarget = dB - nearestdB;
  const sens = deltaWithTarget > 0 ? 1 : -1;

  const interpIndex = transfertTable[index+sens] ?
    index + ( deltaWithTarget /
      Math.abs(transfertTable[index + sens] - transfertTable[index])
    ) : index;

  const raw = interpIndex / transfertTable.length
  return raw;
}


function rawtodB(raw, transfertTable) {
  const interpIndex = raw * (transfertTable.length - 1);
  const lowIndex = Math.floor(interpIndex);
  const highIndex = Math.ceil(interpIndex);
  const rawDist = interpIndex - lowIndex;
  const dBDist = Math.abs(transfertTable[lowIndex] - transfertTable[highIndex]);
  const dB = transfertTable[lowIndex] + dBDist * rawDist;
  return dB;
}

function rawtoLin(raw, range) {
  const sens = (range[1] > range[0]) ? 1 : -1;
  const amplitude = Math.abs(range[1] - range[0]);
  const lin = range[0] + sens * (raw * amplitude);
  return lin;
  // return (Math.round(lin * 100) / 100);
}

function linToRaw(lin, range) {
  const sens = (range[1] > range[0]) ? 1 : -1;
  const amplitude = Math.abs(range[1] - range[0]);
  const raw = sens * (lin - range[0]) / amplitude;
  return raw;
}

export function rawToUser(raw, transfertTable, currentValues) {
  // currentValues.faderType is volume or linear - possibly expand to exponential, polynomial, logarithmic
  if (!transfertTable) {
    return null;
  } else {
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
}

export function userToRaw(user, transfertTable, currentValues) {
  // currentValues.faderType is volume or linear - possibly expand to exponential, polynomial, logarithmic
  if (!transfertTable) {
    return null;
  } else {
    switch (currentValues.faderType) {
    case 'volume':
      return dBtoRaw(user, transfertTable);
      break;
    case 'linear':
      return linToRaw(user, currentValues.faderRange[0]);
      break;
    default:
      throw new Error(`${currentValues.faderType} is not defined`);
    }
  }
}

export function rawToBytes(raw) {
  const decimal = parseInt(raw * (Math.pow(2,14) - 1));
  const msb = decimal >> 7;
  const lsb = decimal & 0b00000001111111;
  return [msb, lsb];
}

export function bytesToRaw(bytes) {
  const msb = bytes[0];
  const lsb = bytes[1];
  const decimal = (msb << 7 | lsb);
  const raw = decimal / (Math.pow(2, 14) - 1);
  return raw;
}

export function relToAbsChannel(relChannel, activePage) {
  return relChannel + (activePage * 8);
}

export function absToRelChannel(absChannel) {
  // @TODO : this function can return page..
  return (absChannel - 1) % 8 + 1;
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
    channel: config.channel,
    disabled: false,
    name: config.name,
    faderType: config.type,
    faderRange: range,
  };
}
