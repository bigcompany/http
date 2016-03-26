/*

  This middleware is responsible for providing node administration methods
  Enable this by setting `nodeadmin` to `true`
  Warning: Do not enable the nodeadmin unless the server has been secured

*/

var methods = {
  "kill": function adminKill () {
    process.exit();
  }
};

module['exports'] = function customDomains (opts) {
  return function (req, res, next) {
    if (req.url === "/kill") {
      console.log('admin kill method was called!');
      methods.kill();
    } else {
      res.end('unknown method');
    }
  }
}