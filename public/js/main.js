requirejs.config({
  baseUrl: '/js/',
  paths: {
    jquery: '../components/jquery/jquery.min',
    handlebars: '../components/handlebars/handlebars-1.0.0-rc.1'
  },
  shim: {
    jquery: {
      exports: '$'
    },
    handlebars: {
      exports: 'Handlebars'
    }
  }
});

requirejs(['jquery', 'handlebars', 'jquery.iframe-transport', 'jquery.fileupload'], function ($, Handlebars) {
  var thumbTemplate = Handlebars.compile($('#thumb-template').html());

  $('#fileupload input').fileupload({
    dataType: 'json',
    progressInterval: 50,
    progressall: function (e, data) {
      var progress = parseInt(data.loaded / data.total * 100, 10);
      console.log(progress);
      $('#progress .bar').css('width', progress + '%');
    },
    start: function (e) {
      $('#progress .bar').css('width', '0%');
      $('#progress').slideDown();
    },
    fail: function (e, data) {
      $('#progress').slideUp();
    },
    done: function (e, data) {
      $('#progress').slideUp();
      $.each(data.result, function (idx, file) {
        $('#thumbs').append(thumbTemplate(file));
      });
    }
  });
});