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
    }
    href = url.resolve(documentHref, href);
    bfHref = new Buffer(href);
    codedHref = "#d" + bfHref.toString("hex") + hash;
  } else {
    // Do nothing, don't change the href
    codedHref = href;
  }
  return codedHref;
}

function processLinks ($, manifest, documentHref) {
  $("a").each(function () {
    var el = $(this);
    var href = $(this).attr("href");
    var item = manifest.filter(function (item) { return item.href === url.resolve(documentHref, href); });
    if (item && (item[0].type === "application/xhtml+xml" || item[0].type === "text/html")) {
      el.attr("href", encodeHref(documentHref, href));
    }
  });
  $("[src]").each(function () {
    // url.resolve here means that if the src is remote, you'll get back the remote url,
    // otherwise you should get back what corresponds to the href property in the manifest items.
    // Of course, this doesn't handle absolute urls in src attributes.
    var fullHref = url.resolve(documentHref, $(this).attr("src"));
    $(this).attr("src", fullHref);
  });

  return $;
}

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
    $ = cheerio.load(nav, {
      normalizeWhitespace: true,
      xmlMode: nav.type === "application/xhtml+xml"
    });
    $ = processLinks($, nav.href);
    return {
      outline: $("nav[epub\\:type='toc']").html(),
      landmarks: $("nav[epub\\:type='landmarks']").html()
    };
  } else {
    var navId = OPF("spine").attr("toc");
    nav = manifest.filter(function (item) { return item.id === navId; })[0];
    $ = cheerio.load(nav, {
      normalizeWhitespace: true,
      xmlMode: true
    });
    return {
      landmarks: guideToLandmarks(OPF),
      outline: ncxToNav($, $("navMap").children("navPoint"), OPF)
    };
  }
}

function htmlSrcList ($, documentHref) {
  var manifest = $("[src]").map(function () {
    var entry = {
      href: url.resolve(documentHref, $(this).attr("src"))
    };
    return entry;
  }).toArray();
  return manifest;
}

function styleManifest (chapters, manifest) {
  var chapterManifest = [].concat(chapters.map(function (item) {
    return htmlSrcList(cheerio.load(item.contents), item.href);
  }));
  manifest = manifest
  .filter(function (item) { return item.type !== "application/xhtml+xml"; })
  .filter(function (item) { return item.type !== "text/html"; })
  .filter(function (item) { return item.type !== "text/css"; })
  .filter(function (item) { return item.type !== "application/x-dtbncx+xml"; })
  .filter(function (item) { return item.type !== "application/javascript"; })
  .filter(function (item) { return chapterManifest.indexOf(item.href) === -1; });
  return manifest;
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
    wraps: [],
    stripIframes: true,
    resizeImages: true
  }, options);
  var $ = cheerio.load(chapter.contents, {
    normalizeWhitespace: true,
    xmlMode: options.xml
  });
  processLinks($, manifest, chapter.href);
  processIDs($, chapter.href);
  var bfHref = new Buffer(chapter.href);
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
  if (options.stripIframes) {
    stripElement($, "iframe");
  }
  if (options.epub) {
    processEPUBFootnotes($);
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
  chapter.contents = sanitizeHTML($);
  return chapter;
}

module.exports = {
  shiftHeadings: shiftHeadings,
  selectorToTag: selectorToTag,
  wrap: wrap,
  wrapAll: wrapAll,
  imgSizes: imgSizes,
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
  toChapter: toChapter,
  outlineAndLandmarks: outlineAndLandmarks,
  styleManifest: styleManifest
};
