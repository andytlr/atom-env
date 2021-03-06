(function() {
  var Rule, Scanner, _,
    __slice = [].slice;

  _ = require('underscore-plus');

  Scanner = require('./scanner');

  module.exports = Rule = (function() {
    function Rule(grammar, registry, _arg) {
      var pattern, patterns, _i, _len, _ref, _ref1;
      this.grammar = grammar;
      this.registry = registry;
      _ref = _arg != null ? _arg : {}, this.scopeName = _ref.scopeName, this.contentScopeName = _ref.contentScopeName, patterns = _ref.patterns, this.endPattern = _ref.endPattern, this.applyEndPatternLast = _ref.applyEndPatternLast;
      this.patterns = [];
      _ref1 = patterns != null ? patterns : [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        pattern = _ref1[_i];
        if (!pattern.disabled) {
          this.patterns.push(this.grammar.createPattern(pattern));
        }
      }
      if (this.endPattern && !this.endPattern.hasBackReferences) {
        if (this.applyEndPatternLast) {
          this.patterns.push(this.endPattern);
        } else {
          this.patterns.unshift(this.endPattern);
        }
      }
      this.scannersByBaseGrammarName = {};
      this.createEndPattern = null;
      this.anchorPosition = -1;
    }

    Rule.prototype.getIncludedPatterns = function(baseGrammar, included) {
      var allPatterns, pattern, _i, _len, _ref;
      if (included == null) {
        included = [];
      }
      if (_.include(included, this)) {
        return [];
      }
      included = included.concat([this]);
      allPatterns = [];
      _ref = this.patterns;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pattern = _ref[_i];
        allPatterns.push.apply(allPatterns, pattern.getIncludedPatterns(baseGrammar, included));
      }
      return allPatterns;
    };

    Rule.prototype.clearAnchorPosition = function() {
      return this.anchorPosition = -1;
    };

    Rule.prototype.getScanner = function(baseGrammar) {
      var patterns, scanner;
      if (scanner = this.scannersByBaseGrammarName[baseGrammar.name]) {
        return scanner;
      }
      patterns = this.getIncludedPatterns(baseGrammar);
      scanner = new Scanner(patterns);
      this.scannersByBaseGrammarName[baseGrammar.name] = scanner;
      return scanner;
    };

    Rule.prototype.scanInjections = function(ruleStack, line, position, firstLine) {
      var baseGrammar, injections, result, scanner, _i, _len, _ref;
      baseGrammar = ruleStack[0].grammar;
      if (injections = baseGrammar.injections) {
        _ref = injections.getScanners(ruleStack);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          scanner = _ref[_i];
          result = scanner.findNextMatch(line, firstLine, position, this.anchorPosition);
          if (result != null) {
            return result;
          }
        }
      }
    };

    Rule.prototype.normalizeCaptureIndices = function(line, captureIndices) {
      var capture, lineLength, _i, _len, _results;
      lineLength = line.length;
      _results = [];
      for (_i = 0, _len = captureIndices.length; _i < _len; _i++) {
        capture = captureIndices[_i];
        capture.end = Math.min(capture.end, lineLength);
        _results.push(capture.start = Math.min(capture.start, lineLength));
      }
      return _results;
    };

    Rule.prototype.findNextMatch = function(ruleStack, line, position, firstLine) {
      var baseGrammar, injectionGrammar, lineWithNewline, result, results, scanner, scopes, _i, _len, _ref;
      lineWithNewline = "" + line + "\n";
      baseGrammar = ruleStack[0].grammar;
      results = [];
      scanner = this.getScanner(baseGrammar);
      if (result = scanner.findNextMatch(lineWithNewline, firstLine, position, this.anchorPosition)) {
        results.push(result);
      }
      if (result = this.scanInjections(ruleStack, lineWithNewline, position, firstLine)) {
        results.push(result);
      }
      scopes = null;
      _ref = this.registry.injectionGrammars;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        injectionGrammar = _ref[_i];
        if (injectionGrammar === this.grammar) {
          continue;
        }
        if (injectionGrammar === baseGrammar) {
          continue;
        }
        if (scopes == null) {
          scopes = this.grammar.scopesFromStack(ruleStack);
        }
        if (injectionGrammar.injectionSelector.matches(scopes)) {
          scanner = injectionGrammar.getInitialRule().getScanner(injectionGrammar, position, firstLine);
          if (result = scanner.findNextMatch(lineWithNewline, firstLine, position, this.anchorPosition)) {
            results.push(result);
          }
        }
      }
      if (results.length > 1) {
        return _.min(results, (function(_this) {
          return function(result) {
            _this.normalizeCaptureIndices(lineWithNewline, result.captureIndices);
            return result.captureIndices[0].start;
          };
        })(this));
      } else if (results.length === 1) {
        result = results[0];
        this.normalizeCaptureIndices(lineWithNewline, result.captureIndices);
        return result;
      }
    };

    Rule.prototype.getNextTokens = function(ruleStack, line, position, firstLine) {
      var captureIndices, endPatternMatch, firstCapture, index, nextTokens, result, scanner;
      result = this.findNextMatch(ruleStack, line, position, firstLine);
      if (result == null) {
        return null;
      }
      index = result.index, captureIndices = result.captureIndices, scanner = result.scanner;
      firstCapture = captureIndices[0];
      endPatternMatch = this.endPattern === scanner.patterns[index];
      nextTokens = scanner.handleMatch(result, ruleStack, line, this, endPatternMatch);
      return {
        nextTokens: nextTokens,
        tokensStartPosition: firstCapture.start,
        tokensEndPosition: firstCapture.end
      };
    };

    Rule.prototype.getRuleToPush = function(line, beginPatternCaptureIndices) {
      var rule;
      if (this.endPattern.hasBackReferences) {
        rule = this.grammar.createRule({
          scopeName: this.scopeName,
          contentScopeName: this.contentScopeName
        });
        rule.endPattern = this.endPattern.resolveBackReferences(line, beginPatternCaptureIndices);
        rule.patterns = [rule.endPattern].concat(__slice.call(this.patterns));
        return rule;
      } else {
        return this;
      }
    };

    return Rule;

  })();

}).call(this);
