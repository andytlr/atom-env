// Generated by CoffeeScript 1.7.1
var Parser, serialise;

Parser = require('./parser');

serialise = require('./serialiser');

module.exports.transform = function(code, opts) {
  return serialise(new Parser().parse(code, opts));
};
