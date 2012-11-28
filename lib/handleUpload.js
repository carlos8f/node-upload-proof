var formidable = require('formidable')
  , idgen = require('idgen')
  , program = require('../server')

var s3 = require('knox').createClient({
  key: program.key,
  secret: program.secret,
  bucket: program.bucket
});

function handleUpload (req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    if (err) return next(err);
    if (!files.upload) {
      return next(new Error('upload must be named "upload"'));
    }

    var ext;
    switch (files.upload.type) {
      case 'image/jpeg': ext = '.jpg'; break;
      case 'image/gif': ext = '.gif'; break;
      case 'image/png': ext = '.png'; break;
      default: return next(new Error('upload must be an image'));
    }
    var p = '/' + idgen(16) + ext;

    console.log('uploading', p);

    var progress = s3.putFile(files.upload.path, p, function (err, resp) {
      if (err) return next(err);
      else if (resp.statusCode !== 200) return next(new Error('s3 http status code ' + resp.statusCode));

      res.writeHead(200, {'Content-Type': 'text/html'});
      var u = 'https://s3.amazonaws.com/' + program.bucket + p;
      res.end('ok! ' + u);
      console.log('done: ' + u);
    });
    progress.on('progress', function (progress) {
      console.log('uploaded', progress.written, 'of', progress.total);
    });
  });
}
module.exports = handleUpload;