"use strict";

var sanitizer = require("sanitizer");
var url = require("url");
var cheerio = require("cheerio");
var crypto = require("crypto");

function shiftHeadings ($) {
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
  return $;
}

function wrap ($, selector, tag) {
  var tagElement = "<" + tag + "></" + tag + ">";
  $(selector).before(tagElement);
  $(selector).each(function () {
    var previous = this.previousSibling;
    $(this).remove();
    $(previous).append(this);
  });
}

function wrapAll ($, selector, tag, include) {
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
  return $;
}

function fixHeadings ($, fixAll) {
  var h1s = $("h1:not(h1+h1)");
  var h1 = h1s.first();
  shiftHeadings($);
  if (!fixAll) {
    h1.get(0).tagName = "h1";
  }
  return $;
}

function processHTMLForMedia ($, manifest, documentHref) {
  $("img").map(function () {
    var href = url.resolve(documentHref, $(this).attr("src"));
    var file = manifest.filter(function (item) { return item.href === href; })[0];
    if ($(this).attr("width")) {
      file.width = $(this).attr("width");
    }
    if ($(this).attr("height")) {
      file.height = $(this).attr("height");
    }
    return file;
  });
  return manifest;
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
  return {
    titles: titles,
    creators: creators,
    languages: languages
  };
}

function processHTMLFootnotes ($) {
  wrap($, "[rel='footnote']", "bookmaker-reference");
  $("[rel='footnote']").each(function () {
    var target = $(this).attr("href");
    if (target[0] === "#") {
      wrap($, target, "bookmaker-footnote");
    }
  });
  return $;
}

function processEPUBFootnotes ($) {
  wrap($, "[epub\\:type='noteref']", "paged-reference");
  wrap($, "[epub\\:type='footnote']", "paged-footnote");
  return $;
}

function epubtypeToRole ($) {
  $("[epub\\:type]").each(function () {
    var type = $(this).attr("epub:type");
    var roles = $(this).attr("role") ? $(this).attr("role") + " " + type : type;
    $(this).attr("role", roles);
    $(this).removeAttr("epub:type");
  });
  return $;
}

function processLinks ($, documentHref) {
  $("a").each(function () {
    var el = $(this);
    var href = $(this).attr("href");
    var parsedHref = url.parse(href);
    var bfHref = new Buffer(documentHref);
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

function processIDs ($, documentHref) {
  $("[id]").each(function () {
    var el = $(this);
    var id = el.attr("id");
    var bfHref = new Buffer(documentHref);
    var codedHref = "d" + bfHref.toString("hex") + "-" + id;
    el.attr("id", codedHref);
  });
  return $;
}

function stripElement ($, tagName) {
  $(tagName).remove();
}

function stripAttribute ($, attributeName) {
  $("[" + attributeName + "]").removeAttr(attributeName);
}

function stripStyles ($) {
  stripElement($, "style");
  stripAttribute($, "style");
  $("link[rel~='stylesheet']").map(function () {
    $(this).remove();
  });
  return $;
}

function stripScripts ($) {
  stripElement($, "script");
  return $;
}

function sanitizeHTML ($) {
  var cleanHTML = sanitizer.sanitize($.html());
  return cleanHTML;
}

function toChapter (chapter, manifest, options) {
  options = Object.assign({
    xml: true,
    locations: true,
    styles: true,
    epub: true,
    fixHeadings: true,
    fixAllHeadings: true,
    mappings: [],
    wraps: []
  }, options);
  var $ = cheerio.load(chapter.contents, {
    normalizeWhitespace: true,
    xmlMode: options.xml
  });
  processLinks($, chapter.originalPath);
  processIDs($, chapter.originalPath);
  var bfHref = new Buffer(chapter.originalPath);
  chapter.identifier = "d" + bfHref.toString("hex");
  if (options.locations) {
    $("*").each(function () {
      if (!$(this).attr("id")) {
        var hash = "loc" + crypto.createHash("md5").update($(this).text()).digest("hex");
        $(this).attr("id", hash);
      }
    });
  }
  if (!options.styles) {
    stripStyles($);
  } else {
    chapter.styles = $("link[rel~='stylesheet'], style").map(function () {
      if ($(this).attr("src")) {
        return {
          src: $(this).attr("src")
        };
      } else {
        return {
          content: $(this).text()
        };
      }
    }).toArray();
  }
  stripScripts($);
  if (options.epub) {
    processEPUBFootnotes($);
    epubtypeToRole($);
  }
  processHTMLForMedia($, manifest, chapter.originalPath);
  if (options.fixHeadings) {
    fixHeadings($, options.fixAllHeadings);
  }
  if (options.mappings) {
    options.mappings.forEach(function (item) {
      selectorToTag($, item.selector, item.tag);
    });
  }
  if (options.wraps) {
    options.wraps.forEach(function (item) {
      if (item.all) {
        wrapAll($, item.selector, item.tag, item.include);
      } else {
        wrap($, item.selector, item.tag);
      }
    });
  }
  chapter.contents = sanitizeHTML($);
  return chapter;
}

module.exports = {
  shiftHeadings: shiftHeadings,
  selectorToTag: selectorToTag,
  wrap: wrap,
  wrapAll: wrapAll,
  processHTMLForMedia: processHTMLForMedia,
  buildMetaFromHTML: buildMetaFromHTML,
  processHTMLFootnotes: processHTMLFootnotes,
  processEPUBFootnotes: processEPUBFootnotes,
  epubtypeToRole: epubtypeToRole,
  processIDs: processIDs,
  processLinks: processLinks,
  stripStyles: stripStyles,
  stripScripts: stripScripts,
  sanitizeHTML: sanitizeHTML,
  fixHeadings: fixHeadings,
  toChapter: toChapter
};
