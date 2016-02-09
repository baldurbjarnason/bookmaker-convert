"use strict";

var postcss = require("postcss");
var postcssPrefix = require("./css-prefixer.js");
var postcssImporter = require("./css-importer.js");
var postcssMapUrl = require("postcss-map-url");
var url = require("url");
var fs = require("fs-extra");
var path = require("path");
var Promise = require("bluebird");

function mapUrlForItem (item) {
  return function mapUrl (origUrl) {
    origUrl = url.resolve(item.href, origUrl);
    return url.resolve(item.target, origUrl);
  };
}

function fixUrl (manifest) {
  return manifest.map(function (item) {
    if (item.type === "text/css") {
      item.contents = postcss([postcssMapUrl(mapUrlForItem(item))]).process(item.contents).css;
    }
    return item;
  });
}

function prefixCSS (styles, ids) {
  return Promise.all(styles.map(function (sheet) {
    ids = ids || sheet.ids;
    var processor = postcss([postcssPrefix(sheet.prefix, "paged-chapter-body", ids), postcssImporter()]);
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
  writeCSS: writeCSS,
  fixUrl: fixUrl
};
