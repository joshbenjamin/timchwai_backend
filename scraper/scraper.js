const cheerio = require('cheerio');
const moment = require('moment');
const url = require('url');
const readline = require('readline');

const models = require('../models');
const {League, LeagueSeason, Team, TeamSeason, Player, PlayerTeamSeason, Career} = require('../models');

const fetchWikiResponse = require('./wikimedia');

const logger = require('../logger');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const db = require('../database');

const ASK_Q = true;

async function createLeague(leagueLink) {
  try {
    const response = await fetchWikiResponse(leagueLink);
    const $ = cheerio.load(response.data);

    const leagueName = $('caption.infobox-title').text();
    const leagueCountry = $('th.infobox-label:contains("Country")').next().find('td').first().text();
    const leagueNumTeams = parseInt($('th.infobox-label:contains("Number of teams")').next().find('a').first().text(), 10);
    const leagueLevel = parseInt($('th.infobox-label:contains("Level on pyramid")').next().find('a').first().text(), 10);
    const leagueImage = $('td.infobox-image img').attr('src');
    const leagueWikiLink = leagueLink;

    const [league, league_created] = await League.findOrCreate({
        where: {
          name: leagueName,
          country: leagueCountry,
          number_of_teams: leagueNumTeams,
          level: leagueLevel,
          image: leagueImage,
          wiki_link: leagueWikiLink
        }
    })

    if (league_created){
      logger.info(`League created: ${leagueName}`);
    }

    if (!league){
      throw new Error(`League not created: ${leagueName}`);
    }

  } catch (error) {
      logger.error(error.message);
  }
}

async function createInternationalLeague(leagueLink) {
  try {
    const response = await fetchWikiResponse(leagueLink);
    const $ = cheerio.load(response.data);

    let leagueName = $('caption.infobox-title').text();
    // const leagueCountry = $('th.infobox-label:contains("Country")').next().find('a').first().text();
    // const leagueNumTeams = parseInt($('th.infobox-label:contains("Number of teams")').next().find('a').first().text(), 10);
    // const leagueLevel = parseInt($('th.infobox-label:contains("Level on pyramid")').next().find('a').first().text(), 10);
    if(leagueName == "UEFA European Championship"){
      leagueName = "Euros";
    }

    const imgElement = $('td.infobox-image img');

    // Extract the src attribute
    const imgSrc = imgElement ? imgElement.attr('src') : "";
    const leagueWikiLink = leagueLink;

    const [league, league_created] = await League.findOrCreate({
        where: {
          name: leagueName,
          // country: leagueCountry,
          // number_of_teams: 24,  // This is just for now
          // number_of_teams: leagueNumTeams,
          // level: leagueLevel,
          // image: imgSrc,
          wiki_link: leagueWikiLink
        }
    })

    let updates = {};
    if(imgSrc)

    if (league_created){
      logger.info(`League created: ${leagueName}`);
    }

    if (!league){
      throw new Error(`League not created: ${leagueName}`);
    }

  } catch (error) {
      logger.error(error);
  }
}

