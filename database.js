const { Sequelize } = require('sequelize');

require('dotenv').config();

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
