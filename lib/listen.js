var debug = require('debug')('resource::http');

var path = require('path');
var https = require('https');
var express = require('express');

// custom middlewares
var viewResource = require('view');
var mergeParams = require('./mergeParams');

// passport support
var passport = require('passport');

// express middlewares
var serveStatic = require('serve-static')
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');

module['exports'] = function listen (options, callback) {
  var server, httpsServer;
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

  var fs = require('fs'),
      view,
      app = express();

  app.host = options.host;
  app.use(favicon(path.resolve(__dirname + '/../public/favicon.png')));

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.  However, since this example does not
  //   have a database of user records, the complete GitHub profile is serialized
  //   and deserialized.
  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  app.use(cookieParser());
  app.use(session({secret: 'secret session password'}))
  app.use(passport.initialize());
  app.use(passport.session());

  // TODO: better default options and documentation for streaming versus non-streaming incoming HTTP requests
  if(options.enableUploads === true) {
   app.use(bodyParser());
  }
  
  app.use(mergeParams);
  if (typeof options.view === "string") {
    debug('using view ' + options.view);
    viewResource.create({ path: options.view }, function(err, _view){
      if(err) throw err;
      view = _view;
      app.view = view;
      finish();
    });
    // if a view path has been passed in, load that view
  } else{
    finish();
  }

  function finish() {

    if (view) {
      app.use(viewResource.middle({ view: view }));
    }

    if (typeof options.root !== 'undefined') {
      //
      // Use http root passed in through options
      //
      debug('using static folder ' + options.root);
      app
        .use(serveStatic(options.root, {'index': ['index.html', 'index.htm']}))//.as("static");

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
      debug('server started ' + options.host + ":" + options.port);
    });

    function _listen () {
      server.listen(options.port, options.host, function (err) {
        app.server = server;
        if (options.https === true) {
          // after http server starts, start https server
          // TODO: better configurable HTTPS support ( port / host / autoport)
          httpsServer = https.createServer({ key: options.key, cert: options.cert, ca: options.ca }, app).listen(443);
          httpsServer.on('error', function(){
            debug('https server error ' + options.host + ":443");
          });
          httpsServer.on('listening', function(){
            debug('https server started ' + options.host + ":443");
          });
        }
        callback(null, app);
      });
    }
    _listen();
  }
};
