"use strict";

var tape = require("tape");
var epub = require("../import/epub.js");
var document = require("../import/document.js");
var path = require("path");
var Promise = require("bluebird");
Promise.promisifyAll(require("fs-extra"));

tape.test("Testing epub processing", function (t) {
  t.plan(24);
  var epubResult = {};
  epub.getZip(path.resolve(__dirname, "assets/test2.zip")).then(function (zip) {
    epubResult.zip = zip;
    t.ok(zip, "Zip should be loaded");
    return epub.getOPF(zip);
  }).then(function (OPF) {
    epubResult.OPF = OPF;
    t.ok(OPF, "OPF object returned");
    t.ok(OPF.root(), "OPF object has cheerio functions");
    return epub.buildMetaFromOPF(OPF);
  }).then(function (meta) {
    epubResult.meta = meta;
    t.ok(meta.identifier, "Meta should have identifier");
    t.ok(meta.creators, "Meta should have creators");
    t.ok(meta.titles, "Meta should have titles");
    t.ok(meta.publisher, "Meta should have a publisher");
    t.ok(meta.languages, "Meta should have languages");
    t.ok(meta.version, "Meta should have a version");
    t.ok(meta.epubVersion, "Meta should have an epub version");
    t.ok(meta.identifiers, "Meta should have identifiers, plural");
    return epub.getOPF(epubResult.zip).then(function (OPF) {
      return epub.buildManifest(OPF);
    });
  }).then(function (manifest) {
    t.ok(manifest, "Manifest should be there.");
    return epub.extractFiles(manifest, epubResult.zip, "test/tmp/");
  }).then(function (manifest) {
    epubResult.manifest = manifest;
    t.ok(manifest, "Should return the manifest");
    return epub.buildSpine(epubResult.OPF);
  }).then(function (spine) {
    t.ok(spine, "Should return a spine");
    var chapters = epub.chapters(epubResult.manifest, spine);
    t.ok(chapters, "Should have chapters");
    t.ok(chapters[0].contents, "Chapters should have content");
    var styles = epub.styles(epubResult.manifest);
    t.ok(styles, "Should have styles");
    t.ok(styles[0].contents, "Styles should have contents");
    var cover = epub.findCover(epubResult.manifest, epubResult.meta);
    t.ok(cover, "EPUB should have cover");
    cover.properties = [];
    var cover2 = epub.findCover(epubResult.manifest, epubResult.meta);
    t.ok(cover2, "EPUB should have cover, even if they aren't using the recommended EPUB3 method");
    var mathml = epub.checkForMathML(epubResult.manifest);
    t.notOk(mathml, "MathML should be false.");
    return epub.createBook(path.resolve(__dirname, "assets/test2.zip"), "test/tmp/");
  }).then(function (book) {
    t.ok(book, "The combined book object should exist");
    t.ok(book.stylesheets, "The combined book object should have stylesheets");
    return document.createDocument(book, "test2.html");
  }).then(function (success) {
    t.ok(success, "Writing HTML should work.");
  });
});
