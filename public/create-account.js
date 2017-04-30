function checkPasswordMatch() {
    var password = $("#pass-field").val();
    var confirmPassword = $("#confirm-password").val();

    if (password != confirmPassword)
        $("#divCheckPasswordMatch").html("Passwords do not match!");
    else
        $("#divCheckPasswordMatch").html("");
}

$(document).ready(function() {
  $("#confirm-password").keyup(checkPasswordMatch);
  $("#pass-field").keyup(checkPasswordMatch);
});
