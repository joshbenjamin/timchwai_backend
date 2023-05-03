const { Sequelize } = require('sequelize');

require('dotenv').config();

function get_db() {
  const USE_DB_URL = process.env.USE_DB_URL || false;

  if (USE_DB_URL){
    const DB_URL = process.env.DB_URL
    return new Sequelize(DB_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: process.env.DB_SSL === 'true',
          rejectUnauthorized: false // You may want to set this to true in a production environment
        }
      }
    });
  } else {
    const DB_USERNAME = process.env.DB_USERNAME || '';
    const DB_PASSWORD = process.env.DB_PASSWORD || '';
    const DB_DATABASE = process.env.DB_DATABASE || '';
    const DB_HOST = process.env.DB_HOST || '';
    const DB_DIALECT = process.env.DB_DIALECT || '';
    return new Sequelize(DB_DATABASE, DB_USERNAME, DB_PASSWORD, {host: DB_HOST, dialect: DB_DIALECT, logging: true}); 
  }
};

const db = get_db();

(async () => {
  try {
    await db.authenticate();
    console.log('Connection to the database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
})();

module.exports = db;
