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
var fs = require('fs-extra');
var encryption = require('./lib/encryption');
var urlencoded = require('./lib/form-urlencoded');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('chirp.sqlite3');
var parseCookie = require('./lib/cookie-parser');

/* load public directory */
fileserver.loadDir('public');

/* load templates */
template.loadDir('templates');

function getUserChirps(username, callback) {
  var chirpTable = username + '_chirps';
  db.all('SELECT * from ' + chirpTable, [], function(err, chirps) {
    if(err) console.log(err);
    else if(chirps.length < 1) callback(false, 'No Chirps');
    else {
      makeChirpTags(chirps, function(err, chirpTags) {
        callback(false, chirpTags);
      });
    }
  });
}

function makeChirpTags(allChirps, callback) {
  var chirps = [];
  allChirps.forEach(function(chirp) {
    chirps.push({username: chirp.username,
                timestamp: chirp.time,
                chirp: chirp.body,
                imageUrl: chirp.username+'.jpg'});
  });
  chirps.sort(function(a, b) {
    return b.timestamp - a.timestamp;
  });
  var chirpTags = chirps.map(function(chirp) {
    return template.render('chirp.html', chirp);
  }).join("");
  callback(false, chirpTags);
}

function getChirps(username, callback) {
  var followingTable = username + '_following';
  db.all('SELECT * from ' + followingTable, [], function(err, following) {
    if(err) console.log(err);
    else if(following.length == 0) {
      console.log('Not following anyone');
      callback(false, 'No Chirps');
    }
    else {
      var followingTables = '';
      following.forEach(function(followingUser) {
        followingTables += 'SELECT * FROM ' + followingUser.username + '_chirps UNION ';
      });
        db.all(followingTables.slice(0, followingTables.length-7), [], function(err, allChirps) {
          if(err) console.log(err);
          else if(allChirps.length == 0) {
            console.log('No chirps');
            callback(false, 'No Chirps');
          }
          else {
            makeChirpTags(allChirps, function(err, chirpTags) {
              callback(false, chirpTags);
            });
          }
        });
    }
  });
}

function getAllUsers(username, callback) {
  db.all('SELECT * FROM users', [], function(err, users) {
    if(err) callback(err, undefined);
    else {
        makeUserTags(users, username, function(err, userTags) {
          callback(false, userTags);
        });
    }
  });
}

function makeUserTags(allUsers, username, callback) {
  var users = [];
  var loopCounter = 0;
  allUsers.forEach(function(user) {
    var followText = "Follow";
    db.get('SELECT * FROM ' + username +'_following WHERE username=?', [user.username], function(err, row) {
      if(row) {
        followText = "Unfollow";
      }
        var firstName = user.firstname;
        var lastName = user.lastname;
        if(!firstName){
          firstName = "";
        }
        if(!lastName) {
          lastName = "";
        }
        getUserStats(user.username, function(stats) {
          users.push({username: user.username,
                      imageUrl: user.username+'.jpg',
                      firstname: firstName,
                      lastname: lastName,
                      followtext: followText,
                      userchirps: stats.userchirps,
                      userfollowers: stats.userfollowers,
                      userfollowing: stats.userfollowing});

          loopCounter++;
          if(loopCounter >= allUsers.length) {
            users.sort(function(a, b) {
              return b.username - a.username;
            });
            var userTags = users.map(function(user) {
              return template.render('user.html', user);
            }).join("");
            callback(false, userTags);
          }
        });
      });
  });
}

function getUserStats(username, callback) {
  var userChirps;
  db.get('SELECT COUNT(*) FROM '+username+'_chirps', [], function(err, count) {
    if(count) {
      userChirps = count['COUNT(*)'];
    } else {
      userChirps = 0;
    }
    var userFollowing;
    db.get('SELECT COUNT(*) FROM '+username+'_following', [], function(err, count) {
      if(count) {
        userFollowing = count['COUNT(*)'];
      } else {
        userChirps = 0;
      }
      var userFollowers = 0;
      db.all('SELECT * FROM users', [], function(err, users) {
        var queryString = "";
        var params = [];
        users.forEach(function(user) {
          queryString += 'SELECT * FROM ' + user.username + '_following where username=? UNION ALL ';
          params.push(username);
        });
        queryString = queryString.slice(0, queryString.length - 11);
        db.all(queryString, params, function(err, followers) {
          if(followers) {
            userFollowers = followers.length;
          }
          callback({userchirps: userChirps, userfollowers: userFollowers, userfollowing: userFollowing});
        });
      });
    });
  });
}

