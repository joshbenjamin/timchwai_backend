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
    refreshPlayers,
    mergeDuplicatePlayers,
    currentSeasonStartYear,
    latestProcessedSeason,
    processEuro2024Players,
    correctPlayerNameWikiDuplicates, 
    processInternationalTournaments,
    syncAltTeamImageToParentImage,
    deleteDuplicatePlayers, 
    setNullTeamImages,
    addBaseWikiPlayer,
} = require("./scraper/scraper");

  // Which seasons to load, as start years (2025 = 2025/26):
  //   --count N            legacy: the single season (currentYear - N - 1)
  //   --season Y           just that season
  //   --from Y [--to Z]    a range (default --to = the current season)
  //   (none)               catch-up: from the newest season already loaded through the current one
  async function seasonsToLoad(name) {
    const current = currentSeasonStartYear();
    if (argv.count !== undefined) {
      return [new Date().getFullYear() - argv.count - 1];
    }
    if (argv.season !== undefined) {
      return [argv.season];
    }
    if (argv.from !== undefined || argv.to !== undefined) {
      const to = argv.to !== undefined ? argv.to : current;
      const from = argv.from !== undefined ? argv.from : to;
      if (from > to) throw new Error(`--from (${from}) must not be after --to (${to})`);
      return Array.from({ length: to - from + 1 }, (_, i) => from + i);
    }
    const last = await latestProcessedSeason(name);
    const from = last === null ? current : last;  // re-run the newest loaded season too: squads change
    return Array.from({ length: current - from + 1 }, (_, i) => from + i);
  }

  async function league(name) {
    const link = name.replace(' ', '_');
    await createLeague(link);
    await createLeagueSeasons(name);

    const seasons = await seasonsToLoad(name);
    logger.info(`League "${name}": loading seasons ${seasons.join(', ')}`);

    // One season at a time, to be gentle on Wikipedia
    for (const season of seasons) {
        logger.info(`League "${name}": season ${season}/${season + 1}`);
        await createTeamsAndTeamSeasonsForLeague(name, season);
        await processTeamSeasons(name, season);
    }
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
    await addBaseWikiPlayer(link);
  }



const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Command-line arguments parsing
const argv = yargs(hideBin(process.argv))
  .option('func', {
    alias: 'f',
    description: 'Specify which function to execute',
    choices: ['league', 'internationalLeague', 'players', 'teams', 'addPlayer', 'refreshPlayers', 'mergeDuplicates'],
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
  .option('limit', {
    description: 'refreshPlayers: how many players to refresh (least recently updated first)',
    type: 'number',
    default: 50,
  })
  .option('name', {
    description: 'refreshPlayers: only players whose name contains this text',
    type: 'string',
  })
  .option('season', {
    description: 'league: load only this season, given as its start year (2025 = 2025/26)',
    type: 'number',
  })
  .option('from', {
    description: 'league: first season (start year) of a range; --to defaults to the current season',
    type: 'number',
  })
  .option('to', {
    description: 'league: last season (start year) of a range',
    type: 'number',
  })
  .option('apply', {
    description: 'mergeDuplicates: actually merge (default is a dry run that only reports)',
    type: 'boolean',
    default: false,
  })
  .option('loose', {
    description: 'mergeDuplicates: also merge players with the same name + birth date but a different Wikipedia page (renamed pages)',
    type: 'boolean',
    default: false,
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
    } else if (argv.func === 'refreshPlayers') {
      await refreshPlayers({ limit: argv.limit, name: argv.name });
      console.log('Refreshing players completed');
    } else if (argv.func === 'mergeDuplicates') {
      await mergeDuplicatePlayers({ apply: argv.apply, loose: argv.loose });
      console.log('mergeDuplicates finished');
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