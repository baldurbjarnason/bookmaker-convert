"use strict";

var postcss = require("postcss");
var postcssPrefix = require("postcss-selector-prefix");
var url = require("url");
var fs = require("fs-extra");
var path = require("path");
var Promise = require("bluebird");

function prefixCSS (styles) {
  return Promise.all(styles.map(function (sheet) {
    var processor = postcss([postcssPrefix(sheet.prefix)]);
    sheet.processedContents = processor.process(sheet.contents, { from: sheet.href, to: url.resolve(sheet.target, sheet.href)});
    return Promise.props(sheet);
  })).then(function (styles) {
    return styles.map(function (sheet) {
      sheet.contents = sheet.processedContents.css;
      return sheet;
    });
  });
}

function writeCSS (styles) {
  return Promise.all(styles.map(function (sheet) {
    fs.outputFileAsync(path.resolve(sheet.target, sheet.href), sheet.contents);
    return path.resolve(sheet.target, sheet.href);
  }));
}

module.exports = {
  prefixCSS: prefixCSS,
  writeCSS: writeCSS
};
