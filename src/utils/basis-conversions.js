export function userToRaw(dB, transfertTable) {
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

  const raw = interpIndex / transfertTable.length;
  return raw;
}

export function rawToUser(raw, transfertTable) {
  if (transfertTable) {
    const interpIndex = raw * (transfertTable.length - 1);
    const lowIndex = Math.floor(interpIndex);
    const highIndex = Math.ceil(interpIndex);
    const rawDist = interpIndex - lowIndex;
    const dBDist = Math.abs(transfertTable[lowIndex] - transfertTable[highIndex]);
    const dB = transfertTable[lowIndex] + dBDist * rawDist;
    return dB;
  } else {
    return raw;
  }
}


export function rawToBytes(raw) {
  const decimal = parseInt(raw * (Math.pow(2,14) - 1));
  const msb = decimal >> 7;
  const lsb = decimal & 0b00000001111111;
  return [msb, lsb];
}

export function bytesToRaw(msb, lsb) {
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
