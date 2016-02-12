# Todo

* BROWSER: browser-based epub export using bookmaker custom elements.
* BROWSER: Customised xml-serialiser. Fork it to create a version that has custom serialisation behaviour for custom elements. Probably using an xmlTagName property.
* DOCX import.
* BROWSER: Use rollup, browserify, and uglify to generate four files: es6 module, cjs module, standalone, standalone minified.
* QUESTION: make the exported HTML completely standalone using data uris and inline js/css?
* BlobStoreFunction for customisable file saves. Or just a writer object that handles tmp files, paths/urls, blob storage, and more.
* Allow for custom CSS, JS, url, and HTML processing functions.
* Consider using a writer object to abstract file save locations and methods.
* Chapter wrapping: preamble (up to first h1), pre-matter (from first h1 to first h2), chapters (each h2 to the next one), post-matter (from last h2 to end).
* Decode obfuscated fonts?
* Pretty much have to parse the CSS for url(). Probably using something like `String.prototype.match(/url\(\s*?((?:"|')?)(.+?)\1\s*?\)/gi); // Returns the match, quote style, url.`. So generate an epub manifest by parsing the CSS for url() and the HTML for [src] and [src-set]
* Hooks for adding custom front and back matter (e.g. title pages, contents).
* Code that auto-guesses landmarks.
* `<paged-generated-chapter type="toc">` or `<paged-generated-chapter type="titlepage">`
* Need to remember in the future (when I get to that) that IDs in HTML sources may not be valide XHTML IDs.
* Switch HTML processing to be entirely async using promises.
* Put MathML attribute on chapters.
* Turn outline and landmarks into JS objects, not HTML. +++
* Don't forget the prefix for epub:type to role conversions.
* Non-standard FXL import types?
* Concat CSS files and fix urls while maintaining original style order, remembering to export sourcemap. Probably best to remove all @imports to begin with.
* tmp cleanup for tests.
* Need to be more aggressive at throwing errors.
* Shift HTML processing into sanitizer.
* Process SVG. But try not to process it like XHTML.
* Process Aria and similar for IDs.
* Turn noscript elements into divs.
* CSS minification.
