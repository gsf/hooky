var cp = require('child_process');
var flatini = require('flatini');
var fs = require('fs');
var http = require('http');
var path = require('path');
var url = require('url');


var cwd = process.cwd();
var port = process.env.PORT || 8951;
var servers = {};

function getConf (filePath) {
  var confStr = fs.readFileSync(filePath, 'utf8');
  var conf = flatini(confStr);
  console.log(conf);
  return conf;
}

var conf = getConf('/etc/hooky.conf');

function startServer (name) {
  var dir = path.resolve(cwd, name);
  var start = (conf[name] && conf[name].start) || 'server.js';
  if (!servers[name]) {servers[name] = {dir: dir}}
  servers[name].proc = cp.fork(path.resolve(dir, start), {
    cwd: dir,
    env: process.env
  });
}

// Start up server.js in each directory
fs.readdirSync(cwd).filter(function (file) {
  return fs.statSync(file).isDirectory()
}).forEach(function (dir) {
  cp.exec('git pull', {cwd: dir}, hx(function () {
    cp.exec('npm install', {cwd: dir}, hx(function () {
      startServer(dir);
    }));
  }));
});

// Handler for exec calls
function hx (cb) {
  return function (err, stdout, stderr) {
    if (err) throw err;
    console.log(stdout);
    console.error(stderr);
    if (cb) cb();
  };
}

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
      if (servers[site]) {
        servers[site].proc.once('exit', function () {startServer(site)});
        cp.exec('git pull', {cwd: servers[site].dir}, hx(function () {
          cp.exec('npm install', {cwd: servers[site].dir}, hx(function () {
            servers[site].proc.kill();
          }));
        }));
      } else {
        if (!payload.repository) return res.end('no repo in payload\n');
        cp.exec('git clone ' + payload.repository.url + '.git', hx(function () {
          var dir = path.resolve(cwd, site);
          cp.exec('npm install', {cwd: dir}, hx(function () {
            startServer(site);
          }));
        }));
      }
      res.end('ok\n');
    });
  }
}).listen(port, function () {
  console.log('Running on port', port);
});
