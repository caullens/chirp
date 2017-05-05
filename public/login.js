$(document).ready(function() {
    $('#pass-field').keypress(function(e) {
        if ((e.keyCode || e.which) == 13) {
            $('#login').trigger('click');
        }
    });
});
