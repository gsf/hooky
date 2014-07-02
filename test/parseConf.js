var fs = require('fs');
var parse = require('../parseConf');
var test = require('tap').test;

test('conf parsed as expected', function (t) {
  var conf = fs.readFileSync(__dirname + '/hooky.conf', 'utf8');
  t.equal(JSON.stringify(parse(conf)), '{"start":"app.js","ENV":"prod","example.com":{"start":"server.js","PORT":"2347","WIZBANG":"xt3fe596","env":{"PORT":"2347","WIZBANG":"xt3fe596"}},"www.example.org":{"MESSAGE":"THE END IS NIGH","env":{"MESSAGE":"THE END IS NIGH"}},"env":{"ENV":"prod"}}', 'output matches');
  t.end();
});
