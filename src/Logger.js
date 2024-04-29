import winston from 'winston';
import stringifyObject from './utils/stringifyObject';

/**
 * A small wrapper around winston for consistent configuration.
 */

export default class Logger {
  static defaultOpts = {
    colorize: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',

    // The higher the number, the higher the severity
    levels: {
      ERROR: 40000,
      WARN: 30000,
      INFO: 20000,
      DEBUG: 10000,
      TRACE: 5000
    },

    colors: {
      ERROR: 'red',
      WARN: 'yellow',
      INFO: 'green',
      DEBUG: 'blue',
      TRACE: 'cyan'
    },

    stderrLevels: ['ERROR']
  };

  constructor(opts = {}) {
    this.receiveOpts(opts);
    if (!this.service) throw new Error('`service` is mandatory');

    this.setupWinston();
    this.createLogMethods();
  }

  receiveOpts(opts) {
    const mergedOpts = {...Logger.defaultOpts, ...opts};
    Object.entries(mergedOpts).forEach(([key, val]) => {
      this[key] = val;
    });

    this.level = opts.level;
    if (!this.level) {
      if (this.isProduction) {
        this.level = this.getLevelsDescending().slice(-1)[0];
      } else {
        this.level = this.getLevelsDescending().slice(2)[0];
      }
    }
  }

  setupWinston() {
    // winston expects levels to conform to RFC 5424, which
    // specifies that lower levels correspond to higher severity.
    // To achieve the reverse order, a mapping is necessary.
    this.winstonLevels = this.getLevelsDescending().reduce((acc, cur, i) => {
      acc[cur] = i;
      return acc;
    }, {});

    this.winston = winston.createLogger({
      transports: [
        new winston.transports.Console({
          stderrLevels: this.stderrLevels
        })
      ],
      format: this.format(),
      level: this.level,
      levels: this.winstonLevels,
      handleExceptions: false,
      exitOnError: this.exitOnError
    });
  }

  createLogMethods() {
    Object.keys(this.levels).forEach((level) => {
      this[level.toLowerCase()] = (message) => {
        let meta;
        // Log functions can be passed an object to provide
        // additional meta data like a logger `name`.
        if (typeof message === 'object') {
          meta = {...message};
          delete meta.message;
          message = message.message;
        }
        // Pass the meta object as actual `meta` object
        this.winston.log(level, message, {meta});
      };
    });
  }

  exitOnError = (e) => {
    this.winston[this.getLevelsDescending()[0]](e.stack);
    return true;
  };

  getLevelsDescending() {
    return Object.entries(this.levels)
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
  }

  format() {
    const formats = [];

    if (this.colorize && !this.isProduction) {
      formats.push(this.formatColorize());
    }

    if (this.isProduction) {
      formats.push(this.formatJson());
    } else {
      formats.push(this.formatSimple());
    }

    return winston.format.combine(...formats);
  }

  formatJson() {
    return winston.format((info) => {
      const now = new Date();

      const {name: logger_name, requestId, ...meta} = info.meta || {};
      const hasMeta = Object.keys(meta).length > 0;

      const log = {
        level: info.level,
        message: info.message,
        service: this.service,
        '@timestamp': now.toISOString(),
        level_value: this.levels[info.level],
        logger_name,
        meta: hasMeta ? meta : undefined,
        stack_trace: hasMeta && meta.stack ? meta.stack.join('\n') : undefined,
        requestId
      };

      info[Symbol.for('message')] = JSON.stringify(log);

      return info;
    })();
  }

  formatSimple() {
    return winston.format((info) => {
      const {meta} = info;

      let message = `${info.level}: ${info.message}`;
      if (meta) {
        message = `${message} ${stringifyObject(meta)}`;
      }

      info[Symbol.for('message')] = message;

      return info;
    })();
  }

  formatColorize() {
    return winston.format.colorize({colors: this.colors});
  }

  destroy() {
    this.winston = null;
  }
}
