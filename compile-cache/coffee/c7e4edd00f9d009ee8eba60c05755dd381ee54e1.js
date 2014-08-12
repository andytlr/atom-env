(function() {
  var Gist, fs, path, protocol;

  fs = require('fs');

  if (atom.config.get('gist-it.gitHubEnterpriseHost') && atom.config.get('gist-it.useHttp')) {
    protocol = require('http');
  } else {
    protocol = require('https');
  }

  path = require('path');

  module.exports = Gist = (function() {
    function Gist() {
      this.isPublic = !atom.config.get('gist-it.newGistsDefaultToPrivate');
      this.files = {};
      this.description = "";
      if (atom.config.get('gist-it.gitHubEnterpriseHost')) {
        this.hostname = atom.config.get('gist-it.gitHubEnterpriseHost');
        this.path = '/api/v3/gists';
      } else {
        this.hostname = 'api.github.com';
        this.path = '/gists';
      }
    }

    Gist.prototype.getSecretTokenPath = function() {
      return path.join(atom.getConfigDirPath(), "gist-it.token");
    };

    Gist.prototype.getToken = function() {
      var config;
      if (this.token == null) {
        config = atom.config.get("gist-it.userToken");
        this.token = (config != null) && config.toString().length > 0 ? config : fs.existsSync(this.getSecretTokenPath()) ? fs.readFileSync(this.getSecretTokenPath()) : void 0;
      }
      return this.token;
    };

    Gist.prototype.post = function(callback) {
      var options, request;
      options = {
        hostname: this.hostname,
        path: this.path,
        method: 'POST',
        headers: {
          "User-Agent": "Atom"
        }
      };
      if (this.getToken() != null) {
        options.headers["Authorization"] = "token " + (this.getToken());
      }
      request = protocol.request(options, function(res) {
        var body;
        res.setEncoding("utf8");
        body = '';
        res.on("data", function(chunk) {
          return body += chunk;
        });
        return res.on("end", function() {
          var response;
          response = JSON.parse(body);
          return callback(response);
        });
      });
      request.write(JSON.stringify(this.toParams()));
      return request.end();
    };

    Gist.prototype.toParams = function() {
      return {
        description: this.description,
        files: this.files,
        "public": this.isPublic
      };
    };

    return Gist;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAiZmlsZSI6ICIiLAogICJzb3VyY2VSb290IjogIiIsCiAgInNvdXJjZXMiOiBbCiAgICAiIgogIF0sCiAgIm5hbWVzIjogW10sCiAgIm1hcHBpbmdzIjogIkFBQUE7QUFBQSxNQUFBLHdCQUFBOztBQUFBLEVBQUEsRUFBQSxHQUFLLE9BQUEsQ0FBUSxJQUFSLENBQUwsQ0FBQTs7QUFFQSxFQUFBLElBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFaLENBQWdCLDhCQUFoQixDQUFBLElBQW9ELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBWixDQUFnQixpQkFBaEIsQ0FBdkQ7QUFDSSxJQUFBLFFBQUEsR0FBVyxPQUFBLENBQVEsTUFBUixDQUFYLENBREo7R0FBQSxNQUFBO0FBR0ksSUFBQSxRQUFBLEdBQVcsT0FBQSxDQUFRLE9BQVIsQ0FBWCxDQUhKO0dBRkE7O0FBQUEsRUFNQSxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVIsQ0FOUCxDQUFBOztBQUFBLEVBUUEsTUFBTSxDQUFDLE9BQVAsR0FDTTtBQUNTLElBQUEsY0FBQSxHQUFBO0FBQ1QsTUFBQSxJQUFDLENBQUEsUUFBRCxHQUFZLENBQUEsSUFBSyxDQUFDLE1BQU0sQ0FBQyxHQUFaLENBQWdCLGtDQUFoQixDQUFiLENBQUE7QUFBQSxNQUNBLElBQUMsQ0FBQSxLQUFELEdBQVMsRUFEVCxDQUFBO0FBQUEsTUFFQSxJQUFDLENBQUEsV0FBRCxHQUFlLEVBRmYsQ0FBQTtBQUtBLE1BQUEsSUFBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQVosQ0FBZ0IsOEJBQWhCLENBQUg7QUFDRSxRQUFBLElBQUMsQ0FBQSxRQUFELEdBQVksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFaLENBQWdCLDhCQUFoQixDQUFaLENBQUE7QUFBQSxRQUNBLElBQUMsQ0FBQSxJQUFELEdBQVEsZUFEUixDQURGO09BQUEsTUFBQTtBQUlFLFFBQUEsSUFBQyxDQUFBLFFBQUQsR0FBWSxnQkFBWixDQUFBO0FBQUEsUUFDQSxJQUFDLENBQUEsSUFB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
//# sourceURL=/Users/andytlr/.atom/packages/gist-it/lib/gist-model.coffee