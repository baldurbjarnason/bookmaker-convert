"use strict";

var postcss = require("postcss");
var tokeniser = require("css-selector-tokenizer");

function hasRoot (selector) {
  return selector.nodes.reduce(function (prev, node) {
    if (node.type === "element" && node.name === "html") {
      return true;
    } else {
      return prev;
    }
  }, false);
}

function isRoot (node) {
  if (node.type === "element" && node.name === "html") {
    return true;
  }
}

function isSeparator (node) {
  if (node.type === "spacing" || node.type === "operator") {
    return true;
  }
}

function getIds (selector) {
  return selector.nodes.filter(function (node) {
    return node.type === "id";
  });
}

function dropRoot (selector) {
  return selector.nodes.reduce(function (prev, node, curr, arr) {
    if (isRoot(node)) {
      prev.node = node;
      return prev;
    } else if (isRoot(prev.node) && isSeparator(node)) {
      prev.dropRoot = false;
      return prev;
    } else {
      prev.dropRoot = true;
      return prev;
    }
  }, {}).dropRoot;
}

function replaceBody (nodes, body) {
  return nodes.map(function (node) {
    if (node.type === "element" && node.name === "body") {
      node.name = body;
      return node;
    } else {
      return node;
    }
  });
}

function prefixSelector (selector, prefix) {
  var prefixNode = prefix;
  var sel = Object.assign({}, selector);
  if (hasRoot(sel) && dropRoot(sel)) {
    sel.nodes = sel.nodes.filter(function (node) { return node.name !== "html"; });
  } else if (hasRoot(sel)) {
    sel.nodes = sel.nodes.map(function (node) {
      if (isRoot(node)) {
        return prefixNode;
      } else {
        return node;
      }
    });
  } else {
    sel.nodes = [prefixNode, { type: "spacing", value: " " }].concat(sel.nodes);
  }
  return sel;
}

function replaceId (selector, name, replacement) {
  var sel = {};
  sel.nodes = selector.nodes.map(function (node) {
    if (node.name === name) {
      return Object.assign({}, node, { "name": replacement});
    } else {
      return Object.assign({}, node);
    }
  });
  return Object.assign({}, selector, sel);
}

function mapIds (id, selectors, ids) {
  var newselectors = selectors.map(function (selector) {
    var replacementSelectors = ids[id.name].map(function (replacement) {
      var replaced = replaceId(selector, id.name, replacement);
      return replaced;
    });
    return replacementSelectors;
  });
  return [].concat.apply([], newselectors);
}

function replaceIds (selectors, ids) {
  var newselectors = selectors.map(function (sel) {
    var selIds = getIds(sel);
    if (selIds.length === 0) {
      return [sel];
    } else {
      var mappedSel = selIds.map(function (id) {
        return mapIds(id, selectors, ids);
      });
      return [].concat.apply([], mappedSel);
    }
  });
  return [].concat.apply([], newselectors);
}

// Needs to use book.ids and chapter.ids to transform old IDs to processed ones, adding selectors as necessary.
// First process for IDs then prefixes.
var plugin = postcss.plugin("bookmaker-css-prefix", function prefixPlugin (prefix, body, ids) {
  return function processRoot (root) {
    root.walkRules(function processRule (rule) {
      rule.selectors = rule.selectors.map(function (rawSelector) {
        var sel = tokeniser.parse(rawSelector);
        var newselectors = sel.nodes;
        newselectors = replaceIds(newselectors, ids);
        newselectors = newselectors.map(function (sel) {
          return prefixSelector(sel, prefix);
        });
        newselectors = newselectors.map(function (sel) {
          sel.nodes = replaceBody(sel.nodes, body);
          return sel;
        });
        sel.nodes = newselectors;
        return tokeniser.stringify(sel);
      });
    });
  };
});

module.exports = plugin;
