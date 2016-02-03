"use strict";

var cheerio = require("cheerio");
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs-extra"));
var path = require("path");
var zipfile = require("zipfile");
var url = require("url");

function getZip (filename) {
  return new Promise(function (resolve, reject) {
    var zip = Promise.promisifyAll(new zipfile.ZipFile(filename));
    resolve(zip);
  });
}

function getOPF (zip) {
  var OPFpath;
  return zip.readFileAsync("META-INF/container.xml").then(function (file) {
    var container = cheerio.load(file.toString(), {
      normalizeWhitespace: true,
      xmlMode: true
    });
    OPFpath = container("rootfile").attr("full-path");
    return zip.readFileAsync(OPFpath);
  }).then(function (OPFFile) {
    var OPF = cheerio.load(OPFFile, {
      normalizeWhitespace: true,
      xmlMode: true
    });
    OPF("package").attr("data-full-path", OPFpath);
    return OPF;
  });
}

function getMeta (OPF, metatag) {
  return new Promise(function (resolve, reject) {
    var metaArray = OPF(metatag).map(function () {
      var el = OPF(this);

      return {
        value: el.text(),
        type: metatag,
        id: el.attr("id"),
        lang: el.attr("xml:lang"),
        dir: el.attr("dir"),
        fileAs: el.attr("file-as")
      };
    }).get();
    resolve(metaArray);
  });
}

function getIdentifier (OPF) {
  return new Promise(function (resolve, reject) {
    var ref = OPF("package").attr("unique-identifier");
    var identifier = OPF("#" + ref).text();
    resolve(identifier);
  });
}

function buildMetaFromOPF (OPF) {
  return Promise.props({
    identifier: getIdentifier(OPF),
    identifiers: getMeta(OPF, "dc\\:identifier"),
    epubVersion: OPF("package").attr("version"),
    creators: getMeta(OPF, "dc\\:creator"),
    titles: getMeta(OPF, "dc\\:title"),
    languages: getMeta(OPF, "dc\\:language"),
    version: OPF("meta[property='ibooks\\:version']").text(),
    publisher: OPF("dc\\:publisher").text(),
    coverId: OPF("meta[name='cover']").attr("content")
  });
}

function buildManifest (OPF) {
  return new Promise(function (resolve, reject) {
    var base = OPF("package").attr("data-full-path");
    var items = OPF("manifest > item").map(function () {
      var el = OPF(this);
      var zipPath = url.resolve(base, el.attr("href"));
      if (el.attr("properties")) {
        var properties = el.attr("properties").split(/\s+/g);
      }
      return {
        href: el.attr("href"),
        zipPath: zipPath,
        id: el.attr("id"),
        type: el.attr("media-type"),
        properties: properties || []
      };
    }).get();
    resolve(items);
  });
}

function extractFiles (manifest, zip, target, exclude) {
  // These are directories we need to ensure exists.
  // Obviously don't need directories for the ones we aren't going to write out to fs
  var filepaths = manifest
  .filter(function (item) { return item.type !== "application/xhtml+xml"; })
  .filter(function (item) { return item.type !== "text/css"; })
  .filter(function (item) { return item.type !== "application/x-dtbncx+xml"; })
  .filter(function (item) { return item.type !== "application/javascript"; })
  .map(function (item) {
    return path.dirname(path.resolve(target, item.href));
  });
  // Sometimes you don't want all of the files. And we never want JS in bookmaker imports.
  if (exclude) {
    exclude.push("application/javascript");
    exclude.forEach(function (type) {
      filepaths = filepaths.filter(function (item) { return item.type !== type; });
    });
  } else {
    exclude = ["application/javascript"];
  }
  // Makes sure all of the targets exist, then return an array of promises for zip reads or copies.
  return Promise.all(filepaths.map(function (filepath) {
    fs.ensureDirAsync(filepath);
  })).then(function () {
    fs.ensureDirAsync(target);
  }).then(function () {
    return Promise.all(manifest.map(function (item) {
      if (item.type === "application/xhtml+xml" || item.type === "text/css" || item.type === "application/x-dtbncx+xml") {
        return Promise.props({
          contents: zip.readFileAsync(item.zipPath).then(function (buf) { return buf.toString(); }),
          href: item.href,
          properties: item.properties || [],
          id: item.id,
          type: item.type,
          originalPath: item.zipPath
        });
      } else if (url.parse(item.href).protocol) {
        return Promise.resolve(item);
      } else {
        return Promise.props({
          contents: zip.copyFileAsync(item.zipPath, path.resolve(target, item.href)),
          href: item.href,
          properties: item.properties || [],
          id: item.id,
          type: item.type,
          originalPath: item.zipPath
        });
      }
    }));
  }).then(function (manifestWithContent) {
    return manifestWithContent;
  });
}

function buildSpine (OPF) {
  return new Promise(function (resolve, reject) {
    var coverHref = OPF("reference[type='cover']").attr("href");
    if (coverHref) {
      var coverId = OPF("item[href='" + coverHref + "']").attr("id");
    }
    var items = OPF("spine > itemref").map(function () {
      var el = OPF(this);
      return {
        idref: el.attr("idref"),
        id: el.attr("id"),
        linear: el.attr("linear")
      };
    }).get().filter(function (item) {
      if (item.idref !== coverId) {
        return true;
      }
    });
    resolve(items);
  });
}

function extractItemsFromManifest (manifest, type) {
  return manifest.filter(function (item) { return item.type === type; });
}

function styles (manifest) {
  return extractItemsFromManifest(manifest, "text/css");
}

function scripts (manifest) {
  return extractItemsFromManifest(manifest, "application/javascript");
}

function chapters (manifest, spine) {
  return spine.map(function (item) {
    var chapter = manifest.filter(function (file) { return file.id === item.idref; })[0];
    chapter.linear = item.linear;
    return chapter;
  });
}

function extractFilesFromManifest (manifest, type) {
  var files = [];
  if (Array.isArray(type)) {
    files = files.concat(type.map(function (filter) {
      manifest.filter(function (item) { return item.type === filter; });
    }));
  } else {
    files = manifest.filter(function (item) { return item.type === type; });
  }
  return files;
}

function MP3s (manifest) {
  return extractFilesFromManifest(manifest, "audio/mpeg");
}

function MP4Audio (manifest) {
  return extractFilesFromManifest(manifest, "audio/mp4");
}

function MP4Video (manifest) {
  return extractFilesFromManifest(manifest, "video/mp4");
}

function images (manifest) {
  return extractFilesFromManifest(manifest, ["image/jpeg", "image/png", "image/gif", "image/svg+xml"]);
}

function findCover (manifest, meta) {
  var coverImage = manifest.filter(function (item) { return item.properties.indexOf("cover-image") !== -1; })[0];
  if (!coverImage && meta.coverId) {
    coverImage = manifest.filter(function (item) { return item.id === meta.coverId; })[0];
  }
  return coverImage;
}

module.exports = {
  getZip: getZip,
  getOPF: getOPF,
  buildMetaFromOPF: buildMetaFromOPF,
  buildManifest: buildManifest,
  extractFiles: extractFiles,
  buildSpine: buildSpine,
  images: images,
  MP4Video: MP4Video,
  MP4Audio: MP4Audio,
  MP3s: MP3s,
  chapters: chapters,
  scripts: scripts,
  styles: styles,
  findCover: findCover
};

