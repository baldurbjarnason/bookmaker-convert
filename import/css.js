"use strict";

var postcss = require("postcss");
var postcssPrefix = require("./css-prefixer.js");
var url = require("url");
var fs = require("fs-extra");
var path = require("path");
var Promise = require("bluebird");

function prefixCSS (styles, ids) {
  return Promise.all(styles.map(function (sheet) {
    ids = ids || sheet.ids;
    var processor = postcss([postcssPrefix(sheet.prefix, "paged-chapter-body", ids)]);
    var processedSheet = Object.assign({}, sheet, {
      contents: processor.process(sheet.contents, { from: sheet.href, to: url.resolve(sheet.target, sheet.href), map: true})
    });
    return Promise.props(processedSheet);
  })).then(function (styles) {
    return styles.map(function (sheet) {
      sheet.contents = sheet.contents.css;
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
