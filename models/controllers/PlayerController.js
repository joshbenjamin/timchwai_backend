const { Op, literal } = require('sequelize');

const models = require('../../models');
const Team = require('../Team');
const TeamSeason = require('../TeamSeason');
const PlayerTeamSeason = require('../PlayerTeamSeason');
const Player = require('../Player');
const Career = require('../Career');

const logger = require('../../logger');

exports.getAllPlayers = async (req, res) => {
  try {
    const players = await Player.findAll({
      attributes: ['id', 'name', 'name_basic', 'birth_date'],
      order: [['name_basic', 'ASC']],
      raw: true,
    });

    if (players && players.length > 0) {
      logger.info(`Players found`);
      res.json(players);
    } else {
      logger.error(`Player not found`);
      res.status(404).send("Players not found");
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getPlayerById = async (req, res) => {
  try {
    if (!req.query.playerId) {
      res.status(400).send("Missing playerId query parameter");
      return;
    }

    const playerId = parseInt(req.query.playerId, 10);

    Player.associate(models);
    Career.associate(models);

    const player = await Player.findOne({
      where: {
        id: playerId
      },
      include: [
        {
          model: Career,
          required: false,
          include: [
            {
              model: Team,
              attributes: ['name']
            }
          ]
        },
      ],
      subQuery: false,
    });

    if (player){
      logger.info(`Player found with playerId=${playerId}`);
      res.json(player.toJSON());
    } else {
      logger.error(`Player not found with playerId=${playerId}`);
      res.status(404).send("No player found");
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getRandomPlayer = async (req, res) => {
  Player.associate(models);
  Career.associate(models);

  try {
    const player = await Player.findOne({
      where: {
        name_basic: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: Career,
          required: false,
          include: [
            {
              model: Team,
              attributes: ['name']
            }
          ],
        },
      ],
      order: literal("random()"),
      subQuery: true,
    });
    

    if (player){
      logger.info("Random player found");
      res.json(player.toJSON());
    } else {
      logger.error("No random player found");
      res.status(404).send("No random player found");
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send("Internal Server Error");
  }
};

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

        const teamIds = req.query.teamIds
        .split(',')
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
    
        if (!leagueSeasonIds.length) {
          res.status(400).send("Invalid leagueSeasonIds query parameter");
          return;
        } else if (!teamIds.length){
          res.status(400).send("Invalid teamIds query parameter");
          return;
        } 
        else {
          Player.associate(models);
          PlayerTeamSeason.associate(models);
          Career.associate(models);
    
          const player = await Player.findOne({
            where: {
              name_basic: {
                [Op.ne]: null
              }
            },
            include: [
              {
                model: PlayerTeamSeason,
                required: true,
                attributes: [],
                include: [
                  {
                    model: TeamSeason,
                    required: true,
                    attributes: [],
                    where: {
                      league_season_id: {
                        [Op.in]: leagueSeasonIds
                      },
                      team_id: {
                        [Op.in]: teamIds,
                      },
                    },
                  },
                ],
              },
            ],
            order: literal("random()"),
            subQuery: false,
          });

          if (player){
            const playerJSON = player.toJSON();

            const careers = await Career.findAll({
              where: {
                player_id: player.id
              },
              include: [
                {
                  model: Team,
                  attributes: ['name']
                }
              ]
            });          
            playerJSON.Careers = careers;

            logger.info(`Random player found with leagueSeasonIds=${leagueSeasonIds} and teamIds=${teamIds}`);
            res.json(playerJSON);
          } else {
            logger.error(`Random player not found with leagueSeasonIds=${leagueSeasonIds} and teamIds=${teamIds}`);
            res.status(404).send("No random player found");
          }
        }
      } catch (error) {
        logger.error(error);
        res.status(500).send("Internal Server Error");
      }
};