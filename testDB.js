const db = require('./database');

async function testConnection() {
    try {
      await db.authenticate();
      console.log('Connection to the database has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
    }
  }
  
  // Call the testConnection function
  testConnection();