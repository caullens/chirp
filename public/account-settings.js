$(document).ready(function() {
  $('#confirm-password').keypress(function(e) {
      if ((e.keyCode || e.which) == 13) {
          $('#button-create').trigger('click');
      }
  });
});
