"use strict";

var postcss = require("postcss");
var postcssPrefix = require("postcss-selector-prefix");
var url = require("url");
var fs = require("fs-extra");
var path = require("path");

function prefixCSS (styles) {
  return Promise.all(styles.map(function (sheet) {
    var processor = postcss([postcssPrefix(sheet.prefix)]);
    return processor.process(sheet.contents, { from: sheet.href, to: url.resolve(sheet.target, sheet.href)});
  }));
}

function writeCSS (styles) {
  return Promise.all(styles.map(function (sheet) {
    fs.outputFile(path.resolve(sheet.target, sheet.href), sheet.contents);
  }));
}

module.export = {
  prefixCSS: prefixCSS,
  writeCSS: writeCSS
};
