/**
 * @module form-urlencoded
 * A module for processing urlencoded HTTP requests
 */
module.exports = urlencoded;

var querystring = require('querystring');

/**
 * @function urlencoded
 * Takes a request and response object,
 * parses the body of the url-encoded request
 * and attaches its contents to the request
 * object.  If an error occurs, we log it
 * and send a 500 status code.  Otherwise
 * we invoke the next callback with the
 * request and response.
 * @param {http.incomingRequest} req the request object
 * @param {http.serverResponse} res the repsonse object
 * @param {function} next the next function in the req/res pipeline
 */
function urlencoded(req, res, next) {
  var body = "";

  // Handle error events by logging the error
  // and responding with a 500 server error
  req.on('error', function(err){
    console.log(err);
    res.statusCode = 500;
    res.statusMessage = "Server error";
    res.end("Server error");
  });

  // Handle data events by appending the new
  // data to the chunks array.
  req.on('data', function(chunk) {
    body += chunk;
  });

  // Handle end events by parsing the body and
  // attaching the resulting object to the request object.
  req.on('end', function() {
    // Store the parsed body in the req.body property
    req.body = querystring.parse(body);

    // trigger the next callback with the modified req object
    next(req, res);
  });
}
