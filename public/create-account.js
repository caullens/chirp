function checkPasswordMatch() {
    var password = $("#pass-field").val();
    var confirmPassword = $("#confirm-password").val();

    if (password != confirmPassword)
        $("#divCheckPasswordMatch").html("Passwords do not match!");
    else
        $("#divCheckPasswordMatch").html("");
}

function checkPasswordRequirements() {
  var password = $('#pass-field').val();
  if(password.length < 8) {
    $("#divCheckPasswordMatch").html("Password must be at least 8 characters!");
    return false;
  } else {
    $("#divCheckPasswordMatch").html("");
    return true;
  }
}

$(document).ready(function() {
  $('#confirm-password').keypress(function(e) {
      if ((e.keyCode || e.which) == 13) {
          $('#button-create').trigger('click');
      }
  });

  $("#confirm-password").keyup(checkPasswordMatch);
  $("#pass-field").keyup(checkPasswordRequirements);

  $('#button-create').on('click', function(e) {
    e.preventDefault();
    if(checkPasswordRequirements()){
      document.getElementById('login-form').submit();
    }
  });
});
