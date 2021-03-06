"use strict";

var sanitize = require("sanitize-html");
var sanityOptions = require("./whitelist.js");
var url = require("url");
var cheerio = require("cheerio");
var getZeroPaddedStringCounter = require("./util.js").getZeroPaddedStringCounter;
var intersection = require("array-intersection");
var diff = require("arr-diff");
var path = require("path");

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

function imgSizes ($, manifest, documentHref) {
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
  }).toArray();
  return {
    titles: titles,
    creators: creators,
    languages: languages
  };
}

function prefixEpubTypes (types) {
  return types.split(/\s+/g).map(function (type) {
    return "doc-" + type;
  }).join(" ");
}

function epubtypeToRole ($) {
  $("[epub\\:type]").each(function () {
    // If there is a pre-existing role in the source, assume that the epub:type is there for
    // legacy purposes and that the document author knew what they were doing.
    var types = prefixEpubTypes($(this).attr("epub:type")).split(/\s+/g).map(function (type) { return "doc-" + type; }).join(" ");
    var roles = $(this).attr("role") ? $(this).attr("role") + " " + types : types;
    $(this).attr("role", roles);
    $(this).removeAttr("epub:type");
  });
  return $;
}

function encodeHref (documentHref, href) {
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
      bfHref = new Buffer(href);
      codedHref = "#d" + bfHref.toString("hex") + hash;
    } else {
      href = url.resolve(documentHref, href);
      bfHref = new Buffer(href);
      codedHref = "#d" + bfHref.toString("hex");
    }
  } else {
    // Do nothing, don't change the href
    codedHref = href;
  }
  return codedHref;
}

function encodeSrcset (documentHref, srcset) {
  return srcset.split(/\,\s*/g).map(function (item) {
    item = item.split(/\s+/);
    item[0] = encodeHref(documentHref, item[0]);
    return item.join(" ");
  }).join(", ");
}

function processLinks ($, manifest, documentHref) {
  $("a").each(function () {
    var el = $(this);
    var href = $(this).attr("href");
    var item = manifest.filter(function (item) { return item.href === url.resolve(documentHref, href); });
    if (item.length !== 0 && ((item[0].type === "application/xhtml+xml") || (item && item[0].type === "text/html"))) {
      el.attr("href", encodeHref(documentHref, href));
    }
  });
  $("[src]").each(function () {
    // url.resolve here means that if the src is remote, you'll get back the remote url,
    // otherwise you should get back what corresponds to the href property in the manifest items.
    // Of course, this doesn't handle absolute urls in src attributes, nor srcset.
    var fullHref = url.resolve(documentHref, $(this).attr("src"));
    $(this).attr("src", fullHref);
  });
  $("[srcset]").each(function () {
    var srcset = $(this).attr("srcset");
    $(this).attr("srcset", encodeSrcset(documentHref, srcset));
  });

  return $;
}

