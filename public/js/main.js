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
        $('#fileupload .btn').slideUp();
        $('#progress .message').text('Uploading...');
        $('#progress .bar').css('width', '0%');
        $('#progress').slideDown();
      },
      fail: function (e, data) {
        $('#progress .message').text('Failed :(');
        setTimeout(function () {
          $('#fileupload .btn').slideDown();
          $('#progress').slideUp();
        }, 2000);
      },
      done: function (e, data) {
        refreshThumbs(data.result);
        $('#progress .message').text('Done!');
        setTimeout(function () {
          $('#fileupload .btn').slideDown();
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

  $.getJSON('/files', refreshThumbs);

  function refreshThumbs (files) {
    $('#thumbs').empty();
    $.each(files, function (idx, file) {
      $('#thumbs').append(thumbTemplate(file));
    });

    $('#thumbs li')
      .mouseover(function () {
        $(this).find('.delete').show();
      })
      .mouseout(function () {
        $(this).find('.delete').hide();
      });

    $('#thumbs .delete').click(function (e) {
      if (confirm('are you sure?')) {
        $.ajax({
          type: 'POST',
          url: '/delete',
          data: {
            id: $(this).attr('href').replace(/^#delete\//, '')
          },
          success: function () {
            $.getJSON('/files', refreshThumbs);
          }
        })
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  }
});