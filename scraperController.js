const logger = require("./logger");
const { 
    createLeague, 
    createInternationalLeague, 
    createLeagueSeasons, 
    createInternationalLeagueSeasons, 
    createTeamsAndTeamSeasonsForLeague, 
    createInternationalTeamsAndTeamSeasonsForLeague,
    processTeamSeasons,
    processTeamData, 
    processPlayers,
    processEuro2024Players,
    correctPlayerNameWikiDuplicates, 
    processInternationalTournaments,
    syncAltTeamImageToParentImage,
    deleteDuplicatePlayers, 
    setNullTeamImages,
} = require("./scraper/scraper");

  async function league(name) {
    const link = name.replace(' ', '_');
    await createLeague(link);
    await createLeagueSeasons(name);

    const currentYear = new Date().getFullYear();
    const numberOfYears = 20;

    // Create an array of the last 20 years
    const seasons = Array.from({ length: numberOfYears }, (v, i) => (currentYear-1) - i);

    // Process each season in parallel
    await Promise.all(seasons.map(async (season) => {
        await createTeamsAndTeamSeasonsForLeague(name, season);
        await processTeamSeasons(name, season);
    }));
  }

  async function internationLeague(link, name) {
    // const link = name.replace(' ', '_');
    await createInternationalLeague(link);
    await createInternationalLeagueSeasons(name);

    const currentYear = new Date().getFullYear();
    const numberOfTournaments = 4;  // You can increase this number to handle more tournaments
    const tournamentYearGap = 4;

    // Create an array of tournament years based on the gap
    const tournaments = Array.from({ length: numberOfTournaments }, (v, i) => currentYear - (tournamentYearGap * i));

    // Process each tournament year in parallel
    await Promise.all(tournaments.map(async (tourney) => {
        await createInternationalTeamsAndTeamSeasonsForLeague(name, tourney);
        await processInternationalTournaments(name, tourney);
    }));
}


  async function players(){
    // await processEuro2024Players();
    await processPlayers();
    await correctPlayerNameWikiDuplicates();
    await deleteDuplicatePlayers();
  }

  async function teams(){
    await processTeamData();
    await syncAltTeamImageToParentImage();
    await setNullTeamImages();
  }



const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Command-line arguments parsing
const argv = yargs(hideBin(process.argv))
  .option('func', {
    alias: 'f',
    description: 'Specify which function to execute',
    choices: ['league', 'internationalLeague', 'players', 'teams'],
    demandOption: true,
  })
  .option('leagueName', {
    description: 'Specify the league name (for league functions)',
    type: 'string',
  })
  .option('internationalLink', {
    description: 'Specify the international link (for international functions)',
    type: 'string',
  })
  .option('internationalName', {
    description: 'Specify the international name (for international functions)',
    type: 'string',
  })
  .help()
  .alias('help', 'h')
  .argv;

// Function execution based on command-line arguments
(async () => {
  try {
    if (argv.func === 'league') {
      if (!argv.leagueName) {
        console.error('leagueName must be specified for league.');
        process.exit(1);
      }
      await league(argv.leagueName);
      console.log('League creation completed successfully');
    } else if (argv.func === 'internationalLeague') {
      if (!argv.internationalLink || !argv.internationalName) {
        console.error('Both internationalLink and internationalName must be specified for createInternationalLeagueMain.');
        process.exit(1);
      }
      await internationalLeague(argv.internationalLink, argv.internationalName);
      console.log('International league creation completed successfully');
    } else if (argv.func === 'players') {
      await players();
      console.log('Processing all players completed successfully');
    } else if (argv.func === 'teams') {
      await teams();
      console.log('Processing all teams completed successfully');
    } else {
      console.error('Unknown function specified.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
})();




  // const leagueName = 'Serie A';
  // const leagueName = 'La Liga';
  // const leagueName = 'Ligue 1';
  // const leagueName = 'Bundesliga';
  // const leagueName = 'Premier League';

  // createLeagueMain(leagueName)
    // .then(() => console.log('League creation completed successfully'))
    // .catch(error => console.error('Error in league creation:', error));

  // const inernationalLink = "UEFA_European_Championship";
  // const internationalName = "Euros";
  // createInternationalLeagueMain(internationalName)
    // .then(() => console.log('International league creation completed successfully'))
    // .catch(error => console.error('Error in international league creation:', error));

  // processAllPlayers();
  // processAllTeams();