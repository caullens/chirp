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

function getChirps(username, callback) {
  var chirps = [];
  var followingTable = username + '_following';
  db.all('SELECT * from ' + followingTable, [], function(err, following) {
    if(err) console.log(err);
    else if(!following) console.log('Not following anyone');
    else {
      following.forEach(function(followingUser) {
        userTable = followingUser.username + '_chirps';
        db.all('SELECT * from ' + userTable, [], function(err, userChirps) {
          if(err) console.log(err);
          else if(!userChirps) console.log('User has no chirps');
          else {
            userChirps.forEach(function(chirp) {
              chirps.push({username: followingUser.username,
                          timestamp: chirp.time,
                          chirp: chirp.body,
                          imageUrl: followingUser.username+'.jpg'});
            });
          }
        });
      });
      chirps.sort(function(a, b) {
        return b.time - a.time;
      });
      var chirpTags = chirps.map(function(chirp) {
        return template.render('chirp.html', chirp);
      }).join("");
      callback(false, chirpTags);
    }
  });
  // callback(false, template.render('chirp.html', {username: '',
  //                                                 timestamp: '',
  //                                                 chirp: '',
  //                                                 imageUrl: 'images/default.jpg'}));//TODO add not following image
}

//Create user html template
function getUser(username, callback) {
  db.get('SELECT * FROM users WHERE username=?',[username], function(err, user) {
    if(!user) {
      callback(true, undefined);
      return;
    }

    var imageUrl = username + '.jpg';
    fs.readFile('./images/' + imageUrl, function(err, image) {
      if(err) {
        imageUrl = 'default.jpg';
      }
      var firstName = user.firstname;
      var lastName = user.lastname;
      if(!firstName){
        firstName = "";
      }
      if(!lastName) {
        lastName = "";
      }
      var userTemplate = template.render('user.html', {username: username,
                                                      imageUrl: imageUrl,
                                                      firstname: firstName,
                                                      lastname: lastName});
      callback(false, userTemplate);
    });
  });
}

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

function serveTemplate(req, res, urlParts) {
  res.setHeader('Content-Type', 'text/html');
  switch(urlParts[1]) {
    case '':
    case 'home':
    case 'index.html':
    case 'index':
      loginRequired(req, res, function(req, res) {
        getUser(req.session.username, function(err, user) {
          if(err) {
            res.statusCode = 500;
            res.end();
            return;
          }
          getChirps(req.session.username, function(e, chirps) {
            if(e) {
              res.statusCode = 500;
              res.end();
              return;
            }
            res.setHeader("Location", "/home");
            res.end(template.render('index.html', {user: user, chirps: chirps}));
            });
        });
      });
      break;

    case 'users':
      loginRequired(req, res, function(req, res) {
        if(urlParts[2]) {
          var username = urlParts[2];
          getUser(username, function(err, user) {
            if(err) {
              res.statusCode = 302;
              res.setHeader("Location", "/page-not-found");
              res.end();
              return;
            } else {
              res.setHeader("Location", "/users/" + username);
              res.end(template.render('account.html', {username: username, user: user}));
            }
          });
        } else {
          res.statusCode = 302;
          res.setHeader("Location", "/page-not-found");
          res.end();
        }
      });
      break;

    case 'login':
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
      res.end(template.render('create-account.html', req.alert));
      break;

    case 'page-not-found':
    case 'page-not-found.html':
      res.statusCode = 404;
      res.end(template.render('page-not-found.html'));
      break;

    case 'account-settings':
      loginRequired(req, res, function(req, res) {
        res.end(template.render('account-settings.html'));
      });
      break;

    default:
      res.statusCode = 302;
      res.setHeader("Location", "/page-not-found");
      res.end();
  }
}

function postChirp(req, res) {
  urlencoded(req, res, function(req, res) {
    var tableName = req.session.username + '_chirps';
    var chirp = req.body.chirptext;

    db.run('INSERT INTO '+tableName+' (time, body) VALUES (?,?)',
              [new Date(), chirp], function(err) {
                if(err) {
                  console.log(err);
                  res.statusCode = 500;
                  serveTemplate(req, res, ['','home']);
                  return;
                  res.statusCode = 302;
                  res.setHeader("Location", "/home");
                  res.end();
                }
              }
    );
  });
}

