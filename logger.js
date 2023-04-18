// logger.js
const winston = require('winston');
const fs = require('fs');

// Create the log file with the current date and time in the name
const now = new Date();
const formattedDate = now.toISOString().replace(/[:.]/g, '-').split('.')[0]; // Format date as 'YYYY-MM-DDTHH-mm-ss'
const logFilename = `logs/scraper_${formattedDate}.log`;

const logger = winston.createLogger({
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

module.exports = logger;
