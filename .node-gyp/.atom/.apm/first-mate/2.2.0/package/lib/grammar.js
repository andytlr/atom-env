(function() {
  var Emitter, EmitterMixin, Grammar, Grim, Injections, OnigRegExp, Pattern, Rule, ScopeSelector, fs, path, pathSplitRegex, _;

  path = require('path');

  _ = require('underscore-plus');

  fs = require('fs-plus');

  OnigRegExp = require('oniguruma').OnigRegExp;

  EmitterMixin = require('emissary').Emitter;

  Emitter = require('event-kit').Emitter;

  Grim = require('grim');

  Injections = require('./injections');

  Pattern = require('./pattern');

  Rule = require('./rule');

  ScopeSelector = require('./scope-selector');

  pathSplitRegex = new RegExp("[/.]");

  module.exports = Grammar = (function() {
    EmitterMixin.includeInto(Grammar);

    Grammar.prototype.registration = null;

    function Grammar(registry, options) {
      var firstLineMatch, injectionSelector, injections, patterns, repository;
      this.registry = registry;
      if (options == null) {
        options = {};
      }
      this.name = options.name, this.fileTypes = options.fileTypes, this.scopeName = options.scopeName, this.foldingStopMarker = options.foldingStopMarker, this.maxTokensPerLine = options.maxTokensPerLine;
      injections = options.injections, injectionSelector = options.injectionSelector, patterns = options.patterns, repository = options.repository, firstLineMatch = options.firstLineMatch;
      this.emitter = new Emitter;
      this.repository = null;
      this.initialRule = null;
      this.rawPatterns = patterns;
      this.rawRepository = repository;
      this.injections = new Injections(this, injections);
      if (injectionSelector != null) {
        this.injectionSelector = new ScopeSelector(injectionSelector);
      } else {
        this.injectionSelector = null;
      }
      if (firstLineMatch) {
        this.firstLineRegex = new OnigRegExp(firstLineMatch);
      } else {
        this.firstLineRegex = null;
      }
      if (this.fileTypes == null) {
        this.fileTypes = [];
      }
      this.includedGrammarScopes = [];
    }


    /*
    Section: Event Subscription
     */

    Grammar.prototype.onDidUpdate = function(callback) {
      return this.emitter.on('did-update', callback);
    };

    Grammar.prototype.on = function(eventName) {
      if (eventName === 'did-update') {
        Grim.deprecate("Call Grammar::onDidUpdate instead");
      } else {
        Grim.deprecate("Call explicit event subscription methods instead");
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };


    /*
    Section: Tokenizing
     */

    Grammar.prototype.tokenizeLines = function(text) {
      var line, lineNumber, lines, ruleStack, tokens, _i, _len, _ref, _results;
      lines = text.split('\n');
      ruleStack = null;
      _results = [];
      for (lineNumber = _i = 0, _len = lines.length; _i < _len; lineNumber = ++_i) {
        line = lines[lineNumber];
        _ref = this.tokenizeLine(line, ruleStack, lineNumber === 0), tokens = _ref.tokens, ruleStack = _ref.ruleStack;
        _results.push(tokens);
      }
      return _results;
    };

    Grammar.prototype.tokenizeLine = function(line, ruleStack, firstLine) {
      var lastRule, match, nextTokens, originalRuleStack, penultimateRule, popStack, position, previousPosition, previousRuleStackLength, rule, scopes, token, tokens, tokensEndPosition, tokensStartPosition, _i, _len, _ref;
      if (firstLine == null) {
        firstLine = false;
      }
      if (ruleStack != null) {
        ruleStack = ruleStack.slice();
      } else {
        ruleStack = [this.getInitialRule()];
      }
      originalRuleStack = ruleStack;
      tokens = [];
      position = 0;
      while (true) {
        scopes = this.scopesFromStack(ruleStack);
        previousRuleStackLength = ruleStack.length;
        previousPosition = position;
        if (tokens.length >= this.getMaxTokensPerLine() - 1) {
          token = this.createToken(line.slice(position), scopes);
          tokens.push(token);
          ruleStack = originalRuleStack;
          break;
        }
        if (position === line.length + 1) {
          break;
        }
        if (match = _.last(ruleStack).getNextTokens(ruleStack, line, position, firstLine)) {
          nextTokens = match.nextTokens, tokensStartPosition = match.tokensStartPosition, tokensEndPosition = match.tokensEndPosition;
          if (position < tokensStartPosition) {
            tokens.push(this.createToken(line.slice(position, tokensStartPosition), scopes));
          }
          tokens.push.apply(tokens, nextTokens);
          position = tokensEndPosition;
        } else {
          if (position < line.length || line.length === 0) {
            tokens.push(this.createToken(line.slice(position, line.length), scopes));
          }
          break;
        }
        if (position === previousPosition) {
          if (ruleStack.length === previousRuleStackLength) {
            console.error("Popping rule because it loops at column " + position + " of line '" + line + "'", _.clone(ruleStack));
            if (ruleStack.length > 1) {
              ruleStack.pop();
            } else {
              if (position < line.length || (line.length === 0 && tokens.length === 0)) {
                tokens.push(this.createToken(line.slice(position, line.length), scopes));
              }
              break;
            }
          } else if (ruleStack.length > previousRuleStackLength) {
            _ref = ruleStack.slice(-2), penultimateRule = _ref[0], lastRule = _ref[1];
            if ((lastRule != null) && lastRule === penultimateRule) {
              popStack = true;
            }
            if (((lastRule != null ? lastRule.scopeName : void 0) != null) && penultimateRule.scopeName === lastRule.scopeName) {
              popStack = true;
            }
            if (popStack) {
              ruleStack.pop();
              tokens.push(this.createToken(line.slice(position, line.length), scopes));
              break;
            }
          }
        }
      }
      for (_i = 0, _len = ruleStack.length; _i < _len; _i++) {
        rule = ruleStack[_i];
        rule.clearAnchorPosition();
      }
      return {
        tokens: tokens,
        ruleStack: ruleStack
      };
    };

    Grammar.prototype.activate = function() {
      return this.registration = this.registry.addGrammar(this);
    };

    Grammar.prototype.deactivate = function() {
      this.emitter = new Emitter;
      return this.registration.dispose();
    };

    Grammar.prototype.clearRules = function() {
      this.initialRule = null;
      return this.repository = null;
    };

    Grammar.prototype.getInitialRule = function() {
      return this.initialRule != null ? this.initialRule : this.initialRule = this.createRule({
        scopeName: this.scopeName,
        patterns: this.rawPatterns
      });
    };

    Grammar.prototype.getRepository = function() {
      return this.repository != null ? this.repository : this.repository = (function(_this) {
        return function() {
          var data, name, repository, _ref;
          repository = {};
          _ref = _this.rawRepository;
          for (name in _ref) {
            data = _ref[name];
            if ((data.begin != null) || (data.match != null)) {
              data = {
                patterns: [data],
                tempName: name
              };
            }
            repository[name] = _this.createRule(data);
          }
          return repository;
        };
      })(this)();
    };

    Grammar.prototype.addIncludedGrammarScope = function(scope) {
      if (!_.include(this.includedGrammarScopes, scope)) {
        return this.includedGrammarScopes.push(scope);
      }
    };

    Grammar.prototype.grammarUpdated = function(scopeName) {
      if (!_.include(this.includedGrammarScopes, scopeName)) {
        return false;
      }
      this.clearRules();
      this.registry.grammarUpdated(this.scopeName);
      this.emit('grammar-updated');
      this.emitter.emit('did-update');
      return true;
    };

    Grammar.prototype.getScore = function(filePath, contents) {
      var _ref, _ref1;
      if ((contents == null) && fs.isFileSync(filePath)) {
        contents = fs.readFileSync(filePath, 'utf8');
      }
      if (this.registry.grammarOverrideForPath(filePath) === this.scopeName) {
        return 2 + ((_ref = filePath != null ? filePath.length : void 0) != null ? _ref : 0);
      } else if (this.matchesContents(contents)) {
        return 1 + ((_ref1 = filePath != null ? filePath.length : void 0) != null ? _ref1 : 0);
      } else {
        return this.getPathScore(filePath);
      }
    };

    Grammar.prototype.matchesContents = function(contents) {
      var character, escaped, lines, numberOfNewlinesInRegex, _i, _len, _ref;
      if (!((contents != null) && (this.firstLineRegex != null))) {
        return false;
      }
      escaped = false;
      numberOfNewlinesInRegex = 0;
      _ref = this.firstLineRegex.source;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        character = _ref[_i];
        switch (character) {
          case '\\':
            escaped = !escaped;
            break;
          case 'n':
            if (escaped) {
              numberOfNewlinesInRegex++;
            }
            escaped = false;
            break;
          default:
            escaped = false;
        }
      }
      lines = contents.split('\n');
      return this.firstLineRegex.testSync(lines.slice(0, +numberOfNewlinesInRegex + 1 || 9e9).join('\n'));
    };

    Grammar.prototype.getPathScore = function(filePath) {
      var fileType, fileTypeComponents, pathComponents, pathScore, pathSuffix, _i, _len, _ref;
      if (!filePath) {
        return -1;
      }
      if (process.platform === 'win32') {
        filePath = filePath.replace(/\\/g, '/');
      }
      pathComponents = filePath.toLowerCase().split(pathSplitRegex);
      pathScore = -1;
      _ref = this.fileTypes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        fileType = _ref[_i];
        fileTypeComponents = fileType.toLowerCase().split(pathSplitRegex);
        pathSuffix = pathComponents.slice(-fileTypeComponents.length);
        if (_.isEqual(pathSuffix, fileTypeComponents)) {
          pathScore = Math.max(pathScore, fileType.length);
        }
      }
      return pathScore;
    };

    Grammar.prototype.createToken = function(value, scopes) {
      return this.registry.createToken(value, scopes);
    };

    Grammar.prototype.createRule = function(options) {
      return new Rule(this, this.registry, options);
    };

    Grammar.prototype.createPattern = function(options) {
      return new Pattern(this, this.registry, options);
    };

    Grammar.prototype.getMaxTokensPerLine = function() {
      return this.maxTokensPerLine;
    };

    Grammar.prototype.scopesFromStack = function(stack, rule, endPatternMatch) {
      var contentScopeName, scopeName, scopes, _i, _len, _ref;
      scopes = [];
      for (_i = 0, _len = stack.length; _i < _len; _i++) {
        _ref = stack[_i], scopeName = _ref.scopeName, contentScopeName = _ref.contentScopeName;
        if (scopeName) {
          scopes.push(scopeName);
        }
        if (contentScopeName) {
          scopes.push(contentScopeName);
        }
      }
      if (endPatternMatch && (rule != null ? rule.contentScopeName : void 0) && rule === stack[stack.length - 1]) {
        scopes.pop();
      }
      return scopes;
    };

    return Grammar;

  })();

}).call(this);
