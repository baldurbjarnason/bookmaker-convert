# Todo

* DOCX import.
* QUESTION: make the exported HTML completely standalone using data uris and inline js/css?
* BlobStoreFunction for customisable file saves. Or just a writer object that handles tmp files, paths/urls, blob storage, and more.
* Allow for custom CSS, JS, url, and HTML processing functions.
* Consider using a writer object to abstract file save locations and methods.
* Decode obfuscated fonts?
* Hooks for adding custom front and back matter (e.g. title pages, contents).
* Code that auto-guesses landmarks.
* Switch HTML processing to be entirely async using promises.
* Non-standard FXL import types? Deviating from spec?
* Concat CSS files and fix urls while maintaining original style order, remembering to export sourcemap. Probably best to remove all @imports to begin with.
* tmp cleanup for tests.
* Need to be more aggressive at throwing errors.
* Shift HTML processing into sanitizer.
* Process SVG. But try not to process it like XHTML.
* Process Aria and similar for IDs.
* Turn noscript elements into divs.
* CSS minification.
* Pre-computed inverted style sheet? 'Cause I can.
* CSS rewriter that turns px font sizes into rem or em.
* Better support for parsing epub files exported from bookmaker.
* Filter style attributes to only allow through page-break-* rules.
* Add meta option to the createBook functions.
* More thorough link handling: img[xlink:href] in SVG should be treated like img[src], a[xlink:href] like a[href], whitelist protocols in CSS (both in HTML and SVG).
* Image processing is actually broken for png->jpg conversion at the moment if the original has an alpha channel.