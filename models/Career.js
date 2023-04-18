const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class Career extends Model {
  toString() {
    return `Career - ${this.player.name} at ${this.team.name} (${this.from_year}-${this.to_year})`;
  }
}

Career.init({
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
  },
  type: {
    type: DataTypes.ENUM('YOUTH', 'COLLEGE', 'SENIOR', 'INTERNATIONAL', 'MANAGER'),
    allowNull: false,
  },
  loan: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  player_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'players',
      key: 'id',
    },
  },
  team_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'teams',
      key: 'id',
    },
  },
  apps: {
    type: DataTypes.INTEGER,
  },
  goals: {
    type: DataTypes.INTEGER,
  },
}, {
  sequelize,
  modelName: 'Career',
  tableName: 'careers',
  timestamps: false,
});

Career.associate = function(models) {
    this.belongsTo(models.Player, { foreignKey: 'player_id' });
    this.belongsTo(models.Team, { foreignKey: 'team_id' });
  }
  
  
module.exports = Career;
