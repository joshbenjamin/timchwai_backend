const cors = require('cors');
const express = require('express');

const PlayerController = require('./models/controllers/PlayerController');
const LeagueController = require('./models/controllers/LeagueController');
const TeamController = require('./models/controllers/TeamController');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
  origin: ['http://localhost:3002', 'https://www.timchwai.co.za', 'https://timchwai-app.vercel.app'],
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to TIMCHWAI backend!');
});


// Leagues
app.get('/leagues', LeagueController.getLeagues);

app.get('/leagues_with_seasons', LeagueController.getLeaguesWithSeasons);

app.get('/league_seasons', LeagueController.getLeagueSeasons);


// Teams
app.get('/teams', TeamController.getTeams);

app.get('/teams_in_seasons', TeamController.getTeamsInLeagueSeasons);


// Players
app.get('/players', PlayerController.getAllPlayers);

app.get('/player', PlayerController.getPlayerById);

app.get('/random_player', PlayerController.getRandomPlayer);

app.get('/player_in_team_seasons', PlayerController.getPlayerInTeamSeasons);

app.get('/random_euros_2024', PlayerController.getPlayerInEuros2024);


if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
