var resource = require('resource');
var domain = resource.define('domain');

domain.timestamps();

domain.property('name', {
  "type": "string",
  "default": "marak.com",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

domain.property('forwardUrl', {
  "type": "string",
  "default": "/marak/home",
  "required": true,
  "minLength": 1,
  "maxLength": 100
});

module['exports'] = domain;