/**
 * Frontend Logger Utility
 * 
 * - In production: only error and warn are outputted
 * - In development: all levels are outputted
 * 
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.debug('Some debug info', data);
 *   logger.info('Important info');
 *   logger.warn('Warning message');
 *   logger.error('Error occurred', error);
 */

const isDev = import.meta.env.DEV;

 
const noop = (..._args: unknown[]) => {};

export const logger = {
  /** Debug-level: stripped in production */
  debug: isDev ? console.log.bind(console) : noop,
  /** Alias for debug */
  log: isDev ? console.log.bind(console) : noop,
  /** Info-level: stripped in production */
  info: isDev ? console.info.bind(console) : noop,
  /** Warnings: always shown */
  warn: console.warn.bind(console),
  /** Errors: always shown */
  error: console.error.bind(console),
};

export default logger;