async function createLeagueSeasons(leagueName) {
  try {
    const league = await League.findOne({
        where: {
            name: leagueName,
        },
    });

    if (!league){
        throw new Error(`League with name "${leagueName}" not found.`);
    }

    const response = await fetchWikiResponse(league.wiki_link);
    const $ = cheerio.load(response.data);

    // Default to 20 seasons

    // const table = $('table').filter((_, el) => $(el).attr('class').includes('navbox-inner'));
    // const seasonsRow = table.find("th:contains('Seasons')").parent();
    // const list = seasonsRow.find("ul");

    let seasons = [];

    // if(list.length > 0){
    if(1==0){
      // seasons = Array.from(
      //   list.find("li > span.nowrap > a[href^='/wiki/']"),
      //   (el) => {
      //     const yearRange = $(el).text().split('–');
      //     let from_year = parseInt(yearRange[0], 10); 
      //     return {
      //       from_year: from_year,
      //       to_year: from_year+1,
      //       wiki_link: el.attribs.href.split('/').pop(),
      //       league_id: league.id,
      //     };
      //   }
      // );
    } else {
      console.log('Seasons list not found, creating default seasons');
      var currentYear = new Date().getFullYear()
      let numberOfSeasons = 20;
      for (let i = 0; i < numberOfSeasons; i++) {
        let startYear = currentYear-i-1;
        let endYear = currentYear-i;
        let link = `${startYear}-${String(endYear%100).padStart(2, '0')}_${league.wiki_link}`
        seasons.push({
          from_year: startYear,
          to_year: endYear,
          wiki_link: link,
          league_id: league.id
        })
      }
    }

    logger.info(`${seasons.length} seasons found on Wiki`);

    let createdLeagueSeasons = 0;

    for (const season of seasons) {
      const [league_season, created_ls] = await LeagueSeason.findOrCreate({
        where: season
      });

      if (created_ls) {
        console.log(`League Season ${JSON.stringify(league_season)} created.`);
        createdLeagueSeasons++;
      }
    }

    logger.info(`Seasons created successfully: ${createdLeagueSeasons}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function createInternationalLeagueSeasons(leagueName) {
  try {
    const league = await League.findOne({
        where: {
            name: leagueName,
        },
    });

    if (!league){
        throw new Error(`League with name "${leagueName}" not found.`);
    }

    const response = await fetchWikiResponse(league.wiki_link);
    const $ = cheerio.load(response.data);

    const competitionHeader = $('h2:contains("Format")');
    const table = competitionHeader.parent().nextAll('table.wikitable').first();
    
    const rows = table.find('tbody > tr');

    const seasons = [];

    rows.each((index, row) => {
      const cells = $(row).find('th, td');

      if (cells.length > 0) {
          const yearLink = $(cells[0]).find('a');

          // Check if yearLink exists
          if (yearLink.length > 0) {
              const year = parseInt(yearLink.text().trim(), 10);
              const yearHref = yearLink.attr('href') ? yearLink.attr('href').split('/').pop() : null;

              // const num_teams = $(cells[1]).text().trim();
              // const minMatches = $(cells[2]).text().trim();
              // const actualMatches = $(cells[3]).text().trim();
              // const format = $(cells[4]).text().trim();

              seasons.push({
                  from_year: year,
                  to_year: year,
                  wiki_link: yearHref,
                  league_id: league.id
              });
          }
      }
  });

    logger.info(`${seasons.length} seasons found on Wiki`);
    
    await LeagueSeason.bulkCreate(seasons)
      .then((createdLeagueSeasons) => {
        logger.info(`Seasons created successfully: ${createdLeagueSeasons.length}`);
      })
      .catch(error => {
        logger.error('Error while creating seasons:', error);
      });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function createTeamsAndTeamSeasonsForLeague(leagueName, startYear) {
    let teamsAdded = 0, teamSeasonsAdded = 0

    try {
      // Find the league and leagueSeason
      const league = await League.findOne({
        where: { name: leagueName },
      });
  
      if (!league) {
        throw new Error(`League not found with name: ${leagueName}`);
        return;
      }
      else{
        logger.info(`League Found: ${league.name}`);
      }
  
      const leagueSeason = await LeagueSeason.findOne({
        where: { league_id: league.id, from_year: startYear },
      });
  
      if (!leagueSeason) {
        throw new Error(`LeagueSeason not found for league_id: ${league.id} and from_year: ${startYear}`);
      }
      else{
        logger.info(`League Season found: ${leagueSeason.from_year} to ${leagueSeason.to_year}`);
      }
  
      const response = await fetchWikiResponse(leagueSeason.wiki_link);
      const $ = cheerio.load(response.data);

      $('span.mw-editsection').remove();

      // Get the team data from the Wikipedia page
      const teamsData = [];

      // Find the h2 element that contains "League Table"
      const leagueTableHeader = $('h2:contains("League table")');

      if (leagueTableHeader.length) {
        logger.info('Found the League table header: %s', leagueTableHeader.text().trim());
      } else {
        logger.info('League table header not found');
        throw new Error('League table header not found');
      }

      // Try to find the table more flexibly, looking for a table within the parent element
      const leagueTable = leagueTableHeader.parent().nextAll('table.wikitable').first();

      if (leagueTable.length) {
        logger.info('Found leagueTable element!');
        // Process the table...
      } else {
        logger.info('leagueTable element not found. Attempting to find any table...');
        throw new Error('League table not found');
      }

        
      $('tr:not(:first-child)', leagueTable).each((index, element) => {
        const teamName = $('th a', element).text();
        const teamWiki = $('th a', element).attr('href') ? $('th a', element).attr('href').split('/').pop() : null;
        const tsPos = parseInt($('td:nth-child(1)', element).text().trim(), 10);
        const tsPlayed = parseInt($('td:nth-child(3)', element).text().trim(), 10);
        const tsWins = parseInt($('td:nth-child(4)', element).text().trim(), 10);
        const tsDraws = parseInt($('td:nth-child(5)', element).text().trim(), 10);
        const tsLosses = parseInt($('td:nth-child(6)', element).text().trim(), 10);
        const tsGF = parseInt($('td:nth-child(7)', element).text().trim(), 10);
        const tsGA = parseInt($('td:nth-child(8)', element).text().trim(), 10);
        const tsGD = parseInt($('td:nth-child(9)', element).text().replace(/[^0-9+-]/g, '').trim(), 10);
        const tsPoints = parseInt($('td:nth-child(10)', element).text().trim(), 10);
        teamsData.push({
            name: teamName, wiki_link: teamWiki, pos: tsPos, played: tsPlayed, wins: tsWins,
            draws: tsDraws, losses: tsLosses, gf: tsGF, ga: tsGA, gd: tsGD, points: tsPoints
        });

        logger.info(`TeamSeason info found for ${teamName}`);
        });
  
      // Create teams and teamSeasons
      for (const teamData of teamsData) {
        console.log(`Operating on ${teamData.name}`);
        // Find or create the team
        const [team, created_team] = await Team.findOrCreate({
          where: {
            name: teamData.name,
            wiki_link: teamData.wiki_link
          },
        });

        if (created_team){
            console.log(`Team ${teamData.name} created.`)
            teamsAdded++;
        }
  
        // If the team was created or already exists, create a TeamSeason
        if (team) {
          const wikiLink = `${leagueSeason.from_year}–${leagueSeason.to_year.toString().slice(-2)}_${team.wiki_link}_season`;

          await TeamSeason.findOrCreate({
            where: {
              league_position: teamData.pos,
              played: teamData.played,
              wins: teamData.wins,
              draws: teamData.draws,
              losses: teamData.losses,
              goals_for: teamData.gf,
              goals_against: teamData.ga,
              goal_difference: teamData.gd,
              points: teamData.points,
              wiki_link: wikiLink,
              team_id: team.id,
              league_season_id: leagueSeason.id,
            }
          });
          teamSeasonsAdded++;
        }
      }
  
      logger.info(`Teams (${teamsAdded}) and TeamSeasons (${teamSeasonsAdded}) created successfully`);
    } catch (error) {
      logger.error('Error:', error.message);
    }
  }

  async function createInternationalTeamsAndTeamSeasonsForLeague(leagueName, year) {
    let teamsAdded = 0, teamSeasonsAdded = 0

    try {
      // Find the league and leagueSeason
      const league = await League.findOne({
        where: { name: leagueName },
      });
  
      if (!league) {
        throw new Error(`League not found with name: ${leagueName}`);
        return;
      }
      else{
        logger.info(`League Found: ${league.name}`);
      }
  
      const leagueSeason = await LeagueSeason.findOne({
        where: { league_id: league.id, from_year: year, to_year: year },
      });
  
      if (!leagueSeason) {
        throw new Error(`LeagueSeason not found for league_id: ${league.id} and from_year: ${startYear}`);
      }
      else{
        logger.info(`League Season found: ${leagueSeason.from_year} to ${leagueSeason.to_year}`);
      }
  
      const response = await fetchWikiResponse(leagueSeason.wiki_link);
      const $ = cheerio.load(response.data);      
      
      const qualificationHeader = $('h2:contains("Qualification")');
      const table = qualificationHeader.parent().nextAll('table.wikitable').first();
      
      if (table.length === 0) {
          console.error('No qualification table found');
          return [];
      }
  
      const rows = table.find('tbody > tr');
  
      const teams = [];
  
      rows.each((index, row) => {
        const cells = $(row).find('td');

        if (cells.length > 0) {
            const teamCell = $(cells[0]);
            teamCell.find('sup').remove();  // Remove sup elements
            const teamLink = teamCell.find('a').attr('href');
            const teamName = teamCell.find('a').text().trim();

            teams.push({
                wiki_link: teamLink ? teamLink.split('/').pop() : null,
                name: teamName,
            });
        }
      });

      for (const t of teams) {
        console.log(`Operating on ${t}`);
        // Find or create the team
        const [team, created_team] = await Team.findOrCreate({
          where: {
            name: t.name,
            wiki_link: t.wiki_link
          },
        });

        if (created_team){
            console.log(`Team ${t.name} created.`)
            teamsAdded++;
        }
  
        // If the team was created or already exists, create a TeamSeason
        if (team) {
          await TeamSeason.findOrCreate({
            where: {
              wiki_link: "",
              team_id: team.id,
              league_season_id: leagueSeason.id,
            }
          });
          teamSeasonsAdded++;
        }
      }
  
      logger.info(`Teams (${teamsAdded}) and TeamSeasons (${teamSeasonsAdded}) created successfully`);
    } catch (error) {
      logger.error('Error:', error.message);
    }
  }

async function processTeamSeasons(leagueName, year){  
  try {
    const league = await League.findOne({
      where: {
        name: leagueName
      }
    });

    if (!league){
      throw new Error(`League not found with name: ${leagueName}`);  
    } else {
      logger.info(`League found with name: ${leagueName}`);
    }

    const leagueSeason = await LeagueSeason.findOne({
      where: {
        league_id: league.id,
        from_year: year
      }
    });

    if (!leagueSeason){
      throw new Error(`No League Season found for ${leagueName} in ${year}`);
    } else {
      logger.info(`League Season found for ${leagueName} in ${year}`);
    }

    LeagueSeason.associate(models);
    TeamSeason.associate(models);
    Team.associate(models);

    const teamSeasons = await TeamSeason.findAll({
      where: {
        league_season_id: leagueSeason.id
      },
      include: {
        model: Team
      },
    });

    if (!teamSeasons){
      throw new Error(`No Team Seasons found for ${leagueName} in ${year}`);
    } else {
      logger.info(`Found ${teamSeasons.length} team seasons`);
    }

    let playersAdded = 0;

    teamSeasons.forEach(async (teamSeason) => {
      logger.info(`Fetching team season for: ${teamSeason.Team.name}`);

      let teamPlayers = [];

      const response = await fetchWikiResponse(teamSeason.wiki_link);

      if (response.status === 200) { // OK response
        let $ = cheerio.load(response.data);

        const headings = [
          "First team squad", "Appearances and goals", "First-team squad", "Squad information", 
          "Squad statistics", "Players and staff", "Players", "Squad", "Appearances, goals and cards", 
          "First team", "Premier League squad", "Player statistics", "Appearances and Goals", 
          "Season squad", "Statistics", "Player details", "Current squad"
        ];
        let playersData = [];
        let playerTable;

        for (const heading of headings) {
          let header = $(`h2:contains("${heading}"), h3:contains("${heading}")`);

          logger.info("%s heading found? %s", heading, header);
          if (header.length) {
            playerTable = header.parent().nextAll('table').filter((index, table) => {
              return !$(table).hasClass('ambox');
            }).first();
            break;
          }
        }

        if (!playerTable){
          logger.error(`Can't find player table for: ${teamSeason.Team.name}`);
          throw new Error("No table found");
        }

        if (playerTable.length) {

          const columnHeaderRow = $('tr:first-child', playerTable);
          let nameColumnIndex = -1;

          $('th', columnHeaderRow).each((index, element) => {
            if ($(element).text().trim().toLowerCase() === 'name' || $(element).text().trim().toLowerCase() === 'player') {
              nameColumnIndex = index;
            }
          });
          
          if(nameColumnIndex == -1){
            // Header row could be a header row as well, 
            logger.info(`columnHeaderRow: ${playerTable}`);
          }

          if (nameColumnIndex !== -1) {
            console.log(nameColumnIndex);

            $('tr:not(:first-child)', playerTable).each(async (index, element) => {
              let playerLink = $(`td:nth-child(${nameColumnIndex + 1}) a:not(span.flagicon a), th:nth-child(${nameColumnIndex + 1}) a:not(span.flagicon a)`, element);
        
              // Check if the player link exists
              if (playerLink.length > 0) {
                let playerNameElement = $(`td:nth-child(${nameColumnIndex + 1}), th:nth-child(${nameColumnIndex + 1})`, element).contents().not('span.flagicon').not('sup.reference');
                playerNameElement.find('small').remove(); // Remove 'small' element

                let playerName = playerNameElement.text().trim();
                playerName = playerName.replace(/\s*\([^)]*\)/g, ''); // Remove brackets and their content
                playerName = playerName.replace(/[\u2020\u00A4\u2021]/g, ''); // Remove specific characters: †, ¤, and ‡
                playerName = playerName.replace(/U\d+/g, ''); // Remove 'UX' pattern (where X is a number)
                playerName = playerName.replace(/HG\d*\s*$/, ''); // Remove 'HG' followed by an optional number from the end of the string
                playerName = playerName.replace('[L]', '');
                playerName = playerName.replace('[R]', '');
                playerName = playerName.replace('[S]', '');
                playerName = playerName.replace('*', '');
                playerName = playerName.trim();

                if(playerName == "League Cup"){
                  return;
                }

                let playerHref = playerLink.attr('href');
                let playerWiki;

                if (playerHref && playerHref.includes('redlink=1')) {
                  logger.info(`Redlink detected for ${playerName}`);
                  return;
                } else {
                  playerWiki = playerHref ? playerHref.split('/').pop() : null;
                }
        
                // Check if playerName and playerWiki are not empty
                if (playerName && playerWiki) {
                  playersData.push({ name: playerName, wiki_link: playerWiki });
                } else {
                  logger.error(`PlayerName not present: ${playerName} or PlayerWiki: ${playerWiki}`);
                }
              } else {
                logger.error(`Error: No player link at index: ${index} for ${teamSeason.Team.name}`);
              }
            });

            for (const playerData of playersData) {
              const [player, created_player] = await Player.findOrCreate({
                where: { name: playerData.name, wiki_link: playerData.wiki_link },
              });

              if (created_player){
                  logger.info(`Player: ${player.name} created`)
                  playersAdded++;
              }

              teamPlayers.push(player.name);

              // Here is where we need to get the season stats for the player

              const [link, created_player_team_season] = await PlayerTeamSeason.findOrCreate({
                where: {
                  player_id: player.id,
                  team_season_id: teamSeason.id,
                }
              });

              if (created_player_team_season){
                logger.info(`Successfully made Player and Season link: ${player.name} to ${teamSeason.Team.name}`);
              }
            }
            logger.info(`Players added (${playersAdded}) successfully`);
          } else {
            throw new Error(`Name column not found at: ${teamSeason.wiki_link}`);
          }        
        }
      }

      logger.info(`Players added for: ${teamSeason.Team.name}\n${teamPlayers}`);

    });

  } catch (error) {
    logger.error(error);
  }
}

