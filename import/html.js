"use strict";

var Promise = require("bluebird");
var fs = require("fs-extra");
var path = require("path");
var sanitizer = require('sanitizer');


function shiftHeadings($) {
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
	return Promise.resolved($);
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


// Needs to treat http/https images differently. Remote HTML needs a completely different function. Needs to find svg images as well
function buildImagesFromHTML($, target) {
	var images = $("img").map(function () {
		var entry = {
			href: $(this).attr("href"),
			target: target,
			absoluteOriginal: path.resolve("", $(this).attr("href"))
		};
	});
	var filepaths = images.map(function (item) {
		path.dirname(path.resolve("", target, item.href));
	});
	return Promise.all(filepaths.map(function (filepath) {
		fs.ensureDirAsync(filepath);
	})).then(function () {
		fs.ensureDirAsync(target)
	}).then(function() {
		Promise.all(images.map(function (item) {
			fs.copyAsync(path.resolve("", item.href), path.resolve("", target, item.href));
		}));
	}).then(function () {
		return images;
	})
}

// Needs functions for extracting scripts, styles, and iframed HTML.


function processHTMLForImages($, images, documentHref) {
	return new Promise(function (resolve, reject) {
		var directory = path.dirname(path.resolve("", documentHref));
		$("img").each(function () {
			var absImg = path.resolve(directory, $(this).attr("href"));
			var image = images.filter(function (item) { item.absoluteOriginal === absImg ? true : false; })[0];
			var newHref = path.relative(directory, path.resolve(image.target, image.href));
			$(this).attr("href", newHref);
			if ($(this).attr("width")) {
				image.width = $(this).attr("width");
			}
			if  ($(this).attr("height")) {
				image.height = $(this).attr("height");
			}
		});
		resolve($, images);
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

function epubtypeToRDFa($) {
	return new Promise(function (resolve, reject) {
		$("[epub\\:type]").each(function () {
			var type = $(this).attr("epub:type");
			$(this).attr("vocab", "http://www.idpf.org/epub/vocab/structure/#");
			$(this).attr("typeof", type);
			$(this).removeAttr("epub:type");
		})
		resolve($);
	});
}

function processLinksSync($) {
	$("a").each(function () {
		var el = $(this);
		var href = el.attr("href");
		if (!href.startsWith("http") && !href.startsWith("mailto") && !href.startsWith("#")) {
			var bfHref = new Buffer(href);
			var codedHref = "#d" + bfHref.toString('hex');
			el.attr("href", codedHref);
		} else if (href.startsWith("#")) {
			var split = href.split("#")
			var bfHref = new Buffer(split[0]);
			var codedHref = "#d" + bfHref.toString('hex') + "-" + split[1];
			el.attr("href", codedHref);
		}
	});
	return $;
}

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
	buildImagesFromHTML: buildImagesFromHTML,
	processHTMLForImages: processHTMLForImages,
	buildMetaFromHTML: buildMetaFromHTML,
	processHTMLFootnotes: processHTMLFootnotes,
	processEPUBFootnotes: processEPUBFootnotes,
	epubtypeToRDFa: epubtypeToRDFa,
	processIDsSync: processIDsSync,
	processLinksSync: processLinksSync,
	stripStyles: stripStyles,
	stripScripts: stripScripts,
	sanitizeHTML: sanitizeHTML
}