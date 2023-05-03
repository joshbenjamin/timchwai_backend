const cors = require('cors');
const express = require('express');

const PlayerController = require('./models/controllers/PlayerController');
const LeagueController = require('./models/controllers/LeagueController');
const TeamController = require('./models/controllers/TeamController');

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to TIMCHWAI backend!');
});


// Leagues
app.get('/api/leagues', LeagueController.getLeagues);

app.get('/api/leagues_with_seasons', LeagueController.getLeaguesWithSeasons);

app.get('/api/league_seasons', LeagueController.getLeagueSeasons);


// Teams
app.get('/api/teams', TeamController.getTeams);

app.get('/api/teams_in_seasons', TeamController.getTeamsInLeagueSeasons);


// Players
app.get('/api/players', PlayerController.getAllPlayers);

app.get('/api/player', PlayerController.getPlayerById);

app.get('/api/random_player', PlayerController.getRandomPlayer);

app.get('/api/player_in_team_seasons', PlayerController.getPlayerInTeamSeasons);


if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
