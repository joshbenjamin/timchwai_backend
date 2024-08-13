const db = require('./database');
const models = require('./models');
console.log('Imported Models:', models);

async function syncModels() {
  try {
    Object.values(models).forEach(model => {
      console.log('Processing Model:', model.name);
      if (model.associate) {
        model.associate(models);
      }
    });
    await db.sync({ force: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
}

syncModels();