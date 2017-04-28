"use strict;"

$(function() {
  $.getScript('/encryption.js', function())
  console.log(encryption);
  $("#button-login").on('click', function(event) {
    event.preventDefault();
    var name = $('#user-field').val();
    var pass = $('#pass-field').val();
    if(user == '' && pass == 'simple'){
      // matching password & username - log the user in
      // by creating the session object
      var session = {username: username};
      // JSON encode the session object
      var sessionData = JSON.stringify(session);
      // Encrypt the session data
      var sessionCrypt = encryption.encipher(sessionData);
      // And send it to the client as a session cookie
      res.setHeader("Set-Cookie", ["cryptsession=" + sessionCrypt + "; session;"]);
      // Finally, redirect back to the index
      res.statusCode = 302;
      res.setHeader("Location", "/index.html");
      res.end();
    }
  });
});
