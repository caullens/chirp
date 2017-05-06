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
})
