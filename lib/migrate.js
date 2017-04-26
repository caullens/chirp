"use strict";

/** @module migrate
 * A module for performing migrations on a database
 */
module.exports = migrate;

/* requires */
var fs = require('fs');

/** @function migrate
 * Applies the specified directory of migrations (sql files)
 * on the supplied database, if they have not been previously
 * applied.  The alphanumeric order of the file names is the
 * order migrations will be applied in.
 * @param {sqlite3.database} db - the database to migrate
 * @param {string} dir - the directory of migration sql files
 * @param {function} callback - a callback to trigger on error or
 * when finished, with one parameter for the error.
 */
function migrate(db, dir, callback) {
  var migrations = fs.readdirSync(dir);
  var todo = migrations.length;

  // Seralize all database calls so that migrations
  // are run in order
  db.serialize(function(){

    // Create the migrations table, if it does not yet exist
    db.run(
      "CREATE TABLE IF NOT EXISTS migrations " +
      "(id INTEGER PRIMARY KEY, filename TEXT NOT NULL);"
    );

    // For all the migrations in the migrations directory
    migrations.forEach(function(migration){
      // Check if the migration was previously run
      // (i.e. it's in our migrations table)
      db.get("SELECT id FROM migrations WHERE filename=?;", [migration], function(err, row){
        if(err) {return callback(err);}
        if(!row) {
          // migration is not in the table, so run it...
          var sql = fs.readFileSync(dir + "/" + migration, {encoding: 'utf8'});
          db.run(sql, [], function(err, result) {
            if(err) {return callback(err);}
            // save the migration to the migrations table
            db.run("INSERT INTO migrations (filename) VALUES (?);", [migration], function(err){
              if(err) {return callback(err);}
              todo--;
              if(todo == 0) callback(false);
            })
          });
        } else {
          todo--;
          if(todo == 0) callback(false);
        }
      });
    });

  });
}
