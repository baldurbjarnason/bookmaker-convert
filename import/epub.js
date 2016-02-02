"use strict";

var cheerio = require("cheerio");
var Promise = require("bluebird");
var fs = require("fs-extra");
var path = require("path");
var zipfile = require("zipfile");


function getZip(filename) {
	return new Promise(function (resolve, reject) {
			var zip = Promise.promisifyAll(new zipfile.ZipFile(filename));
			resolve(zip);
	});
}

function getOPF(zip) {
	var OPFpath;
	return zip.readFileAsync('META-INF/container.xml').then(function (file) {
		var container = cheerio.load(file.toString(), {
    		normalizeWhitespace: true,
    		xmlMode: true
		});
		OPFpath = container("rootfile").attr('full-path');
		return zip.readFileAsync(OPFpath);
	}).then(function (OPFFile) {
		var OPF = cheerio.load(OPFFile, {
    		normalizeWhitespace: true,
    		xmlMode: true
		});
		OPF.root().attr("data-full-path", OPFpath);
		return OPF;
	});
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
				dir: el.attr("dir"),
				fileAs: el.attr("file-as")
			};

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
			titles: getMeta(OPF, "dc\\:title"),
			languages: getMeta(OPF, "dc\\:language"),
			version:  OPF("ibooks\\:version").text(),
			publisher: OPF("dc\\:publisher").text()
	});
}

function buildManifest(OPF) {
	return new Promise(function (resolve, reject) {
		var baseDir = path.dirname(OPF.attr("data-full-path"));
		var items = OPF("manifest > item").map(function () {
			var el = OPF(this);
			var zipPath = url.resolve(baseDir, el.attr("href"));
			return {
				href: el.attr("href"),
				zipPath: zipPath,
				id: el.attr("id"),
				type: el.attr("media-type"),
				properties: el.attr("properties").split(" ")
			}
		}).get();
		resolve(items);
	});
}

function extractFiles(manifest, zip, target, exclude) {
	var filepaths = manifest.map(function (item) {
		path.dirname(path.resolve(target, item.href));
	});
	exclude.forEach(function (type) {
		filepaths = filepaths.filter(function (item) { item.type !== type ? true : false; });
	});
	return Promise.all(filepaths.map(function (filepath) {
		fs.ensureDirAsync(filepath);
	})).then(function () {
		fs.ensureDirAsync(target)
	}).then(function () {
		Promise.all(manifest.map(function (item) {
			if (item.type === "application/xhtml+xml" || item.type === "text/css") {
				return Promise.props({
					contents: zip.readFileAsync(item.zipPath),
					href: item.href,
					properties: item.properties,
					id: item.id,
					type: item.type
				});			
			} else {
				return Promise.props({
					contents: zip.copyFileAsync(item.zipPath, path.resolve(target, item.href)),
					href: item.href,
					properties: item.properties,
					id: item.id,
					type: item.type
				});				
			}
		}));
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
		resolve(items);
	});	
}


function extractItemsFromManifest(manifest, type) {
	var items = manifest.filter(function (item) { item.type === type ? true : false; });
}

function styles(manifest) {
	return extractItemsFromManifest(manifest, "text/css");
}

function scripts(manifest) {
	return extractItemsFromManifest(manifest, "application/javascript");
}


function chapters(manifest, spine) {
	var chapters = spine.map(function (item) {
		var chapter = manifest.filter(function (file) { file.id === item.idref ? true : false; })[0];
		chapter.linear = item.linear;
		return chapter;
	});
}

function extractFilesFromManifest(manifest, target, type) {
	if (Array.isArray(type)) {
		var files = [].concat(type.map(function (filter) {
			manifest.filter(function (item) { item.type === filter ? true : false; });
		}));
	} else {
		var files = manifest.filter(function (item) { item.type === type ? true : false; });
	}
	return files;
}

function MP3s(manifest, target) {
	return extractFilesFromManifest(manifest, target, "audio/mpeg");
}

function MP4Audio(manifest, target) {
	return extractFilesFromManifest(manifest, target, "audio/mp4");
}

function MP4Video(manifest, target) {
	return extractFilesFromManifest(manifest, target, "video/mp4");
}

function images(manifest, target) {
	return extractFilesFromManifest(manifest, target, ["image/jpeg", "image/png", "image/gif", "image/svg+xml"]);
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
	styles: styles
}

