$(document).ready(function() {
  $("#follow").on("click",function(e) {
    e.preventDefault();
    var url = '/users/' + $('#user-name').text();
    $.post(url);
  });
});
