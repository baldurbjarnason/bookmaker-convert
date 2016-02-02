"use strict";

var Promise = require("bluebird");
var sanitizer = require("sanitizer");
var url = require("url");

function shiftHeadingsSync ($) {
  $("h4").each(function () {
    this.tagName = "h5";
  });
  $("h3").each(function () {
    this.tagName = "h4";
  });
  $("h2").each(function () {
    this.tagName = "h3";
  });
  $("h1").each(function () {
    this.tagName = "h2";
  });
}

function selectorToTag ($, selector, tag) {
  $(selector).each(function () {
    this.tagName = tag;
  });
  return Promise.resolved($);
}

function wrapSync ($, selector, tag) {
  var tagElement = "<" + tag + "></" + tag + ">";
  $(selector).before(tagElement);
  $(selector).each(function () {
    var previous = this.previousSibling;
    $(this).remove();
    $(previous).append(this);
  });
}

function wrapAll ($, selector, tag, include) {
  return new Promise(function (resolve, reject) {
    // Include is a selector for elements we want to include in the wrap as long as they follow the original selector.
    var negateNext;
    if (include) {
      negateNext = "p:not(" + include + ")";
    } else {
      negateNext = "p:not(" + selector + " + " + selector + ")";
    }
    $(selector).not(selector + "+" + selector).before("<" + tag + "></" + tag + ">");
    $(selector).not(selector + "+" + selector).each(function () {
      var previous = this.previousSibling;
      var next = $(this).nextUntil(negateNext);
      console.log(next.length);
      $(this).remove();
      next.remove();
      $(previous).append(this);
      next.each(function () {
        $(previous).append($(this));
      });
    });
    resolve($);
  });
}

function fixHeadings ($, fixAll) {
  return new Promise(function (resolve, reject) {
    var h1s = $("h1:not(h1+h1)");
    var h1 = h1s.first();
    shiftHeadingsSync($);
    if (!fixAll) {
      h1.get(0).tagName = "h1";
    }
    resolve($);
  });
}

function processHTMLForMedia ($, manifest, documentHref) {
  return new Promise(function (resolve, reject) {
    $("img").map(function () {
      var href = url.resolve(documentHref, $(this).attr("src"));
      var file = manifest.filter(function (item) { item.href === href; })[0];
      if ($(this).attr("width")) {
        file.width = $(this).attr("width");
      }
      if ($(this).attr("height")) {
        file.height = $(this).attr("height");
      }
      return file;
    });
    resolve($, manifest);
  });
}

function buildMetaFromHTML ($) {
  var titleText = $("meta[property='og\\:title']").attr("content") || $("meta[name='title']").attr("content");
  var titles = [{
    type: "title",
    value: titleText
  }];
  var authors = $("meta[property='og\\:author']") || $("meta[name='author']");
  var languages = [{
    type: "language",
    value: $("html").attr("lang")
  }];
  var creators = authors.map(function () {
    return {
      type: "creator",
      value: $(this).attr("content")
    };
  });
  return Promise.resolved({
    titles: titles,
    creators: creators,
    languages: languages
  });
}

function processHTMLFootnotes ($) {
  return new Promise(function (resolve, reject) {
    wrapSync($, "[rel='footnote']", "bookmaker-reference");
    $("[rel='footnote']").each(function () {
      var target = $(this).attr("href");
      if (target[0] === "#") {
        wrapSync($, target, "bookmaker-footnote");
      }
    });
    resolve($);
  });
}

function processEPUBFootnotes ($) {
  return new Promise(function (resolve, reject) {
    wrapSync($, "[epub\\:type='noteref']", "paged-reference");
    wrapSync($, "[epub\\:type='footnote']", "paged-footnote");
    resolve($);
  });
}

function epubtypeToRole ($) {
  return new Promise(function (resolve, reject) {
    $("[epub\\:type]").each(function () {
      var type = $(this).attr("epub:type");
      var roles = $(this).attr("role") ? $(this).attr("role") + " " + type : type;
      $(this).attr("role", roles);
      $(this).removeAttr("epub:type");
    });
    resolve($);
  });
}

function processLinksSync ($, documentHref) {
  $("a").each(function () {
    var el = $(this);
    var href = $(this).attr("href");
    var parsedHref = url.parse(href);
    var bfHref = new Buffer(href);
    var codedHref = "#d" + bfHref.toString("hex");
    if (href.startsWith("#")) {
      codedHref = "#d" + bfHref.toString("hex") + "-" + href.slice(1);
    } else if (!parsedHref.protocol && !parsedHref.host) {
      if (parsedHref.hash) {
        var hash = "-" + parsedHref.hash.slice(1);
        parsedHref.hash = "";
        href = url.format(parsedHref);
      }
      href = url.resolve(documentHref, href);
      bfHref = new Buffer(href);
      codedHref = "#d" + bfHref.toString("hex") + hash;
    }
    el.attr("href", codedHref);
  });
  return $;
}

// Remember to add the root id on each processed HTML file.

function processIDsSync ($, documentHref) {
  $("[id]").each(function () {
    var el = $(this);
    var id = el.attr("id");
    var bfHref = new Buffer(documentHref);
    var codedHref = "d" + bfHref.toString("hex") + "-" + id;
    el.attr("id", codedHref);
  });
  return $;
}

function stripElementSync ($, tagName) {
  $(tagName).remove();
}

function stripAttributeSync ($, attributeName) {
  $("[" + attributeName + "]").removeAttr(attributeName);
}

function stripStyles ($) {
  stripElementSync($, "style");
  stripAttributeSync($, "style");
  $("link").map(function () {
    if ($(this).attr("type") === "text/css") {
      $(this).remove();
    }
  });
  return Promise.resolved($);
}

function stripScripts ($) {
  stripElementSync($, "script");
  return Promise.resolved($);
}

function sanitizeHTML ($) {
  return new Promise(function (resolve, reject) {
    var cleanHTML = sanitizer.sanitize($.html());
    resolve(cleanHTML);
  });
}

module.exports = {
  shiftHeadingsSync: shiftHeadingsSync,
  selectorToTag: selectorToTag,
  wrapSync: wrapSync,
  wrapAll: wrapAll,
  processHTMLForMedia: processHTMLForMedia,
  buildMetaFromHTML: buildMetaFromHTML,
  processHTMLFootnotes: processHTMLFootnotes,
  processEPUBFootnotes: processEPUBFootnotes,
  epubtypeToRole: epubtypeToRole,
  processIDsSync: processIDsSync,
  processLinksSync: processLinksSync,
  stripStyles: stripStyles,
  stripScripts: stripScripts,
  sanitizeHTML: sanitizeHTML,
  fixHeadings: fixHeadings
};
