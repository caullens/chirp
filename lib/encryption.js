"use strict";

// Normally we'd define our secret in a configuration file or
// enviornment variable, so that it wouldn't be bundled with
// our code... but for covenience (and because this is just an
// example), we'll set it here.
const secret = "akdjfopiap oainv3208u9842hpoagnpovu n4qap9u8h4pa";

const crypto = require('crypto');
const algorithm = 'aes-256-ctr';

/** @module encipherion
 * A module of functions to encipher/decipher and digest
 */
module.exports = {
  encipher: encipher,
  decipher: decipher,
  digest: digest
}

/** @function salt
 * Creates a random value to use as a salt
 * @returns {string} a 32-bit salt
 */
function salt() {
  return crypto.randomBytes(32).toString('hex').slice(32);
}

/** @function digest
 * Creates a cryptographic hash of the provided text.
 * @param {string} plaintext - the text to create a digest from
 */
function digest(plaintext) {
  const hash = crypto.createHash('sha256');
  hash.update(plaintext);
  hash.update(secret);
  return hash.digest('hex');
}

/** @function encipher
 * Enciphers the provided text
 * @param {string} plaintext - the text to encipher
 * @returns {string} the enciphered text
 */
function encipher(plaintext) {
  const cipher = crypto.createCipher(algorithm, secret);
  var enciphered = cipher.update(plaintext, 'utf8', 'hex');
  enciphered += cipher.final('hex');
  return enciphered;
}

/** @function decipher
 * @param {string} crypttext - the text to decipher
 * @returns {string} the deciphered plain text
 */
function decipher(crypttext) {
  const decipher = crypto.createCipher(algorithm, secret);
  var deciphered = decipher.update(crypttext, 'hex', 'utf8');
  deciphered += decipher.final('utf8');
  return deciphered;
}
