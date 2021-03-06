(function() {
  var Directory, Disposable, Emitter, EmitterMixin, File, Grim, PathWatcher, Q, crypto, fs, path, runas, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  crypto = require('crypto');

  path = require('path');

  _ = require('underscore-plus');

  EmitterMixin = require('emissary').Emitter;

  _ref = require('event-kit'), Emitter = _ref.Emitter, Disposable = _ref.Disposable;

  fs = require('fs-plus');

  Grim = require('grim');

  Q = null;

  runas = null;

  Directory = null;

  PathWatcher = require('./main');

  module.exports = File = (function() {
    EmitterMixin.includeInto(File);

    File.prototype.realPath = null;

    File.prototype.subscriptionCount = 0;


    /*
    Section: Construction
     */

    function File(filePath, symlink) {
      this.symlink = symlink != null ? symlink : false;
      this.didRemoveSubscription = __bind(this.didRemoveSubscription, this);
      this.willAddSubscription = __bind(this.willAddSubscription, this);
      if (fs.isDirectorySync(filePath)) {
        throw new Error("" + filePath + " is a directory");
      }
      if (filePath) {
        filePath = path.normalize(filePath);
      }
      this.path = filePath;
      this.emitter = new Emitter;
      this.on('contents-changed-subscription-will-be-added', this.willAddSubscription);
      this.on('moved-subscription-will-be-added', this.willAddSubscription);
      this.on('removed-subscription-will-be-added', this.willAddSubscription);
      this.on('contents-changed-subscription-removed', this.didRemoveSubscription);
      this.on('moved-subscription-removed', this.didRemoveSubscription);
      this.on('removed-subscription-removed', this.didRemoveSubscription);
      this.cachedContents = null;
    }

    File.prototype.on = function(eventName) {
      switch (eventName) {
        case 'content-changed':
          Grim.deprecate("Use File::onDidChange instead");
          break;
        case 'moved':
          Grim.deprecate("Use File::onDidRename instead");
          break;
        case 'removed':
          Grim.deprecate("Use File::onDidDelete instead");
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };


    /*
    Section: Event Subscription
     */

    File.prototype.onDidChange = function(callback) {
      this.willAddSubscription();
      return this.trackUnsubscription(this.emitter.on('did-change', callback));
    };

    File.prototype.onDidRename = function(callback) {
      this.willAddSubscription();
      return this.trackUnsubscription(this.emitter.on('did-rename', callback));
    };

    File.prototype.onDidDelete = function(callback) {
      this.willAddSubscription();
      return this.trackUnsubscription(this.emitter.on('did-delete', callback));
    };

    File.prototype.willAddSubscription = function() {
      if (this.exists() && this.subscriptionCount === 0) {
        this.subscribeToNativeChangeEvents();
      }
      return this.subscriptionCount++;
    };

    File.prototype.didRemoveSubscription = function() {
      this.subscriptionCount--;
      if (this.subscriptionCount === 0) {
        return this.unsubscribeFromNativeChangeEvents();
      }
    };

    File.prototype.trackUnsubscription = function(subscription) {
      return new Disposable((function(_this) {
        return function() {
          subscription.dispose();
          return _this.didRemoveSubscription();
        };
      })(this));
    };


    /*
    Section: File Metadata
     */

    File.prototype.isFile = function() {
      return true;
    };

    File.prototype.isDirectory = function() {
      return false;
    };

    File.prototype.exists = function() {
      return fs.existsSync(this.getPath());
    };

    File.prototype.getDigest = function() {
      var _ref1;
      return (_ref1 = this.digest) != null ? _ref1 : this.setDigest(this.readSync());
    };

    File.prototype.setDigest = function(contents) {
      return this.digest = crypto.createHash('sha1').update(contents != null ? contents : '').digest('hex');
    };


    /*
    Section: Managing Paths
     */

    File.prototype.getPath = function() {
      return this.path;
    };

    File.prototype.setPath = function(path) {
      this.path = path;
      return this.realPath = null;
    };

    File.prototype.getRealPathSync = function() {
      var error;
      if (this.realPath == null) {
        try {
          this.realPath = fs.realpathSync(this.path);
        } catch (_error) {
          error = _error;
          this.realPath = this.path;
        }
      }
      return this.realPath;
    };

    File.prototype.getBaseName = function() {
      return path.basename(this.path);
    };


    /*
    Section: Traversing
     */

    File.prototype.getParent = function() {
      if (Directory == null) {
        Directory = require('./directory');
      }
      return new Directory(path.dirname(this.path));
    };


    /*
    Section: Reading and Writing
     */

    File.prototype.readSync = function(flushCache) {
      if (!this.exists()) {
        this.cachedContents = null;
      } else if ((this.cachedContents == null) || flushCache) {
        this.cachedContents = fs.readFileSync(this.getPath(), 'utf8');
      }
      this.setDigest(this.cachedContents);
      return this.cachedContents;
    };

    File.prototype.read = function(flushCache) {
      var bytesRead, content, deferred, promise, readStream;
      if (Q == null) {
        Q = require('q');
      }
      if (!this.exists()) {
        promise = Q(null);
      } else if ((this.cachedContents == null) || flushCache) {
        deferred = Q.defer();
        promise = deferred.promise;
        content = [];
        bytesRead = 0;
        readStream = fs.createReadStream(this.getPath(), {
          encoding: 'utf8'
        });
        readStream.on('data', function(chunk) {
          content.push(chunk);
          bytesRead += chunk.length;
          return deferred.notify(bytesRead);
        });
        readStream.on('end', function() {
          return deferred.resolve(content.join(''));
        });
        readStream.on('error', function(error) {
          return deferred.reject(error);
        });
      } else {
        promise = Q(this.cachedContents);
      }
      return promise.then((function(_this) {
        return function(contents) {
          _this.setDigest(contents);
          return _this.cachedContents = contents;
        };
      })(this));
    };

    File.prototype.write = function(text) {
      var previouslyExisted;
      previouslyExisted = this.exists();
      this.writeFileWithPrivilegeEscalationSync(this.getPath(), text);
      this.cachedContents = text;
      if (!previouslyExisted && this.hasSubscriptions()) {
        this.subscribeToNativeChangeEvents();
      }
      return void 0;
    };

    File.prototype.writeFileWithPrivilegeEscalationSync = function(filePath, text) {
      var error;
      try {
        return fs.writeFileSync(filePath, text);
      } catch (_error) {
        error = _error;
        if (error.code === 'EACCES' && process.platform === 'darwin') {
          if (runas == null) {
            runas = require('runas');
          }
          if (runas('/bin/dd', ["of=" + filePath], {
            stdin: text,
            admin: true
          }) !== 0) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    };


    /*
    Section: Private
     */

    File.prototype.handleNativeChangeEvent = function(eventType, eventPath) {
      var oldContents;
      switch (eventType) {
        case 'delete':
          this.unsubscribeFromNativeChangeEvents();
          return this.detectResurrectionAfterDelay();
        case 'rename':
          this.setPath(eventPath);
          this.emit('moved');
          return this.emitter.emit('did-rename');
        case 'change':
          oldContents = this.cachedContents;
          return this.read(true).done((function(_this) {
            return function(newContents) {
              if (oldContents !== newContents) {
                _this.emit('contents-changed');
                return _this.emitter.emit('did-change');
              }
            };
          })(this));
      }
    };

    File.prototype.detectResurrectionAfterDelay = function() {
      return _.delay(((function(_this) {
        return function() {
          return _this.detectResurrection();
        };
      })(this)), 50);
    };

    File.prototype.detectResurrection = function() {
      if (this.exists()) {
        this.subscribeToNativeChangeEvents();
        return this.handleNativeChangeEvent('change', this.getPath());
      } else {
        this.cachedContents = null;
        this.emit('removed');
        return this.emitter.emit('did-delete');
      }
    };

    File.prototype.subscribeToNativeChangeEvents = function() {
      return this.watchSubscription != null ? this.watchSubscription : this.watchSubscription = PathWatcher.watch(this.path, (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return _this.handleNativeChangeEvent.apply(_this, args);
        };
      })(this));
    };

    File.prototype.unsubscribeFromNativeChangeEvents = function() {
      if (this.watchSubscription != null) {
        this.watchSubscription.close();
        return this.watchSubscription = null;
      }
    };

    return File;

  })();

}).call(this);