function login(req, res) {
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
            res.setHeader("Location", "/home");
            res.end();
          } else {
            req.alert = {alert: "Invalid Username/Password"};
            res.statusCode = 302;
            serveTemplate(req, res, ['', 'login']);
          }
        } else {
          req.alert = {alert: "Invalid Username/Password"};
          res.statusCode = 302;
          serveTemplate(req, res, ['', 'login']);
        }
      });
    });
}

function createAccount(req, res) {
  urlencoded(req, res, function(req, res) {
      var username = req.body.username;
      var password = req.body.password;
      var confPass = req.body.confirmPassword;

      db.get('SELECT * FROM users WHERE username=?', [username], function(err, user) {
        console.log(user);
        if(user) {
          req.alert = {alert: "Username Taken"};
          res.statusCode = 302;
          serveTemplate(req, res, ['','create-account']);
        } else if(password != confPass) {
          req.alert = {alert: "Passwords do not Match"};
          res.statusCode = 302;
          serveTemplate(req, res, ['','create-account']);
        } else {
          var salt = encryption.salt();
          var cryptedPass = encryption.encipher(password + salt);

          db.run('INSERT INTO users (username, crypted_password, salt) VALUES (?,?,?)',
                    [username, cryptedPass, salt], function(err) {
                      if(err) {
                        console.log(err);
                        res.statusCode = 500;
                        serveTemplate(req, res, ['','create-account']);
                        return;
                      } else {
                        var session = {username: username};
                        var sessionData = JSON.stringify(session);
                        var sessionCrypt = encryption.encipher(sessionData);
                        res.setHeader("Set-Cookie", ["cryptsession=" + sessionCrypt + "; session;"]);

                        db.run('CREATE TABLE ' + username + '_chirps (time TEXT, body TEXT);');
                        db.run('CREATE TABLE ' +username+ '_following (username TEXT);');

                        res.statusCode = 302;
                        res.setHeader("Location", "/account-settings");
                        res.end();
                      }
                    }
          );
        }
      });
    });
}

function updateAccountSettings(req, res) {
  multipart(req, res, function(req, res) {
      var username = req.session.username;
      var firstName = req.body.firstname;
      var lastName = req.body.lastname;
      db.run('UPDATE users SET firstname=?, lastname=? WHERE username=?',
                [firstName, lastName, username], function(err) {
                  if(err) {
                    console.log(err);
                    res.statusCode = 500;
                    serveTemplate(req, res, ['','home']);
                    return;
                  } else {
                    // check if an image was uploaded
                    if(req.body.image.filename) {
                      fs.writeFile('images/' + username+'.jpg', req.body.image.data, function(err){
                        if(err) {
                          console.error(err);
                          res.statusCode = 500;
                          res.statusMessage = "Server Error";
                          res.end("Server Error");
                          return;
                        }
                      });
                    }
                    res.statusCode = 302;
                    res.setHeader("Location", "/home");
                    res.end();
                  }
                }
              );
      });
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
    case 'index':
    case 'index.html':
    case '':
    case 'home':
      if(req.method == 'GET') {
        serveTemplate(req, res, ['', 'home']);
      } else {
        postChirp(req, res);
      }
      break;

    case 'login':
    case 'login.html':
      if(req.method == 'GET') {
        res.setHeader("Location", "/login");
        serveTemplate(req, res, ['', 'login']);
      } else {
        login(req, res);
      }
      break;

    case 'create-account':
    case 'create-account.html':
      if(req.method == 'GET') {
        serveTemplate(req, res, ['','create-account']);
      } else {
        createAccount(req, res);
      }
      break;

    case 'account-settings':
    case 'account-settings.html':
      if(req.method == 'GET') {
        res.setHeader("Location", "/account-settings");
        serveTemplate(req, res, ['', 'account-settings']);
      } else {
        updateAccountSettings(req, res);
      }
      break;

    case 'images':
      serveImage(urlParts[2], req, res);
      break;

    default:
      if(fileserver.isCached('public' + req.url)) {
        fileserver.serveFile('public' + req.url, req, res);
      }
      else {
        serveTemplate(req, res, urlParts);
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
    res.setHeader("Location", "/login");
    serveTemplate(req, res, ['', 'login']);
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
