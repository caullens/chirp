/**
 * server.js
 * This file defines the server for chirp
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

function serveTemplate(req, res, url) {
  res.setHeader('Content-Type', 'text/html');
  switch(url) {
    case '':
    case 'home':
    case 'index.html':
    case 'index':
      loginRequired(req, res, function(req, res) {
        res.setHeader("Location", "/home");
        res.end(template.render('index.html', req.session));
      });
      break;

    case 'login':
      res.setHeader("Location", "/login");
      res.end(template.render('login.html', req.alert));
      break;

    case 'logout':
    case 'logout.html':
      res.setHeader("Location", "/login");
      res.setHeader("Set-Cookie", ["cryptsession="]);
      res.statusCode = 302;
      res.end(template.render('login.html'));
      break;

    case 'create-account':
      res.setHeader("Location", "/create-account");
      res.end(template.render('create-account.html', req.alert));
      break;

    default:
      res.statusCode = 404;
      res.setHeader("Location", "/page-not-found");
      res.end(template.render('page-not-found.html'));
  }
}

function login(req, res) {
  if(req.method == 'GET') {
    serveTemplate(req, res, 'login');
  } else {
    urlencoded(req, res, function(req, res) {
      var username = req.body.username;
      db.get('SELECT * FROM users WHERE username=?',[username], function(err, user) {
        if(user) {
          console.log(user);
          var salt = user.salt;
          var cryptedPass = user.crypted_password;
          if(cryptedPass == encryption.encipher(req.body.password + salt)) {
            console.log("correct password");
            var session = {username: username};
            var sessionData = JSON.stringify(session);
            var sessionCrypt = encryption.encipher(sessionData);
            res.setHeader("Set-Cookie", ["cryptsession=" + sessionCrypt + "; session;"]);
            res.statusCode = 302;
            serveTemplate(req, res, 'index');
          } else {
            req.alert = {alert: "Invalid Username/Password"};
            res.statusCode = 302;
            serveTemplate(req, res, 'login');
          }
        } else {
          req.alert = {alert: "Invalid Username/Password"};
          res.statusCode = 302;
          serveTemplate(req, res, 'login');
        }
      });
    });
  }
}

function createAccount(req, res) {
  if(req.method == 'GET') {
    serveTemplate(req, res, 'create-account');
  } else {
    urlencoded(req, res, function(req, res) {
      var username = req.body.username;
      var password = req.body.password;
      var confPass = req.body.confirmPassword;

      db.get('SELECT * FROM users WHERE username=?', [username], function(err, user) {
        console.log(user);
        if(user) {
          res.statusCode = 302;
          req.alert = {alert: "Username Taken"};
          serveTemplate(req, res, 'create-account');
        } else if(password != confPass) {
          res.statusCode = 302;
          req.alert = {alert: "Passwords do not Match"};
          serveTemplate(req, res, 'create-account');
        } else {
          var salt = encryption.salt();
          var cryptedPass = encryption.encipher(password + salt);

          db.run('INSERT INTO users (username, crypted_password, salt) VALUES (?,?,?)',
                    [username, cryptedPass, salt], function(err) {
                      if(err) {
                        console.log(err);
                        res.statusCode = 500;
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
}

/** @function handleRequest
 * A function to determine what to do with
 * incoming http requests.
 * @param {http.incomingRequest} req - the incoming request object
 * @param {http.serverResponse} res - the response object
 */
function handleRequest(req, res) {
  req.alert = {alert: ""};
  //Get cookies
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
    case 'login.html':
      login(req, res);
      break;

    case 'create-account':
    case 'create-account.html':
      createAccount(req, res);
      break;

    default:
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
    return;
  }
  // Pass control to the next request handler
  next(req, res);
}

/* Create and launch the webserver */
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("Server is listening on port ", port);
});
