$(document).ready(function() {
  $('.button').on('click', function(e) {
    if($(this).attr('id').toLowerCase().includes('follow')) {
      e.preventDefault();
      var url = '/users/' + $('#user-name').text();
      $.post(url);

      $(".user-following").click();
    }
  });
});
