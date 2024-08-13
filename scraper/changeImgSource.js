// const axios = require('axios');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { Player, Team, League } = require('../models');
const streamPipeline = util.promisify(require('stream').pipeline);
const logger = require('../logger');
const { Op } = require('sequelize');

require('dotenv').config();

const cloudinary = require('cloudinary').v2;

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  logger.error('Cloudinary configuration environment variables are missing.');
  process.exit(1);
}

// Configuration 
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function downloadAndUploadImage(imageUrl, imageData) {
  let response;
  try {
    const fetch = await import('node-fetch').then(mod => mod.default);
    response = await fetch(`https://${imageUrl}`);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
  } catch (error) {
    logger.error(`Error while fetching the image: ${error.message}`);
    return null; // or handle the error as needed
  }

  const tempFilePath = path.join(__dirname, 'temp_image.png');

  try {
    await streamPipeline(response.body, fs.createWriteStream(tempFilePath));
  } catch (error) {
    logger.error(`Error while saving the image to file: ${error}`);
    return null; // or handle the error as needed
  }

  let result;
  try {
    result = await cloudinary.uploader.upload(tempFilePath, imageData);
  } catch (error) {
    // logger.error(`Error while trying to upload: ${error}`);
    logger.error(`Error while trying to upload: ${error.message}`);
    logger.error(`Full error: ${JSON.stringify(error, null, 2)}`);
    return null; // or handle the error as needed
  }

  // Clean up temporary file
  try {
    fs.unlinkSync(tempFilePath);
  } catch (error) {
    logger.error(`Error while deleting the temporary file: ${error}`);
  }

  return result ? result.secure_url : imageUrl;
}


async function processPlayers() {
  const players = await Player.findAll({
    where: {
      image: {
        [Op.like]: '%wikimedia%'
      }
    },
  });

  let length = players.length;
  
  for (const playerIdx in players) {
    let player = players[playerIdx];
    logger.info(`Processing player ${player.name} (${playerIdx}) of ${length}`);
    try {
      const imageData = {
        public_id: `player_images/${player.id}`,
        overwrite: true,
      };

      const url = player.image.replace('//', '');

      const newImageUrl = await downloadAndUploadImage(url, imageData);
      console.log(`Player ${player.name} image uploaded to ${newImageUrl}`);

      info = {
          image: newImageUrl
      }

      Player.update(info, {
          where: {
            id: player.id
          }
        }).then((result) => {
          logger.info(`Player image source updated: ${player.name}`);
        }).catch((error) => {
          logger.error(`Player image source not updated: ${player.name}\n${error}`);
        });
      
    } catch (error) {
      logger.error(`Error processing image source for player ${player.id}\n${error.message}`);
    }
  }
}

async function processTeams() {
  const teams = await Team.findAll({
    where: {
      image: {
        [Op.like]: '%wikimedia%'
      }
    }
  });

  let length = teams.length;
  
  for (const teamIdx in teams) {
    let team = teams[teamIdx];
    logger.info(`Processing team ${team.name} (${teamIdx}) of ${length}`);
    try {
      const imageData = {
        public_id: `team_images/${team.id}`,
        overwrite: true,
        transformation: {
          width: 128,
          height: 128,
          crop: 'fit', // You can use 'fit' or 'limit' if you don't want to crop the image
        },
      };
      
      const newImageUrl = await downloadAndUploadImage(team.image, imageData);
      console.log(`Team ${team.name} image uploaded to ${newImageUrl}`);

      info = {
          image: newImageUrl
      }

      Team.update(info, {
          where: {
            id: team.id
          }
        }).then((result) => {
          logger.info(`Team image source updated: ${team.name}`);
        }).catch((error) => {
          logger.error(`Team image source not updated: ${team.name}\n${error}`);
        });
      
    } catch (error) {
      console.error(`Error processing image source for player ${team.id}\n${error}`);
    }
  }
}

async function processLeagues() {
  const leagues = await League.findAll({
    where: {
      image: {
        [Op.notLike]: '%cloudinary%'
      }
    }
  });

  let length = leagues.length;
  
  for (const leagueIdx in leagues) {
    let league = leagues[leagueIdx];
    logger.info(`Processing league ${league.name} (${leagueIdx}) of ${length}`);
    try {
      const imageData = {
        public_id: `league_images/${league.id}`,
        overwrite: true,
        transformation: {
          width: 256,
          height: 256,
          crop: 'fit', // You can use 'fit' or 'limit' if you don't want to crop the image
        },
      };
      
      const newImageUrl = await downloadAndUploadImage(league.image, imageData);
      console.log(`League ${league.name} image uploaded to ${newImageUrl}`);

      info = {
          image: newImageUrl
      }

      League.update(info, {
          where: {
            id: league.id
          }
        }).then((result) => {
          logger.info(`League image source updated: ${league.name}`);
        }).catch((error) => {
          logger.error(`League image source not updated: ${league.name}\n${error.message}`);
        });
      
    } catch (error) {
      console.error(`Error processing image source for player ${team.id}\n${error}`);
    }
  }
}

// processLeagues();
// processTeams();
processPlayers();