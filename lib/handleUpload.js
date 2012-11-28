var formidable = require('formidable')
  , idgen = require('idgen')
  , program = require('../server')
  , imageMagick = require('imagemagick')

var s3 = require('knox').createClient({
  key: program.key,
  secret: program.secret,
  bucket: program.bucket
});

function handleUpload (req, res, next) {
  var form = new formidable.IncomingForm()
    , files = {}
    , counter = 1
    , done = false

  form
    .on('fileBegin', function (name, file) {
      if (done) return;

      files[name] = {
        id: idgen(16),
        path: file.path,
        name: file.name,
        type: file.type
      };
      var ext;
      switch (file.type) {
        case 'image/jpeg': ext = '.jpg'; break;
        case 'image/gif': ext = '.gif'; break;
        case 'image/png': ext = '.png'; break;
        default: return finish(new Error('upload must be an image'));
      }
      files[name].s3path = files[name].id + ext;
      files[name].s3url = 'https://s3.amazonaws.com/' + program.bucket + '/' + files[name].s3path;
      console.log('receiving', files[name]);
    })
    .on('field', function (name, value) {
      // not using fields
    })
    .on('file', function (name, file) {
      if (done) return;

      var size = file.size;
      file = files[name];
      file.size = size;
      file.uploaded = new Date();

      console.log('uploading', file.name);
      counter++;
      var headers = {
        'Content-Length': file.size,
        'Content-Type': file.type,
        'x-amz-acl': 'public-read'
      };
      var progress = s3.putFile(files[name].path, files[name].s3path, headers, function (err, resp) {
        if (err) {
          return finish(err);
        }
        else if (resp.statusCode !== 200) {
          return finish(new Error('s3 http status code ' + resp.statusCode));
        }
        finish();
      });
      progress.on('progress', function (progress) {
        console.log('uploaded', progress.written, 'of', progress.total);
      });
    })
    .on('aborted', function () {
      // @todo: delete already uploaded files in s3
    })
    .on('progress', function (bytesReceived, bytesExpected) {
      console.log('received', bytesReceived, 'of', bytesExpected);
    })
    .on('error', finish)
    .on('end', finish)
    .parse(req);

  function finish (err) {
    counter--;
    if (err) {
      done = true;
      return next(err);
    }
    if (counter < 1 && !done) {
      done = true;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Disposition': 'inline; filename="files.json"'
      });

      var resp = Object.keys(files).map(function (name) {
        return files[name];
      });
      resp.forEach(function (file) {
        program.files[file.id] = file;
      });
      res.end(JSON.stringify(resp));
      console.log('done');
    }
  }
}
module.exports = handleUpload;