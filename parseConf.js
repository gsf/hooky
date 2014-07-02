var flatini = require('flatini');

module.exports = function (conf) {
  var confSection;

  conf = flatini(conf);
  conf.env = {};

  for (var key in conf) {
    // Assuming the ordering is consistent between ini and JS object,
    // we'll see all global envs before we get to sections
    if (key == key.toUpperCase()) {
      conf.env[key] = conf[key];
    }

    if (typeof conf[key] == 'object' && key != 'env') {
      console.log('object key:', key);
      confSection = conf[key];
      confSection.env = {};
      for (var sKey in confSection) {
        if (sKey == sKey.toUpperCase()) {
          confSection.env[sKey] = confSection[sKey]
        }
      }
    }
  }
  return conf;
};
