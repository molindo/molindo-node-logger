import {Router} from 'express';
import expressWinston from 'express-winston';
import bodyParser from 'body-parser';

expressWinston.responseWhitelist.push('body');

/**
 * Allows to integrate the logger with an express server.
 */

const MASKED_HEADERS = ['Cookie', 'cookie', 'Authorization', 'authorization'];
const MASKED_HEADER_VALUE = '*****';

export default ({logger, MAX_GRAPHQL_VARIABLES_LOG_LENGTH = 512}) => {
  const router = new Router();
  return router.use(
    bodyParser.json(),
    expressWinston.logger({
      winstonInstance: logger.winston,

      level(req, res) {
        if (res.statusCode >= 500) {
          return logger.getLevelsDescending()[0] || 'ERROR';
        }
        if (res.statusCode >= 400) {
          return logger.getLevelsDescending()[1] || 'WARN';
        }
        return logger.getLevelsDescending()[3] || 'DEBUG';
      },

      dynamicMeta(req) {
        const meta = {name: 'express'};

        if (req.method === 'POST' && req.body && req.body.operationName) {
          let variables;

          if (MAX_GRAPHQL_VARIABLES_LOG_LENGTH > 0) {
            const stringifiedVariables = JSON.stringify(req.body.variables);
            const isTooLarge =
              stringifiedVariables.length > MAX_GRAPHQL_VARIABLES_LOG_LENGTH;

            if (isTooLarge) {
              variables = `${stringifiedVariables.substring(
                0,
                MAX_GRAPHQL_VARIABLES_LOG_LENGTH
              )} […] max payload length reached (${MAX_GRAPHQL_VARIABLES_LOG_LENGTH} chars)`;
            } else {
              variables = req.body.variables;
            }
          } else {
            variables = req.body.variables;
          }

          meta.graphql = {
            operationName: req.body.operationName,
            variables
          };
        }

        return meta;
      },

      requestFilter(req, propName) {
        if (propName === 'headers') {
          // Mask confidential headers
          return Object.entries(req.headers)
            .map(([header, value]) => [
              header,
              MASKED_HEADERS.includes(header) ? MASKED_HEADER_VALUE : value
            ])
            .reduce((acc, [header, value]) => {
              acc[header] = value;
              return acc;
            }, {});
        }

        return req[propName];
      },

      responseFilter(res, propName) {
        if (propName === 'body') {
          const hasErrors =
            res.body && res.body.errors && res.body.errors.length > 0;

          // Ignore logging the body of responses, except for if a GraphQL error
          // happened.
          if (hasErrors) {
            return res[propName];
          }

          return;
        }

        return res[propName];
      }
    })
  );
};
