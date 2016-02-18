"use strict";

var bookmaker = require("../index.js");

bookmaker.createBookFromTagsoup("The_Book_of_Wag_final_ebook.xhtml", "bookofwag/", {
  xml: true,
  styles: false,
  epub: false,
  fixHeadings: false,
  fixAllHeadings: false,
  mappings: [],
  wraps: [],
  stripIframes: true,
  resizeImages: true,
  chapterSelector: ".Ch-Numbers, .chapter-title",
  forceImgType: "jpg",
  process: [{ selector: ".Ch-Numbers", processFunction: function ($) {
    return function () {
      $(this).text($(this).text().toUpperCase());
    };
  } }]
}).then(function (book) {
  bookmaker.createDocument(book, "index.html", { addCover: false });
});
