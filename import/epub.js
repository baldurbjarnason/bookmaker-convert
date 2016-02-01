"use strict";

var AdmZip = require("adm-zip");
var cheerio = require("cheerio");
var Promise = require("bluebird");
var fs = require("fs-extra");
var path = require("path");


function getZip(filename) {
	return new Promise(function (resolve, reject) {
			var zip = new AdmZip(filename);
			Promise.promisifyAll(zip);
			resolve(zip);
	});
}

function getOPF(zip) {
	return new Promise(function (resolve, reject) {
		var container = cheerio.load(zip.readAsText('META-INF/container.xml'), {
    		normalizeWhitespace: true,
    		xmlMode: true
		});
		var OPFpath = container("rootfile").attr('full-path');
		var OPF = cheerio.load(zip.readAsText(OPFpath), {
    		normalizeWhitespace: true,
    		xmlMode: true
		});
		OPF.root().attr("data-full-path", OPFpath);
		resolve(OPF);
	});
}


function refineMetaSync(OPF, metaEntry) {
	var refines = OPF("[refines='" + metaEntry.id + "'']");
	refines.each(function () {
		metaEntry[OPF(this).attr("property")] = OPF(this).text();
	});
	return metaEntry;
}

function getMeta(OPF, metatag) {
	return new Promise(function (resolve, reject) {
		var metaArray = OPF(metatag).map(function () {
			var el = OPF(this);

			var metaEntry = {
				value: el.text(),
				type: metatag,
				id: el.attr("id"),
				lang: el.attr("xml:lang"),
				dir: el.attr("dir")
			};
			var mapEntry = refineMeta(OPF, metaEntry);

		}).get();
		resolve(metaArray);
	});
}

function getIdentifier(OPF) {
	return new Promise(function (resolve, reject) {
		var ref = OPF("package").attr("unique-identifier");
		var identifier = OPF("#" + ref).text();
		resolve(identifier);
	});
}


function buildMetaFromOPF(OPF) {
	return Promise.props({
			identifier: getIdentifier(OPF),
			identifiers: getMeta(OPF, "dc\\:identifier"),
			epubVersion: OPF("package").attr("version"),
			creators: getMeta(OPF, "dc\\:creator"),
			contributor: getMeta(OPF, "dc\\:contributor"),
			titles: getMeta(OPF, "dc\\:title"),
			languages: getMeta(OPF, "dc\\:language"),
			sources: getMeta(OPF, "dc\\:source"),
			subjects: getMeta(OPF, "dc\\:subject"),
			description: OPF("dc\\:description").text(),
			version:  OPF("ibooks\\:version").text(),
			dcDate: OPF("dc\\:date").text(),
			rights: OPF("dc\\:rights").text(),
			publisher: OPF("dc\\:publisher").text()
	});
}

function buildManifest(OPF) {
	return new Promise(function (resolve, reject) {
		var baseDir = path.dirname(OPF.attr("data-full-path"));
		var items = OPF("manifest > item").map(function () {
			var el = OPF(this);
			var href = path.relative("", path.resolve(baseDir, el.attr("href")));
			return {
				href: href,
				id: el.attr("id"),
				type: el.attr("media-type"),
				properties: el.attr("properties").split(" ")
			}
		}).get();
		resolve(items);
	});
}

function buildSpine(OPF) {
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
			}
		}).get().filter(function (item) {
			if (item.idref !== coverId) {
				return true;
			}
		});
		return items;
	});	
}


function extractItemsFromManifest(manifest, zip, type) {
	var items = manifest.filter(function (item) { item.type === type ? true : false; });
	return Promise.all(chapters.map(function (item) {
		return Promise.props({
			chapter: zip.readAsTextAsyncAsync(item.href),
			href: item.href,
			properties: item.properties,
			id: item.id,
			type: item.type
		});
	}));
}

function extractStylesFromManifest(manifest, zip) {
	return extractItemsFromManifest(manifest, zip, "text/css");
}

function extractScriptsFromManifest(manifest, zip) {
	return extractItemsFromManifest(manifest, zip, "application/javascript");
}


