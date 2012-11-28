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
  var uploadForm = Handlebars.compile($('#upload-form').html());
  $(document.body).append(uploadForm);
  $('#fileupload').fileupload({
    dataType: 'json',
    done: function (e, data) {
      console.log(data);
      $.each(data.result, function (index, file) {
        $('<p/>').text(file.name).appendTo(document.body);
      });
    }
  });
});