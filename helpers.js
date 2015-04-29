
"use strict";

var helpers = {

  and: function (a, b, options) {
    return (a && b) ? options.fn(this) : options.inverse(this);
  },

  contains: function (haystack, needle, options) {
    return (haystack.indexOf(needle) !== -1) ? options.fn(this) : options.inverse(this);
  },

  gt: function (a, b, options) {
    return (a > b) ? options.fn(this) : options.inverse(this);
  },

  gte: function (a, b, options) {
    return (a >= b) ? options.fn(this) : options.inverse(this);
  },

  is: function (a, b, options) {
    return (a === b) ? options.fn(this) : options.inverse(this);
  },

  isnt: function (a, b, options) {
    return (a !== b) ? options.fn(this) : options.inverse(this);
  },

  lt: function (a, b, options) {
    return (a < b) ? options.fn(this) : options.inverse(this);
  },

  lte: function (a, b, options) {
    return (a <= b) ? options.fn(this) : options.inverse(this);
  },

  or: function (a, b, options) {
    return (a || b) ? options.fn(this) : options.inverse(this);
  }

};


module.exports = function(Handlebars) {
  for (var helper in helpers)
    Handlebars.registerHelper(helper, helpers[helper]);
};