const processInternationalTournaments = async (leagueName, year) => {
  try {
    const league = await League.findOne({
      where: { name: leagueName }
    });

    if (!league) {
      throw new Error(`League not found with name: ${leagueName}`);
    } else {
      logger.info(`League found with name: ${leagueName}`);
    }

    const leagueSeason = await LeagueSeason.findOne({
      where: { league_id: league.id, from_year: year, to_year: year }
    });

    if (!leagueSeason) {
      throw new Error(`No League Season found for ${leagueName} in ${year}`);
    } else {
      logger.info(`League Season found for ${leagueName} in ${year}`);
    }

    Team.associate(models);
    TeamSeason.associate(models);
    Player.associate(models);
    PlayerTeamSeason.associate(models);

    const response = await fetchWikiResponse(`${leagueSeason.wiki_link}_squads`);
    const $ = cheerio.load(response.data);
    const bulkPlayerTeamSeasons = [];

    const processPlayerRow = async (row, teamSeason) => {
      const playerCell = $(row).find('th[scope="row"] > a');
      if (playerCell.length === 0) return;

      const playerName = playerCell.text().trim();
      let modifiedName = playerName.replace(/[\u2020\u00A4\u2021]/g, '').replace(/U\d+/g, '').replace(/HG\d*\s*$/, '').replace('/', '').replace('[L]', '').replace('[R]', '').replace('[S]', '').replace('*', '').trim();
      const playerLink = playerCell.attr('href');
      if (!playerLink) return;

      const wiki = playerLink.toString().replace('/wiki/', '');
      const [player, created_player] = await Player.findOrCreate({ where: { name: modifiedName, wiki_link: wiki } });

      if (created_player) {
        logger.info(`Player: ${player.name} created`);
      }

      if (player) {
        const [pts, pts_created] = await PlayerTeamSeason.findOrCreate({
          where: {
            player_id: player.id, 
            team_season_id: teamSeason.id
          }
        })
      }
    };

    const processTeam = async (teamElem, leagueSeason) => {
      teamElem.find('mw-editsection').remove();
      const teamName = teamElem.text().replace('[edit]', '').trim();

      if (teamName === 'Age' || teamName === 'Caps') {
        logger.info(`Skipping ${teamName}`);
        return;
      }

      const table = teamElem.nextAll('table.wikitable').first();
      const team = await Team.findOne({ where: { name: teamName } });

      if (!team) {
        logger.error(`No team found with teamName: ${teamName}`);
        return;
      }

      const teamSeason = await TeamSeason.findOne({ where: { team_id: team.id, league_season_id: leagueSeason.id } });

      if (!teamSeason) {
        logger.error(`No team season found with teamName: ${teamName}`);
        return;
      }

      const rows = table.find('tbody > tr').get();
      for (const row of rows) {
        await processPlayerRow(row, teamSeason);
      }
    };

    const processGroups = async () => {
      const groupPromises = $('h2').get().map(async (h2) => {
        if ($(h2).text().includes('Group')) {
          const teamElems = $(h2).nextAll('h3').slice(0, 6).get();
          for (const teamElem of teamElems) {
            await processTeam($(teamElem), leagueSeason);
          }
        }
      });

      await Promise.all(groupPromises);
    };

    await processGroups();

    // if (bulkPlayerTeamSeasons.length > 0) {
    //   await PlayerTeamSeason.bulkCreate(bulkPlayerTeamSeasons);
    //   logger.info(`Player Team Seasons created successfully: ${bulkPlayerTeamSeasons.length}`);
    // } else {
    //   logger.info('No Player Team Seasons to create.');
    // }

    logger.info(`Finished processing ${leagueName} ${year}`);
  } catch (error) {
    logger.error(error);
  }
};


