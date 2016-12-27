// view middleware is cached by default ( will not re-load view assets after process start )
// if options.cacheView is set to false, a new View and middleware will be created for every request,
// ( slow, but allows for hot-reload assets without process restart )
var serveStatic = require('serve-static')
var viewResource = require('view');

var _views = {};
var _viewsLabels = {};

module.exports = function viewMiddle (options, app) {

  return function (req, res, next) {
    if (!options.cacheView) {
      loadView(req, res, next);
    } else {
      serveCachedView(req, res, next);
    }
  }

  function loadView (req, res, next) {
    // console.log('loading view from disk');
    // load view from disk
    // may take some time, and it not recommended for production usage
    viewResource.create({ path: options.view, autoindex: options.autoindex }, function (err, _view) {
      if (err) throw err;
      view = _view;
      //app.view = view;
      _views[options.view] = _view;
      serveView(req, res, next);
    });
  } 

  function serveView (req, res, next) {
    // console.log('serving view', options.view);
    viewResource.middle({ view: _views[options.view] /*, autoindex: options.autoindex*/ })(req, res, next);
  }

  function serveCachedView (req, res, next) {
    // check to see if cached view exists
    if (typeof _views[options.view] === "undefined") {
      // must load view
      loadView(req, res, next)
    } else {
      serveView(req, res, next);
      //viewResource.middle({ view: _views[options.view], autoindex: options.autoindex })(req, res, next);
    }
  }

 }