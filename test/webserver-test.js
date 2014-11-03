var tap = require("tap"), 
    request = require('request');

var http = require('../'), server;

tap.test('can start http webserver with options', function (t) {
  http.listen({ port: 8888, root: './test/spec/public' }, function(err, app){
    t.equal(err, null);
    server = app.server;
    t.equal(server.address().port, 8888);
    t.end('server started');
    app.get('/paramsTest', function(req, res){
      res.end(JSON.stringify(req.resource.params));
    });
    app.post('/paramsTest', function(req, res){
      res.end(JSON.stringify(req.resource.params));
    });
  });
});

tap.test('webserver can respond to basic http request', function (t) {
  var str = "# hello";
  request('http://localhost:8888/test.html', function(err, res, body){
    t.equal(err, null);
    t.equal(body, 'page');
    t.end();
  })
});

tap.test('webserver can parse incoming query string data into resource params', function (t) {
  var str = "# hello";
  request('http://localhost:8888/paramsTest?foo=bar', function(err, res, body){
    t.equal(err, null);
    var result = JSON.parse(body);
    t.equal(result.foo, "bar");
    t.end();
  })
});

tap.test('webserver can parse incoming form data into resource params', function (t) {
  var str = "# hello";
  request({ url: 'http://localhost:8888/paramsTest', method: "POST", form: {
    foo: "bar"
  }}, function(err, res, body){
    t.equal(err, null);
    var result = JSON.parse(body);
    t.equal(result.foo, "bar");
    t.end();
  })
});


tap.test('http webserver can stop', function (t) {
  server.close(function(){
    t.end('shutdown webserver');
  });
});


var boundPort, boundHost;

// TODO: fix resource / mschema-rpc no options defaults to include {} and callback
return;
tap.test('attempt start http webserver - no options', function (t) {
  http.listen(function(err, app){

    t.equal(err, null);

    server = app.server;
    boundPort = server.address().port;
    boundHost = server.address().address;

    app.get('/', function(req, res){
      res.end('test');
    })

    t.end('server started');
  });
});

tap.test('webserver can respond to basic http request', function (t) {
  var str = "# hello";
  request('http://' + boundHost + ':' + boundPort + '/', function(err, res, body){
    t.equal(err, null);
    t.equal(body, 'test');
    t.end();
  })
});

tap.test('can 404', function (t) {
  var str = "# hello";
  request('http://' + boundHost + ':' + boundPort + '/foo', function(err, res, body){
    t.equal(err, null);
    t.equal(body, '404');
    t.end();
  })
});

tap.test('http webserver can stop', function (t) {
  server.close(function(){
    t.end('shutdown webserver');
  });
});