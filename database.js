const { Sequelize } = require('sequelize');

require('dotenv').config();

// const DB_USERNAME = process.env.DB_USERNAME || 'your_development_username';
// const DB_PASSWORD = process.env.DB_PASSWORD || 'your_development_password';
// const DB_DATABASE = process.env.DB_DATABASE || 'your_development_database';
// const DB_HOST = process.env.DB_HOST || 'your_development_host';
// const DB_DIALECT = process.env.DB_DIALECT || 'your_development_dialect';

// const db = new Sequelize(
//     DB_DATABASE, DB_USERNAME, DB_PASSWORD, {host: DB_HOST, dialect: DB_DIALECT, logging: true,
// });

const DB_URL = process.env.DB_URL

const db = new Sequelize(DB_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: process.env.DB_SSL === 'true',
      rejectUnauthorized: false // You may want to set this to true in a production environment
    }
  }
});

(async () => {
  try {
    await db.authenticate();
    console.log('Connection to the database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
})();

module.exports = db;
