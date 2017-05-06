$(document).ready(function() {
  var username = $('.username').text()
  $('#'+username+'-follow').css('display', 'none');

  $('#chirp-button').on('click', function(e) {
    e.preventDefault();
    document.getElementById('compose-form').submit();
  });

  $('#chirptext').keypress(function(e) {
      if ((e.keyCode || e.which) == 13) {
          $('#chirp-button').trigger('click');
      }
  });
});
