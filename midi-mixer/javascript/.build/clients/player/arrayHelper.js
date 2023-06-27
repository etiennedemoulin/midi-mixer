export function removeFromArray(array, e) {
  const index = array.indexOf(e);
  if (index !== -1) {
    array.splice(index, 1);
  }
  ;
  return array;
}
//# sourceMappingURL=./arrayHelper.js.map