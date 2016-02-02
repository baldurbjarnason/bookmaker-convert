"use strict";

function getZeroPaddedStringCounter () {
  var counter = 0;
  return function () {
    counter = counter + 1;

    return ("000000" + counter).slice(-6);
  };
}

module.exports = {
  getZeroPaddedStringCounter: getZeroPaddedStringCounter
};
