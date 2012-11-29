var program = require('../server')
  , formidable = require('formidable')
  , hydration = require('hydration')
  , async = require('async')

module.exports = function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    if (err) return next(err);

    var key = 'node-upload-proof:files:' + fields.id;

    if (!fields.id) {
      return next(new Error('no id given'));
    }
    program.redis.GET(key, function (err, file) {
      if (err) return next(err);
      if (!file) return next(new Error('file not found: ' + fields.id));

      try {
        file = JSON.parse(file);
        file = hydration.hydrate(file);
      }
      catch (e) {
        return next(e);
      }

      var tasks = [];
      [file, file.thumb].forEach(function (file) {
        tasks.push(program.s3.deleteFile.bind(program.s3, file.s3path));
      });
      tasks.push(program.redis.DEL.bind(program.redis, key));

      async.series(tasks, function (err) {
        if (err) return next(err);

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('ok');
      });
    });
  });
};