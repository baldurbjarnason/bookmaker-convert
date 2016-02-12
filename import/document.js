"use strict";

var cheerio = require("cheerio");
var fs = require("fs-extra");
var path = require("path");
var htmlTemplate = fs.readFileSync(path.resolve(__dirname, "template.html"));

function mintTag (prefix, tagname, contents) {
  contents = contents || "\n";
  var tag = "<" + prefix + "-" + tagname + " class='" + prefix + "-" + tagname + "'>" + contents + "</" + prefix + "-" + tagname + ">";
  return tag;
}

function addStyle ($, style) {
  var styleElement = "<style type='text/css'>\n" + style + "</style>";
  $("head").append(styleElement);
}

function addChapter ($, chapter, options) {
  var chapterElement = $(mintTag(options.tagPrefix, "chapter"));
  var chapterBodyElement = $(mintTag(options.tagPrefix, "chapter-body", chapter.contents));
  chapterElement.attr("id", chapter.htmlId);
  chapterElement.attr("class", chapter.htmlClasses);
  chapterElement.attr("role", chapter.htmlRole);
  chapterBodyElement.attr("id", chapter.bodyId);
  chapterBodyElement.attr("class", chapter.bodyClasses);
  chapterElement.addClass(options.tagPrefix + "-chapter");
  chapterBodyElement.addClass(options.tagPrefix + "-chapter-body");
  chapterBodyElement.attr("role", chapter.bodyRole);
  chapterElement.append(chapterBodyElement);
  chapterElement.append("\n");
  $(options.tagPrefix + "book" + " > " + options.tagPrefix + "book-body").append(chapterElement);
  $(options.tagPrefix + "book" + " > " + options.tagPrefix + "book-body").append("\n");
}

function addCover ($, meta, options) {
  var cover = $(mintTag(options.tagPrefix, "cover"));
  var h1 = $("<h1 class='title'></h1>").text(meta.titles[0].value);
  var h2 = $("<h2 class='author'></h2>").text(meta.creators[0].value);
  cover.append(h1).append(h2);
  $(mintTag(options.tagPrefix, "book")).prepend(cover);
}

function createDocument (book, filename, options) {
  options = Object.assign({
    tagPrefix: "bm"
  }, options);
  var $ = cheerio.load(htmlTemplate);
  for (var style of book.stylesheets) {
    addStyle($, style.contents, options);
  }
  $("head").append("<script async src='bookmaker.js'></script>");
  $("title").text(book.meta.titles[0].value);
  addCover($, book.meta, options);
  for (var chapter of book.chapters) {
    addChapter($, chapter, options);
  }
  $(options.tagPrefix + "-book").attr("meta", "book.json");
  return fs.writeFileAsync(path.resolve(book.target, "book.json"), JSON.stringify(book.meta)).then(function () {
    return fs.writeFileAsync(path.resolve(book.target, filename), $.html());
  }).then(function () {
    return true;
  });
}

module.exports = {
  createDocument: createDocument
};