function askQuestion(query) {
  const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
      rl.close();
      resolve(ans);
  }))
}
  
async function processTeamData(){
  const teams = await Team.findAll({
    where: {
      full_name: null,
      wiki_link: {
        [Op.ne]: null
      },
      name: { 
        [Op.notRegexp]: 'U\\d',
      },
      [Op.and]: [
        { wiki_link: { [Op.notLike]: '%Youth%' } },
        { wiki_link: { [Op.notLike]: '%youth%' } },
        { wiki_link: { [Op.notLike]: '%Reserve%' } },
        { wiki_link: { [Op.notLike]: '%reserve%' } },
        { wiki_link: { [Op.notLike]: '%Academy%' } },
        { wiki_link: { [Op.notLike]: '%academy%' } },
      ],
    }
  });
  let length = teams.length;

  if (teams){
    const ans = await askQuestion(`Are you sure you want to scrape ${length} teams? `);
  }


  logger.info(`Found ${teams.length} incomplete teams in DB`);

  for (const teamIdx in teams){
    logger.info(`Processing team ${teamIdx} of ${length}`);
    let team = teams[teamIdx];
    let link = team.wiki_link;

    logger.info(`Processing team data for: ${team.name}`);
    const response = await fetchWikiResponse(link);
    if (response && response.status === 200) { // OK response
      let $ = cheerio.load(response.data);
      let infobox = $('table.infobox.vcard');
      if (infobox.length === 0) {
        infobox = $('table.infobox');
      }
      if (infobox.length === 0){
        // Still
        logger.error(`No data table found for ${team.name}`);
        continue;
      }

      const fullNameElement = infobox.find('th:contains("Full name")');
      let fullName = fullNameElement ? fullNameElement.next().text().trim() : null;
      if (!fullName){
        fullName = $('h1').first().text().trim();
      }

      if (fullName.length > 255){
        fullName = team.name;
      }

      // Need to fix this, goes through all rows
      const nicknamesList = [];
      $('tr').each((index, rowElement) => {
        const labelElement = $(rowElement).find('.infobox-label');
        const labelText = labelElement.text().trim().toLowerCase();
        
        if (labelText === 'nickname(s)') {
          const dataElement = $(rowElement).find('.infobox-data');
          const clonedElement = dataElement.clone();
          clonedElement.find('sup').remove();

          const listElements = clonedElement.find('li');

          if (listElements.length > 0) {
            listElements.each((_, li) => {
              nicknamesList.push($(li).text().trim());
            });
          } else if (clonedElement.html().includes('<br>')) {
            const splitNicknames = clonedElement.html().split('<br>');

            splitNicknames.forEach((nickname) => {
              nicknamesList.push(nickname.trim());
            });
          } else {
            nicknamesList.push(clonedElement.text().trim());
          }
        }
      });
      let nicknames = nicknamesList.join(',');
      while (nicknames.length > 512) {
        nicknamesList.pop();
        nicknames = nicknamesList.join(',');
      }
      
      const stadiumElement = infobox.find('th:contains("Home stadium"), th:contains("Stadium"), th:contains("Ground")');
      const stadium = stadiumElement.next().text().trim();;

      const capacityElement = infobox.find('th:contains("Capacity")');
      const capacityStr = capacityElement ? capacityElement.first().text().trim() : null;
      const capacity = parseInt(capacityStr.replace(/,/g, ''), 10);

      const imageLink = infobox.find('.infobox-image img').attr('src');
      const teamInfo = {
        full_name: fullName,
        nicknames: nicknames,
        stadium: stadium,
        capacity: isNaN(capacity) ? null : capacity,
        image: imageLink
      };

      Team.update(teamInfo, { where: { id: team.id } })
      .then((result) => {
        logger.info(`Team updated successfully: ${team.name}`);
      })
      .catch((error) => {
        logger.error(`Error updating team: ${team.name}\n${error}`);
      });

    } else {
      logger.info(`Response was not OK for: ${team.name}`);
    }
  };
}

