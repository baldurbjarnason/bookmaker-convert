"use strict";

function getZeroPaddedStringCounter () {
  var counter = 0;
  return function () {
    counter = counter + 1;

    return counter;
  };
}

module.exports = {
  getZeroPaddedStringCounter: getZeroPaddedStringCounter
};
