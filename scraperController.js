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

// Create a league
async function createLeagueMain(link, name){
    await createLeague(link);
    await createLeagueSeasons(name);

    const currentYear = new Date().getFullYear();
    const numberOfYears = 1;

    const seasons = Array.from({ length: numberOfYears }, (v, i) => (currentYear-1) - i);
    
    for (const season of seasons){
        await createTeamsAndTeamSeasonsForLeague(name, season);
        await processTeamSeasons(name, season);
    }
  }

  async function createInternationalLeagueMain(link, name){
    await createInternationalLeague(link);
    await createInternationalLeagueSeasons(name);

    const currentYear = new Date().getFullYear();
    const numberOfTournaments = 1;
    const tournamentYearGap = 4;

    const tournaments = Array.from({ length: numberOfTournaments }, (v, i) => currentYear - (tournamentYearGap * i));
    
    for (const tourney of tournaments){
        await createInternationalTeamsAndTeamSeasonsForLeague(name, tourney);
        await processInternationalTournaments(name, tourney);
    }
  }

  async function processAllPlayers(){
    // await processEuro2024Players();
    await processPlayers();
    await correctPlayerNameWikiDuplicates();
    // await deleteDuplicatePlayers();
  }

  async function processAllTeams(){
    // await processTeamData();
    // await syncAltTeamImageToParentImage();
    // await setNullTeamImages();
  }

  // const leagueLink = 'Serie_A';
  // const leagueLink = 'La_Liga';
  // const leagueLink = 'Ligue_1';
  // const leagueLink = 'Bundesliga';
  const leagueLink = 'Premier_League';
  // const leagueName = 'Serie A';
  // Had to change this name from LaLiga EA Sports
  // const leagueName = 'La Liga';
  // const leagueName = 'Ligue 1';
  // const leagueName = 'Bundesliga';
  const leagueName = 'Premier League';
  // createLeagueMain(leagueLink, leagueName);

  // const inernationalLink = "UEFA_European_Championship";
  // const internationalName = "Euros";
  // createInternationalLeagueMain(inernationalLink, internationalName);

  processAllPlayers();
  // processAllTeams();