function replaceNameCharacters(name) {
  // Called from processPlayers()
  return name
    .normalize('NFD') // Normalize the string using Unicode decomposition
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/Ø/g, 'O') // Replace 'Ø' with 'O'
    .replace(/ø/g, 'o') // Replace 'ø' with 'o'
    .replace(/Å/g, 'A') // Replace 'Å' with 'A'
    .replace(/å/g, 'a') // Replace 'å' with 'a'
    .replace(/Ä/g, 'A') // Replace 'Ä' with 'A'
    .replace(/ä/g, 'a') // Replace 'ä' with 'a'
    .replace(/Ö/g, 'O') // Replace 'Ö' with 'O'
    .replace(/ö/g, 'o') // Replace 'ö' with 'o'
    .replace(/Ü/g, 'U') // Replace 'Ü' with 'U'
    .replace(/ü/g, 'u') // Replace 'ü' with 'u'
    .replace(/Ð/g, 'D') // Replace 'Ð' with 'D'
    .replace(/ð/g, 'd') // Replace 'ð' with 'd'
    .replace(/Þ/g, 'Th') // Replace 'Þ' with 'Th'
    .replace(/þ/g, 'th'); // Replace 'þ' with 'th'
}


async function processPlayers(){
  const players = await Player.findAll({
    where: {
      name_basic: null
      // name_basic: "Samuel Umtiti"
    }
  });
  let length = players.length;

  if (players){
    const ans = await askQuestion(`Are you sure you want to scrape ${length} players? `);
  }

  for (const player in players) {
    await processPlayer(players[player]);
    logger.info(`Processing player ${player} of ${length}`);
  }

}

