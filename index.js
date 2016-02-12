"use strict";

var Promise = require("bluebird");
Promise.promisifyAll(require("mkdirp"));
Promise.promisifyAll(require("easy-gd"));
Promise.promisifyAll(require("glob"));
Promise.promisifyAll(require("fs-extra"));
var epub = require("./import/epub.js");
var tagsoup = require("./import/tagsoup.js");
var document = require("./import/document.js");

module.exports = {
  createBookFromEpub: epub.createBook,
  createBookFromTagsoup: tagsoup.createBookFromTagsoup,
  createDocument: document.createDocument
};
