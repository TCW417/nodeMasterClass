//
// helper functions for various tasks
//
import crypto from 'crypto';
import config from '../config';

const helpers = {};

// create a SHA256 hash
helpers.hash = (str) => {
  if (typeof str === 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.HASH_SECRET).update(str).digest('hex');
  }
  return false;
};

// parse json to obj without throwing error
helpers.jsonParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (err) {
    return false;
  }
};

export default helpers;
