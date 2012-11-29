var formidable = require('formidable')
  , idgen = require('idgen')
  , program = require('../server')
  , im = require('imagemagick')
  , fs = require('fs')
  , async = require('async')
  , listFiles = require('./listFiles')
  , hydration = require('hydration')

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
    , socket
    , requestId = idgen()

  console.log('starting', requestId);

  form
    .on('fileBegin', function (name, file) {
      if (done) return;

      files[name] = {
        id: idgen(16),
        path: file.path,
        name: file.name,
        type: file.type,
        size: file.size,
        started: new Date()
      };
      var ext;
      switch (file.type) {
        case 'image/jpeg': ext = '.jpg'; break;
        case 'image/gif': ext = '.gif'; break;
        case 'image/png': ext = '.png'; break;
        default: return finish(new Error('upload must be an image'));
      }
      files[name].ext = ext;
      files[name].s3path = files[name].id + ext;
      files[name].s3url = 'https://s3.amazonaws.com/' + program.bucket + '/' + files[name].s3path;
      files[name].thumb = {
        type: file.type,
        width: 150,
        height: 150,
        path: file.path + '_s',
        s3path: files[name].id + '_s' + ext,
        s3url: 'https://s3.amazonaws.com/' + program.bucket + '/' + files[name].id + '_s' + ext
      };
      console.log('receiving', files[name], 'requestId', requestId);
    })
    .on('field', function (name, value) {
      if (done) return;
      if (name === 'socketId') {
        socket = program.io.clients[value];
      }
    })
    .on('file', function (name, file) {
      if (done) return;

      var size = file.size;
      file = files[name];
      file.size = size;
      file.uploaded = new Date();

      counter++;
      console.log('cropping', file.name);
      im.crop({
        srcPath: file.path,
        dstPath: file.thumb.path,
        width: file.thumb.width,
        height: file.thumb.height,
        quality: 1,
        gravity: 'Center'
      }, function (err, stdout, stderr) {
        if (err) return finish(err);
        fs.stat(file.thumb.path, function (err, stats) {
          if (err) return finish(err);
          file.thumb.size = stats.size;
          finish();
        });
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

  function toS3 (cb) {
    var tasks = []
      , totalSize = 0
      , totalWritten = 0

    Object.keys(files).forEach(function (name) {
      var file = files[name];
      [file, file.thumb].forEach(function (file) {
        tasks.push(upload.bind(null, file));
        totalSize += file.size;
      });
    });

    console.log('uploading', tasks.length, 'files for', requestId, 'size', totalSize);

    function upload (file, cb) {
      var prevWritten = 0;
      var headers = {
        'Content-Length': file.size,
        'Content-Type': file.type,
        'x-amz-acl': 'public-read'
      };
      var progress = s3.putFile(file.path, file.s3path, headers, function (err, resp) {
        if (!err && resp && resp.statusCode !== 200) {
          err = new Error('s3 http status code ' + resp.statusCode + ' uploading ' + file.path);
        }
        cb(err);
      });
      progress.on('progress', function (progress) {
        if (done) return;

        totalWritten += progress.written - prevWritten;
        prevWritten = progress.written;
        var percent = Math.round(100 * (totalWritten / totalSize));
        if (socket) {
          socket.oil.send('progress', {percent: percent});
        }
        console.log('uploaded', percent, '%');
      });
    }

    async.parallel(tasks, cb);
  }

  function toRedis (cb) {
    async.map(Object.keys(files), function (name, done) {
      var file = files[name];
      try {
        var id = file.id;
        file = hydration.dehydrate(file);
        file = JSON.stringify(file);
      }
      catch (e) {
        return done(e);
      }
      program.redis.SET('node-upload-proof:files:' + id, file, done);
    }, cb);
  }

  function finish (err) {
    counter--;

    function onErr (err) {
      console.error(err.stack || err);
      done = true;
      return next(err);
    }

    if (err) return onErr(err);

    if (counter < 1 && !done) {
      toS3(function (err) {
        if (err) return onErr(err);

        toRedis(function (err) {
          if (err) return onErr(err);

          console.log('done');
          listFiles(req, res, next);
        });
      });
    }
  }
}
module.exports = handleUpload;