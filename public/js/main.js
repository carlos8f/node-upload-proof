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
  var formTemplate = Handlebars.compile($('#upload-form').html());
  var thumbTemplate = Handlebars.compile($('#thumb').html());
  $(document.body).append(formTemplate);
  $('#fileupload').fileupload({
    dataType: 'json',
    done: function (e, data) {
      $.each(data.result, function (idx, file) {
        $('#file-list').append(thumbTemplate(file));
      });
    }
  });
});