//
// this is the router that handles request to check sites for availability
// users will be permitted to have up to 5 checks active at a time.
//

import _data from '../lib/data';
import helpers from '../lib/helpers';
import config from '../config';

// request handlers
const handlers = {};

// base handler
handlers.checks = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, cb);
  }
};

// container for all the token methods
handlers._checks = {};

// checks post
// Required data: protocol, url, method, success codes, timeout seconds
// Optional data: none
handlers._checks.post = (data, cb) => {
  const protocol = typeof data.payload.protocol === 'string'
    && ['http', 'https'].includes(data.payload.protocol.trim())
    ? data.payload.protocol.trim() : false;
  const url = typeof data.payload.url === 'string'
    && data.payload.url.trim().length > 0
    ? data.payload.url.trim() : false;
  const method = typeof data.payload.method === 'string'
    && ['post', 'get', 'put', 'delete'].includes(data.payload.method.trim())
    ? data.payload.method.trim() : false;
  const successCodes = typeof data.payload.successCodes === 'object'
    && data.payload.successCodes instanceof Array 
    && data.payload.successCodes.length > 0
    ? data.payload.successCodes : false;
  const timeoutSeconds = typeof data.payload.timeoutSeconds === 'number'
    && data.payload.timeoutSeconds % 1 === 0
    && data.payload.timeoutSeconds >= 1
    && data.payload.timeoutSeconds <= 5
    ? data.payload.timeoutSeconds : false;  

  if (!(protocol && method && successCodes && timeoutSeconds)) return cb(400, { Error: 'Missing required inputs or invalid inputs' });

  // get the token from the headers
  const token = typeof data.headers.token === 'string'
    ? data.headers.token : false;

  _data.read('tokens', token, (terr, tokenData) => {
    if (terr) return cb(403);

    const userPhone = tokenData.phone;

    // lookup the user's data
    _data.read('users', userPhone, (rerr, userData) => {
      if (rerr) return cb(403);

      // determine which checks the user already has
      const userChecks = typeof userData.checks === 'object'
        && userData.checks instanceof Array
        ? userData.checks : [];
      
      // verify that user has < MAX_CHECKS
      if (userChecks.length >= config.MAX_CHECKS) {
        return cb(400, { Error: `The user already has the max number of checks (${config.MAX_CHECKS})` });
      }

      // create a random id for the new check
      const checkId = helpers.createRandomString(20);

      // create the check object and include the user's phone (key value)
      const checkObj = {
        id: checkId,
        userPhone,
        protocol,
        url,
        method,
        successCodes,
        timeoutSeconds,
      };

      // save check to disk
      _data.create('checks', checkId, checkObj, (cerr) => {
        if (cerr) return cb(500, { Error: 'Could not create the new check' });

        // add checkId to user's object
        userData.checks = userChecks;
        userData.checks.push(checkId);

        // save the new user data
        _data.update('users', userPhone, userData, (uerr) => {
          if (uerr) return cb(500, { Error: 'Unable to update user with new check' });

          // return data about the new check to the user
          return cb(200, checkObj);
        });
        return undefined;
      });
      return undefined;
    });
    return undefined;
  });
  return undefined;
};

// checks get
// Required data: id
// Optional data: none
handlers._checks.get = (data, cb) => {
  // check that the phone number provided is valid (from query)
  const id = typeof data.query.id === 'string'
    && data.query.id.trim().length === 20 
    ? data.query.id.trim()
    : false;
  
  if (!id) return cb(400, { Error: 'Missing required field' });
  
  // lookup the check
  _data.read('checks', id, (err, checkData) => {
    if (err) return cb(404);

    // get the token from the header
    const token = typeof data.headers.token === 'string' ? data.headers.token : false;

    // verify that the token is valid for this user
    helpers.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
      if (!tokenIsValid) return cb(403, { Error: 'Missing required token in header or token is invalid' });

      // return the check data
      return cb(200, checkData);
    });
    return undefined;
  });
  return undefined;
};

