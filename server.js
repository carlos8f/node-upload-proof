var program = module.exports = require('commander')
  .option('--port <port>', 'port to listen on. (default: 3000)', Number, 3000)
  .option('--key <key>', 's3 key')
  .option('--secret <secret>', 's3 secret')
  .option('--bucket <bucket>', 's3 bucket')
  .parse(process.argv)

;['key', 'secret', 'bucket'].forEach(function (k) {
  if (!program[k]) {
    console.error('must specify --' + k);
    process.exit(1);
  }
});

var middler = require('middler')
  , buffet = require('buffet')()
  , server = require('http').createServer()

program.router = middler(server)
  .post('/upload', require('./lib/handleUpload'))
  .get('/files', require('./lib/listFiles'))
  .add(buffet)
  .add(buffet.notFound)
  .on('error', function (err, req, res) {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Oops! error: ' + err);
  });

server.listen(program.port, function () {
  console.log('server started on port ' + program.port);
});
program.server = server;
program.files = {};