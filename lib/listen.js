var path = require('path');

module['exports'] = function listen (options, callback) {

  var server;
  var resource = {};
  options.logger = options.logger || false;
  options.host = options.host || "localhost";
  options.root = options.root || (__dirname + "/../public");
  options.root = path.resolve(options.root);

  var connect = require('connect'),
      fs = require('fs'),
//      vhttp = require('vinyl-http'),
      express = require('express'),
      app = express();

  //
  // connectr module is used to enable management of Connect middleware stack
  //
  app = require('./connectr').patch(app);

  //
  // map the connectr methods for middleware management
  //
  app.before = app.before;
  app.after = app.after;
  app.first = app.first;
  app.last = app.last;

  app.host = options.host;

  app.use(connect.favicon(__dirname + '/favicon.png')).as('favicon');

  if (options.logger) {
    app.use(connect.logger('dev')).as('logger')
  }

  // app.use("/vhttp", vhttp.middle({ mount: "/vhttp"}));

  app.use(connect.cookieParser()).as('cookieParser');
  app.use(connect.session({ secret: 'my secret here' })).as('session');

  if(options.enableUploads === true) {
    app
    .use(express.bodyParser({
      uploadDir: __dirname + '/uploads',
      keepExtensions: true
    })).as('bodyParser');
  }

  app.use(mergeParams).as('mergeParams');

  //
  // Explicitly use the app.router middleware here so that routes take
  // precedence over the view middleware
  //
  app.use(app.router).as('router');

  finish();

  function finish() {

    if (typeof options.root !== 'undefined') {
      //
      // Use http root passed in through options
      //
      app
        .use(connect.static(options.root)).as("static")
        .before("static").use(function (req, res, next) {
          if(req.url === "/") {
            req.url = "/index.html";
          }
          var path = options.root + req.url;
          fs.stat(path, function (err, stat) {
            if (err) {
              res.end('404', 404);
              return;
            }
            if (stat.isDirectory()) {
              return res.end('404', 404);
            }
            return next();
          });
        }).as("404");

    }

    server = require('http').createServer(app);

    server.on('error', function(err){
      return callback(err);
    })

    server.listen(options.port, options.host, function () {
      app.server = server;
      callback(null, app);
    });

  }
};

//
// Middleware for merging all querystring / request.body and route parameters,
// into a common scope bound to req.resource.params
//
function mergeParams (req, res, next) {

  req.resource = req.resource || {};
  req.resource.params = {};
  req.body = req.body || {};

  //
  // Iterate through all the querystring and request.body values and
  // merge them into a single "data" argument
  //
  if (typeof req.params === 'object') {
    Object.keys(req.params).forEach(function (p) {
      req.resource.params[p] = req.param(p);
    });
  }

  if (typeof req.query === 'object') {
    Object.keys(req.query).forEach(function (p) {
      req.resource.params[p] = req.query[p];
    });
  }

  Object.keys(req.body).forEach(function (p) {
    req.resource.params[p] = req.body[p];
  });

  next();
}