// checks put (allow users to change any field in the check)
// Required data: id, one field from optional data
// Optional data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = (data, cb) => {
  const id = typeof data.payload.id === 'string'
    && data.payload.id.trim().length === 20 
    ? data.payload.id.trim()
    : false;

  if (!id) return cb(400, { Error: 'Missing required field' });

  const protocol = typeof data.payload.protocol === 'string'
    && ['http', 'https'].includes(data.payload.protocol.trim())
    ? data.payload.protocol.trim() : false;
  const url = typeof data.payload.url === 'string'
    && data.payload.url.trim().length > 0
    ? data.payload.url.trim() : false;
  const method = typeof data.payload.method === 'string'
    && ['post', 'get', 'put', 'delete'].includes(data.payload.method.trim())
    ? data.payload.method.trim() : false;
  const successCodes = typeof data.payload.successCodes === 'object'
    && data.payload.successCodes instanceof Array 
    && data.payload.successCodes.length > 0
    ? data.payload.successCodes : false;
  const timeoutSeconds = typeof data.payload.timeoutSeconds === 'number'
    && data.payload.timeoutSeconds % 1 === 0
    && data.payload.timeoutSeconds >= 1
    && data.payload.timeoutSeconds <= 5
    ? data.payload.timeoutSeconds : false;  

  // check for inclusion of at least one of the optional fields
  
  if (!(protocol || url || method || successCodes || timeoutSeconds)) {
    return cb(400, { Error: 'Missing field(s) to update' });
  }

  // get the token from the header
  const token = typeof data.headers.token === 'string' ? data.headers.token : false;

  // lookup the check
  _data.read('checks', id, (err, checkData) => {
    if (err) return cb(400, { Error: 'The check id did not exist' });

    // verify that the token is valid for this phone number
    helpers.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
      if (!tokenIsValid) return cb(403, { Error: 'Missing required token in header or token is invalid' });

      // update the necessary fields
      if (protocol) checkData.protocol = protocol;
      if (url) checkData.url = url;
      if (method) checkData.method = method;
      if (successCodes) checkData.successCodes = successCodes;
      if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;

      // store the new updates
      _data.update('checks', id, checkData, (uerr) => {
        if (uerr) {
          console.log(err);
          return cb(500, { Error: 'Could not update the check' });
        }
        return cb(200, checkData);
      });
      return undefined;
    });
    return undefined;
  });
  return undefined;
};

// checks delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, cb) => {
  const id = typeof data.query.id === 'string'
    && data.query.id.trim().length === 20 
    ? data.query.id.trim()
    : false;
  if (!id) return cb(400, { Error: 'Missing required field' });

  // get the check to be deleted
  _data.read('checks', id, (rerr, checkData) => {
    if (rerr) return cb(400, { Error: 'Specified check ID not found' });

    // get the token from the header
    const token = typeof data.headers.token === 'string' ? data.headers.token : false;
    // verify that the token is valid for this phone number    
    helpers.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
      if (!tokenIsValid) return cb(403, { Error: 'Missing required token in header or token is invalid' });

      // delete the check
      _data.delete('checks', id, (derr) => {
        if (derr) return cb(404, { Error: 'Token not found' });
        
        // now clean up the user's checks references
        _data.read('users', checkData.userPhone, (ruerr, userData) => {
          if (ruerr) return cb(500, { Error: 'Could not find user who created the check' });

          // determine which checks the user already has
          const userChecks = typeof userData.checks === 'object'
            && userData.checks instanceof Array
            ? userData.checks : [];
            
          const updatedChecks = userData.checks.filter(c => c !== id);

          userData.checks = updatedChecks;

          // resave the user's data
          _data.update('users', checkData.userPhone, userData, (err) => {
            if (err) return cb(500, { Error: 'Cound not update user' });
            return cb(200);
          });
          return undefined;
        });
        return undefined;
      });
      return undefined;
    });
    return undefined;
  });
  return undefined;
};

export default handlers;
