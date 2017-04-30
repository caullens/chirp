"use strict;"

/** @module cookie-parser
 * A module for parsing cookies
 */
module.exports = parseCookie;

/** @function parseCookie
 * Parses a cookie and converts it to an associative array
 * @param {string} cookie - the cookie to parse
 * @returns {Object} the assocative array of key/value pairs
 */
function parseCookie(cookie) {
  var cookies = {};
  // Cookies are key/value pairs separated by semicolons,
  // followed by a space, so split the cookie by that string
  cookie.split('; ').forEach(function(pair) {
    
    // Individual key/value are separated by an equal sign (=)
    pair = pair.split('=');
    var key = pair[0];

    // values are URI encoded, so decode them
    var value = decodeURIComponent(pair[1]);

    // Assign values to keys in the associative array
    cookies[key] = value;
  });

  // Return the parsed cookies
  return cookies;
}
