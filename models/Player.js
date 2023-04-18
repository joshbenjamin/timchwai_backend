const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class Player extends Model {}

Player.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name_basic: {
    type: DataTypes.STRING,
  },
  full_name: {
    type: DataTypes.STRING,
  },
  birth_date: {
    type: DataTypes.DATE,
  },
  height: {
    type: DataTypes.FLOAT,
  },
  image: {
    type: DataTypes.STRING(512),
  },
  wiki_link: {
    type: DataTypes.STRING,
  },
}, {
  sequelize,
  modelName: 'Player',
  tableName: 'players',
  timestamps: true,
});

Player.associate = function(models) {
  this.hasMany(models.Career, { foreignKey: 'player_id' });
  this.hasMany(models.PlayerTeamSeason, { foreignKey: 'player_id' }); // Add this line
};

module.exports = Player;
