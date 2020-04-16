var http = require('../index');
http.listen({ 
  port: 8000,
  auth: {
    basicAuth: {
      username: 'admin',
      password: 'admin'
    }
  }
}, function(err, app){
  console.log(app.server.address())
});