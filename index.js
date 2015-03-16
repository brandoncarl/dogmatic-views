
"use strict";

/*

  Dogmatic Views: A highly opinionated view library

  Assumptions:
  1. Root directory is two directories above current (library and node_modules)
  2. "public" directory is relative to root
  3. "views" directory is relative to root
  4. Jade is the view engine of choice

  Functions:
  • root
  • file
  • public
  • handlebars

  Route Handlers:
  • sendScript
  • sendStatic

*/


/*

  //// Dependencies

*/

var accepts     = require("accepts"),
    assign      = require("lodash.assign"),
    debug       = require("debug")("dogmatic-views"),
    fs          = require("fs"),
    handlebars  = require("handlebars"),
    jade        = require("jade"),
    nodefn      = require("when/node"),
    path        = require("path"),
    readFile    = nodefn.lift(fs.readFile.bind(fs)),
    when        = require("when"),
    zlib        = require("zlib"),
    zip         = nodefn.lift(zlib.gzip);



/*

  //// Globals

*/

var Views = module.exports = {};

var cache       = process.env.CACHE || (process.env.NODE_ENV === "production"),
    __dirroot   = path.join(__dirname, "..", ".."),
    __dirviews  = "views",
    __dirpublic = "public";



/*

  //// Helper Functions

*/


/*

  function hasPath

  Determines whether file appears to be in path-format.

*/

var pathRE = new RegExp("^\.?\.?" + path.sep);

function hasPath(name) {
  return pathRE.test(name || "")
}


/*

  function makePath

  Adds directory to path if necessary.

*/

function makePath(name, dir) {
  return hasPath(name) ? name : path.join(__dirroot, dir, name || "");
}



/*

  function addExtension

  Adds extension to file if one doesn't already exist and doesn't appear to be in
  path format.

*/

function addExtension(name, ext) {
  return path.extname(name) !== "" ? name : name + "." + ext;
};




/*

  //// Configuration

*/

/*

  function root

  Gets or sets root directory.

*/

Views.root = function(newRoot) {
  if (newRoot)
    __dirroot = newRoot;
  else
    return __dirroot;
};


/*

  function views

  Gets or sets default views.

*/

Views.views = function(newViews) {
  if (newViews)
    __dirviews = newViews;
  else
    return __dirviews;
};


/*

  function public

  Gets or sets default public.

*/

Views.public = function(newPublic) {
  if (newPublic)
    __dirpublic = newPublic;
  else
    return __dirpublic;
};




/*

  //// File functions

*/

(function() {

  /*

    function file

    Reads a file, caches and zips it. Returns a promise that resolves to said file.

  */

  var files = {};

  Views.file = function(name, needsZip) {

    var type = needsZip ? "zip" : "std";

    // Return cached file if available
    if (files[name] && cache) return when(files[name][type]);

    debug("Reading file for " + name);

    return readFile(name)

    .then(function(file) {
      return when.join(file, zip(file));
    })

    .spread(function(file, zipped) {
      files[name] = { std : file, zip : new Buffer(zipped, "binary") };
      return when(files[name][type]);
    });

  };

})();



/*

  function public

  Reads a file from a "public" directory, assumed to be relative to root.

*/

Views.publicFile = function(name, needsZip) {
  return Views.file(makePath(name, "public"), needsZip);
};



(function() {

  var defaults  = {},
      templates = {},
      render    = jade.render.bind(jade),
      compile   = handlebars.compile.bind(handlebars);


  /*

    function jade

    Renders a Jade template into HTML and caches it. Returns a promise that resolves to said HTML.

    Assumes files are relative to "views" directory unless filename starts with "./" or "/".

  */

  Views.jade = function(name, vars, cacheResults) {

    var loc;

    //  Set default for caching
    if ("undefined" === typeof cacheResults) cacheResults = true;

    // Ensure name has jade extension (for caching)
    name = addExtension(name, "jade");

    // Return cached file if available
    if (templates[name] && cache) return when(templates[name]);

    loc = makePath(name, __dirviews);
    return readFile(loc, "utf8")

    .then(function(file) {
      var params = assign({}, defaults, vars || {}, { filename : loc });
      return when.try(render, file, params);
    })

    .tap(function(html) {
      if (cacheResults) templates[name] = html;
    });

  };


  /*

    function handlebars

    Renders a template into a Handlebars script and caches it. Accepts HTML files, but if no
    extension is provided, assumes it is Jade. Caches the result. Returns a promise that resolves
    to said function.

    Assumes files are relative to "views" directory unless filename starts with "./" or "/".

  */

  Views.handlebars = function(name, vars) {

    var ext;

    // Ensure name has jade extension (for caching)
    name = addExtension(name, "jade");
    ext  = path.extname(name);

    return (ext === ".html" ? readFile(makePath(name, __dirviews)) : Views.jade(name, vars, false))

    .then(function(html) {
      return when.try(compile, html);
    })

    .tap(function(compiled) {
      templates[name] = compiled;
    });

  };

})();



/*

  //// Route Handlers

*/


/*

  function sendStatic

  Convenient route handler for static files or templates. If no extension, assumes Jade file. Assumes files are
  relative to "views" directory unless filename starts with "./" or "/".

*/

Views.sendStatic = function(name) {

  return function(req, res) {

    Views.jade(name)

    .then(function(html) {
      res.type("html").send(html);
    })

    .catch(function(err) {
      res.sendStatus(500);
      return when.reject(err);
    });
  }

};


/*

  function sendScript

  Convenient route handler that will load a script, zip and cache it, and then respond with proper
  headers. Assumes files are relative to "public" directory unless filename starts with "./" or "/".

*/

Views.sendScript = function(name) {

  return function(req, res) {

    var needsZip = !!accepts(req).encodings("gzip");

    Views.publicFile(name.needsZip)

    .then(function(data) {

      if (needsZip) res.set({
        "Content-Encoding" : "gzip",
        "Content-Type"     : "application/javascript",
        "Content-Length"   : data.length
      });

      res.send(data);

    })

    .catch(function(err) {
      res.sendStatus(500);
      return when.reject(err);
    });

  }
};
