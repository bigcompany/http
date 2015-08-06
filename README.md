# http

a resource for creating and configuring express http servers

<img src="https://travis-ci.org/bigcompany/http.svg?branch=master"/>

## Features

 - Easily configurable through simple options hash
 - Based on latest <a href="http://expressjs.com/">Express</a> 4.x.x
 - Static File Support
 - Session Support
 - Custom Web Domain support
 - HTTPS / SSL / Enforce SSL option
 - OAuth Single Sign On through <a href="https://www.npmjs.org/package/passport">Passport</a>
 - View Support through <a href="http://npmjs.org/package/view">View module</a>
 - Body Parser / File Uploads
 - Auto-port detection

## Example

see: `./examples/server.js`

```js
var http = require('resource-http');

// all options are optional and will default to a reasonable value if left unset
http.listen({
 port: 8888,
 host: 'localhost',
 root: __dirname + "/public",
 view: __dirname + "/view",
 uploads: false,
 https: false,
 autoport: true,
 key: fs.readFileSync(__dirname + "/ssl/server.key").toString(),
 cert: fs.readFileSync(__dirname + "/ssl/cert.crt").toString(),
 ca: fs.readFileSync(__dirname + "/ssl/ca.crt").toString()
}, function(err, app){
 console.log(app.server.address())
 // from here, app is a regular Express server
 app.get('/foo', function (req, res){
   res.end('got /foo');
 });
});
```
