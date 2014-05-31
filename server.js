var exec = require('child_process').exec;
var fs = require('fs');
var http = require('http');
var path = require('path');
var qs = require('querystring');
var url = require('url');

var port = process.env.PORT || 8951;
var cwd = process.cwd()

http.createServer(function (req, res) {
  console.log(req.method, req.url);
  var u = url.parse(req.url);
  if (u.pathname == '/') {
    return res.end('ok\n');
  } 
  var site = u.pathname.substr(1);
  if (req.method == 'POST') {
    var body = '';
    req.on('data', function (chunk) {body += chunk});
    req.on('end', function () {
      var payload = JSON.parse(body);
      console.log(payload)
      if (payload.commits.length > 0) {
        for (var i=0; i<payload.commits.length; i++) {
          var commit = payload.commits[i];
        }
        var siteDir = path.resolve(cwd, site);
        console.log(siteDir);
        fs.exists(siteDir, function (exists) {
          if (exists) {
            exec('git pull', {cwd: siteDir}, function (err, stdout, stderr) {
              if (err) throw err;
              console.log(stdout);
              console.error(stderr);
              // TODO Stop server.js in this directory
              // TODO Start server.js in this directory
            });
          } else {
            exec('git clone ' + payload.repository.url + '.git', function (err, stdout, stderr) {
              if (err) throw err;
              console.log(stdout);
              console.error(stderr);
              // TODO Start server.js in this directory
            });
          }
        });
      }
      res.end('ok\n');
    });
  }
}).listen(port, function () {
  console.log('Running on port', port);
});
