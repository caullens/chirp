var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('chirp.sqlite3');

$(function() {
  $('#button-create').on('click', function(event) {
    event.preventDefault();
    var username = $('#user-field').val();
    var pass = $('#pass-field').val();
    var confPass = $('#confirm-password').val();
    console.log(username);

    db.get('SELECT * FROM users WHERE username=?', [username], function(users) {
      if(users) {
        $('#user-field').empty();
      }
    });
  });
});
