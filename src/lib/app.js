//
// this is the primary file for the api
//
import http from 'http';

const server = http.createServer((req, res) => {
  res.end('Hello World!\n');
});

export const startServer = () => {
  server.listen(3000, () => {
    console.log('The server is listening on port 3000');
  });
};
