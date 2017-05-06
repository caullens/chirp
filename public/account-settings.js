$(document).ready(function() {
  $('#confirm-password').keypress(function(e) {
      if ((e.keyCode || e.which) == 13) {
          $('#button-create').trigger('click');
      }
  });

  $('#button-create').on('click', function(e) {
    e.preventDefault();
    document.getElementById('login-form').submit();
  });

  $('#button-delete').on('click', function(e) {
    e.preventDefault();
    var buttonText = $(this).text()
    console.log(buttonText)
    if(buttonText == "Delete Account") {
      $(this).text("Are You Sure?")
      $(this).css('background-color', 'red')
      $(this).css('color', 'white')
    } else {
      $.post('/logout');
      window.location.replace("/logout");
    }
  })

  $('#button-setuplater').on('click', function(e) {
    e.preventDefault()
    $('#user-field').val('');
    $('#pass-field').val('');
    $('#image').val('');
    $('#button-create').click();
  })
});
