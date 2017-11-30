var debug = require('debug')('resource::http');

var path = require('path');
var https = require('https');
var express = require('express');
var colors = require('colors');
var i18n = require('i18n-2');

// custom middlewares
var viewResource = require('view');
var viewMiddle = require('./middlewares/view');
var mergeParams = require('merge-params');

// passport support
var passport = require('passport');

// express middlewares
var serveStatic = require('serve-static')
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var cors = require('cors');

module['exports'] = function listen (options, callback) {

  var server, httpsServer, customDomains = false;
  var resource = {};
  options.logger = options.logger || false;
  options.host = options.host || "localhost";
  options.root = options.root || (process.cwd() + "/public");

  if (typeof options.secret === "undefined") {
    options.secret = 'secret session password';
  }

  // By default, resource-http will auto-increment options.port if a service is already running on that options.port
  if (options.autoport === false) {
    options.autoport = false;
  } else {
    options.autoport = true;
  }

  if (options.cors === false) {
    options.cors = false;
  } else {
    options.cors = true;
  }

  if (options.cacheView === false) {
    options.cacheView = false;
  } else {
    options.cacheView = true;
  }

  if (options.autoindex === false) {
    options.autoindex = false;
  } else {
    options.autoindex = true;
  }

  if (options.customDomains === true) {
   customDomains = true;
  }

  if (options.sslRequired === true) {
    options.sslRequired = true;
  } else {
    options.sslRequired = false;
  }

  if (options.onlySSL === true) {
    options.onlySSL = true;
  } else {
    options.onlySSL = false;
  }

  options.root = path.resolve(options.root);
  options.roots = options.roots || ["localhost", ,"127.0.0.1"];

  var fs = require('fs'),
      view,
      app = express();

  app.host = options.host;

  function requireSSL(req, res, next) {
    if (!req.secure) {
      // Do not attempt to force ssl connections for incoming requests that don't match any of the provided roots
      // This is to ensure we don't force an ssl connection if there are custom domains / subdomain on the site
      // Custom domains / subdomains will be subject to diffirent SSL certificate rules,
      // ( new certs for custom domains / wildcard certs for subdomains)
      if (options.roots.indexOf(req.hostname) !== -1) {
        return res.redirect('https://' + req.host + req.url);
      }
    }
    next();
  }

  var parseRequest = function parse (req, res, cb) {
    var mergeParams = require('merge-params'),
        bodyParser = require('body-parser');
    bodyParser()(req, res, function bodyParsed () {
      mergeParams(req, res, function(){});
      params = req.resource.params;
      cb(null, params);
    });
  };

  app.use(function(req, res, next) {
    var acceptTypes = [];
    if (req.headers && req.headers.accept) {
      acceptTypes = req.headers.accept.split(',');
    }
    if (acceptTypes.indexOf('text/html') === -1) {
      req.jsonResponse = true;
    }
    req.parseRequest = function (cb) {
      parseRequest(req, res, cb);
    };
    next();
  });

  if (options.sslRequired) {
    app.use(requireSSL);
  }

  app.set('json spaces', 2);
  app.use(favicon(path.resolve(__dirname + '/../public/favicon.png')));

  if (options.cors) {
    app.use(cors());
  }

  if (options.noSession !== true) {
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

    if (typeof options.redis === "object") {
      // Note: we could make the connect-redis package optional in the package.json ( hence the custom try / catch here )
      // leaving it as default since its required in most production apps
      try {
        var RedisStore = require('connect-redis')(session);
      } catch (err) {
        if (err.code === "MODULE_NOT_FOUND") {
          throw new Error('You must run `npm install connect-redis` to use redis based sessions!');
        }
        throw err;
      }
      app._store = new RedisStore(options.redis);
      app.use(session({
        store: app._store,
        secret: options.secret,
        proxy: true,
        saveUninitialized: false,
        resave: false
      }));
    } else {
      app.use(session({secret: options.secret, saveUninitialized: true, resave: true }))
    }

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(function (req, res, next) {
      if (!req.session) {
        return next(new Error('Could not connect to session server. Is redis running at: ' + options.redis.host + ":" + options.redis.port + "?")) // handle error
      }
      next(); // otherwise continue
    })
  } else {
    console.log('Warning: '.yellow, 'no session storage being used!');
  }

  if (options.locales) {
    i18n.expressBind(app, options.locales);
    app.use(function(req, res, next) {
      req.i18n.setLocaleFromCookie();
      next();
    });
  }


  // TODO: better default options and documentation for streaming versus non-streaming incoming HTTP requests
  if (options.bodyParser === true || options.enableUploads === true) {
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
  }

  if (options.auth && options.auth.basicAuth) {
    // Note: noSession must not be set false for this to work!
    var httpStrategy = require('passport-http');
    passport.use(new httpStrategy.BasicStrategy(
      function(userid, password, done) {
        if (options.auth.basicAuth.username === userid && options.auth.basicAuth.password === password) {
          return done(null, { username: userid });
        } else {
          return done(null, false);
        }
      }
    ));

    // map specific routes for integrated basic auth
    app.get('/logout', function (req, res) {
      req.logout();
      res.send("logged out", 401);
    });

    app.get('/auth',  passport.authenticate('basic', { session: true }), function (req, res){
      console.log(req.user, req.session.username)
      //res.end(req.user.username);
      return res.redirect(req.session.redirectTo || "/");
    });

  }

  app.use(mergeParams);

  // TODO: move to view.js file?
  // Loads view into cache on load for the first time
  if (typeof options.view === "string") {
    viewResource.create({ path: options.view, autoindex: options.autoindex }, function (err, _view) {
      if(err) throw err;
      view = _view;
      app.view = view;
      finish();
    });
  } else {
    finish();
  }

  function finish () {
    if (customDomains) {
      app.use(require('./middlewares/customDomains')(options));
      console.log('Using custom domains middleware'.blue, options.roots)
    }

    if (view) {
      app.use(viewMiddle(options, app));
    }

    if (options.nodeinfo) {
      // TODO: separate into module and also a middleware
      var info = require('./nodeinfo');
      app.get('/_info', function (req, res) {
        res.json(info.getStat());
      });
    }

    if (options.nodeadmin) {
      app.use('/_admin', require('./middlewares/nodeadmin')(options));
      console.log('Using custom nodeadmin middleware'.blue, options.roots)
    }

    if (typeof options.root !== 'undefined') {
      //
      // Use http root passed in through options
      //
      debug('using static folder ' + options.root);
      app
        .use(serveStatic(options.root, {'index': ['index.html', 'index.htm']}))//.as("static");
    }

    if (options.onlySSL) {
      server = https.createServer({ key: options.key, cert: options.cert, ca: options.ca }, app);
    } else {
      server = require('http').createServer(app);
    }

    var serverError = null;
    server.on('error', function(err){
      serverError = err;
      if (options.autoport !== false) {
        if (err && err.code === "EADDRINUSE") {
          server.listening = false;
          // port is not available, try increasing port by 1
          options.port = options.port + 1;
          return _listen(options, callback);
        }
      } else {
        callback(err);
      }
    });

    server.on('listening', function (){
      serverError = null;
      // console.log('listening', app);
      debug('server started ' + options.host + ":" + options.port);
    });

    if (options.wss) {
      var WebSocketServer = require('ws').Server
        , wss = new WebSocketServer({ server: server });
    }

    var errorTimer;

    function _listen () {

      server.listen(options.port, options.host, function (err) {
        if (err) {
          return callback(err);
        }
        server.listening = true;
        debug('server started ' + options.host + ":" + options.port);

        app.server = server;
        app.wss = wss;

        if (options.https === true && options.onlySSL === false) {
          var sslPort = 443;
          // after http server starts, start https server
          httpsServer = https.createServer({ 
            key: options.key,
            cert: options.cert, 
            ca: options.ca
            /*
            ,
            SNICallback: function (domain) {
              // TODO: only call for known domains
              return secureContext[domain];
            }
            */
          }, app);

          // assume if wss option and https options are set, that we want secure websockets
          // we could make this a separate configuration property in the future
          if (options.wss) {
            var secureWss = new WebSocketServer({ server: httpsServer });
            app.secureWss = secureWss;
          }
          httpsServer.listen(sslPort);
          httpsServer.on('error', function(err){
            debug('https server error ' + options.host + ":443", err);
          });
          httpsServer.on('listening', function(){
            debug('https server started ' + options.host + ":443");
          });
        }

        if (typeof errorTimer === "undefined") {
          errorTimer = setTimeout(function(){
            if (serverError === null) {
              callback(null, app);
            }
          }, 500);
        }

      });
    }
    _listen();
  }
};

//function to pick out the key + certs dynamically based on the domain name
function getSecureContext (domain) {
  var crypto = require("crypto");
  return crypto.createCredentials({
    key:  options.domains[domain].key,
    cert: options.domains[domain].cert,
    ca: options.domains[domain].ca
  }).context;
}

/*
//read them into memory
var secureContext = {
  'domain1': getSecureContext('domain1'),
  'domain2': getSecureContext('domain2')
};
*/