function processIDs ($, documentHref) {
  return $("[id]").map(function () {
    var el = $(this);
    var id = el.attr("id");
    var bfHref = new Buffer(documentHref);
    var codedHref = "d" + bfHref.toString("hex") + "-" + id;
    el.attr("id", codedHref);
    return {
      id: id,
      encoded: codedHref
    };
  }).toArray().reduce(function (prev, curr) {
    prev[curr.id] = curr.encoded;
    return prev;
  }, {});
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

function sanitizeHTML (html) {
  var cleanHTML = sanitize(html, sanityOptions);
  return cleanHTML;
}

function guideToLandmarks (OPF) {
  var list = OPF("guide > reference").map(function () {
    if (OPF(this).attr("type") === "text") {
      OPF(this).attr("type", "bodymatter");
    }
    var href = encodeHref(OPF("package").attr("data-full-path"), OPF(this).attr("href"));
    return "<li><a href='" + href + "' epub:type='" + OPF(this).attr("type") + "'>" + OPF(this).attr("title") + "</a></li>";
  }).toArray().join("\n");
  return "<ol>" + list + "</ol>";
}

function ncxToNav ($, navPoints, OPF) {
  var nav = ["<ol>"];
  navPoints.each(function () {
    var href = encodeHref(OPF("package").attr("data-full-path"), $("content", this).attr("src"));
    var li = "<li>\n\t<a href='" + href + "'>" + $("navLabel > text", this).text() + "</a>";
    nav.push(li);
    if ($(this).children("navPoint")) {
      nav.push(ncxToNav($, $(this).children("navPoint")), OPF);
    }
    nav.push("</li>");
  });
  nav.push("</ol>");
  return nav.join("\n");
}

function outlineAndLandmarks (manifest, OPF) {
  var nav = manifest.filter(function (item) { return item.properties.indexOf("nav") !== -1; })[0];
  var $;
  if (nav) {
    $ = cheerio.load(nav.contents, {
      normalizeWhitespace: false,
      xmlMode: nav.type === "application/xhtml+xml"
    });
    $ = processLinks($, manifest, nav.href);
    return {
      outline: $("nav[epub\\:type='toc']").html(),
      landmarks: $("nav[epub\\:type='landmarks']").html()
    };
  } else {
    var navId = OPF("spine").attr("toc");
    nav = manifest.filter(function (item) { return item.id === navId; })[0];
    $ = cheerio.load(nav, {
      normalizeWhitespace: false,
      xmlMode: true
    });
    return {
      landmarks: guideToLandmarks(OPF),
      outline: ncxToNav($, $("navMap").children("navPoint"), OPF)
    };
  }
}

function toChapter (chapter, manifest, options) {
  var $ = cheerio.load(chapter.contents, {
    normalizeWhitespace: false,
    xmlMode: options.xml
  });
  processLinks($, manifest, chapter.href);
  chapter.ids = processIDs($, chapter.href);
  var bfHref = new Buffer(chapter.href);
  chapter.identifier = "d" + bfHref.toString("hex");
  if (options.counter) {
    $("*").each(function () {
      if (!$(this).attr("id")) {
        var hash = "loc" + options.counter();
        $(this).attr("id", hash);
      }
    });
  }
  if (!options.styles) {
    stripStyles($);
  } else {
    chapter.styles = $("link[rel~='stylesheet'], style").map(function () {
      if ($(this).attr("href")) {
        return url.resolve(chapter.href, $(this).attr("href"));
      }
    }).toArray();
    chapter.styleElements = $("style").map(function () {
      $(this).text();
    }).toArray();
    if (chapter.styleElements.length !== 0) {
      var chapterStyles = {
        contents: chapter.styleElements.join("\n/* */"),
        href: url.resolve(chapter.href, path.basename(chapter.href, path.extname(chapter.href)) + ".css"),
        type: "text/css"
      };
      manifest.push(chapterStyles);
      chapter.styles.push(chapterStyles.href);
    }
  }
  stripScripts($);
  if (options.stripIframes) {
    stripElement($, "iframe");
  }
  if (options.epub) {
    epubtypeToRole($);
  }
  if (options.resizeImages) {
    imgSizes($, manifest, chapter.href);
  }
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
  chapter.bodyClasses = $("body").attr("class");
  chapter.htmlClasses = $("html").attr("class");
  chapter.bodyId = $("body").attr("id");
  chapter.htmlId = $("html").attr("id");
  chapter.htmlRole = $("html").attr("role");
  chapter.bodyRole = $("body").attr("role");
  chapter.title = $("title").text();
  chapter.contents = sanitizeHTML($("body").html());
  return chapter;
}

function findCommonStyleSheets (chapters) {
  return intersection.apply(undefined, chapters.map(function (chapter) {
    return chapter.styles;
  }));
}

function processChapters (book, options) {
  var chapters = book.chapters();
  var manifest = book.manifest;
  options = Object.assign({
    xml: true,
    counter: getZeroPaddedStringCounter(),
    styles: true,
    epub: true,
    fixHeadings: true,
    fixAllHeadings: true,
    mappings: [],
    wraps: [],
    stripIframes: true,
    resizeImages: true,
    tagPrefix: "bm"
  }, options);
  chapters = chapters.map(function (item) {
    if (item.type === "text/html") {
      options.xml = false;
    } else {
      options.xml = true; // Need both cases because options is shared across all chapters. Dumb of me.
    }
    return toChapter(item, manifest, options);
  });
  if (options.styles) {
    book.stylesheetUrls = findCommonStyleSheets(chapters);
    book.stylesheets = book.stylesheetUrls.map(function (sheetHref) {
      return Object.assign({}, manifest.filter(function (file) { return file.href === sheetHref; })[0]);
    });
    chapters = chapters.map(function (item, index) {
      var stylesheetUrls = diff(item.styles, book.stylesheetUrls);
      if (!item.htmlId) {
        item.htmlId = "chapter" + index;
      }
      var styles = stylesheetUrls.map(function (sheetHref) {
        var style = Object.assign({}, manifest.filter(function (file) { return file.href === sheetHref; })[0]);
        // This lets us properly process the CSS later
        style.prefix = item.htmlId;
        style.ids = item.ids;
        return sheetHref;
      });
      book.stylesheets.concat(styles);
      return item;
    });
  }
  book.manifest = manifest;
  return book;
}

module.exports = {
  shiftHeadings: shiftHeadings,
  selectorToTag: selectorToTag,
  wrap: wrap,
  wrapAll: wrapAll,
  imgSizes: imgSizes,
  buildMetaFromHTML: buildMetaFromHTML,
  epubtypeToRole: epubtypeToRole,
  processIDs: processIDs,
  processLinks: processLinks,
  stripStyles: stripStyles,
  stripScripts: stripScripts,
  sanitizeHTML: sanitizeHTML,
  fixHeadings: fixHeadings,
  toChapter: toChapter,
  outlineAndLandmarks: outlineAndLandmarks,
  processChapters: processChapters
};
