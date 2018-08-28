//
// send an SMS message via twilio
//
import https from 'https';
import querystring from 'querystring';
import config from '../config';

const twilio = {};

twilio.sendTwilioSms = (phoneNumber, message, cb) => {
  // validate params
  const phone = typeof phoneNumber === 'string' && phoneNumber.trim().length === 10
    ? phoneNumber : false;
  const msg = typeof message === 'string' && message.trim().length > 0 && message.trim().length <= 1600
    ? message : false;
  
  if (!(phone && msg)) return cb(400, { Error: 'Bad request: Missing or invalid parameters' });

  // configure twilio request payload
  const payload = {
    From: config.TWILIO.FROM_PHONE,
    To: `+1${phone}`,
    Body: msg,
  };

  // stringify the payload and configur request details
  const stringPayload = querystring.stringify(payload);
  const requestDetails = {
    protocol: 'https:',
    hostname: 'api.twilio.com',
    method: 'POST',
    path: `/2010-04-01/Accounts/${config.TWILIO.ACCOUNT_SID}/Messages.json`,
    auth: `${config.TWILIO.ACCOUNT_SID}:${config.TWILIO.AUTH_TOKEN}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(stringPayload),
    },
  };

  // instantiate the request object
  const request = https.request(requestDetails, (res) => {
    // grab status of sent request
    const status = res.statusCode;
    // return success to originator if request went through
    if (status === 200 || status === 201) return cb(false);
    return cb(status, { Error: 'Twilio return failure status code' });
  });

  // bind to the error event so it doesn't get thrown
  request.on('error', (e) => {
    cb(e);
  });

  // add the payload to the request
  request.write(stringPayload);

  // send it off
  return request.end();
};

export default twilio;
