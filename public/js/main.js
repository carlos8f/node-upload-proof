requirejs.config({
  baseUrl: '/js/',
  paths: {
    jquery: '../components/jquery/jquery.min',
    handlebars: '../components/handlebars/handlebars-1.0.0-rc.1',
    oil: '/engine.io'
  },
  shim: {
    jquery: {
      exports: '$'
    },
    handlebars: {
      exports: 'Handlebars'
    },
    oil: {
      exports: 'oil'
    }
  }
});

requirejs(['jquery', 'handlebars', 'oil', 'jquery.iframe-transport', 'jquery.fileupload'], function ($, Handlebars, oil) {
  var thumbTemplate = Handlebars.compile($('#thumb-template').html());

  var client = oil.connect();
  client.on('connect', function () {
    $('#fileupload input').fileupload({
      dataType: 'json',
      progressInterval: 50,
      formData: {
        socketId: client.socket.id
      },
      progressall: function (e, data) {
        var progress = parseInt(data.loaded / data.total * 100, 10);
        $('#progress .bar').css('width', progress + '%');
      },
      start: function (e) {
        $('#progress .message').text('Uploading...');
        $('#progress .bar').css('width', '0%');
        $('#progress').slideDown();
      },
      fail: function (e, data) {
        $('#progress .message').text('Failed :(');
        setTimeout(function () {
          $('#progress').slideUp();
        }, 2000);
      },
      done: function (e, data) {
        $.each(data.result, function (idx, file) {
          $('#thumbs').append(thumbTemplate(file));
        });
        $('#progress .message').text('Done!');
        setTimeout(function () {
          $('#progress').slideUp();
        }, 2000);
      }
    });
  });

  client.on('progress', function (progress) {
    $('#progress .message').text('Processing...');
    $('#progress .bar')
      .css('background-color', '#93de32')
      .css('width', progress.percent + '%');
  });
});