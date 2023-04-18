// models/PlayerTeamSeason.js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class PlayerTeamSeason extends Model {}

PlayerTeamSeason.init({
  player_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'players',
      key: 'id',
    },
  },
  team_season_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'team_seasons',
      key: 'id',
    },
  },
  appearances: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  goals: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'PlayerTeamSeason',
  tableName: 'player_team_seasons',
  timestamps: false,
});

PlayerTeamSeason.associate = function(models) {
    this.belongsTo(models.Player, { foreignKey: 'player_id' });
    this.belongsTo(models.TeamSeason, { foreignKey: 'team_season_id' });
  };

module.exports = PlayerTeamSeason;
