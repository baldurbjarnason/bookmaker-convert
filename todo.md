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
* BlobStoreFunction for customisable file saves.
* Switch to yauzl, requires changes in HTML parsing as well.
* Handle remote assets and remote files.