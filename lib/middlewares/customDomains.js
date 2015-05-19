/*

  This module is responsible for managing custom domains
  Any incoming requests with hosts that don't match opts.roots
  will be assumed to be a custom domain which requires a database lookup

*/

var domain = require('../resources/domain'),
    request = require('hyperquest'); // hyperquest module is required for custom domains to work

module['exports'] = function customDomains (opts) {
  return function (req, res, next) {
    //
    // Remark: It's important to keep a hard-coded list of known site roots,
    // in order to keep database i/o to a minimal
    //
    // localhost, 127.0.0.1, and your main web domains should always be provided as known roots,
    // as this will circumvent a custom domain lookup ( and increase performance )
    //
    // console.log('using domain routing middleware', req.host, req.url.blue)
    if (opts.roots.indexOf(req.host) === -1) {
     // if the req.host doesn't match the main site, assume its a custom domain
     // perform domain name lookup
     // console.log('attempting to find custom domain ', req.host);
     domain.find({ name: req.host }, function (err, results) {
       if (err) {
         return res.end(err.stack);
       }
       if (results.length === 0) {
         // console.log('cannot find custom domain ' + req.host);
         // domain not found, do nothing
         return next();
         // return res.end('cannot find custom domain ' + req.host + '\n Try adding this as a new domain? http://hook.io/domains');
       } else {
         var result = results[0];
         // console.log('found custom domain ' + result.name);
         // TODO: make localhost address configurable
         // console.log('rewriting url...' + req.host + ":" + req.socket.localPort + req.url + req.socket.localPort)
         var newUrl = "http://" + "127.0.0.1:" + req.socket.localPort + result.forwardUrl   + req.url;
         // console.log(newUrl);
         request(newUrl).pipe(res);
       }
     });
    } else {
     next();
    }
  }

};