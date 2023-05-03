const { Op } = require('sequelize');

const models = require('../../models');
const Team = require('../Team');
const TeamSeason = require('../TeamSeason');

const logger = require('../../logger');

exports.getTeams = async (req, res) => {
    try {
        Team.associate(models);

        const teams = await Team.findAll({
          include: 
          [
            {
              model: TeamSeason,
              required: false 
            }
          ]
        });

        if (teams){
          logger.info(`Teams found`);
          res.json(teams.map(team => team.toJSON()));
        } else {
          logger.error(`Teams not found`);
          res.status(404).send("No teams found");
        }
    } catch (error) {
        logger.error(error);
        res.status(500).send("Internal Server Error");
    }
};

exports.getTeamsInLeagueSeasons = async (req, res) => {
    try {
      if (!req.query.leagueSeasonIds) {
        res.status(400).send("Missing leagueSeasonIds query parameter");
        return;
      }
      const leagueSeasonIds = req.query.leagueSeasonIds
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
  
      if (!leagueSeasonIds.length) {
        res.status(400).send("Invalid leagueSeasonIds query parameter");
        return;
      } else {
        Team.associate(models);
  
        const teams = await Team.findAll({
          include: [
            {
              model: TeamSeason,
              required: true,
              where: {
                league_season_id: { 
                  [Op.in]: leagueSeasonIds 
                },
              },
              attributes: []
            },
          ],
          order: [['name', 'ASC']],
          subQuery: false,
        });
  
        if (teams) {
          logger.info(`Teams found for leagueSeasonIds: ${leagueSeasonIds}`);
          res.json(teams.map((team) => team.toJSON()));
        } else {
          logger.error(`No teams found for leagueSeasonIds: ${leagueSeasonIds}`);
          res.status(404).send("No teams found");
        }
      }
    } catch (error) {
      logger.error(error);
      res.json(500).send("Internal Server Error");
    }
  };