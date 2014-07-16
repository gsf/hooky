var argv = require('minimist')(process.argv.slice(2));
var cp = require('child_process');
var flatini = require('flatini');
var fs = require('fs');
var getEnv = require('./getEnv');
var http = require('http');
var mkdirp = require('mkdirp');
var path = require('path');
var stream = require('stream');
var url = require('url');


function debug () {argv.v && console.log.apply(this, arguments)}

var cwd = process.cwd();
var port = process.env.PORT || 8951;
var servers = {};

function getConf (filePath) {
  var confStr = fs.readFileSync(filePath, 'utf8');
  return flatini(confStr);
}

var conf = getConf('/etc/hooky.conf');

function addServer (site) {
  debug('Adding server', site);
  var dir = path.resolve(cwd, site);

  var logfile = (conf[site] && conf[site].log) ||
    path.resolve(conf.logDir || '/var/log/hooky', site);
  mkdirp.sync(path.dirname(logfile));
  var logfileStream = fs.createWriteStream(logfile, {flags: 'a'});
  var log = new stream.Writable({decodeStrings: false});
  log._write = function (chunk, encoding, callback) {
    logfileStream.write(new Date().toISOString() + ' ' + chunk);
    callback();
  };

  var start = (conf[site] && conf[site].start) || conf.start || 'server.js';
  servers[site] = {
    dir: dir,
    log: log,
    start: path.resolve(dir, start)
  };
}

function startServer (site) {
  var p = cp.fork(servers[site].start, {
    cwd: servers[site].dir,
    env: getEnv(conf, site),
    silent: true
  });
  p.stdout.pipe(servers[site].log);
  p.stderr.pipe(servers[site].log);
  servers[site].proc = p;
}

// Handler for exec calls
function hx (site, cb) {
  return function (err, stdout, stderr) {
    if (err) servers[site].log.write(err.stack, 'utf8');
    if (stdout) servers[site].log.write(stdout);
    if (stderr) servers[site].log.write(stderr);
    if (cb) cb();
  };
}

// Start up server.js in each directory
fs.readdirSync(cwd).filter(function (file) {
  return fs.statSync(file).isDirectory()
}).forEach(function (site) {
  addServer(site);
  cp.exec('git pull', {cwd: site}, hx(site, function () {
    cp.exec('npm install', {cwd: site}, hx(site, function () {
      startServer(site);
    }));
  }));
});

http.createServer(function (req, res) {
  debug(req.method, req.url);
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
      if (!payload.repository) return res.end('no repo in payload\n');

      var branch = payload.ref.split('/')[2];
      if (!branch) return res.end('no branch specified in payload\n');
      if (branch != 'master') site = branch + '.' + site;

      if (servers[site]) {
        servers[site].proc.once('exit', function () {startServer(site)});
        cp.exec('git pull', {cwd: servers[site].dir}, hx(site, function () {
          cp.exec('npm install', {cwd: servers[site].dir}, hx(site, function () {
            servers[site].proc.kill();
          }));
        }));
      } else {
        addServer(site);
        cp.exec(
          'git clone ' + payload.repository.url + '.git -b ' + branch + ' ' + site,
          hx(site, function () {
            cp.exec('npm install', {cwd: servers[site].dir}, hx(site, function () {
              startServer(site);
            }));
          })
        );
      }
      res.end('ok\n');
    });
  }
}).listen(port, function () {
  debug('Running on port', port);
});
