"use strict";

var Promise = require("bluebird");
var gd = require("easy-gd");
var path = require("path");

function resizeImagesToMatch (images) {
  images = images.filter(function (item) {
    return item.type !== "image/svg+xml";
  });
  return Promise.all(images.map(function (img) {
    var sizes = {};
    var href;
    if (img.newhref) {
      href = img.newhref;
    } else {
      href = img.href;
    }
    var saveOptions;
    if ((path.extname(href) === ".jpg") || (path.extname(href) === ".jpeg")) {
      saveOptions = { quality: 70};
    } else if (path.extname(href) === ".png") {
      saveOptions = { compression: 6 };
    } else {
      saveOptions = {};
    }
    if (img.width) {
      sizes.width = Math.min(Number.parseInt(img.width, 10) * 2, 2000);
    } else if (img.height) {
      sizes.height = Math.min(Number.parseInt(img.height, 10) * 2, 2000);
    }
    if (sizes) {
      return gd.openAsync(path.resolve(img.target, img.href)).then(function (image) {
        image.saveAlpha(100);
        return image.resizeAsync(sizes);
      }).then(function (image) {
        return image.saveAsync(path.resolve(img.target, href), saveOptions);
      }).then(function () {
        return img;
      });
    } else {
      return gd.openAsync(path.resolve(img.target, img.href)).then(function (image) {
        return image.resizeAsync({width: 2000, height: 2000});
      }).then(function (resized) {
        return resized.saveAsync(path.resolve(img.target, href), saveOptions);
      });
    }
  }));
}

module.exports = {
  resizeImagesToMatch: resizeImagesToMatch
};
