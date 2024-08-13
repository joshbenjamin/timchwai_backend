// logger.js
const winston = require('winston');
const fs = require('fs');
const util = require('util');

// Create the log file with the current date and time in the name
const now = new Date();
const formattedDate = now.toISOString().replace(/[:.]/g, '-').split('.')[0];
const logFilename = `logs/scraper_${formattedDate}.log`;

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: logFilename }),
  ],
});

// Custom logger wrapper
const logger = {
  info: (message, ...params) => {
    winstonLogger.info(util.format(message, ...params));
  },
  warn: (message, ...params) => {
    winstonLogger.warn(util.format(message, ...params));
  },
  error: (message, ...params) => {
    winstonLogger.error(util.format(message, ...params));
  },
  debug: (message, ...params) => {
    winstonLogger.debug(util.format(message, ...params));
  },
};

module.exports = logger;