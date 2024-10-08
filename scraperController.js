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
    addBaseWikiPlayer,
} = require("./scraper/scraper");

  async function league(name) {
    const link = name.replace(' ', '_');
    await createLeague(link);
    await createLeagueSeasons(name);

    const count = argv.count;
    const currentYear = new Date().getFullYear();
    const numberOfYears = 1;

    // Create an array of the last 20 years
    const seasons = Array.from({ length: numberOfYears }, (v, i) => (currentYear-(count*numberOfYears)-1) - i);

    // Process each season in parallel
    await Promise.all(seasons.map(async (season) => {
        await createTeamsAndTeamSeasonsForLeague(name, season);
        await processTeamSeasons(name, season);
    }));
  }

  async function internationalLeague(name) {
    const link = name.replace(' ', '_');
    await createInternationalLeague(link);
    await createInternationalLeagueSeasons(name);

    const currentYear = 2024;  // By default, just start at 2024
    // const numberOfTournaments = 4;  // You can increase this number to handle more tournaments
    const count = argv.count;
    const tournamentYearGap = 4;
    const tourney = currentYear - (tournamentYearGap * count);

    await createInternationalTeamsAndTeamSeasonsForLeague(name, tourney);
    await processInternationalTournaments(name, tourney);
}


  async function players(){
    // await processEuro2024Players();
    await processPlayers();
    // await correctPlayerNameWikiDuplicates();
    // await deleteDuplicatePlayers();
  }

  async function teams(){
    await processTeamData();
    // await syncAltTeamImageToParentImage();
    // await setNullTeamImages();
  }

  async function addPlayer() {
    const link = argv.playerLink;
    console.info(`Adding player at link: ${link}`);
    addBaseWikiPlayer(link);
  }



const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Command-line arguments parsing
const argv = yargs(hideBin(process.argv))
  .option('func', {
    alias: 'f',
    description: 'Specify which function to execute',
    choices: ['league', 'internationalLeague', 'players', 'teams', 'addPlayer'],
    demandOption: true,
  })
  .option('leagueName', {
    alias: 'lN',
    description: 'Specify the league name (for league functions)',
    type: 'string',
  })
  .option('internationalName', {
    alias: 'iN',
    description: 'Specify the international name (for international functions)',
    type: 'string',
  })
  .option('playerLink', {
    alias: 'pL',
    description: 'Specify the player\'s wikipedia link)',
    type: 'string',
  })
  .option('count', {
    alias: 'c',
    description: 'Specify the count for season calculation',
    type: 'number',
    demandOption: false
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
      if (!argv.internationalName) {
        console.error('internationalName must be specified for createInternationalLeagueMain.');
        process.exit(1);
      }
      await internationalLeague(argv.internationalName);
      console.log('International league creation completed successfully');
    } else if (argv.func === 'players') {
      await players();
      console.log('Processing all players completed successfully');
    } else if (argv.func === 'teams') {
      await teams();
      console.log('Processing all teams completed successfully');
    } else if (argv.func == 'addPlayer') {
      if(!argv.playerLink){
        console.error('playerLink must be specified for player');
        process.exit(1);
      }
      await addPlayer();
      console.log('Player added successfully');
    }
    else {
      console.error('Unknown function specified.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
})();

  // createLeagueMain(leagueName)
    // .then(() => console.log('League creation completed successfully'))
    // .catch(error => console.error('Error in league creation:', error));

  // const inernationalLink = "UEFA_European_Championship";
  // createInternationalLeagueMain(internationalName)
    // .then(() => console.log('International league creation completed successfully'))
    // .catch(error => console.error('Error in international league creation:', error));

  // processAllPlayers();
  // processAllTeams();