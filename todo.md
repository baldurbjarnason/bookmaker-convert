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