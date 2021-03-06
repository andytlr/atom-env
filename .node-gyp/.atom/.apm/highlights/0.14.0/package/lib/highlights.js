(function() {
  var GrammarRegistry, Highlights, fs, path, _;

  path = require('path');

  _ = require('underscore-plus');

  fs = require('fs-plus');

  GrammarRegistry = require('first-mate').GrammarRegistry;

  module.exports = Highlights = (function() {
    function Highlights(_arg) {
      var _ref;
      _ref = _arg != null ? _arg : {}, this.includePath = _ref.includePath, this.registry = _ref.registry;
      if (this.registry == null) {
        this.registry = new GrammarRegistry({
          maxTokensPerLine: Infinity
        });
      }
    }

    Highlights.prototype.loadGrammarsSync = function() {
      var filePath, grammar, grammarPath, grammarsPath, _i, _len, _ref, _ref1, _results;
      if (this.registry.grammars.length > 1) {
        return;
      }
      if (typeof this.includePath === 'string') {
        if (fs.isFileSync(this.includePath)) {
          this.registry.loadGrammarSync(this.includePath);
        } else if (fs.isDirectorySync(this.includePath)) {
          _ref = fs.listSync(this.includePath, ['cson', 'json']);
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            filePath = _ref[_i];
            this.registry.loadGrammarSync(filePath);
          }
        }
      }
      grammarsPath = path.join(__dirname, '..', 'gen', 'grammars.json');
      _ref1 = JSON.parse(fs.readFileSync(grammarsPath));
      _results = [];
      for (grammarPath in _ref1) {
        grammar = _ref1[grammarPath];
        if (this.registry.grammarForScopeName(grammar.scopeName) != null) {
          continue;
        }
        grammar = this.registry.createGrammar(grammarPath, grammar);
        _results.push(this.registry.addGrammar(grammar));
      }
      return _results;
    };

    Highlights.prototype.highlightSync = function(_arg) {
      var fileContents, filePath, grammar, html, lastLineTokens, lineTokens, scopeName, scopeStack, scopes, tokens, value, _i, _j, _len, _len1, _ref, _ref1;
      _ref = _arg != null ? _arg : {}, filePath = _ref.filePath, fileContents = _ref.fileContents, scopeName = _ref.scopeName;
      this.loadGrammarsSync();
      if (filePath) {
        if (fileContents == null) {
          fileContents = fs.readFileSync(filePath, 'utf8');
        }
      }
      grammar = this.registry.grammarForScopeName(scopeName);
      if (grammar == null) {
        grammar = this.registry.selectGrammar(filePath, fileContents);
      }
      lineTokens = grammar.tokenizeLines(fileContents);
      if (lineTokens.length > 0) {
        lastLineTokens = lineTokens[lineTokens.length - 1];
        if (lastLineTokens.length === 1 && lastLineTokens[0].value === '') {
          lineTokens.pop();
        }
      }
      html = '<pre class="editor editor-colors">';
      for (_i = 0, _len = lineTokens.length; _i < _len; _i++) {
        tokens = lineTokens[_i];
        scopeStack = [];
        html += '<div class="line">';
        for (_j = 0, _len1 = tokens.length; _j < _len1; _j++) {
          _ref1 = tokens[_j], scopes = _ref1.scopes, value = _ref1.value;
          if (!value) {
            value = ' ';
          }
          html = this.updateScopeStack(scopeStack, scopes, html);
          html += "<span>" + (this.escapeString(value)) + "</span>";
        }
        while (scopeStack.length > 0) {
          html = this.popScope(scopeStack, html);
        }
        html += '</div>';
      }
      html += '</pre>';
      return html;
    };

    Highlights.prototype.escapeString = function(string) {
      return string.replace(/[&"'<> ]/g, function(match) {
        switch (match) {
          case '&':
            return '&amp;';
          case '"':
            return '&quot;';
          case "'":
            return '&#39;';
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case ' ':
            return '&nbsp;';
          default:
            return match;
        }
      });
    };

    Highlights.prototype.updateScopeStack = function(scopeStack, desiredScopes, html) {
      var excessScopes, i, j, _i, _j, _ref, _ref1;
      excessScopes = scopeStack.length - desiredScopes.length;
      if (excessScopes > 0) {
        while (excessScopes--) {
          html = this.popScope(scopeStack, html);
        }
      }
      for (i = _i = _ref = scopeStack.length; _ref <= 0 ? _i <= 0 : _i >= 0; i = _ref <= 0 ? ++_i : --_i) {
        if (_.isEqual(scopeStack.slice(0, i), desiredScopes.slice(0, i))) {
          break;
        }
        html = this.popScope(scopeStack, html);
      }
      for (j = _j = i, _ref1 = desiredScopes.length; i <= _ref1 ? _j < _ref1 : _j > _ref1; j = i <= _ref1 ? ++_j : --_j) {
        html = this.pushScope(scopeStack, desiredScopes[j], html);
      }
      return html;
    };

    Highlights.prototype.pushScope = function(scopeStack, scope, html) {
      scopeStack.push(scope);
      return html += "<span class=\"" + (scope.replace(/\.+/g, ' ')) + "\">";
    };

    Highlights.prototype.popScope = function(scopeStack, html) {
      scopeStack.pop();
      return html += '</span>';
    };

    return Highlights;

  })();

}).call(this);
