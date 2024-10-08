const { Op, literal } = require('sequelize');

const models = require('../../models');
const Team = require('../Team');
const TeamSeason = require('../TeamSeason');
const PlayerTeamSeason = require('../PlayerTeamSeason');
const Player = require('../Player');
const Career = require('../Career');
const League = require('../League');
const LeagueSeason = require('../LeagueSeason');

const db = require('../../database');
const logger = require('../../logger');

exports.getAllPlayers = async (req, res) => {
  try {
    const players = await Player.findAll({
      attributes: ['id', 'name', 'name_basic', 'birth_date'],
      order: [['name_basic', 'ASC']],
      raw: true,
      where: {
        name_basic: {
          [Op.ne]: null
        }
      }
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
              attributes: ['name', 'image'],
            }
          ],
        },
      ],
      order: [
        [Career, 'from_year', 'ASC'],
        [Career, 'to_year', 'ASC'],
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


exports.getRandomPlayerOld = async (req, res) => {
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
              attributes: ['name', 'image'],
            }
          ],
        },
      ],
      order: [
        [Career, 'from_year', 'ASC'],
        [Career, 'to_year', 'ASC'],
        literal("random()")
      ],
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


exports.getRandomPlayer = async (req, res) => {
  Player.associate(models);
  Career.associate(models);
  Team.associate(models);

  try {
    const playerId = await Player.findOne({
      attributes: ['id'],
      where: {
        name_basic: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: Career,
          required: true,
          attributes: ['id', 'apps'],
          where: {
            apps: {
              [Op.gte]: 30
            }
          },
          include: [
            {
              model: Team,
              required: true,
              attributes: ['id'],
              include: [
                {
                  model: TeamSeason,
                  required: true,
                  attributes: ['id']
                }
              ]
            }
          ]
        }
      ],
      group: ['Player.id', 'Careers.id', 'Careers->Team.id', 'Careers->Team->TeamSeasons.id'],
      having: literal('SUM("Careers"."apps") >= 100'),
      where: {
        name_basic: {
          [Op.ne]: null
        }
      },
      order: [
        literal('random()')
      ],
      subQuery: false
    });

     const player = await Player.findOne({
      where: {
        id: playerId.id
      },
      include: [
        {
          model: Career,
          required: false,
          include: [
            {
              model: Team,
              attributes: ['name', 'image'],
            }
          ],
        },
      ],
      order: [
        [Career, 'from_year', 'ASC'],
        [Career, 'to_year', 'ASC']
      ],
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
                  attributes: ['name', 'image'],
                }
              ],
              order: [
                ['from_year', 'ASC'],
                ['to_year', 'ASC'],

              ],
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

exports.getPlayerInEuros2024 = async (req, res) => {
  PlayerTeamSeason.associate(models);
  TeamSeason.associate(models);
  Team.associate(models);
  LeagueSeason.associate(models);
  League.associate(models);
  Player.associate(models);
  Career.associate(models);

  const league = await League.findOne({
    where: { name: "UEFA European Championship" },
  });

  if (!league) {
    throw new Error(`League not found with name: UEFA European Championship`);
    return;
  }
  else{
    logger.info(`League Found: ${league.name}`);
  }

  const leagueSeason = await LeagueSeason.findOne({
    where: { league_id: league.id, from_year: 2024, to_year: 2024 },
  });

  if (!leagueSeason) {
    throw new Error(`LeagueSeason not found for league_id: ${league.id} and ${2024}`);
  }
  else{
    logger.info(`League Season found: ${leagueSeason.from_year} to ${leagueSeason.to_year}`);
  }

  const leagueSeasonId = leagueSeason.id;

  if (!leagueSeasonId) {
    console.error("leagueSeasonId is undefined or null");
    throw new Error("Invalid leagueSeasonId");
  }

  console.log("leagueSeasonId:", leagueSeasonId);

  const query = `SELECT players.id, players.name_basic
      FROM players
      JOIN player_team_seasons ps ON players.id = ps.player_id
      JOIN team_seasons ts ON ps.team_season_id = ts.id
      JOIN league_seasons ls ON ts.league_season_id = ls.id
      JOIN leagues lg ON ls.league_id = lg.id
      WHERE ls.id = :leagueSeasonId AND players.name_basic IS NOT NULL
      ORDER BY RANDOM() LIMIT 1;`;

  try {
    const [results, metadata] = await db.query(query, {
      replacements: { leagueSeasonId },
    });

    const randomPlayerId = results.length > 0 ? results[0].id : null;

    if (randomPlayerId) {    
      const player = await Player.findOne({
          where: {
            id: randomPlayerId
          },
          include: [
            {
              model: Career,
              required: false,
              include: [
                {
                  model: Team,
                  attributes: ['name', 'image'],
                }
              ],
            },
          ],
          order: [
            [Career, 'from_year', 'ASC'],
            [Career, 'to_year', 'ASC']
          ],
          subQuery: true,
      });
    
      try {
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

    } else {
      console.error("No player found for the given league season");
    }
  } catch (error) {
    console.error("Error executing query:", error);
  }
};