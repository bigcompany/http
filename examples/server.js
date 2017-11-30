var http = require('../index');
http.listen({ port: 8000 }, function(err, app){
  console.log(app.server.address())
});