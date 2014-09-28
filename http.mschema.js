var port = {
  "type": "number",
  "default": 8888,
};

var host = {
  "type": "string",
  "default": "0.0.0.0", 
};

var root = {
  "type": "string",
};

module['exports'] = {
  "description": "provides an HTTP API",
  "type": "http",
  "properties": {
    "port": port,
    "host": host,
    "root": root
  },
  "methods": {
    "listen": {
      "input": { port: port, host: host, root: root, "enableUploads": { "type": "boolean", "default": true }}
    }
  }
};