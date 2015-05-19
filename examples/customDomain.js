var http = require('../index');

// persist the domain to memory
http.domain.persist('memory');

http.domain.create({
  name: "dev.marak.com",
  owner: "Marak",
  forwardUrl: '/Marak/echo'
}, function (err, result) {
  http.listen({
    roots: ["localhost", "127.0.0.1", "hook.io", "www.hook.io"]
  }, function(err, app){
    console.log(app.server.address())
  });
});