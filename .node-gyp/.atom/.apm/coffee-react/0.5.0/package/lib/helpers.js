// Generated by CoffeeScript 1.7.1
var helpers;

helpers = require('coffee-script/lib/coffee-script/helpers');

helpers.isCoffee = function(filepath) {
  return /\.((lit)?coffee|coffee\.md|cjsx|csx)$/.test(filepath);
};

helpers.hasCJSXExtension = function(filepath) {
  return /\.(cjsx|csx)$/.test(filepath);
};

helpers.hasCJSXPragma = function(src) {
  return /^\s*#\s*@(cjsx|csx)/.test(src);
};

module.exports = helpers;
