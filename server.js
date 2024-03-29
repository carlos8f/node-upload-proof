var program = module.exports = require('commander')
  .option('--port <port>', 'port to listen on. (default: 3000)', Number, 3000)
  .option('--key <key>', 's3 key')
  .option('--secret <secret>', 's3 secret')
  .option('--bucket <bucket>', 's3 bucket')
  .option('--redisHost <host>', 'redis host (default: 127.0.0.1)', String, '127.0.0.1')
  .option('--redisPort <port>', 'redis port (default: 6379)', Number, 6379)
  .parse(process.argv)

;['key', 'secret', 'bucket'].forEach(function (k) {
  if (!program[k]) {
    console.error('must specify --' + k);
    process.exit(1);
  }
});

program.redis = require('redis').createClient(program.redisPort, program.redisHost);

var middler = require('middler')
  , buffet = require('buffet')()
  , server = program.server = require('http').createServer()

program.router = middler(server)
  .add(function (req, res, next) {
    console.log(req.method, req.url);
    next();
  })
  .post('/upload', require('./lib/handleUpload'))
  .get('/files', require('./lib/listFiles'))
  .post('/delete', require('./lib/delete'))
  .add(buffet)
  .on('error', function (err, req, res) {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Oops! error: ' + err);
  });

program.io = require('oil').attach(server);

program.router.add(buffet.notFound);

server.listen(program.port, function () {
  console.log('server started on port ' + program.port);
});