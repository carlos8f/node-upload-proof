var program = require('../server');
program.files = {};

module.exports = function (req, res, next) {
  listFiles(function (err, files) {
    if (err) {
      return next(err);
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Disposition': 'inline; filename="files.json"'
    });
    res.end(JSON.stringify(files));
  });
};

var async = require('async')
  , hydration = require('hydration')

function listFiles (cb) {
  program.redis.KEYS('node-upload-proof:files:*', function (err, keys) {
    if (err) return cb(err);
    async.map(keys, function (key, done) {
      program.redis.GET(key, function (err, val) {
        if (err) return done(err);
        try {
          var file = JSON.parse(val);
          file = hydration.hydrate(file);
        }
        catch (e) {
          return done(e);
        }
        done(null, file);
      });
    }, function (err, files) {
      if (err) return cb(err);

      files.sort(function dateDescSort (a, b) {
        return a.uploaded < b.uploaded;
      });

      cb(null, files);
    });
  });
}