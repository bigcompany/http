var debug = require('debug')('resource::http');

var passport = require('passport');

var path = require('path');
var viewResource = require('view');
var serveStatic = require('serve-static')
var mergeParams = require('./mergeParams');

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


  app.use(connect.cookieParser()).as('cookieParser');
  app.use(connect.session({ secret: 'my secret here' })).as('session');
  app.use(passport.initialize());
  app.use(passport.session());


  // TODO: better default options and documentation for streaming versus non-streaming incoming HTTP requests
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
      app.view = view;
      finish();
    });
    // if a view path has been passed in, load that view
  } else{
    finish();
  }


  function finish() {


    if (view) {
      app.use(viewResource.middle({ view: view })).as('view')
    }

    if (typeof options.root !== 'undefined') {
      //
      // Use http root passed in through options
      //
      debug('using static folder ' + options.root);
      app
        .use(serveStatic(options.root, {'index': ['index.html', 'index.htm']})).as("static");

    }
    app.use(app.router).as('router');

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
