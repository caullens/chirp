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
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('chirp.sqlite3');

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

/** @function serveLogin
 * A function to serve a HTML page representing an
 * index of computer science pioneers.
 * @param {http.incomingRequest} req - the request object
 * @param {http.serverResponse} res - the response object
 */
function serveLogin(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.end(template.render('login.html'));
}

function serveCreate(req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.end(template.render('create-account.html'));
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

/** @function handleRequest
 * A function to determine what to do with
 * incoming http requests.
 * @param {http.incomingRequest} req - the incoming request object
 * @param {http.serverResponse} res - the response object
 */
function handleRequest(req, res) {
  var urlParts = url.parse(req.url).pathname.split('/');
  console.log(urlParts);
  switch(urlParts[1]) {
    // Simplest case is the user requests the index
    // or default page.
    case '':
    case 'home':
      if(req.method == 'GET') {
        serveIndex(req, res);
      } else if(req.method == 'POST') {

      }
      break;
    case 'login':
      if(req.method == 'GET') {
        serveLogin(req, res);
      }
      break;
    case 'user':
      req.params.user = urlParts[2];
      serveUser(req, res);
    case 'create-account':
      if(req.method == 'GET') serveCreate(req, res);
      break;
    default:
      // Check if the request is for a file in the
      // public directory
      if(fileserver.isCached('public' + req.url)) {
        fileserver.serveFile('public' + req.url, req, res);
      }
      else {
        // Otherwise, we have three possibilities -
        // an image file in /images, a JSON file
        // in /pioneers, or a file we aren't serving.
        switch(urlParts[1]) {
          case 'images':
            serveImage(urlParts[2], req, res);
            break;
          case 'pioneers':
            servePioneer(urlParts[2], req, res);
            break;
          default:
            res.statusCode = 404;
            res.end("Resource not found");
        }
      }
  }
}

/* Create and launch the webserver */
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("Server is listening on port ", port);
});
