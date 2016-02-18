"use strict";

var html = require("./html.js");
var cheerio = require("cheerio");
var path = require("path");
var fs = require("fs-extra");
var getZeroPaddedStringCounter = require("./util.js").getZeroPaddedStringCounter;
var url = require("url");
var resizeImagesToMatch = require("./images.js").resizeImagesToMatch;

function wrapChapters ($, selectors) {
  var counter = getZeroPaddedStringCounter();
  var chapters = [];
  $(selectors).each(function () {
    var chapter = $("<div class='chapter-wrapper'></div>");
    var chapterBody = $(this).nextUntil(selectors);
    chapterBody.remove();
    chapter.append($(this));
    chapter.append(chapterBody);
    chapters.push({ contents: chapter.html(), htmlId: "chapter" + counter() });
  });
  return chapters;
}

function createBookFromTagsoup (filename, target, options) {
  options = Object.assign({
    xml: true,
    counter: getZeroPaddedStringCounter(),
    styles: false,
    epub: false,
    fixHeadings: true,
    fixAllHeadings: true,
    mappings: [],
    wraps: [],
    stripIframes: true,
    resizeImages: true,
    chapterSelector: "h1, h2, .chapter-break",
    forceImgType: false
  }, options);
  var book = {};
  return fs.readFileAsync(filename, "utf8").then(function (rawfile) {
    var $ = cheerio.load(rawfile, {
      normalizeWhitespace: true,
      xmlMode: options.xml
    });
    if (options.counter) {
      $("*").each(function () {
        if (!$(this).attr("id")) {
          var hash = "loc" + options.counter();
          $(this).attr("id", hash);
        }
      });
    }
    if (options.transforms) {
      for (var selector in options.transforms) {
        $(selector).each(options.transforms[selector]);
      }
    }
    if (!options.styles) {
      $ = html.stripStyles($);
    }
    if (!options.scripts) {
      $ = html.stripScripts($);
    }
    if (options.process) {
      options.process.forEach(function (item) {
        $(item.selector).each(item.processFunction($));
      });
    }
    book.images = [];
    $("[src]").each(function () {
      var src = $(this).attr("src");
      var img = {
        href: url.resolve(filename, $(this).attr("src"))
      };
      if (path.extname(img.href) === ".png") {
        img.type = "image/png";
      } else if ((path.extname(img.href) === ".jpeg") || (path.extname(img.href) === ".jpg")) {
        img.type = "image/jpeg";
      } else if (path.extname(img.href) === ".gif") {
        img.type = "image/gif";
      }
      img.target = target;
      var srcFile = url.resolve(filename, $(this).attr("src"));
      var targetFile = url.resolve(target, srcFile);
      fs.copySync(path.resolve(srcFile), path.resolve(targetFile));
      if (options.forceImgType !== false) {
        $(this).attr("src", src.replace(path.extname(src), "." + options.forceImgType));
        img.newhref = $(this).attr("src");
      }
      book.images.push(img);
    });
    book.meta = html.buildMetaFromHTML($);
    book.chapters = wrapChapters($, options.chapterSelector);
    book.target = target;
    return resizeImagesToMatch(book.images);
  }).then(function () {
    return book;
  });
}

module.exports = {
  createBookFromTagsoup: createBookFromTagsoup
};
