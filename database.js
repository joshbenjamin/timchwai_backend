const { Sequelize } = require('sequelize');

require('dotenv').config();

function get_db() {
  const env = process.env;
  let DB_URL = env.DB_URL;
  if (!DB_URL) {
    DB_URL = `${env.DB_DIALECT}://${env.DB_USERNAME}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
  }
  
  const useSSL = env.DB_SSL === 'true';
  
  const config = {
    dialect: 'postgres',
    logging: env.DB_LOGGING === 'true' ? console.log : false // SQL logging is very verbose; set DB_LOGGING=true to see it
  };

  if (useSSL) {
    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    };
  }

  return new Sequelize(DB_URL, config);
}

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
