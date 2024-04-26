/* eslint-disable no-console */
import express from 'express';
import supertest from 'supertest';
import {it, vi, expect, describe, beforeEach, afterEach} from 'vitest';
import Logger from '../Logger';
import createLoggerMiddleware from '../createLoggerMiddleware';

function createServer(logger) {
  const server = express();

  server.use(createLoggerMiddleware({logger}));
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
  return server;
}

const mockGraphQLPayload = {
  operationName: 'createPizza',
  mutation: `
  mutation createPizza($pizza: PizzaInput!) {
    createPizza(pizza: $pizza) {
      publicId
    }
  }
`,
  variables: {pizza: {toppings: ['salami']}}
};

describe('createLoggerMiddleware', () => {
  const originalStdout = console._stdout.write;
  const originalStderr = console._stderr.write;

  beforeEach(() => {
    console._stdout.write = vi.fn();
    console._stderr.write = vi.fn();
  });

  it('logs plain messages in development', async () => {
    const logger = new Logger({
      service: 'pizza-shop',
      level: 'TRACE',
      isProduction: false,
      colorize: false
    });
    const server = createServer(logger);

    await supertest(server).get('/');
    await supertest(server).get('/404');
    await supertest(server).post('/graphql').send(mockGraphQLPayload);
    await supertest(server)
      .post('/graphql')
      .send({...mockGraphQLPayload, operationName: 'error'});

    await supertest(server).get('/500');

    const stdoutCalls = console._stdout.write.mock.calls.map((call) => call[0]);
    expect(stdoutCalls[0]).toMatch(
      /DEBUG: HTTP GET \/ url=\/.*statusCode=200,/
    );
    expect(stdoutCalls[1]).toMatch(
      /WARN: HTTP GET \/404 url=\/404,[\s\S]*statusCode=404/
    );
    expect(stdoutCalls[2]).toMatch(
      /DEBUG: HTTP POST \/graphql url=\/graphql,.*statusCode=200/
    );

    const stderrCalls = console._stderr.write.mock.calls.map((call) => call[0]);

    expect(stderrCalls[0]).toMatch(
      /ERROR: HTTP POST \/graphql url=\/graphql[\s\S]*statusCode=500/
    );
    expect(stderrCalls[1]).toMatch(
      /ERROR: HTTP GET \/500 url=\/500[\s\S]*statusCode=500/
    );

    logger.destroy();
  });

  it('logs json messages in production', async () => {
    const logger = new Logger({service: 'pizza-shop', isProduction: true});
    const server = createServer(logger);

    await supertest(server).get('/');
    await supertest(server).get('/404');
    await supertest(server).post('/graphql').send(mockGraphQLPayload);
    await supertest(server)
      .post('/graphql')
      .send({...mockGraphQLPayload, operationName: 'error'});
    await supertest(server).get('/500');

    const stdoutCalls = console._stdout.write.mock.calls.map((call) =>
      JSON.parse(call[0])
    );

    expect(typeof stdoutCalls[0]['@timestamp']).toBe('string');
    expect(stdoutCalls[0]['@timestamp']).toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
    expect(stdoutCalls[0].level).toBe('DEBUG');
    expect(stdoutCalls[0].level_value).toBe(10000);
    expect(stdoutCalls[0].logger_name).toBe('express');
    expect(stdoutCalls[0].message).toBe('HTTP GET /');
    expect(stdoutCalls[0].service).toBe('pizza-shop');

    expect(stdoutCalls[0].meta).toBeTruthy();
    expect(stdoutCalls[0].meta.req).toBeTruthy();
    expect(stdoutCalls[0].meta.req.headers).toBeTruthy();
    expect(stdoutCalls[0].meta.req.method).toBe('GET');
    expect(stdoutCalls[0].meta.req.originalUrl).toBe('/');
    expect(stdoutCalls[0].meta.req.body).toBe(undefined);
    expect(stdoutCalls[0].meta.res).toBeTruthy();
    expect(stdoutCalls[0].meta.res.statusCode).toBe(200);
    expect(typeof stdoutCalls[0].meta.responseTime).toBe('number');

    expect(stdoutCalls[1].level).toBe('WARN');

    expect(stdoutCalls[2].level).toBe('DEBUG');
    expect(stdoutCalls[2].meta.graphql).toEqual({
      operationName: 'createPizza',
      variables: {pizza: {toppings: ['salami']}}
    });

    const stderrCalls = console._stderr.write.mock.calls.map((call) =>
      JSON.parse(call[0])
    );
    expect(stderrCalls[0].level).toBe('ERROR');
    expect(stderrCalls[0].meta.res.body).toEqual({
      errors: [
        {
          extensions: {
            method: 'GET',
            responseText: 'Unauthorized',
            statusCode: 401,
            statusText: 'Unauthorized',
            url: 'https://api.example.com/pizzas'
          },
          locations: [{column: 3, line: 3}],
          message: '401: Unauthorized',
          path: ['pizzas']
        }
      ],
      data: null
    });
    expect(stderrCalls[1].level).toBe('ERROR');

    logger.destroy();
  });

  it('masks confidential headers', async () => {
    const logger = new Logger({service: 'pizza-shop', isProduction: true});
    const server = createServer(logger);

    await supertest(server).get('/').set({
      cookie: 'JSESSIONID=1234567890',
      'accept-language': 'en-US,en;q=0.8,de;q=0.6,la;q=0.4',
      authorization: 'Bearer cn389ncoiwuencr',
      accept: 'application/hal+json, application/json',
      'x-requested-with': 'XMLHttpRequest'
    });

    const output = JSON.parse(console._stdout.write.mock.calls[0][0]);
    const {headers} = output.meta.req;
    expect(headers['accept-language']).toBe('en-US,en;q=0.8,de;q=0.6,la;q=0.4');
    expect(headers.accept).toBe('application/hal+json, application/json');
    expect(headers['x-requested-with']).toBe('XMLHttpRequest');
    expect(headers.cookie).toBe('*****');
    expect(headers.authorization).toBe('*****');

    logger.destroy();
  });

  afterEach(() => {
    console._stdout.write = originalStdout;
    console._stderr.write = originalStderr;
  });
});
