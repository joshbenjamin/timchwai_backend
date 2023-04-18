const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class LeagueSeason extends Model {}

LeagueSeason.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  from_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  to_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  wiki_link: {
    type: DataTypes.STRING,
    allowNull: false
  },
  league_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'leagues',
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'LeagueSeason',
  tableName: 'league_seasons',
  timestamps: false,
});

LeagueSeason.associate = function(models) {
    this.belongsTo(models.League, { foreignKey: 'league_id' });
    this.hasMany(models.TeamSeason, { foreignKey: 'league_season_id' });
  }

module.exports = LeagueSeason;
