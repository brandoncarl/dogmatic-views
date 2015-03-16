
"use strict";

/*

  Dogmatic Views: A highly opinionated view library

  Assumptions:
  1. Root directory is two directories above current (library and node_modules)
  2. "public" directory is relative to root
  3. "views" directory is relative to root
  4. Jade is the view engine of choice

  Getters/setters:
  • root
  • views
  • public
  • firstPass
  • secondPass

  Functions:
  • file
  • publicFile
  • jade
  • handlebars

  Route Handlers:
  • staticHandler
  • templateHandler
  • scriptHandler

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
    __dirpublic = "public",
    __engFirst  = "jade",
    __engSecond = "handlebars";



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

  function firstPass

  Gets or sets default static engine.

*/

Views.firstPass = function(newEngine) {
  if (newEngine)
    __engFirst = newEngine;
  else
    return __engFirst;
};


/*

  function secondPass

  Gets or sets default static engine.

*/

Views.secondPass = function(newEngine) {
  if (newEngine)
    __engSecond = newEngine;
  else
    return __engSecond;
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

  Views.file = function(name, options) {

    //  Set default for caching and zipping
    options = ("object" === typeof options) ? options : {};
    options = assign({ cache : true, zip : true }, options);

    var type = options.zip ? "zip" : "std";

    // Return cached file if available
    if (files[name] && cache) {
      if (files[name][type])
        return when(files[name][type]);
      else {
        // File must exist in unzipped form
        zip(files[name].std).tap(function(zipped) {
          files[name].zip = new Buffer(zipped, "binary");
        });
      }
    }

    debug("Reading file at " + name);

    return readFile(name)

    // Optionally zip
    .then(function(file) {
      var promises = [file];
      if (options.zip) promises.push(zip(file));
      return when.all(promises);
    })

    .spread(function(file, zipped) {

      // Optionally cache
      if (options.cache) {
        files[name] = { std : file };
        if (options.zip) files[name].zip = new Buffer(zipped, "binary");
      }

      return when("std" === type ? file : zipped);
    });

  };

})();



/*

  function publicFile

  Reads a file from a "public" directory, assumed to be relative to root.

*/

Views.publicFile = function(name, options) {
  return Views.file(makePath(name, "public"), options);
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

  Views.jade = function(name, vars, options) {

    var loc;

    //  Set default for caching
    options = ("object" === typeof options) ? options : {};
    options = assign({ cache : true }, options);

    // Ensure name has jade extension (for caching)
    name = addExtension(name, "jade");

    // Return cached file if available
    if (templates[name] && cache) return when(templates[name]);

    loc = makePath(name, __dirviews);
    debug("Reading file at " + loc);

    return readFile(loc, "utf8")

    .then(function(file) {
      var params = assign({}, defaults, vars || {}, { filename : loc });
      return when.try(render, file, params);
    })

    .tap(function(html) {
      if (options.cache) templates[name] = html;
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

  function staticHandler

  Convenient route handler for static files or templates. If no extension, assumes Jade file. Assumes files are
  relative to "views" directory unless filename starts with "./" or "/".

  options defaults: { warm : true, cache : true }

*/

Views.staticHandler = function(name, vars, options) {

  // Warm up and set up caching
  options = ("object" === typeof options) ? options : {};
  options = assign({ cache : true, warm : true}, options);

  // Optionally warm cache
  if (options.warm) Views[__engFirst](name, vars, options.cache);

  return function(req, res) {

    Views[__engFirst](name, vars, options.cache)

    .then(function(html) {
      res.type("html").send(html);
    })

    .catch(function(err) {
      res.status(404).end();
      return when.reject(err);
    });
  }

};


/*

  function templateHandler

  Convenient route handler to setup and use Handlebars scripts. If no extension, assumes Jade file.
  Assumes files are relative to "views" directory unless filename starts with "./" or "/".

*/

Views.templateHandler = function(name, vars, options) {

  // Warm up and set up caching
  options = ("object" === typeof options) ? options : {};
  options = assign({ cache : true, warm : true}, options);

  // Optionally warm cache
  if (options.warm) Views[__engSecond](name, vars);

  return function(req, res, locals) {

    Views[__engSecond](name, vars)

    .then(function(template) {
      res.type("html").send(template(locals || {}));
    })

    .catch(function(err) {
      res.status(404).end();
      return when.reject(err);
    });
  }


};



/*

  function scriptHandler

  Convenient route handler that will load a script, zip and cache it, and then respond with proper
  headers. Assumes files are relative to "public" directory unless filename starts with "./" or "/".

*/

Views.scriptHandler = function(name, options) {

  // Warm up and set up caching
  options = ("object" === typeof options) ? options : {};
  options = assign({ cache : true, warm : true, zip : true }, options);

  // Optionally warm cache
  if (options.warm) Views.publicFile(name, options);

  return function(req, res) {

    var needsZip = !!accepts(req).encodings("gzip");

    Views.publicFile(name, { zip : needsZip })

    .then(function(data) {

      if (needsZip) res.set({
        "Content-Encoding" : "gzip",
        "Content-Type"     : "application/javascript",
        "Content-Length"   : data.length
      });

      res.send(data);

    })

    .catch(function(err) {
      res.status(404).end();
      return when.reject(err);
    });

  }
};