function extractChaptersFromManifest(manifest, zip) {
	var chapters = manifest.filter(function (item) { item.type === "application/xhtml+xml" ? true : false; })
		.filter(function (item) { item.properties.includes("nav") ? false : true; });
	return Promise.all(chapters.map(function (item) {
		return Promise.props({
			chapter: zip.readAsTextAsyncAsync(item.href),
			href: item.href,
			properties: item.properties,
			id: item.id,
			type: item.type
		});
	}));
}

function extractFilesFromManifest(manifest, zip, target, type) {
	if (Array.isArray(type)) {
		var files = [].concat(type.map(function (filter) {
			manifest.filter(function (item) { item.type === filter ? true : false; });
		}));
	} else {
		var files = manifest.filter(function (item) { item.type === type ? true : false; });
	}
	var filepaths = files.map(function (item) {
		path.dirname(path.resolve("", target, item.href));
	});
	return Promise.all(filepaths.map(function (filepath) {
		fs.ensureDirAsync(filepath);
	})).then(function () {
		fs.ensureDirAsync(target)
	}).then(function () {
		return Promise.all(
			files.map(function (entry) {
					zip.readFileAsyncAsync(entry.href).then(function (file) {
						return fs.writeFileAsync(path.resolve(target, entry.href), file);
					}).then(function () {
						entry.target = target;
						entry.absoluteOriginal = path.resolve("", entry.href);
						return entry;
					});
			}));
	});
}

function extractMP3FromManifest(manifest, zip, target) {
	return extractFilesFromManifest(manifest, zip, target, "audio/mpeg");
}

function extractMP4AudioFromManifest(manifest, zip, target) {
	return extractFilesFromManifest(manifest, zip, target, "audio/mp4");
}

function extractMP4VideoFromManifest(manifest, zip, target) {
	return extractFilesFromManifest(manifest, zip, target, "video/mp4");
}

function extractImagesFromManifest(manifest, zip, target) {
	return extractFilesFromManifest(manifest, zip, target, ["image/jpeg", "image/png", "image/gif", "image/svg+xml"]);
}

// function buildImagesFromManifest(manifest, zip, target) {
// 	var jpegs = manifest.filter(function (item) { item.type === "image/jpeg" ? true : false; });
// 	var pngs = manifest.filter(function (item) { item.type === "image/png" ? true : false; });
// 	var gifs = manifest.filter(function (item) { item.type === "image/gif" ? true : false; });
// 	var svgs = manifest.filter(function (item) { item.type === "image/svg+xml" ? true : false; });
// 	var images = jpgs.concat(pngs, gifs, svgs);
// 	var filepaths = images.map(function (item) {
// 		path.dirname(path.resolve("", target, item.href));
// 	});
// 	return Promise.all(filepaths.map(function (filepath) {
// 		fs.ensureDirAsync(filepath);
// 	})).then(function () {
// 		fs.ensureDirAsync(target)
// 	}).then(function () {
// 		return Promise.all(
// 			images.map(function (entry) {
// 					zip.readFileAsyncAsync(entry.href).then(function (image) {
// 						return fs.writeFileAsync(path.resolve(target, entry.href), image);
// 					}).then(function () {
// 						entry.target = target;
// 						entry.absoluteOriginal = path.resolve("", entry.href);
// 						return entry;
// 					});
// 			}));
// 	});
// }

module.exports = {
	getZip: getZip,
	getOPF: getOPF,
	buildMetaFromOPF: buildMetaFromOPF,
	buildManifest: buildManifest,
	buildSpine: buildSpine,
	extractImagesFromManifest: extractImagesFromManifest,
	extractMP4VideoFromManifest: extractMP4VideoFromManifest,
	extractMP4AudioFromManifest: extractMP4AudioFromManifest,
	extractMP3FromManifest: extractMP3FromManifest,
	extractChaptersFromManifest: extractChaptersFromManifest,
	extractScriptsFromManifest: extractScriptsFromManifest,
	extractStylesFromManifest: extractStylesFromManifest
}

