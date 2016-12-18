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
    // console.log('using domain routing middleware', req.hostname, req.url.blue)
    if (opts.roots.indexOf(req.hostname) === -1) {
     // if the req.hostname doesn't match the main site, assume its a custom domain
     // perform domain name lookup
     // console.log('attempting to find custom domain ', req.hostname, req.url);
     domain.find({ name: req.hostname }, function (err, results) {
       if (err) {
         return res.end(err.stack);
       }
       if (results.length === 0) {
         // console.log('cannot find custom domain ' + req.hostname);
         // domain not found, do nothing
         return next();
       } else {
         var result = results[0];
         // console.log('found custom domain ' + result.name);
         // Ensure to copy over any query string information
         var search = req._parsedUrl.search;
         if (search === null) {
           search = "";
         }

         req.headers["X-Forwarded-For"] = req.connection.remoteAddress;
         req.headers["X-Forwarded-Host"] = req.hostname;
         req.headers["X-Forwarded-Url"] = req.url;
         
         var _url = req.url;

         // TODO: hook.io specific, remove
         if (result.forwardUrl === "/Marak/view") {
           _url = "";
         }

         if (_url === "/") {
           _url = "";
         }

         var newUrl;
         if (!opts.https) {
           newUrl = "http://" + "127.0.0.1:" + (opts.proxyPort || req.socket.localPort) + result.forwardUrl + _url;
         } else {
           newUrl = "https://" + "127.0.0.1" + result.forwardUrl + _url;
         }

         //console.log(opts)
         //console.log('rewriting proxy url...', newUrl);

         // TODO: make localhost address configurable
         req.headers.host = "127.0.0.1:" + req.socket.localPort;
         var stream = request.post(newUrl, {
           headers: req.headers
         });

         stream.on('error', function(err){
           res.write('Proxy error communicating with remote server ' + newUrl + '\n\n');
           res.end(err.stack)
         });

        req.pipe(stream).pipe(res);
        stream.on('response', function (response) {
           // Remark: is it wise to always replay all headers?
           // This is used to preserve information sent back from the response
           // replay all headers except set-cookie ( to preserve session )
           for (var p in response.headers) {
             // Remark: Don't overwrite the passport session on server
             // This may cause issues with user hooks which intend to modify cookies
             if (p !== "set-cookie") {
               // Remark: should we also write set-cookie header?
               res.setHeader(p, response.headers[p])
             }
           }
           // replay the status code
           res.writeHead(response.statusCode);
         });
       }
     });
    } else {
     next();
    }
  }

};