async function processEuro2024Players(){
  logger.info("ProcessEuro2024Players");
  Player.associate(models);
  PlayerTeamSeason.associate(models);
  TeamSeason.associate(models);
  LeagueSeason.associate(models);
  League.associate(models);

  const league = await League.findOne({
    where: { name: "Euros" },
  });

  if (!league) {
    throw new Error(`League not found with name: ${leagueName}`);
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

  logger.info(`League Season id is ${leagueSeason.id}`);
  const leagueSeasonId = leagueSeason.id;

  const query = `
    SELECT players.*
    FROM players
    JOIN player_team_seasons ps ON players.id = ps.player_id
    JOIN team_seasons ts ON ps.team_season_id = ts.id
    JOIN league_seasons ls ON ts.league_season_id = ls.id
    JOIN leagues lg ON ls.league_id = lg.id
    WHERE ls.id = :leagueSeasonId;
  `;

  const [players, metadata] = await db.query(query, {
    replacements: { leagueSeasonId },
  });

  console.info(`Metadata: ${metadata}`);

  let length = players.length;

  if (players){
    if(ASK_Q){
      const ans = await askQuestion(`Are you sure you want to scrape ${length} players? `);
    } else {
      logger.info(`Scraping ${length} players`);
    }
  }

  for (const player in players) {
    await processPlayer(players[player]);
    logger.info(`Processing player ${player} of ${length}`);
  }

}

async function processPlayer(player){
  if (player){
    logger.info(`Found ${player.name}`);
  } else {
    return;
  }

  if (player.name_basic != null){
    logger.info(`Name to name_basic already processed`);
  }

  if (!player.wiki_link){
    logger.info(`No wiki_link for: ${player.name}`);
    return;
  }

  logger.info(`Link: ${player.wiki_link}`);

  const response = await fetchWikiResponse(player.wiki_link);

  if (response.status === 200){
    const $ = cheerio.load(response.data);
    const infobox = $('table.infobox.vcard:not([class*=" "])');

    if (!infobox){
      logger.info(`No infobox found for: ${player.name}`);
      return;
    }

    const positionsElement = infobox.find('.infobox-label:contains("Position")')
      .add('.infobox-label:contains("Positions")')
      .add('.infobox-label:contains("Position(s)")')
      .next('.infobox-data');

    positionsElement.find('.reference').remove();

    const positions = positionsElement.find('a').map((_, el) => $(el).text()).get();
    logger.info(`Positions found for ${player.name} --- ${positions}`);

    // const height = infobox.find('.infobox-data:contains("ft")').text().trim();
    const nameBasic = replaceNameCharacters(player.name);
    const imageElement = $('.infobox-image img');
    const imageSource = imageElement.attr('src');

    const dateOfBirthElem = $('span.bday');
    let dateOfBirth = null;
    if (dateOfBirthElem.length == 0){
      logger.info(`Player ${nameBasic} does not have a bday elem`);;
    } else {
      const dateOfBirthText = dateOfBirthElem.text();
      logger.info(`DOB Text: ${dateOfBirthText}`);
      dateOfBirth = moment.utc(dateOfBirthText, 'YYYY-MM-DD').toISOString().split('T')[0];
      logger.info(`BDay for ${player.name} - ${dateOfBirth}`);
    }


    const fullNameElement = $('th:contains("Full name")').siblings('td');
    const heightElement = $('th:contains("Height")').siblings('td');
    const birthPlaceElement = $('th:contains("Place of birth")').siblings('td');

    // Remove any <sup> elements
    fullNameElement.find('sup').remove();
    heightElement.find('sup').remove();
    birthPlaceElement.find('sup').remove();

    // Get the text content
    const fullName = fullNameElement.text().trim();
    const birthPlace = birthPlaceElement.text().trim();

    // Get the height value
    const heightText = heightElement.text().trim();

    // Extract height in feet and inches
    const feetInchesRegex = /(\d+)\s*ft\s*(\d*)\s*in/;
    const metersRegex = /([\d.]+)\s*m/;

    
    let heightInMeters = null;
    if (feetInchesRegex.test(heightText)) {
      const [, feet, inches] = heightText.match(feetInchesRegex);
      const totalInches = parseInt(feet) * 12 + parseInt(inches);
      heightInMeters = totalInches * 0.0254;
    } else if (metersRegex.test(heightText)) {
      const [, meters] = heightText.match(metersRegex);
      heightInMeters = parseFloat(meters);
    }

    heightInMeters = heightInMeters !== null ? parseFloat(heightInMeters.toFixed(2)) : null;

    const playerInfo = {
      name_basic: nameBasic,
      full_name: fullName,
      positions: positions,
      image: imageSource ? imageSource : null,
      birth_date: dateOfBirth,
      height: heightInMeters,
      birth_place: birthPlace,
    }

    Player.update(playerInfo, {
      where: {
        id: player.id
      }
    }).then((result) => {
      logger.info(`Player updated: ${player.name}`);
    }).catch((error) => {
      logger.error(`Player not updated: ${player.name}\n${error}`);
    });

    const tableRows = $('table.infobox tbody tr:not(:has(table.infobox-subbox))');
    let currentType = '';
    let careersFound = false;
    let careersCreated = 0;

    const numRows = tableRows.length;
    logger.info(`Number of rows in table: ${numRows}`);
    for (let i = 0; i < numRows; i++){
      const row = $(tableRows[i]);
      let header = row.find('.infobox-header').text().trim().toUpperCase();

      if (header.includes('CAREER')) {
        careersFound = true;
      }

      if (careersFound){
        if (header.includes('YOUTH')) {
          currentType = 'YOUTH';
        } else if (header.includes('COLLEGE')) {
          currentType = 'COLLEGE'; 
        }else if (header.includes('SENIOR')) {
          currentType = 'SENIOR';
        } else if (header.includes('INTERNATIONAL')) {
          currentType = 'INTERNATIONAL';
        } else if (header.includes('MANAGER')) {
          currentType = 'MANAGER';
        } else if (row.find('.infobox-label').length > 0) {

          const cssNames = ['.infobox-data-b', '.infobox-data-c'];
          let appearances = null;
          let goalsScored = null;

          let teamElement = row.find('td.infobox-data, td.infobox-data-a').first();
          // let teamElement = null;
          if (row.find(cssNames[0]) && row.find(cssNames[1])){
            appearances = row.find(cssNames[0]) ? parseInt(row.find(cssNames[0]).text().trim(), 10) : null;
            goalsScored = row.find(cssNames[1]) ? parseInt(row.find(cssNames[1]).text().replace('(', '').replace(')', '').trim(), 10 ): null;
            
            // let teamElement = row.find('td.infobox-data, td.infobox-data-a');
          } else {
            // let teamElement = row.find('td.infobox-data, td.infobox-data-a');
          }

          if (!teamElement){
            logger.error(`No teamElement found at ${index} for ${player.name}`);
            continue;
          }
          const years = row.find('.infobox-label').text().trim();
          let fromYear = null;
          let toYear = null;
          if (years && years.length != 0){
            if(years.toLowerCase().includes('year') || years.toLowerCase().includes('total')){
              continue;
            }
            const yearParts = years.replace('–', '-').split('-');
            try {
              fromYear = parseInt(yearParts[0], 10);
              if (isNaN(fromYear)){
                logger.error(`Not creating career with incomplete year information for ${player.wiki_link}`);
                continue;
              }
            } catch (error) {
              logger.error(`Trying to parse fromYear for ${player.name} - ${years}`);
              continue;
            }
            if (yearParts.length > 1){
              if (yearParts[1] === ''){
                toYear = null;
              } else {
                toYear = parseInt(yearParts[1], 10)
              }

              if (yearParts[0] === ''){
                fromYear = toYear;
              }
            } else {
              toYear = fromYear;
            }
          } else {
            logger.error(`No years for ${player.name} at ${teamElement.find('sup.reference').remove().text().trim()}, not creating Career`);
            continue;
          }

          // This happens at times, do this instead of calling seperate correct Careers funct
          if(fromYear == 0){
            fromYear = toYear;
          }
          
          teamElement.find('sup.reference').remove();
          let teamAnchor = teamElement.find('a');

          const teamExtracted = teamElement.find('a');
          logger.info(`Team Extracted element: ${teamExtracted}`);

          let teamName = teamAnchor.length ? teamAnchor.text() : teamElement.text();
          let onLoan = false;
          if (teamElement.text().toLowerCase().includes('loan')) {
            onLoan = true;
          }
          teamName = teamName.replace(/(→|loan|\(|\))/g, '').trim();
          const teamUrlFull = teamElement.find('a').attr('href');
          const teamUrl = teamUrlFull ? teamUrlFull.split('/').pop() : null;

          logger.info(`Team Name: ${teamName}`);
          logger.info(`Team URL: ${teamUrl}`);
          logger.info(`fromYear: ${fromYear}`);
          logger.info(`toYear: ${toYear}`);
          logger.info(`Apps: ${appearances}`);
          logger.info(`Goals: ${goalsScored}`);
          logger.info(`Type: ${currentType}`);
          logger.info('\n----------------\n');

          // First find team with name, then create new team if this is a new URL
          const teamWithName = await Team.findOne({
            where: {
              name: teamName,
            }
          })

          let team;
          if (!teamWithName){
            [team, teamCreated] = await Team.findOrCreate({
              where: {
                name: teamName,
                wiki_link: teamUrl,
              }
            });

            if (teamCreated){
              logger.info(`Team created: ${team.name} with ${teamUrl}`);
            } else {
              if (team){
                logger.info(`Team found successfully: ${team.name}`);
              } else {
                logger.error(`'No team found or created for that Name and URL`);
              }
            }
          } else {
            team = teamWithName;
          }

          let whereObj = {
            from_year: fromYear,
            type: currentType,
            player_id: player.id,
            team_id: team.id,
            loan: onLoan,
          };

          const [career, careerCreated] = await Career.findOrCreate({
            where: whereObj
          });

          if (careerCreated){
            logger.info(`Career created for ${player.name} at ${team.name} - ${fromYear} to ${toYear}`);
            careersCreated++;
          } else {
            if (career){
              logger.info(`Career has already been created for ${player.name} at ${team.name} - ${fromYear} to ${toYear}`);
            } else {
              logger.error(`Error creating Career for ${player.name} at ${team.name} - ${fromYear} to ${toYear}`);
            }
          }
          
          let updateObj = {
            to_year: toYear ? toYear : null,
            apps: appearances ? appearances : 0,
            goals: goalsScored ? goalsScored : 0,
          }

          const [updatedRowsCount, [updatedCareer]] = await Career.update(updateObj, {
            where: whereObj,
            returning: true, // This returns the updated instance
          });
          
          if (updatedRowsCount > 0) {
            logger.info(`Career updated for ${player.name} at ${team.name} - ${fromYear} to ${toYear}`);
          } else {
            logger.error(`Failed to update Career for ${player.name} at ${team.name} - ${fromYear} to ${toYear}`);
          }

        }
      }
    };
  } else {
    throw new Error(`Response didn't make it`);
  }


}

async function correctPlayerNameWikiDuplicates(){
  try {
    const duplicateNames = await Player.findAll({
      attributes: ['name_basic'],
      group: 'name_basic',
      having: Sequelize.literal('COUNT(*) > 1'),
      raw: true,
    });

    // Extract the name_basic values from the result
    const duplicateNameValues = duplicateNames.map((item) => item.name_basic);
    // const duplicateNameIds = duplicateNames.map((item) => item.id);
    // logger.info(`duplicateNameIds: ${duplicateNameIds}`);

    // Fetch all players with the name_basic values that appear more than once
    const players = await Player.findAll({
      where: {
        name_basic: {
          [Op.in]: duplicateNameValues,
        },
      },
      attributes: ['id', 'name', 'name_basic', 'birth_date', 'wiki_link']
    });

    const ids = players.map((item) => item.id);
    logger.info(`PlayerIDS: ${ids}`);

    const length = players.length;

    logger.info(`Correcting possible duplicate links for ${length} players`);
    const ans = await askQuestion(`Are you sure you want to correct ${length} players? `);

    for (const playerIdx in players){
      let player = players[playerIdx];
      logger.info(`Checking for redirect for ${player.name}`);
      
      if (!player){
        logger.info(`Player already deleted`);
        continue;
      }

      // <span class="mw-redirectedfrom">(Redirected from 
      //   <a href="/w/index.php?title=Matt_Doherty_(footballer_born_1992)&amp;redirect=no" class="mw-redirect" 
      //   title="Matt Doherty (footballer born 1992)">
      //     Matt Doherty (footballer born 1992)
      //   </a>)
      // </span>

      if (!player.wiki_link){
        logger.info(`No Wiki Link for: ${player.name}`);
        continue;
      }

      const response = await fetchWikiResponse(player.wiki_link);

      if (response.status === 200){
        const $ = cheerio.load(response.data);
        const redirectElem = $('span.mw-redirectedfrom');
        if (redirectElem.length){
          // Has a redirect, remove the other player
          logger.info(`Found redirect element`);

          logger.info(`RD Name: ${player.name}`);
          logger.info(`RD DOB: ${player.birth_date}`);

          const redirectedPlayer = await Player.findOne({
            where: {
              name: player.name,
              name_basic: player.name_basic,
              birth_date: player.birth_date,
              id: {
                [Op.ne]: player.id
              }
            }
          });

          if (redirectedPlayer){
            logger.info(`There is a redirected player`);
            await PlayerTeamSeason.update({player_id: redirectedPlayer.id}, {
              where: {
                player_id: player.id
              }
            }).then((result) => {
              logger.info(`Updated PlayerTeamSeasons for ${player.name}`);
            }).catch((error) => {
              logger.info(`Error changing PlayerTeamSeasons for ${player.name}\n${error}`);
            });

            await Career.destroy({
              where: {
                player_id: player.id
              }
            });

            await player.destroy();

          } else {
            logger.info(`There is no redirected player, skipping`);
            continue;
          }
        } else {
          continue;
        }
      }
    }

  } catch (error) {
    logger.error(error);
  }
}

async function syncAltTeamImageToParentImage(){
  const teams = await Team.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.regexp]: 'U[0-9]+$' } },
        { name: { [Op.regexp]: 'B$' } },
        { name: { [Op.regexp]: 'C$' } },
      ],
    },
  });

  if (teams){
    let length = teams.length;
    const ans = await askQuestion(`Do you want to correct ${length} team images?`);

    for (const teamIdx in teams){
      let team = teams[teamIdx];
      const newName = team.name.replace(/(U[0-9]+|B)$/, '').trim();

      const parentTeam = await Team.findOne({
        where: {
          name: newName
        }
      });

      if (parentTeam){
        logger.info(`Parent team found: ${parentTeam.name} for ${team.name}`);
        Team.update({image: parentTeam.image}, {
          where: {
            id: team.id
          }
        }).then((result) => {
          logger.info(`Updated team image for ${team.name}`);
        }).catch((error) => {
          logger.error(`Error updating team image for ${team.name}:\n${error}`);
        })
      } else {
        logger.info(`No parent team found for ${newName}, skipping`);
        continue;
      }
    }
  }
  
}

