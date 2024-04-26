import {it, expect} from 'vitest';
import stringifyObject from '../stringifyObject';

it('stringifies an object', () => {
  const meta = {
    req: {
      url: '/graphql',
      headers: {
        host: '127.0.0.1:64495',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
        'content-length': '196',
        connection: 'close'
      },
      method: 'POST',
      httpVersion: '1.1',
      originalUrl: '/graphql',
      query: {}
    },
    res: {
      statusCode: 500,
      body: {
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
      }
    },
    responseTime: 1,
    name: 'express',
    graphql: {
      operationName: 'error',
      variables: {pizza: {toppings: ['salami', 'cheese']}}
    }
  };

  const output = stringifyObject(meta);

  expect(output).toMatch(
    'url=/graphql, host=127.0.0.1:64495, accept-encoding=gzip, deflate, content-type=application/json, content-length=196, connection=close, method=POST, httpVersion=1.1, originalUrl=/graphql, query=[], statusCode=500, errors=[message=401: Unauthorized, locations=[line=3, column=3], path=[pizzas], statusCode=401, statusText=Unauthorized, responseText=Unauthorized, method=GET, url=https://api.example.com/pizzas], data=null, responseTime=1, name=express, operationName=error, toppings=[salami, cheese]'
  );
});
