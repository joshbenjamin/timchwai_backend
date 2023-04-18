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

exports.getLeagueSeasons = async (req, res) => {
    try {
        const leagueId = req.query.leagueId;
        if (!leagueId) {
            res.status(400).send("Missing leagueId query parameter");
            return;
        }
        else {
            const models = require('../../models');
            League.associate(models);
            LeagueSeason.associate(models);

            const leagueSeasons = await LeagueSeason.findAll({
                include: [{
                    model: TeamSeason,
                    required: true
                }],
                where: {
                    league_id: leagueId
                },
                order: [['from_year', 'ASC']],
                subQuery: false,
            });

            if (leagueSeasons){
                res.json(leagueSeasons.map(ls => ls.toJSON()));
            } else {
                res.status(404).send("No leagues found");
            }
        }
    } catch (error) {
        console.error(error);
    }
};