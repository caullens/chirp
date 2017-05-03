$(document).ready(function() {
  $('#chirp-button').on('click', function(e) {
    e.preventDefault();
    document.getElementById('compose-form').submit();
  });

  $("#follow").on("click",function(e) {
    e.preventDefault();
    var url = '/users/' + $('#user-name').text();
    $.post(url);
  });

  $('#chirptext').keypress(function(e) {
      if ((e.keyCode || e.which) == 13) {
          $('#chirp-button').trigger('click');
      }
  });
});
