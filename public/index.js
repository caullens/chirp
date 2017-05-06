function updateLength() {
  var chirpLength = $('#chirptext').val().length
  if(chirpLength > 140) {
    $('#chirplength').css('color', 'red');
    $('#chirp-button').css('background-color', '#e8e8ee');
  } else {
    $('#chirplength').css('color', 'rgb(119, 78, 144)');
    $('#chirp-button').css('background-color', 'white');
  }

  $('#chirplength').text(140 - chirpLength)
}

$(document).ready(function() {
  var username = $('.username').text()
  $('#'+username+'-follow').css('display', 'none');

  $('#chirp-button').on('click', function(e) {
    e.preventDefault();
    if($('#chirptext').val().length <= 140) {
      document.getElementById('compose-form').submit();
    }
  });

  $('#chirptext').keypress(function(e) {
      if ((e.keyCode || e.which) == 13) {
          $('#chirp-button').trigger('click');
      }
  });

  $('#chirptext').keyup(updateLength)
});
