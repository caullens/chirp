function searchUsers() {
  var searchString = $("#search-text").val().toLowerCase()
  var allUsers = $('.user')
  allUsers.each(function() {
    if($(this).attr('id').toLowerCase().includes(searchString)) {
      $(this).css('display', 'inline-flex');
    } else {
      $(this).css('display', 'none');
    }
  })
}

$(document).ready(function() {
  $('#search-text').keyup(searchUsers);

  $('.button').on('click', function(e) {
    if($(this).attr('id').toLowerCase().includes('follow')) {
      e.preventDefault();

      if($(this).text() == 'Follow') {
        $(this).text('Unfollow');
      } else {
        $(this).text('Follow');
      }

      var username = $(this).attr('id').split('-follow')[0];
      $.post('/users/' + username);
    }
  })
})
