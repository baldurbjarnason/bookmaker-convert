"use strict";

var Promise = require("bluebird");
Promise.promisifyAll(require("mkdirp"));
Promise.promisifyAll(require("easy-gd"));
Promise.promisifyAll(require("glob"));
Promise.promisifyAll(require("fs-extra"));