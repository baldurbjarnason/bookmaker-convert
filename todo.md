# Todo

* BROWSER: browser-based epub export using bookmaker custom elements.
* BROWSER: Customised xml-serialiser. Fork it to create a version that has custom serialisation behaviour for custom elements. Probably using an xmlTagName property.
* DOCX import.
* BROWSER: Use rollup, browserify, and uglify to generate four files: es6 module, cjs module, standalone, standalone minified.
* QUESTION: make the exported HTML completely standalone using data uris and inline js/css?
* BlobStoreFunction for customisable file saves. Or just a writer object that handles tmp files, blob storage, and more.
* Allow for custom CSS, JS, and HTML processing functions.
* CSS link reconstruction will be done at the document construction stage.
* Build basic EPUB 3.1 support. And EPUB2. This means adding support for HTML chapters.
* Consider using a writer object to abstract file save locations and methods.
* Chapter wrapping: preamble (up to first h1), pre-matter (from first h1 to first h2), chapters (each h2 to the next one), post-matter (from last h2 to end).
* A manifest for the files that aren't linked or embedded directly in the HTML. Basically style resources.
* Decode obfuscated fonts?
* srcset, again.
* Pretty much have to parse the CSS for url(). Probably using something like `String.prototype.match(/url\(\s*?((?:"|')?)(.+?)\1\s*?\)/gi); // Returns the match, quote style, url.`. So generate an epub manifest by parsing the CSS for url() and the HTML for [src] and [src-set]
* Parse chapter-specific CSS files and prefix all selectors with the id for the new chapter element.
* Write out style elements and add to manifest.
* epub:type needs to be copied into a data-epub-type attribute as well, otherwise the exporter won't be able to tell the difference between ARIA roles and epub roles. Also on import, need to check if the epub type is already in the role.
* Hooks for adding custom front and back matter (e.g. title pages, contents).
* Code that auto-guesses landmarks.
* `<paged-generated-chapter type="toc">` or `<paged-generated-chapter type="titlepage">`
* Need to remember in the future (when I get to that) that IDs in HTML sources may not be valide XHTML IDs.
* Switch HTML processing to be entirely async using promises.
