(function() {
  var CSON, Disposable, Emitter, EmitterMixin, Grammar, GrammarRegistry, Grim, NullGrammar, _, _ref;

  _ = require('underscore-plus');

  CSON = require('season');

  EmitterMixin = require('emissary').Emitter;

  _ref = require('event-kit'), Emitter = _ref.Emitter, Disposable = _ref.Disposable;

  Grim = require('grim');

  Grammar = require('./grammar');

  NullGrammar = require('./null-grammar');

  module.exports = GrammarRegistry = (function() {
    EmitterMixin.includeInto(GrammarRegistry);

    function GrammarRegistry(options) {
      var _ref1;
      if (options == null) {
        options = {};
      }
      this.maxTokensPerLine = (_ref1 = options.maxTokensPerLine) != null ? _ref1 : Infinity;
      this.emitter = new Emitter;
      this.grammars = [];
      this.grammarsByScopeName = {};
      this.injectionGrammars = [];
      this.grammarOverridesByPath = {};
      this.nullGrammar = new NullGrammar(this);
      this.addGrammar(this.nullGrammar);
    }


    /*
    Section: Event Subscription
     */

    GrammarRegistry.prototype.onDidAddGrammar = function(callback) {
      return this.emitter.on('did-add-grammar', callback);
    };

    GrammarRegistry.prototype.onDidUpdateGrammar = function(callback) {
      return this.emitter.on('did-update-grammar', callback);
    };

    GrammarRegistry.prototype.on = function(eventName) {
      switch (eventName) {
        case 'grammar-added':
          Grim.deprecate("Call GrammarRegistry::onDidAddGrammar instead");
          break;
        case 'grammar-updated':
          Grim.deprecate("Call GrammarRegistry::onDidUpdateGrammar instead");
          break;
        default:
          Grim.deprecate("Call explicit event subscription methods instead");
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };


    /*
    Section: Managing Grammars
     */

    GrammarRegistry.prototype.getGrammars = function() {
      return _.clone(this.grammars);
    };

    GrammarRegistry.prototype.grammarForScopeName = function(scopeName) {
      return this.grammarsByScopeName[scopeName];
    };

    GrammarRegistry.prototype.addGrammar = function(grammar) {
      this.grammars.push(grammar);
      this.grammarsByScopeName[grammar.scopeName] = grammar;
      if (grammar.injectionSelector != null) {
        this.injectionGrammars.push(grammar);
      }
      this.grammarUpdated(grammar.scopeName);
      this.emit('grammar-added', grammar);
      this.emitter.emit('did-add-grammar', grammar);
      return new Disposable((function(_this) {
        return function() {
          return _this.removeGrammar(grammar);
        };
      })(this));
    };

    GrammarRegistry.prototype.removeGrammar = function(grammar) {
      _.remove(this.grammars, grammar);
      delete this.grammarsByScopeName[grammar.scopeName];
      _.remove(this.injectionGrammars, grammar);
      this.grammarUpdated(grammar.scopeName);
      return void 0;
    };

    GrammarRegistry.prototype.removeGrammarForScopeName = function(scopeName) {
      var grammar;
      grammar = this.grammarForScopeName(scopeName);
      if (grammar != null) {
        this.removeGrammar(grammar);
      }
      return grammar;
    };

    GrammarRegistry.prototype.readGrammarSync = function(grammarPath) {
      var grammar, _ref1;
      grammar = (_ref1 = CSON.readFileSync(grammarPath)) != null ? _ref1 : {};
      if (typeof grammar.scopeName === 'string' && grammar.scopeName.length > 0) {
        return this.createGrammar(grammarPath, grammar);
      } else {
        throw new Error("Grammar missing required scopeName property: " + grammarPath);
      }
    };

    GrammarRegistry.prototype.readGrammar = function(grammarPath, callback) {
      CSON.readFile(grammarPath, (function(_this) {
        return function(error, grammar) {
          if (grammar == null) {
            grammar = {};
          }
          if (error != null) {
            return typeof callback === "function" ? callback(error) : void 0;
          } else {
            if (typeof grammar.scopeName === 'string' && grammar.scopeName.length > 0) {
              return typeof callback === "function" ? callback(null, _this.createGrammar(grammarPath, grammar)) : void 0;
            } else {
              return typeof callback === "function" ? callback(new Error("Grammar missing required scopeName property: " + grammarPath)) : void 0;
            }
          }
        };
      })(this));
      return void 0;
    };

    GrammarRegistry.prototype.loadGrammarSync = function(grammarPath) {
      var grammar;
      grammar = this.readGrammarSync(grammarPath);
      this.addGrammar(grammar);
      return grammar;
    };

    GrammarRegistry.prototype.loadGrammar = function(grammarPath, callback) {
      this.readGrammar(grammarPath, (function(_this) {
        return function(error, grammar) {
          if (error != null) {
            return typeof callback === "function" ? callback(error) : void 0;
          } else {
            _this.addGrammar(grammar);
            return typeof callback === "function" ? callback(null, grammar) : void 0;
          }
        };
      })(this));
      return void 0;
    };

    GrammarRegistry.prototype.grammarOverrideForPath = function(filePath) {
      return this.grammarOverridesByPath[filePath];
    };

    GrammarRegistry.prototype.setGrammarOverrideForPath = function(filePath, scopeName) {
      if (filePath) {
        return this.grammarOverridesByPath[filePath] = scopeName;
      }
    };

    GrammarRegistry.prototype.clearGrammarOverrideForPath = function(filePath) {
      delete this.grammarOverridesByPath[filePath];
      return void 0;
    };

    GrammarRegistry.prototype.clearGrammarOverrides = function() {
      this.grammarOverridesByPath = {};
      return void 0;
    };

    GrammarRegistry.prototype.selectGrammar = function(filePath, fileContents) {
      return _.max(this.grammars, function(grammar) {
        return grammar.getScore(filePath, fileContents);
      });
    };

    GrammarRegistry.prototype.clearObservers = function() {
      this.off();
      return this.emitter = new Emitter;
    };

    GrammarRegistry.prototype.createToken = function(value, scopes) {
      return {
        value: value,
        scopes: scopes
      };
    };

    GrammarRegistry.prototype.grammarUpdated = function(scopeName) {
      var grammar, _i, _len, _ref1, _results;
      _ref1 = this.grammars;
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        grammar = _ref1[_i];
        if (grammar.scopeName !== scopeName) {
          if (grammar.grammarUpdated(scopeName)) {
            this.emit('grammar-updated', grammar);
            _results.push(this.emitter.emit('did-update-grammar', grammar));
          } else {
            _results.push(void 0);
          }
        }
      }
      return _results;
    };

    GrammarRegistry.prototype.createGrammar = function(grammarPath, object) {
      var grammar;
      if (object.maxTokensPerLine == null) {
        object.maxTokensPerLine = this.maxTokensPerLine;
      }
      grammar = new Grammar(this, object);
      grammar.path = grammarPath;
      return grammar;
    };

    return GrammarRegistry;

  })();

}).call(this);
