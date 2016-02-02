"use strict";

var Promise = require("bluebird");
var gd = require("easy-gd");
var path = require("path");

function resizeImagesToMatch (images) {
  images = images.filter(function (item) {
    item.type !== "image/svg+xml";
  });
  return Promise.all(images.map(function (img) {
    var sizes = {};
    if (img.width) {
      sizes.width = Math.min(Number.parseInt(img.width, 10) * 2, 2000);
    } else if (img.height) {
      sizes.height = Math.min(Number.parseInt(img.height, 10) * 2, 2000);
    }
    if (sizes) {
      return gd.openAsync(path.resolve(img.target, img.href)).then(function (image) {
        image.resizeAsync(sizes);
      }).then(function (image) {
        image.saveAsync(path.resolve(img.target, img.href));
      }).then(function () {
        return img;
      });
    } else {
      return gd.openAsync(path.resolve(img.target, img.href)).then(function (image) {
        return image.resizeAsync({width: 2000, height: 2000});
      }).then(function (resized) {
        resized.saveAsync(path.resolve(img.target, img.href));
      });
    }
  }));
}

module.exports = {
  resizeImagesToMatch: resizeImagesToMatch
};
