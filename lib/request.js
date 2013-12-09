module['exports'] = function request (options, callback) {
  var requestModule = require('request');
  requestModule(options, callback);
};