async function setNullTeamImages(){
  const teams = await Team.findAll({
    where: {
      image: null,
      wiki_link: {
        [Op.ne]: null
      }
    }
  });
  let length = teams.length;

  if (teams){
    const ans = await askQuestion(`Are you sure you want to scrape ${length} teams? `);
  }


  logger.info(`Found ${teams.length} incomplete teams in DB`);

  for (const teamIdx in teams){
    logger.info(`Processing team ${teamIdx} of ${length}`);
    let team = teams[teamIdx];
    let link = team.wiki_link;

    logger.info(`Processing team data for: ${team.name}`);
    const response = await fetchWikiResponse(link);
    if (response && response.status === 200) { // OK response
      let $ = cheerio.load(response.data);
      let infobox = $('table.infobox.vcard');
      if (infobox.length === 0) {
        infobox = $('table.infobox');
      }
      if (infobox.length === 0){
        // Still
        logger.error(`No data table found for ${team.name}`);
        continue;
      }

      const imageLink = infobox.find('.infobox-image img').attr('src');
      logger.info(`imageLink found for ${team.name}: ${imageLink}`);
      const teamInfo = {
        image: imageLink
      };

      Team.update(teamInfo, { where: { id: team.id } })
      .then((result) => {
        logger.info(`Team updated successfully: ${team.name}`);
      })
      .catch((error) => {
        logger.error(`Error updating team: ${team.name}\n${error}`);
      });

    } else {
      logger.info(`Response was not OK for: ${team.name}`);
    }
  };
}

