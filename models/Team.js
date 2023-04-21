const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class Team extends Model {}

Team.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  full_name: {
    type: DataTypes.STRING,
  },
  nicknames: {
    type: DataTypes.STRING(512),
  },
  founded: {
    type: DataTypes.INTEGER,
  },
  stadium: {
    type: DataTypes.STRING,
  },
  capacity: {
    type: DataTypes.INTEGER,
  },
  head_coach: {
    type: DataTypes.STRING,
  },
  image: {
    type: DataTypes.STRING(512),
  },
  wiki_link: {
    type: DataTypes.STRING,
  },
}, {
  sequelize,
  modelName: 'Team',
  tableName: 'teams',
  timestamps: true,
});

Team.associate = function(models) {
    this.hasMany(models.Career, { foreignKey: 'team_id' });
    this.hasMany(models.TeamSeason, { foreignKey: 'team_id' });
  }

module.exports = Team;