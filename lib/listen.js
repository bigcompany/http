var debug = require('debug')('resource::http');

var path = require('path');
var viewResource = require('resource-view');
var serveStatic = require('serve-static')

module['exports'] = function listen (options, callback) {
  var server;
  var resource = {};
  options.logger = options.logger || false;
  options.host = options.host || "localhost";
  options.root = options.root || (__dirname + "/../public");

  // By default, resource-http will auto-increment options.port if a service is already running on that options.port
  if (options.autoport === false) {
    options.autoport = false;
  } else {
    options.autoport = true;
  }

  options.root = path.resolve(options.root);

  var connect = require('connect'),
      fs = require('fs'),
      express = require('express'),
      view,
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
  if (typeof options.view === "string") {
    debug('using view ' + options.view);
    viewResource.create({ path: options.view }, function(err, _view){
      if(err) throw err;
      view = _view;
      finish();
    });
    // if a view path has been passed in, load that view
  } else{
    finish();
  }


  function finish() {

    app.use(app.router).as('router');

    if (view) {
      app.use(viewResource.middle({ view: view })).as('view')
    }

    if (typeof options.root !== 'undefined') {
      //
      // Use http root passed in through options
      //
      app
        .use(serveStatic(options.root, {'index': ['index.html', 'index.htm']})).as("static")
        .before("static").use(function (req, res, next) {
          var path = options.root + req.url;
          fs.stat(path, function (err, stat) {
            if (err) {
              res.end('404', 404);
              return;
            }
            if (stat.isDirectory()) {
              fs.stat(path + "/index.html", function(err, stat){
                if (err) {
                  return express.directory(options.root)(req, res, next);
                } else {
                  return next();
                }
              });
            } else {
              return next();
            }
          });
        }).as("404");
    }

    server = require('http').createServer(app);

    server.on('error', function(err){
      if (options.autoport !== false) {
        if (err && err.code === "EADDRINUSE") {
          // port is not available, try increasing port by 1
          options.port = options.port + 1;
          return _listen(options, callback);
        }
      } else {
        callback(err);
      }
    });

    server.on('listening', function(){
      debug('server started ' + options.host + ":" + options.port)
    });

    function _listen () {
      server.listen(options.port, options.host, function (err) {
        app.server = server;
        callback(null, app);
      });
    }
    _listen();
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