async function deleteDuplicatePlayers(){
  // Deletes these players

  // const ids = [1762, 1728, 1704, 1690, 1748, 1776, 1807, 1737, 1792, 1820];
  // const ids = [1151, 1254, 1342];
  // const ids = [2207, 1822, 1692];
  // const ids = [417];
  // const ids = [1297, 795, 1442, 1544];
  // const ids = [27,37,42,78,181,1296,79,355,390,526,544,610,732,30,32,38,1854,1060,41,1273,1160,1395,842,182,1274,227,230,251,2136,944,946,1059,1608,356,391,470,524,533,611,627,1658,2009,843,718,2008,734];
  // const ids = [129,1381,442,1388,2,1392,194,1771,1281,339,1566,464,1488,1080];
  // const ids = [64,2136,1234,2978,2932,3018];
  // const ids = [2190,1707,2757,3203,2978,2014,3729,3597,3601,3485];
  const ids = [];

  logger.info(`Deleting players with these ids: ${ids}`);

  const players = await Player.findAll({
    where: {
      id: {
        [Op.in]: ids
      }
    }
    // where: {
    //   name_basic: {
    //     [Op.like]: '%Fabian Sc%'
    //   }
    // }
  });

  if (players){
    for (const player of players){
      const newName = player.name;
      logger.info(`newName is: ${newName}`);
      const realPlayer = await Player.findOne({
        where: {
          name_basic: player.name_basic,
          // name: player.name,
          // name: newName,
          id: {
            [Op.ne]: player.id
          }
        }
      });

      if (!realPlayer){
        logger.error(`No realPlayer for ${player.name}`);
        // let updateData = {
        //   name: newName,
        // }
        // if(player.name_basic != null){
        //   updateData.push({ name_basic: player.name_basic })
        // }
        // Player.update(updateData, {
        //   where: {
        //     id: player.id
        //   }
        // }).then((result) => {
        //   logger.info(`Name updated for ${player.name}`);
        // }).catch((error) => {
        //   logger.error(`Error for ${player.name}:\n${error}`)
        // });
        continue;
      }

      await PlayerTeamSeason.update({player_id: realPlayer.id}, {
        where: {
          player_id: player.id
        }
      }).then((result) => {
        logger.info(`Updated PlayerTeamSeasons for ${player.name}`);
      }).catch((error) => {
        logger.info(`Error changing PlayerTeamSeasons for ${player.name}\n${error}`);
      });

      await Career.destroy({
        where: {
          player_id: player.id
        }
      });

      await player.destroy();
    }
  }
}

module.exports = {
  createLeague, 
  createInternationalLeague, 
  createLeagueSeasons, 
  createInternationalLeagueSeasons, 
  createTeamsAndTeamSeasonsForLeague, 
  createInternationalTeamsAndTeamSeasonsForLeague, 
  processTeamSeasons, 
  processInternationalTournaments,
  processTeamData, 
  processPlayers, 
  processEuro2024Players,
  processPlayer, 
  correctPlayerNameWikiDuplicates, 
  syncAltTeamImageToParentImage, 
  deleteDuplicatePlayers,
  setNullTeamImages
};