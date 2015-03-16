# Dogmatic Views

Dogmatic is a collection of highly opinionated modules for use in IO.js and Node.js, with an emphasis on Express.

Dogmatic Views was created for web applications that utilize a limited number of files and templates, but need high availability. It's great for web apps, and horrible for non-templated blogs.

It uses two-pass rendering. By default, the first pass is Jade (for readability/maintainability) and the second pass is Handlebars (for compilation speed). Yes, this sounds crazy, but it helps to maximize both maintanability and performance.

For further assumptions and light configuration options, please see below.




## Installation

```base
$ npm install dogmatic-views
```


## API

```js
var Views = require("dogmatic-views");
```


### Views.file(filename, [options = { zip : true, cache : true }])

Reads a file, caches and zips it. Returns a promise that resolves to said file.


### Views.publicFile(filename, [options = { zip : true, cache : true }])

Reads a file from the public directory (which defaults to the root directory + "/public"). Returns a promise that resolves to said file.


### Views.jade(filename, variables, [options = { cache : true }])

Renders a Jade template into HTML and caches it. Returns a promise that resolves to said HTML.

Assumes files are relative to "views" directory unless filename starts with "./" or "/".


### Views.handlebars(filename, variables)

Renders a file into a precompiled Handlebars function. Accepts HTML files, but if no extension is provided, assumes it is Jade. Caches the result. Returns a promise that resolves to said function.

Assumes files are relative to "views" directory unless filename starts with "./" or "/".


### Views.staticHandler(filename, vars, [options = { warm : true, cache : true }])

Convenient route handler for static files or first-pass templates.

```js
app.get("/privacy", Views.staticHandler("legal/privacy"))`
```

If no extension, assumes Jade file. Assumes files are relative to "views" directory unless filename starts with "./" or "/".


### Views.templateHandler(filename, vars, [options = { warm : true, cache : true }])

Convenient route handler for second-pass templates. This is best understood through example. Below,
the Jade template is compiled to HTML, which is then pre-compiled to Handlebars and cached. When
the request is made, only the Handlebars function runs (which is lighting fast).

```js
app.get("/app", function(req, res) { return Views.templateHandler("app", globalVars)(req, res, localVars); })`
```

If no extension, assumes Jade file. Assumes files are relative to "views" directory unless filename starts with "./" or "/".


### Views.scriptHandler(filename, [options = { cache : true, warm : true, zip : true }])

Convenient route handler that will load a script, zip and cache it, and then respond with proper headers.

```js
app.get("/scripts/app.js", Views.scriptHandler("app.js"))
```

Assumes files are relative to "public" directory unless filename starts with "./" or "/".


## Assumptions

1. Dogmatic will cache files if the CACHE environment variable is set, or if the NODE_ENV is production.
2. Dogmatic use Promises for everything because they're awesome.
3. Root directory is two directories above current (library and node_modules).
4. "public" directory is relative to root.
5. "views" directory is relative to root.
6. Files without path and extension will be treated as Jade.


## Configuration

There are, of course, configuration options, but we encourage you to use them sparingly. The key is to never have opinions of your own!


### Views.root(newRoot)

Sets the root directory.


### Views.views(newViews)

Sets the views directory offset to root.


### Views.public(newPublic)

Sets the public directory offset to root.


### Views.firstPass(newEngine)

Sets the rendering engine for first pass rendering.


### Views.secondPass(newEngine)

Sets the rendering engine for second pass rendering.
