const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class League extends Model {}

League.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
  },
  number_of_teams: {
    type: DataTypes.INTEGER,
  },
  level: {
    type: DataTypes.INTEGER,
  },
  image: {
    type: DataTypes.STRING(512),
  },
  wiki_link: {
    type: DataTypes.STRING,
    allowNull: false
  },
}, {
  sequelize,
  modelName: 'League',
  tableName: 'leagues',
  timestamps: true,
});

League.associate = function(models) {
    this.hasMany(models.LeagueSeason, { foreignKey: 'league_id' });
  }

module.exports = League;
