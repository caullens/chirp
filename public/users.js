function searchUsers() {
  var searchString = $("#search-text").val()
  var allUsers = $('.user')
  allUsers.each(function() {
    if($(this).attr('id').includes(searchString)) {
      $(this).css('display', 'inline-flex');
    } else {
      $(this).css('display', 'none');
    }
  })
}

$(document).ready(function() {
  $('#search-text').keyup(searchUsers);
})
