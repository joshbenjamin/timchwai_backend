const { Sequelize, Op } = require('sequelize');

const Team = require('../Team');
const TeamSeason = require('../TeamSeason');
const LeagueSeason = require('../LeagueSeason');
const PlayerTeamSeason = require('../PlayerTeamSeason');
const Player = require('../Player');
const Career = require('../Career');
const logger = require('../../../scraper/logger');

exports.getPlayerInTeamSeasons = async (req, res) => {
    try {
        if (!req.query.leagueSeasonIds) {
            res.status(400).send("Missing leagueSeasonIds query parameter");
            return;
          }
          if (!req.query.teamIds) {
            res.status(400).send("Missing teamIds query parameter");
            return;
          }

          const leagueSeasonIds = req.query.leagueSeasonIds
          .split(',')
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id));

          let teamIds = req.query.teamIds;
          let includeAllTeams = false;
          if (teamIds === 'all'){
            includeAllTeams = true;
          } else {
            teamIds = teamIds
            .split(',')
            .map((id) => parseInt(id, 10))
            .filter((id) => !isNaN(id));
          }
    
        if (!leagueSeasonIds.length) {
          res.status(400).send("Invalid leagueSeasonIds query parameter");
          return;
        } else if (!teamIds.length){
            res.status(400).send("Invalid teamIds query parameter");
          return;
        } 
        else {
          const models = require('../../models');
          Team.associate(models);
          TeamSeason.associate(models);
          LeagueSeason.associate(models);
          Player.associate(models);
          PlayerTeamSeason.associate(models);
          Career.associate(models);
    
          // const randomPlayer = await Player.findOne({
          //   include: [
          //     {
          //       model: PlayerTeamSeason,
          //       required: true,
          //       include: [
          //         {
          //           model: TeamSeason,
          //           required: true,
          //           // This will also only include one Career, use getPlayerById to get Careers
          //           where: { 
          //             league_season_id: {
          //               [Op.in]: leagueSeasonIds
          //             },
          //             team_id: {
          //               [Op.in]: teamIds,
          //             }, 
          //           },
          //         },
          //       ],
          //     },
          //   ],
          //   order: Sequelize.literal("random()"),
          //   subQuery: false,
          // });
          
          const teamSeasonInclude = {
            model: TeamSeason,
            required: true,
            where: {
              league_season_id: {
                [Op.in]: leagueSeasonIds,
              },
            },
          };
          
          if (!includeAllTeams) {
            teamSeasonInclude.where.team_id = {
              [Op.in]: teamIds,
            };
          }
          
          const randomPlayer = await Player.findOne({
            include: [
              {
                model: PlayerTeamSeason,
                required: true,
                include: [teamSeasonInclude],
              },
            ],
            where: {
              id: 259,
            },
          });

          if (randomPlayer){
              logger.info(`Random player found: ${randomPlayer.name}`);

              const careers = await Career.findAll({
                include: [
                  {
                    model: Team,
                    required: true,
                  },
                ],
                where: {
                  player_id: randomPlayer.id,
                },
              });

              if (!careers){
                logger.error(`No careers found for ${randomPlayer.name}`);
              }

              const data = {
                player: randomPlayer.toJSON(),
                career: careers.map(career => career.toJSON())
              }

              res.json(data);
          } else {
              res.status(404).send("No random player found");
          }
        }
      } catch (error) {
        console.error(error);
      }
};

exports.getPlayerById = async (req, res) => {
  try {
    if (!req.query.playerId) {
      res.status(400).send("Missing playerId query parameter");
      return;
    }

    const playerId = parseInt(req.query.playerId, 10);

    const models = require('../../models');
    Team.associate(models);
    TeamSeason.associate(models);
    LeagueSeason.associate(models);
    Player.associate(models);
    PlayerTeamSeason.associate(models);
    Career.associate(models);

    const player = await Player.findOne({
      where: {
        // id: playerId
        name: "Wayne Rooney"
      },
      include: [
        {
          model: PlayerTeamSeason,
          required: true,
          include: [
            {
              model: TeamSeason,
              required: true,
            },
          ],
        },
      ],
      order: Sequelize.literal("random()"),
      subQuery: false,
    });

    if (player){
      const careers = await Career.findAll({
        include: [
          {
            model: Team,
            required: true,
          },
        ],
        where: {
          player_id: player.id,
        },
      });

      if (!careers){
        logger.error(`No careers found for ${randomPlayer.name}`);
      }

      const data = {
        player: player.toJSON(),
        career: careers.map(career => career.toJSON())
      }

      logger.info(data);
      res.json(data);
    } else {
        res.status(404).send("No player found");
    }
  } catch (error) {
    console.error(error);
  }
};