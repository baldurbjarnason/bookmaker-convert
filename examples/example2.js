"use strict";

var bookmaker = require("../index.js");

bookmaker.createBookFromTagsoup("joshuajones.html", "joshuajones/", {
  xml: true,
  styles: false,
  epub: false,
  fixHeadings: false,
  fixAllHeadings: false,
  mappings: [],
  wraps: [],
  stripIframes: true,
  resizeImages: true,
  chapterSelector: "._cht-",
  forceImgType: "jpg",
  process: [{ selector: "._idGenObjectLayout-1", processFunction: function ($) {
    return function () {
      this.tagName = "figure";
    };
  } }]
}).then(function (book) {
  bookmaker.createDocument(book, "index.html", { addCover: false });
});
