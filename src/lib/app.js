//
// this is the primary file for the api
//
import http from 'http';
import url from 'url';
import stringDecoder from 'string_decoder';

const { StringDecoder } = stringDecoder;

// request handlers
const handlers = {};

// request router
const router = {};


const server = http.createServer((req, res) => {
  // get the url and parse it including the query string
  const parsedUrl = url.parse(req.url, true);
  
  // get the path from the url
  const path = parsedUrl.pathname;
  
  // trim leading and trailing slashes
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  
  // get the query string
  const { query } = parsedUrl;
  
  // get the http method requested
  const method = req.method.toUpperCase();
  
  // get request headers as an object
  const { headers } = req;

  // get the payload if there is one
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });
  req.on('end', () => {
    buffer += decoder.end();

    // choose the handler for this request. if one isn't
    // found use the notFound handler
    const chosenHandler = router[trimmedPath] ? router[trimmedPath] : handlers.notFound;
    
    // construct the data object to pass to the handler
    const data = {
      trimmedPath,
      query,
      method,
      headers,
      payload: buffer,
    };

    // route the request to the chosen handler
    chosenHandler(data, (statusCode = 200, payload = {}) => {
      // convert payload object to sting
      const payloadString = JSON.stringify(payload);

      // return the resposne
      res.writeHead(statusCode);
      res.end(payloadString);

      console.log(`Responding with status ${statusCode} and payload:\n${payloadString}`);
    });
  });
    
  console.log(`${method} request received on path: ${trimmedPath} with query ${JSON.stringify(query)}`);
});

const startServer = () => {
  server.listen(3000, () => {
    console.log('The server is listening on port 3000');
  });
};

export default startServer;

// sample handler
handlers.sample = (data, cb) => {
  // call back with http status code and payload object
  cb(406, { name: 'I am the sample hander.' });
};
router.sample = handlers.sample;

// not found handler
handlers.notFound = (data, cb) => {
  cb(404);
};
