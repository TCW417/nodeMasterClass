//
// this is the primary file for the api
//
import http from 'http';
import url from 'url';
import stringDecoder from 'string_decoder';

const { StringDecoder } = stringDecoder;

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

    // request body received. ready to respond.
    res.end('Hello world!\n');
  
    // log request path
    console.log(`${method} request received on path: ${trimmedPath} with query ${JSON.stringify(query)}`);
    console.log(`Request headers:\n${JSON.stringify(headers, null, 4)}`);
    console.log(`Payload:\n${buffer}`);
  });
});

const startServer = () => {
  server.listen(3000, () => {
    console.log('The server is listening on port 3000');
  });
};

export default startServer;
