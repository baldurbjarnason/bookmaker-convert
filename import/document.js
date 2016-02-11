"use strict";

var cheerio = require("cheerio");
var fs = require("fs-extra");
var path = require("path");
var htmlTemplate = fs.readFileSync(path.resolve(__dirname, "template.html"));

function addStyle ($, style) {
  var styleElement = "<style type='text/css'>\n" + style + "</style>";
  $("head").append(styleElement);
}

function addChapter ($, chapter) {
  var chapterElement = $("<bm-chapter>\n</bm-chapter>");
  var chapterBodyElement = $("<bm-chapter-body>\n" + chapter.contents + "</bm-chapter-body>");
  chapterElement.attr("id", chapter.htmlId);
  chapterElement.attr("class", chapter.htmlClasses);
  chapterElement.attr("role", chapter.htmlRole);
  chapterBodyElement.attr("id", chapter.bodyId);
  chapterBodyElement.attr("class", chapter.bodyClasses);
  chapterElement.addClass("bm-chapter");
  chapterBodyElement.addClass("bm-chapter-body");
  chapterBodyElement.attr("role", chapter.bodyRole);
  chapterElement.append(chapterBodyElement);
  chapterElement.append("\n");
  $("bm-book > bm-book-body").append(chapterElement);
  $("bm-book > bm-book-body").append("\n");
}

function addCover ($, meta) {
  var cover = $("<bm-cover class='bm-cover'></bm-cover>");
  var h1 = $("<h1 class='title'></h1>").text(meta.titles[0].value);
  var h2 = $("<h2 class='author'></h2>").text(meta.creators[0].value);
  cover.append(h1).append(h2);
  $("bm-book").prepend(cover);
}

function createDocument (book, filename) {
  var $ = cheerio.load(htmlTemplate);
  for (var style of book.stylesheets) {
    addStyle($, style.contents);
  }
  $("head").append("<script async src='bookmaker.js'></script>");
  $("title").text(book.meta.titles[0].value);
  addCover($, book.meta);
  for (var chapter of book.chapters) {
    addChapter($, chapter);
  }
  $("bm-book").attr("meta", "book.json");
  return fs.writeFileAsync(path.resolve(book.target, "book.json"), JSON.stringify(book.meta)).then(function () {
    return fs.writeFileAsync(path.resolve(book.target, filename), $.html());
  }).then(function () {
    return true;
  });
}

module.exports = {
  createDocument: createDocument
};
