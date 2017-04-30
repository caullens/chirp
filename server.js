/**
 * server.js
 * This file defines the server for a
 * simple photo gallery web app.
 */
"use strict;"

var port = 4000;

/* global variables */
var multipart = require('./lib/multipart');
var template = require('./lib/template');
var fileserver = require('./lib/fileserver');
var http = require('http');
var url = require('url');
var fs = require('fs');
var encryption = require('./lib/encryption');
var urlencoded = require('./lib/form-urlencoded');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('chirp.sqlite3');
var parseCookie = require('./lib/cookie-parser');

/* load public directory */
fileserver.loadDir('public');

/* load templates */
template.loadDir('templates');

/** @function parseFiles
 * Asynchronous gelper function that takes an array of JSON
 * filenames, and a callback.
 * The first argument of the callback is an error, and
 * the second is an array of the objects corresponding to
 * the JSON files.
 * @param {string[]} filenames - the JSON filenames
 * @param {function} callback - the callback function
 */
function parseFiles(filenames, callback) {
  var objectsToParse = filenames.length;
  var objects = [];
  filenames.forEach(function(filename){
    fs.readFile(filename, function(err, data){
      // if no error ocurrs, parse the file data and
      // store it in the objects array.
      if(err) console.error(err);
      else objects.push(JSON.parse(data));
      // We reduce the number of files to parse,
      // regardless of the outcome
      objectsToParse--;
      // If we've finished parsing all JSON files,
      // trigger the callback
      if(objectsToParse == 0) {
        callback(false, objects);
      }
    })
  });
}

/** @function serveImage
 * A function to serve an image file.
 * @param {string} filename - the filename of the image
 * to serve.
 * @param {http.incomingRequest} - the request object
 * @param {http.serverResponse} - the response object
 */
function serveImage(fileName, req, res) {
  fs.readFile('images/' + decodeURIComponent(fileName), function(err, data){
    if(err) {
      console.error(err);
      res.statusCode = 404;
      res.statusMessage = "Resource not found";
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'image/*');
    res.end(data);
  });
}

function serveTemplate(req, res, url) {
  res.setHeader('Content-Type', 'text/html');
  switch(url) {
    case '':
    case 'home':
    case 'index.html':
    case 'index':
      loginRequired(req, res, function(req, res) {
        res.setHeader("Location", "/home");
        res.end(template.render('index.html'));
      });
      break;

    case 'login':
    case 'login.html':
      res.setHeader("Location", "/login");
      res.end(template.render('login.html'));
      break;

    case 'logout':
    case 'logout.html':
      res.setHeader("Set-Cookie", ["cryptsession="]);
      res.statusCode = 302;
      res.setHeader("Location", "/login");
      res.end(template.render('login.html'));
      break;

    case 'create-account':
    case 'create-account.html':
      res.setHeader("Location", "/create-account");
      res.end(template.render('create-account.html'));
      break;

    default:
      res.statusCode = 404;
      res.setHeader("Location", "/page-not-found");
      res.end(template.render('page-not-found.html'));
  }
}

/** @function handleRequest
 * A function to determine what to do with
 * incoming http requests.
 * @param {http.incomingRequest} req - the incoming request object
 * @param {http.serverResponse} res - the response object
 */
function handleRequest(req, res) {
  req.session = {}
  var cookie = req.headers.cookie;
  if(cookie) {
    var cookieMap = parseCookie(cookie);
    var cryptedSession = cookieMap["cryptsession"];
    if(cryptedSession) {
      var sessionData = encryption.decipher(cryptedSession);
      req.session = JSON.parse(sessionData);
    }
  }

  var urlParts = url.parse(req.url).pathname.split('/');
  console.log(urlParts);
  switch(urlParts[1]) {
    case 'login':
      if(req.method == 'GET') {
        serveTemplate(req, res, 'login');
      } else {
        // For POST requests, parse the urlencoded body
        urlencoded(req, res, function(req, res) {
          var username = req.body.username;
          db.get('SELECT * FROM users WHERE username=?',[username], function(err, user) {
            if(user) {
              var salt = user.salt;
              var cryptedPass = user.crypted_password;
              if(cryptedPass == encryption.encipher(req.body.password + salt)) {
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
                serveTemplate(req, res, 'index');
              } else {
                // Not a username/password match, redirect to
                res.statusCode = 302;
                serveTemplate(req, res, 'login');
              }
            }
          });
        });
      }
      break;
    case 'create-account':
      if(req.method == 'GET') {
        serveTemplate(req, res, 'create-account');
      } else {
        urlencoded(req, res, function(req, res) {
          var username = req.body.username;
          var password = req.body.password;
          var confPass = req.body.confirmPassword;

          db.get('SELECT * FROM users WHERE username=?', [username], function(err, user) {
            console.log(user);
            if(user || password != confPass) {
              res.statusCode = 302;
              serveTemplate(req, res, 'create-account');
            } else {
              var salt = encryption.salt();
              var cryptedPass = encryption.encipher(password + salt);

              db.run('INSERT INTO users (username, crypted_password, salt) VALUES (?,?,?)',
                        [username, cryptedPass, salt], function(err) {
                          if(err) {
                            console.log(err);
                            res.statusCode = 500;
                            res.setHeader("Location", "/create-account");
                            serveTemplate(req, res, 'create-account');
                            return;
                          } else {
                            serveTemplate(req, res, 'login');
                          }
                        });
            }
          });
        });
      }
      break;
    default:
      // Check if the request is for a file in the
      // public directory
      if(fileserver.isCached('public' + req.url)) {
        fileserver.serveFile('public' + req.url, req, res);
      }
      else {
        serveTemplate(req, res, urlParts[1]);
      }
  }
}

/** @function loginRequired
 * A helper function to make sure a user is logged
 * in.  If they are not logged in, the user is
 * redirected to the login page.  If they are,
 * the next request handler is invoked.
 * @param {http.IncomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 * @param {function} next - the request handler to invoke if
 * a user is logged in.
 */
function loginRequired(req, res, next) {
  // Make sure both a session exists and contains a
  // username (if so, we have a logged-in user)
  if(!(req.session && req.session.username)) {
    // Redirect to the login page
    res.statusCode = 302;
    serveTemplate(req, res, 'login');
    return
  }
  // Pass control to the next request handler
  next(req, res);
}

/* Create and launch the webserver */
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("Server is listening on port ", port);
});
