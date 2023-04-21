const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const Player = require('./models/Player');
const PlayerController = require('./models/controllers/PlayerController');
const LeagueController = require('./models/controllers/LeagueController');
const TeamController = require('./models/controllers/TeamController');

require('dotenv').config();

const { getRandomItem } = require('./utils');
const db = require('./database');
const Sequelize = require('sequelize');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to TIMCHWAI backend!');
});

app.get('/api/random_player', async (req, res) => {
  try {
    const randomPlayer = await Player.findOne({ order: Sequelize.literal('random()') });
    res.json(randomPlayer.toJSON());
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/leagues', LeagueController.getAllLeaguesWithSeasons);

app.get('/api/league_seasons', LeagueController.getLeagueSeasons);

app.get('/api/teams_in_seasons', TeamController.getTeamsInLeagueSeasons);

app.get('/api/player_in_team_seasons', PlayerController.getPlayerInTeamSeasons);

app.get('/api/player', PlayerController.getPlayerById);


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
