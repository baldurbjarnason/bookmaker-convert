"use strict";

var Promise = require("bluebird");
var fs = require("fs-extra");
var path = require("path");
var sanitizer = require('sanitizer');
var url = require("url");

function shiftHeadingsSync($) {
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

function selectorToTag($, selector, tag) {
	$(selector).each(function () {
		this.tagName = tag;
	});
	return Promise.resolved($);
}

function wrapSync($, selector, tag) {
	var tagElement = "<" + tag + "></" + tag + ">";
	$(selector).before(tagElement);
	$(selector).each(function () {
		var previous = this.previousSibling;
		$(this).remove();
		$(previous).append(this);
	});
}

function wrapAll($, selector, tag, include) {
	return new Promise(function (resolve, reject) {
		// Include is a selector for elements we want to include in the wrap as long as they follow the original selector.
		if (include) {
			var negateNext = "p:not(" + include + ")";
		} else {
			var negateNext = "p:not(" + selector + " + " + selector + ")";
		}
		$(selector).not(selector + "+" + selector).before('<' + tag + '></' + tag + '>');
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

function fixHeadings($, fixAll) {
	return new Promise(function (resolve, reject) {
			var h1s = $("h1:not(h1+h1)");
			var h2s = $("h2:not(h2+h2)");
			var h1 = h1s.first();
			shiftHeadingsSync($);
			if (!fixAll) {
				h1.get(0).tagName = "h1";
			}
			resolve($);
	});
}

function processHTMLForMedia($, manifest) {
	return new Promise(function (resolve, reject) {
		$("img").each(function () {
			if ($(this).attr("width")) {
				file.width = $(this).attr("width");
			}
			if  ($(this).attr("height")) {
				file.height = $(this).attr("height");
			}
		});
		resolve($, manifest);
	});
}



function buildMetaFromHTML($) {
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


function processHTMLFootnotes($) {
	return new Promise(function (resolve, reject) {
		wrapSync($, "[rel='footnote']", "bookmaker-reference");
		$("[rel='footnote']").each(function () {
			var target = $(this).attr("href");
			if (target[0] === "#") {
				wrapSync($, target,  "bookmaker-footnote");
			}
		});
		resolve($);		
	});
}

function processEPUBFootnotes($) {
	return new Promise(function (resolve, reject) {
		wrapSync($, "[epub\\:type='noteref']", "paged-reference");
		wrapSync($, "[epub\\:type='footnote']", "paged-footnote");
		resolve($);		
	});
}

function epubtypeToRole($) {
	return new Promise(function (resolve, reject) {
		$("[epub\\:type]").each(function () {
			var type = $(this).attr("epub:type");
			var roles = $(this).attr("role") ? $(this).attr("role") + " " + type : type;
			$(this).attr("role", roles);
			$(this).removeAttr("epub:type");
		})
		resolve($);
	});
}

function processLinksSync($, documentHref) {
	$("a").each(function () {
		var el = $(this);
		var href = $(this).attr("href");
		if (href.startsWith("#")) {
			var bfHref = new Buffer(documentHref);
			var codedHref = "#d" + bfHref.toString('hex') + "-" + href.slice(1);
			el.attr("href", codedHref);
		} else if (!href.protocol && !href.host && !href.path.startsWith("/")) {
			var href = url.parse(el.attr("href"));
			var bfHref = new Buffer(href.path);
			if (href.hash) {
				var hash = "-" + href.hash.slice(1);
			}
			var codedHref = "#d" + bfHref.toString('hex') + hash;
			el.attr("href", codedHref);
		}
	});
	return $;
}

// Remember to add the root id on each processed HTML file.

function processIDsSync($, documentHref) {
	$("[id]").each(function () {
		var el = $(this);
		var id = el.attr("id");
		var bfHref = new Buffer(documentHref);
		var codedHref = "d" + bfHref.toString('hex') + "-" + id;
		el.attr("id", codedHref);
	});
	return $;
}

function stripElementSync($, tagname) {
	$(tagName).remove();
}

function stripAttributeSync($, attributeName) {
	$("[" + attributeName + "]").removeAttr(attributeName);
}

function stripStyles($) {
	stripElement($, "style");
	stripAttribute($, "style");
	$("link").map(function () {
		if ($(this).attr("type") === "text/css") {
			$(this).remove();
		}
	});
	return Promise.resolved($);
}

function stripScripts($) {
	stripElement($, "script");
	return Promise.resolved($);
}

function sanitizeHTML($) {
	return new Promise(function (resolve, reject) {
			var cleanHTML = sanitizer.sanitize($.html());
			resolve(cleanHTML);
	});
}

module.exports = {
	shiftHeadings: shiftHeadings,
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
	sanitizeHTML: sanitizeHTML
}
