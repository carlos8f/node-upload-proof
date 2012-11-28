var program = require('../server');

module.exports = function (req, res, next) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Disposition': 'inline; filename="files.json"'
  });

  var resp = Object.keys(program.files).map(function (id) {
    return program.files[id];
  });
  res.end(JSON.stringify(resp));
};