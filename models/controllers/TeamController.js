const { Sequelize, Op } = require('sequelize');

const Team = require('../Team');
const TeamSeason = require('../TeamSeason');
const LeagueSeason = require('../LeagueSeason');

exports.getTeamSeasons = async (req, res) => {
    try {
        const leagueSeasonIds = req.query.leagueSeasonIds.split(',').map(Number);

        if (!leagueSeasonIds) {
            res.status(400).send("Missing leagueSeasonIds query parameter");
            return;
        }
        else {
            const models = require('../../models');
            Team.associate(models);
            TeamSeason.associate(models);

            const teamSeasons = await TeamSeason.findAll({
                where: {
                    league_season_id: {
                        [Op.in]: leagueSeasonIds,
                    },
                },
                include: [{
                    model: Team, required: true
                }]
            });

            if (teamSeasons){
                res.json(teamSeasons.map(ts => ts.toJSON()));
            } else {
                res.status(404).send("No leagues found");
            }
        }
    } catch (error) {
        console.error(error);
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
        const models = require('../../models');
        Team.associate(models);
        TeamSeason.associate(models);
        LeagueSeason.associate(models);
  
        const teams = await Team.findAll({
          include: [
            {
              model: TeamSeason,
              required: true,
              where: {
                league_season_id: { [Sequelize.Op.in]: leagueSeasonIds },
              },
            },
          ],
          order: [['name', 'ASC']],
          subQuery: false,
        });
  
        if (teams) {
          res.json(teams.map((team) => team.toJSON()));
        } else {
          res.status(404).send("No teams found");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };