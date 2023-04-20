const { Sequelize, Op } = require('sequelize');

const League = require('../League');
const LeagueSeason = require('../LeagueSeason');
const TeamSeason = require('../TeamSeason');

exports.getAllLeagues = async (req, res) => {
    try {
        const models = require('../../models');
        League.associate(models);
        LeagueSeason.associate(models);

        const leagues = await League.findAll({});

        if (leagues){
            res.json(leagues.map(league => league.toJSON()));
        } else {
            res.status(404).send("No leagues found");
        }

      } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      }
};

exports.getAllLeaguesWithSeasons = async (req, res) => {
    try {
        const models = require('../../models');
        League.associate(models);
        LeagueSeason.associate(models);

        const leagues = await League.findAll({
            include: {
                model: LeagueSeason,
                attributes: [] // Add atts if you want more than count
            },
            group: ['League.id'],
            having: LeagueSeason.sequelize.literal('COUNT("LeagueSeasons"."id") >= 1')
        });

        if (leagues){
            res.json(leagues.map(league => league.toJSON()));
        } else {
            res.status(404).send("No leagues found");
        }

      } catch (err) {
        console.error(err);
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

        const models = require('../../models');
        League.associate(models);
        LeagueSeason.associate(models);
        TeamSeason.associate(models);

        const leagueSeasons = await LeagueSeason.findAll({
            include: [
                {
                    model: TeamSeason,
                    required: true,
                    attributes: []
                },
                {
                    model: League,
                    attributes: ['name'], // Exclude attributes from the result, if not needed
                },
            ],
            where: {
                league_id: {
                    [Op.in]: leagueIds
                }
            },
            order: [
                [League, 'name', 'ASC'], // Order by League.name
                ['from_year', 'ASC'], // Then order by LeagueSeason.from_year
            ],
            subQuery: false,
        });

        if (leagueSeasons){
            res.json(leagueSeasons.map(ls => ls.toJSON()));
        } else {
            res.status(404).send("No leagues found");
        }
        // }
        } catch (error) {
            console.error(error);
        }
    };