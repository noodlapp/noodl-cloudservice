import Winston from 'winston';
import { MongoDB } from 'winston-mongodb';

const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

// This stuff is needed to get the mongo-db transport working
// https://github.com/winstonjs/winston/issues/1130
function clone(obj) {
  var copy = Array.isArray(obj) ? [] : {};
  for (var i in obj) {
    if (Array.isArray(obj[i])) {
      copy[i] = obj[i].slice(0);
    } else if (obj[i] instanceof Buffer) {
      copy[i] = obj[i].slice(0);
    } else if (typeof obj[i] != 'function') {
      copy[i] = obj[i] instanceof Object ? clone(obj[i]) : obj[i];
    } else if (typeof obj[i] === 'function') {
      copy[i] = obj[i];
    }
  }
  return copy;
}
require("winston/lib/winston/common").clone = clone;

let Transport = require("winston-transport");
Transport.prototype.normalizeQuery = function (options) { //
  options = options || {};

  // limit
  options.rows = options.rows || options.limit || 10;

  // starting row offset
  options.start = options.start || 0;

  // now
  options.until = options.until || new Date;
  if (typeof options.until !== 'object') {
    options.until = new Date(options.until);
  }

  // now - 24
  options.from = options.from || (options.until - (24 * 60 * 60 * 1000));
  if (typeof options.from !== 'object') {
    options.from = new Date(options.from);
  }

  // 'asc' or 'desc'
  options.order = options.order || 'desc';

  // which fields to select
  options.fields = options.fields;

  return options;
};
Transport.prototype.formatResults = function (results, _options) {
  return results;
};

// Create a logger that will push to mongodb
export class LoggerAdapter {
  logger: Winston.Logger;

  constructor(options) {
    const info = new MongoDB({
      db: options.databaseURI,
      level: 'info',
      collection: '_ndl_logs_info',
      capped: true,
      cappedSize: 2000000, // 2mb size
    })
    // @ts-expect-error
    info.name = 'logs-info'

    const error = new MongoDB({
      db: options.databaseURI,
      level: 'error',
      collection: '_ndl_logs_error',
      capped: true,
      cappedSize: 2000000, // 2mb size
    })
    // @ts-expect-error
    error.name = 'logs-error'

    this.logger = Winston.createLogger({
      transports: [
        info,
        error
      ]
    })
  }

  log() {
    // Logs from parse are simply passed to console
    console.log.apply(this, arguments);
  }

  // This function is used by cloud functions to actually push to log
  _log() {
    // Logs from parse are simply passed to console
    console.log.apply(this, arguments);
    return this.logger.log.apply(this.logger, arguments);
  }

  // custom query as winston is currently limited
  query(options, callback = (_result) => {}) {
    if (!options) {
      options = {};
    }

    // defaults to 7 days prior
    const from = options.from || new Date(Date.now() - 7 * MILLISECONDS_IN_A_DAY);
    const until = options.until || new Date();
    const limit = options.size || 10;
    const order = options.order || 'desc';
    const level = options.level || 'info';

    const queryOptions: Winston.QueryOptions = {
      from,
      until,
      limit,
      order,
      fields: {}
    }

    return new Promise((resolve, reject) => {
      this.logger.query(queryOptions, (err, res) => {
        if (err) {
          callback(err);
          return reject(err);
        }

        const _res = level === 'error' ? res['logs-error'] : res['logs-info'];
        _res.forEach(r => delete r.meta)

        callback(_res);
        resolve(_res);

      });
    });
  }
}
