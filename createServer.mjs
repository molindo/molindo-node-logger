import express from 'express';

const server = express();

server.get('/', (req, res) => res.json({success: true}));
server.get('/500', () => {
  throw new Error('500');
});
server.post('/graphql', (req, res) => {
  if (req.body.operationName === 'error') {
    res.status(500);
    res.json({
      errors: [
        {
          message: '401: Unauthorized',
          locations: [{line: 3, column: 3}],
          path: ['pizzas'],
          extensions: {
            statusCode: 401,
            statusText: 'Unauthorized',
            responseText: 'Unauthorized',
            method: 'GET',
            url: 'https://api.example.com/pizzas'
          }
        }
      ],
      data: null
    });
  } else {
    res.json({data: {publicId: '1'}});
  }
});

server.listen(4000, 'localhost', (err) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('Listening at');
});
