(function() {
  module.exports = {
    activate: function(state) {
      atom.workspaceView.command("move-panes:move-right", (function(_this) {
        return function() {
          return _this.moveRight();
        };
      })(this));
      atom.workspaceView.command("move-panes:move-left", (function(_this) {
        return function() {
          return _this.moveLeft();
        };
      })(this));
      atom.workspaceView.command("move-panes:move-down", (function(_this) {
        return function() {
          return _this.moveDown();
        };
      })(this));
      atom.workspaceView.command("move-panes:move-up", (function(_this) {
        return function() {
          return _this.moveUp();
        };
      })(this));
      atom.workspaceView.command("move-panes:move-next", (function(_this) {
        return function() {
          return _this.moveNext();
        };
      })(this));
      return atom.workspaceView.command("move-panes:move-previous", (function(_this) {
        return function() {
          return _this.movePrevious();
        };
      })(this));
    },
    moveRight: function() {
      return this.move('horizontal', +1);
    },
    moveLeft: function() {
      return this.move('horizontal', -1);
    },
    moveUp: function() {
      return this.move('vertical', -1);
    },
    moveDown: function() {
      return this.move('vertical', +1);
    },
    moveNext: function() {
      return this.moveOrder(this.nextMethod);
    },
    movePrevious: function() {
      return this.moveOrder(this.previousMethod);
    },
    nextMethod: 'activateNextPane',
    previousMethod: 'activatePreviousPane',
    active: function() {
      return atom.workspace.getActivePane();
    },
    moveOrder: function(method) {
      var source, target;
      source = this.active();
      atom.workspace[method]();
      target = this.active();
      return this.swapEditor(source, target);
    },
    move: function(orientation, delta) {
      var axis, child, pane, target, _ref;
      pane = atom.workspace.getActivePane();
      _ref = this.getAxis(pane, orientation), axis = _ref[0], child = _ref[1];
      if (axis != null) {
        target = this.getRelativePane(axis, child, delta);
      }
      if (target != null) {
        return this.swapEditor(pane, target);
      }
    },
    swapEditor: function(source, target) {
      var editor;
      editor = source.getActiveItem();
      source.removeItem(editor);
      target.addItem(editor);
      target.activateItem(editor);
      return target.activate();
    },
    getAxis: function(pane, orientation) {
      var axis, child;
      axis = pane.parent;
      child = pane;
      while (true) {
        if (axis.constructor.name !== 'PaneAxis') {
          return;
        }
        if (axis.orientation === orientation) {
          break;
        }
        child = axis;
        axis = axis.parent;
      }
      return [axis, child];
    },
    getRelativePane: function(axis, source, delta) {
      var position, target;
      position = axis.children.indexOf(source);
      target = position + delta;
      if (!(target < axis.children.length)) {
        return;
      }
      return axis.children[target].getPanes()[0];
    },
    deactivate: function() {},
    serialize: function() {}
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAiZmlsZSI6ICIiLAogICJzb3VyY2VSb290IjogIiIsCiAgInNvdXJjZXMiOiBbCiAgICAiIgogIF0sCiAgIm5hbWVzIjogW10sCiAgIm1hcHBpbmdzIjogIkFBQUE7QUFBQSxFQUFBLE1BQU0sQ0FBQyxPQUFQLEdBRUU7QUFBQSxJQUFBLFFBQUEsRUFBVSxTQUFDLEtBQUQsR0FBQTtBQUNSLE1BQUEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFuQixDQUEyQix1QkFBM0IsRUFBb0QsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtpQkFBRyxLQUFDLENBQUEsU0FBRCxDQUFBLEVBQUg7UUFBQSxFQUFBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFwRCxDQUFBLENBQUE7QUFBQSxNQUNBLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBbkIsQ0FBMkIsc0JBQTNCLEVBQW1ELENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFBLEdBQUE7aUJBQUcsS0FBQyxDQUFBLFFBQUQsQ0FBQSxFQUFIO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkQsQ0FEQSxDQUFBO0FBQUEsTUFFQSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQW5CLENBQTJCLHNCQUEzQixFQUFtRCxDQUFBLFNBQUEsS0FBQSxHQUFBO2VBQUEsU0FBQSxHQUFBO2lCQUFHLEtBQUMsQ0FBQSxRQUFELENBQUEsRUFBSDtRQUFBLEVBQUE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQW5ELENBRkEsQ0FBQTtBQUFBLE1BR0EsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFuQixDQUEyQixvQkFBM0IsRUFBaUQsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtpQkFBRyxLQUFDLENBQUEsTUFBRCxDQUFBLEVBQUg7UUFBQSxFQUFBO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqRCxDQUhBLENBQUE7QUFBQSxNQUlBLElBQUksQ0FBQyxhQUFhLENBQUMsT0FB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
//# sourceURL=/Users/andytlr/.atom/packages/move-panes/lib/move-panes.coffee