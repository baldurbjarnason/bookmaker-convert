# Todo

* BROWSER: browser-based epub export using bookmaker custom elements.
* Theming.
* Config.
* BROWSER: Customised xml-serialiser. Fork it to create a version that has custom serialisation behaviour for custom elements. Probably using an xmlTagName property.
* DOCX import.
* Link handling for merged documents. Don't forget to use URL parsing, otherwise a mess.
* BROWSER: Use rollup, browserify, and uglify to generate four files: es6 module, cjs module, standalone, standalone minified.
* QUESTION: make the exported HTML completely standalone using data uris and inline js/css?
* Add support for automatically converting single stylesheet epubs into a document with a theme.
* BlobStoreFunction for customisable file saves. Or just a writer object that handles tmp files, blob storage, and more.
* Handle remote assets and remote files.
* Allow for custom CSS, JS, and HTML processing functions.
* Figure out something about MathML
* CSS link reconstruction will be done at the document construction stage.
* Build basic EPUB 3.1 support. And EPUB2. This means adding support for HTML chapters.
* Consider using a writer object to abstract file save locations and methods.
* Add NCX and Nav HTML parsing functions.
* Optionally strip iframes.
* Add landmark parsing.
* Chapter wrapping: preamble (up to first h1), pre-matter (from first h1 to first h2), chapters (each h2 to the next one), post-matter (from last h2 to end).
* Need a solid story for handling style tags.
* Remote resources. I think the best thing to do is to preserve remote resources and make sure they carry across properly in the final epub.