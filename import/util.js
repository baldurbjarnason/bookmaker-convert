"use strict";

function getZeroPaddedStringCounter () {
  var counter = 0;
  return function () {
    counter = counter + 1;

    return ("0000000000" + counter).slice(-10);
  };
}

module.exports = {
  getZeroPaddedStringCounter: getZeroPaddedStringCounter
};
