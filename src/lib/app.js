//
// this is the primary file for the api
//
import http from 'http';
import url from 'url';

const server = http.createServer((req, res) => {
  // get the url and parse it including the query string
  const parsedUrl = url.parse(req.url, true);

  // get the path from the url
  const path = parsedUrl.pathname;
  
  // trim leading and trailing slashes
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // send the response
  res.end('Hello world!\n');

  // log request path
  console.log(`Request received on path: ${trimmedPath}`);
});

const startServer = () => {
  server.listen(3000, () => {
    console.log('The server is listening on port 3000');
  });
};

export default startServer;
