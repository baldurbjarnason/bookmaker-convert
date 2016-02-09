"use strict";

var postcss = require("postcss");

var plugin = postcss.plugin("bookmaker-css-import", function prefixPlugin () {
  return function processRoot (root) {
    root.walkAtRules("import", function processRule (rule) { rule.remove(); });
  };
});

module.exports = plugin;
