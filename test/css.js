"use strict";

var tape = require("tape");
var css = require("../import/css.js");
var path = require("path");
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs-extra"));
var cssFile = fs.readFileSync(path.resolve(__dirname, "assets/css1.css"));

var styles = [
  { contents: cssFile, type: "text/css", href: "assets/css1.css", prefix: "chapter1", target: "test/tmp/"},
  { contents: cssFile, type: "text/css", href: "assets/css2.css", prefix: "chapter2", target: "test/tmp/"},
  { contents: cssFile, type: "text/css", href: "assets/css3.css", prefix: "paged-book", target: "test/tmp/"}
];

var ids = {
  "test": ["test2", "test3"],
  "thing": ["thing2", "thing3"]
};

tape.test("Testing CSS processing", function (t) {
  t.plan(4);
  css.prefixCSS(styles, ids).then(function (styles) {
    t.ok(styles[0].contents.startsWith("#chapter1"), "CSS1 should be prefixed");
    t.ok(styles[1].contents.startsWith("#chapter2"), "CSS2 should be prefixed");
    t.ok(styles[2].contents.startsWith("#paged-book"), "CSS3 should be prefixed");
    return css.writeCSS(styles);
  }).then(function (paths) {
    t.ok(paths, "The write function should return an array of paths.");
  });
});
