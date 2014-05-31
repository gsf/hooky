var exec = require('child_process').exec;
var http = require('http');
var qs = require('querystring');
var url = require('url');

var port = process.argv[2] || 8951;
var sites = ['wavefarm.org', 'phlccs.grrawr.com'];

http.createServer(function (req, res) {
  var urlParsed = url.parse(req.url);
  if (urlParsed.pathname == '/') {
    return res.end('ok\n');
  } 
  var siteIndex = sites.indexOf(urlParsed.pathname.substr(1));
  if (siteIndex != -1 && req.method == 'POST') {
    var body = '';
    req.on('data', function (chunk) {body = body + chunk});
    req.on('end', function () {
      var payload = JSON.parse(qs.parse(body).payload);
      if (payload.commits.length > 0) {
        for (var i=0; i<payload.commits.length; i++) {
          var commit = payload.commits[i];
        }
        console.log(__dirname + '/' + sites[siteIndex]);
        exec('git pull --rebase && git push -f ploy', {cwd: __dirname + '/' + sites[siteIndex]},
          function (err, stdout, stderr) {
            if (err) throw err;
            console.log(stdout);
            console.log(stderr);
          }
        );
      }
      res.end('ok\n');
    });
  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('404');
  }
}).listen(port, function () {
  console.log('Running on port', port);
});