//Create user html template
function getUser(req, username, callback) {
  db.get('SELECT * FROM users WHERE username=?',[username], function(err, user) {
    if(!user) {
      callback(true, undefined);
      return;
    }

    var followText = "Follow";
    if(req.session.username) {
      db.get('SELECT * FROM ' + req.session.username + '_following WHERE username=?', [username], function(err, row) {
        if(row) {
          followText = "Unfollow";
        }
      });
    }

    var imageUrl = username + '.jpg';
    var firstName = user.firstname;
    var lastName = user.lastname;
    if(!firstName){
      firstName = "";
    }
    if(!lastName) {
      lastName = "";
    }

    getUserStats(username, function(stats) {
      var userTemplate = template.render('user.html', {username: username,
                                                      imageUrl: imageUrl,
                                                      firstname: firstName,
                                                      lastname: lastName,
                                                      followtext: followText,
                                                      userchirps: stats.userchirps,
                                                      userfollowing: stats.userfollowing,
                                                      userfollowers: stats.userfollowers});
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
        getUser(req, req.session.username, function(err, user) {
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
          getUser(req, username, function(err, user) {
            if(err) {
              res.statusCode = 302;
              res.setHeader("Location", "/page-not-found");
              res.end();
              return;
            } else {
              getUserChirps(username, function(err, chirps) {
                res.setHeader("Location", "/users/" + username);
                res.end(template.render('account.html', {username: username, user: user, chirps: chirps}));
              });
            }
          });
        } else {
          getAllUsers(req.session.username, function(err, users) {
            res.end(template.render('users.html', {users: users}));
          });
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

    db.run('INSERT INTO '+tableName+' (time, body, username) VALUES (?,?,?)',
              [new Date(), chirp, req.session.username], function(err) {
                if(err) {
                  console.log(err);
                  res.statusCode = 500;
                  serveTemplate(req, res, ['','home']);
                  return;
                }
                  res.statusCode = 302;
                  res.setHeader("Location", "/home");
                  res.end();
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

                        db.run('CREATE TABLE ' + username + '_chirps (time TEXT, body TEXT, username TEXT);');
                        db.run('CREATE TABLE ' +username+ '_following (username TEXT);', function(err) {
                          db.run('INSERT INTO '+username+'_following (username) VALUES (?)',[username]);
                        });

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

function updateFollow(req, res) {
  var user = req.session.username;
  var follower = url.parse(req.url).pathname.split('/')[2];
  db.get('SELECT * FROM ' + user + '_following WHERE username=?', [follower], function(err, row) {
    if(row) {
      db.run('DELETE FROM '+user+'_following WHERE username=?', [follower]);
    } else {
      db.run('INSERT INTO '+user+'_following (username) VALUES (?)', [follower]);

    }
  });
  res.statusCode = 302;
  res.setHeader("Location", "/home");
  serveTemplate(req, res, ['','home']);
}

function updateAccountSettings(req, res) {
  multipart(req, res, function(req, res) {
      var username = req.session.username;
      var firstName = req.body.firstname;
      var lastName = req.body.lastname;
      if(firstName != '' || lastName != ''){
        db.run('UPDATE users SET firstname=?, lastname=? WHERE username=?',
                  [firstName, lastName, username], function(err) {
                    if(err) {
                      console.log(err);
                      res.statusCode = 500;
                      serveTemplate(req, res, ['','home']);
                      return;
                    }
                  }
                );
            }
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
            } else {
              fs.copy('images/default.jpg', 'images/'+username+'.jpg', function(err) {
                console.error(err);
                res.statusCode = 500;
                res.statusMessage = "Server Error";
                res.end("Server Error");
              });
            }
            res.statusCode = 302;
            res.setHeader("Location", "/home");
            res.end();
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

    case 'users':
    if(req.method == 'GET') {
      serveTemplate(req, res, urlParts);
    } else {
      updateFollow(req, res);
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
