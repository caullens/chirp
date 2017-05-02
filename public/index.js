$(document).ready(function() {
  $('#chirp-button').on('click', function(e) {
    e.preventDefault();
    document.getElementById('compose-form').submit();
  });
});
