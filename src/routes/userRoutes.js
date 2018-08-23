//
// These are the request handlers
//

import _data from '../lib/data';
import helpers from '../lib/helpers';

// request handlers
const handlers = {};

// base handler
handlers.users = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, cb);
  }
};

// container for _users submethods
handlers._users = {};

// _users post
// Required data: firstName, lastName, phone, password,
// tosAgreement. 
// Optional data: none
// users uniquely identified by their phone and password
handlers._users.post = (data, cb) => {
  // check that all require fields are filled out
  const firstName = typeof data.payload.firstName === 'string'
    && data.payload.firstName.trim().length > 0
    ? data.payload.firstName.trim() : false;
  const lastName = typeof data.payload.lastName === 'string'
    && data.payload.lastName.trim().length > 0
    ? data.payload.lastName.trim() : false;
  const phone = typeof data.payload.phone === 'string'
    && data.payload.phone.trim().length === 10
    ? data.payload.phone.trim() : false;
  const password = typeof data.payload.password === 'string'
    && data.payload.password.trim().length > 0
    ? data.payload.password.trim() : false;
  const tosAgreement = typeof data.payload.tosAgreement === 'boolean'
    && data.payload.tosAgreement;
  
  if (!(firstName && lastName && phone && password && tosAgreement)) {
    return cb(400, { Error: 'Missing required fields' });
  }

  // make sure the user doesn't already exist
  // try and read their data file. Error ==> they don't exist
  _data.read('users', phone, (rerr) => {
    if (!rerr) return cb(400, { Error: 'A user with that phone number already exists' });

    // no file find, valid new user post request
    // hash the user's password
    const hashedPassword = helpers.hash(password);
    if (!hashedPassword) return cb(500, { Error: 'Could not hash the user\'s password' });

    // create the user object
    const userObj = {
      firstName,
      lastName,
      phone,
      hashedPassword,
      tosAgreement,
    };

    // store the user
    _data.create('users', phone, userObj, (cerr) => {
      if (!cerr) return cb(200);
      console.log(cerr);
      return cb(500, { Error: 'Could not create new user' });
    });
    return undefined;
  });
  return undefined;
};

// _users get
// Required data: phone
// Optional data: none
handlers._users.get = (data, cb) => {
  // check that the phone number provided is valid (from query)
  const phone = typeof data.query.phone === 'string'
    && data.query.phone.trim().length === 10 
    ? data.query.phone.trim()
    : false;
  
  if (!phone) return cb(400, { Error: 'Missing required field' });
  
  // get the token from the header
  const token = typeof data.headers.token === 'string' ? data.headers.token : false;
  // verify that the token is valid for this phone number
  helpers.verifyToken(token, phone, (tokenIsValid) => {
    if (!tokenIsValid) return cb(403, { Error: 'Missing required token in header or token is invalid' });

    _data.read('users', phone, (err, userData) => {
      if (err) return cb(404, { Error: 'User not found' });

      // remove hashedPassword from user object
      delete userData.hashedPassword;
      return cb(200, userData);
    });
    return undefined;
  });
  return undefined;
};

// _users put
// Required data: phone
// Optional data: fistName, lastName, password (at least one required)
handlers._users.put = (data, cb) => {
  const phone = typeof data.payload.phone === 'string'
    && data.payload.phone.trim().length === 10 
    ? data.payload.phone.trim()
    : false;
  if (!phone) return cb(400, { Error: 'Missing required field' });

  // check for optional fields
  const firstName = typeof data.payload.firstName === 'string'
    && data.payload.firstName.trim().length > 0
    ? data.payload.firstName.trim() : false;
  const lastName = typeof data.payload.lastName === 'string'
    && data.payload.lastName.trim().length > 0
    ? data.payload.lastName.trim() : false;
  const password = typeof data.payload.password === 'string'
    && data.payload.password.trim().length > 0
    ? data.payload.password.trim() : false;
  if (!(firstName || lastName || password)) {
    return cb(400, { Error: 'Missing field(s) to update' });
  }

  // get the token from the header
  const token = typeof data.headers.token === 'string' ? data.headers.token : false;

  // verify that the token is valid for this phone number
  helpers.verifyToken(token, phone, (tokenIsValid) => {
    if (!tokenIsValid) return cb(403, { Error: 'Missing required token in header or token is invalid' });

    // lookup the user
    _data.read('users', phone, (err, userData) => {
      if (err) return cb(400, { Error: 'The specified user does not exist' });

      // update the necessary fields
      if (firstName) userData.firstName = firstName;
      if (lastName) userData.lastName = lastName;
      if (password) userData.hashedPassword = helpers.hash(password);

      // store the new updates
      _data.update('users', phone, userData, (uerr) => {
        if (uerr) {
          console.log(err);
          return cb(500, { Error: 'Could not update the user' });
        }
        return cb(200);
      });
      return undefined;
    });
    return undefined;
  });
  return undefined;
};

// _users delete
// Required data: phone
// Optional data: none
// @TODO clean up (delete) any other data associated with this user
handlers._users.delete = (data, cb) => {
  const phone = typeof data.query.phone === 'string'
    && data.query.phone.trim().length === 10 
    ? data.query.phone.trim()
    : false;
  if (!phone) return cb(400, { Error: 'Missing required field' });

  // get the token from the header
  const token = typeof data.headers.token === 'string' ? data.headers.token : false;

  // verify that the token is valid for this phone number
  helpers.verifyToken(token, phone, (tokenIsValid) => {
    if (!tokenIsValid) return cb(403, { Error: 'Missing required token in header or token is invalid' });
  
    _data.read('users', phone, (rerr) => {
      if (rerr) return cb(404, { Error: 'Specified user not found' });

      _data.delete('users', phone, (derr) => {
        if (derr) return cb(404, { Error: 'User not found' });
        return cb(200);
      });
      return undefined;
    });
    return undefined;
  });
  return undefined;
};

export default handlers;
