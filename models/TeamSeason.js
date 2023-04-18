const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class TeamSeason extends Model {}

TeamSeason.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  league_position: {
    type: DataTypes.INTEGER,
  },
  played: {
    type: DataTypes.INTEGER,
  },
  wins: {
    type: DataTypes.INTEGER,
  },
  draws: {
    type: DataTypes.INTEGER,
  },
  losses: {
    type: DataTypes.INTEGER,
  },
  goals_for: {
    type: DataTypes.INTEGER,
  },
  goals_against: {
    type: DataTypes.INTEGER,
  },
  goal_difference: {
    type: DataTypes.INTEGER,
  },
  points: {
    type: DataTypes.INTEGER,
  },
  wiki_link: {
    type: DataTypes.STRING,
    allowNull: false
  },
  accolades: {
    type: DataTypes.STRING,
  },
  team_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: 'teams',
        key: 'id',
    },
  },
  league_season_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'league_seasons',
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'TeamSeason',
  tableName: 'team_seasons',
  timestamps: false,
});

TeamSeason.associate = function(models) {
  this.belongsTo(models.LeagueSeason, { foreignKey: 'league_season_id' });
  this.belongsTo(models.Team, { foreignKey: 'team_id' });
  this.hasMany(models.PlayerTeamSeason, { foreignKey: 'team_season_id' });
};

module.exports = TeamSeason;
