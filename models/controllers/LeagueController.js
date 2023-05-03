const { Op } = require('sequelize');

const models = require('../../models');
const League = require('../League');
const LeagueSeason = require('../LeagueSeason');
const TeamSeason = require('../TeamSeason');

const logger = require('../../logger');

exports.getLeagues = async (req, res) => {
    try {
        const leagues = await League.findAll();

        if (leagues){
            logger.info(`Leagues found`);
            res.json(leagues.map(league => league.toJSON()));
        } else {
            logger.error(`No leagues found`);
            res.status(404).send("No leagues found");
        }

    } catch (err) {
        logger.error(err);
        res.status(500).send("Internal Server Error");
    }
};

exports.getLeaguesWithSeasons = async (req, res) => {
    try {
        League.associate(models);

        const leagues = await League.findAll({
            include: {
              model: LeagueSeason,
              attributes: []
            },
            where: {
              id: {
                [Op.in]: LeagueSeason.sequelize.literal(
                  '(SELECT "league_id" FROM "league_seasons" GROUP BY "league_id")'
                ),
              },
            },
          });          

        if (leagues){
            logger.info(`Leagues with Seasons found`);
            res.json(leagues.map(league => league.toJSON()));
        } else {
            logger.error(`Leagues with Seasons not found`);
            res.status(404).send("No leagues found");
        }
    } catch (err) {
        logger.error(err);
        res.status(500).send("Internal Server Error");
    }
};

exports.getLeagueSeasons = async (req, res) => {
    try {
        if (!req.query.leagueIds) {
            res.status(400).send("Missing leagueIds query parameter");
            return;
        }

        const leagueIds = req.query.leagueIds
          .split(',')
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id));

        LeagueSeason.associate(models);

        const leagueSeasons = await LeagueSeason.findAll({
            include: [
                {
                    model: TeamSeason,
                    required: true,
                    attributes: []
                },
                {
                    model: League,
                    attributes: ['name'],
                },
            ],
            where: {
                league_id: {
                    [Op.in]: leagueIds
                }
            },
            attributes: ['id', 'from_year', 'to_year', 'wiki_link'],
            order: [
                [League, 'name', 'ASC'],
                ['from_year', 'ASC'],
            ],
            subQuery: false,
        });

        if (leagueSeasons){
            logger.info(`Found League Seasons for LeagueIds: ${leagueIds}`);
            res.json(leagueSeasons.map(ls => ls.toJSON()));
        } else {
            logger.error(`Found no League Seasons for LeagueIds: ${leagueIds}`);
            res.status(404).send("No leagues found");
        }
        } catch (error) {
            logger.error(error);
            res.status(500).send("Internal Server Error");
        }
};