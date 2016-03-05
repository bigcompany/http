# http

a resource for creating and configuring express http servers

<img src="https://travis-ci.org/bigcompany/http.svg?branch=master"/>

## Features

 - Easily configurable through simple options hash
 - Based on latest <a href="http://expressjs.com/">Express</a> 4.x.x
 - Static File Support
 - Session Support
 - Custom Web Domain support
 - HTTPS / SSL / Enforce SSL / Only SSL options
 - Websockets
 - OAuth Single Sign On through <a href="https://www.npmjs.org/package/passport">Passport</a>
 - View Support through <a href="http://npmjs.org/package/view">View module</a>
 - Body Parser / File Uploads
 - Auto-port detection
 - i18n support through <a href="https://www.npmjs.org/package/i18n-2">18n-2</a>

## Example

see: `./examples/server.js`

```js
var http = require('resource-http');

// all options are optional and will default to a reasonable value if left unset
http.listen({
 port: 8888,
 wss: true, // enables websocket server
 host: 'localhost',
 root: __dirname + "/public",
 view: __dirname + "/view",
 cacheView: true, // caches all local view templates and presenters into memory
 uploads: false,
 https: false, // enables https / ssl, requires key, cert, ca
 autoport: true, // will auto-increment port if port unavailable
 bodyParser: true, // parse incoming body data automatically, disable for streaming
 sslRequired: false, // redirects all http traffic to https
 onlySSL: false, // will only start https server, no http services
 key: fs.readFileSync(__dirname + "/ssl/server.key").toString(),
 cert: fs.readFileSync(__dirname + "/ssl/cert.crt").toString(),
 ca: fs.readFileSync(__dirname + "/ssl/ca.crt").toString()
}, function(err, app){
 console.log(app.server.address())
 // from here, app is a regular Express.js server
 app.get('/foo', function (req, res){
   res.end('got /foo');
 });
});
```
