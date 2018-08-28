//
// web workers
//
// import path from 'path';
import https from 'https';
import http from 'http';
import url from 'url';

import twilio from './twilio';
import _data from './data';

const workers = {};

// perform checks
workers.performCheck = (validCheck) => {
  // prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  // mark that the outcome has not yet been sent
  let outcomeSent = false;

  // parse hostname and path out of validCheck data
  const parsedUrl = url.parse(`${validCheck.protocol}://${validCheck.url}`, true);
  const { hostname, path, port } = parsedUrl;

  // construct the request
  const requestDetails = {
    protocol: `${validCheck.protocol}:`,
    hostname,
    port,
    method: validCheck.method.toUpperCase(),
    path,
    timout: validCheck.timeoutSeconds * 1000, // convert secs to msecs
  };

  // instantiate the request object using requested protocol
  const _moduleToUse = validCheck.protocol === 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // grab status
    const status = res.statusCode;

    // update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;

    if (!outcomeSent) {
      workers.processCheckOutcome(validCheck, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind to the error event so it doesn't get thrown
  req.on('error', (e) => {
    // update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: e,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(validCheck, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind to the timeout event so it doesn't get thrown
  req.on('timeout', () => {
    // update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(validCheck, checkOutcome);
      outcomeSent = true;
    }
  });

  // end the request (send it)
  req.end();
};

// process the check outcome, update the heck data as needed,
// trigger alert to the user as required. Include special logic
// to accomodate a check that's never been tested before and don't
// alert on that.
workers.processCheckOutcome = (checkData, outcome) => {
  // decide if the check is up or down in its current state
  const state = !outcome.error && outcome.responseCode && checkData.successCodes.includes(outcome.responseCode)
    ? 'up' : 'down';
  
  // decide if an alert is warranted
  const alertWarranted = checkData.lastChecked && checkData.state !== state;

  // update the check data in storage
  const newCheckData = Object.assign({}, checkData);
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // save the updates
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (err) return console.log('Error trying to save on eof the checks');
    if (!alertWarranted) return console.log('Check outcome unchanged. No alert sent');
    return workers.alertUserToStatusChange(newCheckData);
  });
};

// alert the user as to a change to their check status
workers.alertUserToStatusChange = (check) => {
  const msg = `Alert: Your check for ${check.method.toUpperCase()} ${check.protocol}://${check.url} is currently ${check.state}.`;

  twilio.sendTwilioSms(check.userPhone, msg, (err) => {
    if (err) return console.log('Twilio returned ', err);
    return console.log('Msg sent:', msg);
  });
};

// validate checks
workers.validateCheckData = (orgCheckData) => {
  // validate object data
  const originalCheckData = typeof orgCheckData === 'object' && orgCheckData !== null
    ? orgCheckData : {};
  originalCheckData.id = typeof originalCheckData.id === 'string' && originalCheckData.id.trim().length === 20
    ? originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof originalCheckData.userPhone === 'string' && originalCheckData.userPhone.length === 10
    ? originalCheckData.userPhone : false;
  originalCheckData.protocol = typeof originalCheckData.protocol === 'string' && ['http', 'https'].includes(originalCheckData.protocol)
    ? originalCheckData.protocol : false;
  originalCheckData.url = typeof originalCheckData.url === 'string' && originalCheckData.url.trim().length > 0
    ? originalCheckData.url.trim() : false;
  originalCheckData.method = typeof originalCheckData.method === 'string' && ['post', 'get', 'put', 'delete'].includes(originalCheckData.method)
    ? originalCheckData.method : false;
  originalCheckData.successCodes = typeof originalCheckData.successCodes === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0
    ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof originalCheckData.timeoutSeconds === 'number'
    && originalCheckData.timeoutSeconds % 1 === 0
    && originalCheckData.timeoutSeconds >= 1
    && originalCheckData.timeoutSeconds <= 5
    ? originalCheckData.timeoutSeconds : false;
    
  // set the keys that may note be set if the workers have never seen
  // this check, namely state (up or down) and lastChecked timestamp
  originalCheckData.state = typeof originalCheckData.state === 'string' && ['up', 'down'].includes(originalCheckData.state)
    ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof originalCheckData.lastChecked === 'number'
    && originalCheckData.lastChecked > 0
    ? originalCheckData.lastChecked : false;
  
  // if all the checks pass, pass data along to next step in the process
  if (!(originalCheckData.id
    && originalCheckData.userPhone
    && originalCheckData.protocol
    && originalCheckData.method
    && originalCheckData.successCodes
    && originalCheckData.timeoutSeconds)) return console.log('Error: One or more of the check data items fails validation');
     
  return workers.performCheck(originalCheckData);
};

// gather tasks from all checks
workers.gatherAllChecks = () => {
  // get all checks in the system
  _data.list('checks', (err, checks) => {
    if (err || !checks || checks.length === 0) return console.log('Info: No checks to process.');

    checks.forEach((check) => {
      _data.read('checks', check, (rerr, originalCheckData) => {
        if (rerr || !originalCheckData) console.log('Error reading one of the checks data files or file is malformed');
        workers.validateCheckData(originalCheckData);
      });
    });
    return undefined;
  });
};

// Timer to execute the worker processes once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

const startWorkers = () => {
  // execute all the checks on startup
  workers.gatherAllChecks();
  // call the loop so the checks continue to be executed
  workers.loop();
};

export default startWorkers;
