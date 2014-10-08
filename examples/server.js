var http = require('../index');
http.listen({}, function(err, app){
  console.log(app.server.address())
});