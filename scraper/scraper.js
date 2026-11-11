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

// The season that is current right now, as its start year. Seasons start around July/August,
// so from July onwards the current season began this calendar year, otherwise last year.
function currentSeasonStartYear(now = new Date()) {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

// Newest season (start year) of a league that already has teams loaded, or null.
// Wikipedia links reach us either percent-encoded ("Cesc_F%C3%A0bregas", "John_O%27Shea") or plain
// ("Cesc_Fàbregas", "John_O'Shea") depending on how the page was rendered at the time. Compare them decoded.
function normalizeWikiLink(link) {
  if (!link) return '';
  let l = String(link);
  try { l = decodeURIComponent(l); } catch (e) { /* keep as is */ }
  return l.replace(/ /g, '_');
}

// findOrCreate for a player that treats differently-encoded links as the same player.
async function findOrCreatePlayer(name, wiki_link) {
  const decoded = normalizeWikiLink(wiki_link);
  const variants = [...new Set([
    wiki_link, decoded,
    encodeURIComponent(decoded),
    encodeURIComponent(decoded).replace(/'/g, '%27'),
    encodeURI(decoded),
  ])];
  const candidates = await Player.findAll({
    where: { [Op.or]: [{ name }, { wiki_link: { [Op.in]: variants } }] },
    order: [['id', 'ASC']],
  });
  const existing = candidates.find(p => p.wiki_link && normalizeWikiLink(p.wiki_link) === decoded);
  if (existing) return [existing, false];
  return Player.findOrCreate({ where: { name, wiki_link } });
}

async function latestProcessedSeason(leagueName) {
  const [row] = await db.query(
    `SELECT MAX(ls.from_year) AS y
     FROM league_seasons ls
     JOIN leagues l ON l.id = ls.league_id
     JOIN team_seasons ts ON ts.league_season_id = ls.id
     WHERE l.name = :name`,
    { replacements: { name: leagueName }, type: QueryTypes.SELECT }
  );
  return row && row.y !== null ? Number(row.y) : null;
}

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
    // if(leagueName == "UEFA European Championship"){
    //   leagueName = "Euros";
    // }

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
    const league = await League.findOne({ order: [['id', 'ASC']],
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
      let numberOfSeasons = 20;
      const latestStart = currentSeasonStartYear();
      for (let i = 0; i < numberOfSeasons; i++) {
        let startYear = latestStart-i;
        let endYear = startYear+1;
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
    const league = await League.findOne({ order: [['id', 'ASC']],
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
      const league = await League.findOne({ order: [['id', 'ASC']],
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
      const league = await League.findOne({ order: [['id', 'ASC']],
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

// ---- Squad extraction from a club's season page on Wikipedia ----
// Pages differ: the squad table may be a direct sibling of the heading or wrapped in a <section>,
// and some clubs lay the squad out as two tables side by side inside one outer table.
const SQUAD_HEADINGS = [
  "First team squad", "Appearances and goals", "First-team squad", "Squad information",
  "Squad statistics", "Players and staff", "Players", "Squad", "Appearances, goals and cards",
  "First team", "Premier League squad", "Player statistics", "Appearances and Goals",
  "Season squad", "Statistics", "Player details", "Current squad"
];

function cleanPlayerName(raw) {
  return raw
    .replace(/\s*\([^)]*\)/g, '')            // remove brackets and their content
    .replace(/[†¤‡]/g, '')    // remove †, ¤, ‡
    .replace(/U\d+/g, '')                    // remove 'UX' pattern
    .replace(/HG\d*\s*$/, '')                // remove trailing 'HG' + optional number
    .replace('[L]', '').replace('[R]', '').replace('[S]', '').replace('*', '')
    .trim();
}

function playersFromSimpleTable($, table) {
  const rows = $('tr', table).get();
  const headerIdx = rows.findIndex(tr => $(tr).children('th').length >= 2);
  if (headerIdx === -1) return [];
  const nameCols = [];
  $(rows[headerIdx]).children('th').each((i, th) => {
    const t = $(th).text().trim().toLowerCase();
    if (t === 'name' || t === 'player') nameCols.push(i);
  });
  if (!nameCols.length) return [];

  const found = [];
  for (const row of rows.slice(headerIdx + 1)) {
    for (const col of nameCols) {
      const cell = $(row).children().eq(col);
      const link = $('a:not(span.flagicon a)', cell);
      if (!link.length) continue;

      const nameEl = cell.contents().not('span.flagicon').not('sup.reference');
      nameEl.find('small').remove();
      let name = cleanPlayerName(nameEl.text().trim());
      if (name === 'League Cup') continue;

      const href = link.attr('href');
      if (!href || href.includes('redlink=1')) continue;
      const wiki_link = href.split('/').pop();
      if (name && wiki_link) found.push({ name, wiki_link });
    }
  }
  return found;
}

function playersFromTable($, table) {
  const nested = $('table', table);
  const tables = nested.length ? nested.get() : [table.get(0)];
  return tables.flatMap(t => playersFromSimpleTable($, $(t)));
}

function extractSquadPlayers($) {
  for (const heading of SQUAD_HEADINGS) {
    const headings = $(`h2:contains("${heading}"), h3:contains("${heading}")`).get();
    for (const h of headings) {
      const level = h.tagName.toLowerCase() === 'h2' ? 2 : 3;
      const container = $(h).closest('.mw-heading').length ? $(h).closest('.mw-heading') : $(h);
      let sib = container.next();
      while (sib.length) {
        // stop at the next heading of the same or a higher level
        const isHeading = sib.hasClass('mw-heading') || /^h[1-6]$/i.test(sib[0].tagName);
        if (isHeading) {
          const m = (sib.attr('class') || '').match(/mw-heading(\d)/) || sib[0].tagName.match(/h(\d)/i);
          if (!m || Number(m[1]) <= level) break;
        }
        const tables = sib.is('table') ? sib : $('table', sib).filter((i, t) => $(t).parents('table').length === 0);
        for (const t of tables.get()) {
          if ($(t).hasClass('ambox')) continue;
          const players = playersFromTable($, $(t));
          if (players.length) {
            const seen = new Set();
            return players.filter(pl => !seen.has(pl.wiki_link) && seen.add(pl.wiki_link));
          }
        }
        sib = sib.next();
      }
    }
  }
  return [];
}

async function processTeamSeasons(leagueName, year){  
  try {
    const league = await League.findOne({ order: [['id', 'ASC']],
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

    // One team at a time (not all in parallel) so memory stays low on a small server
    for (const teamSeason of teamSeasons) {
    try {

      if(teamSeason.wiki_link === "2008–09_Portsmouth_F.C._season" ||
        teamSeason.wiki_link === "2013–14_Parma_Calcio_1913_season" ||
        teamSeason.wiki_link === "2013–14_RC_Celta_de_Vigo_season" ||
        teamSeason.wiki_link === "2013–14_Hannover_96_season" ||
        teamSeason.wiki_link === "2013–14_FC_Nantes_season"){
        logger.info("Skipping teamSeason: %s", teamSeason.wiki_link);
        continue;
      }

      logger.info(`Fetching team season for: ${teamSeason.Team.name}`);

      let teamPlayers = [];

      const response = await fetchWikiResponse(teamSeason.wiki_link);

      if (response.status === 200) { // OK response
        const $ = cheerio.load(response.data);
        const playersData = extractSquadPlayers($);

        if (!playersData.length) {
          logger.error(`Can't find player table for, skipping: ${teamSeason.Team.name} in ${teamSeason.wiki_link}`);
          continue;
        }

        for (const playerData of playersData) {
          const [player, created_player] = await findOrCreatePlayer(playerData.name, playerData.wiki_link);

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
      }

      logger.info(`Players added for: ${teamSeason.Team.name}\n${teamPlayers}`);
    } catch (teamError) {
      logger.error(`Failed processing ${teamSeason.Team ? teamSeason.Team.name : teamSeason.wiki_link}: ${teamError.message}`);
    }
    }

  } catch (error) {
    logger.error(error);
  }
}

const processInternationalTournaments = async (leagueName, year) => {
  try {
    const league = await League.findOne({ order: [['id', 'ASC']],
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
      const [player, created_player] = await findOrCreatePlayer(modifiedName, wiki);

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

  let failed = 0;
  for (const player in players) {
    try {
      await processPlayer(players[player]);
    } catch (error) {
      // one bad Wikipedia link must not stop the rest; the player stays unprocessed (name_basic null)
      failed++;
      logger.error(`Player failed, skipping: ${players[player].name} (${players[player].wiki_link}): ${error.message}`);
    }
    logger.info(`Processing player ${player} of ${length}`);
  }
  logger.info(`Players done: ${length - failed} processed, ${failed} failed`);

}

async function processEuro2024Players(){
  logger.info("ProcessEuro2024Players");
  Player.associate(models);
  PlayerTeamSeason.associate(models);
  TeamSeason.associate(models);
  LeagueSeason.associate(models);
  League.associate(models);

  const league = await League.findOne({ order: [['id', 'ASC']],
    where: { name: "UEFA European Championship" },
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

// refresh=true: re-scrape an already-processed player. Existing values are kept when the
// page yields nothing (and the image is never replaced, it may already be on Cloudinary).
// Scrape one player's page. A newly processed player (not a refresh) is then merged into an older row
// for the same person, if one exists (same name_basic + birth date), so renamed Wikipedia pages
// ("Joe_Gomez" vs "Joe_Gomez_(footballer)") do not leave two rows behind.
async function processPlayer(player, opts = {}) {
  await processPlayerPage(player, opts);
  if (!opts.refresh) await mergeIfDuplicate(player.id);
}

async function processPlayerPage(player, { refresh = false } = {}){
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

  if (response && response.status === 200){
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

    if (refresh) {
      if (player.image) delete playerInfo.image; // keep existing (Cloudinary) image, but fill a missing one
      delete playerInfo.name_basic;
      for (const key of Object.keys(playerInfo)) {
        const v = playerInfo[key];
        const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
        if (empty) delete playerInfo[key];
      }
    }

    try {
      await Player.update(playerInfo, {
        where: {
          id: player.id
        }
      });
      logger.info(`Player updated: ${player.name}`);
    } catch (error) {
      logger.error(`Player not updated: ${player.name}\n${error}`);
    }

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

// Re-scrape existing players (careers, apps, goals, bio), least recently updated first.
// Safe to re-run: careers are findOrCreate + update, and existing values/images are preserved.
async function refreshPlayers({ limit = 50, name = null } = {}) {
  const where = { name_basic: { [Op.ne]: null }, wiki_link: { [Op.ne]: null } };
  if (name) {
    where.name = { [Op.iLike]: `%${name}%` };
  }

  const players = await Player.findAll({ where, order: [['updatedAt', 'ASC']], limit });
  logger.info(`Refreshing ${players.length} players`);

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < players.length; i++) {
    try {
      await processPlayer(players[i], { refresh: true });
      ok++;
    } catch (error) {
      failed++;
      logger.error(`Refresh failed for ${players[i].name}: ${error.message}`);
    }
    logger.info(`Refreshed ${i + 1} of ${players.length} (${failed} failed)`);
  }
  logger.info(`Refresh done: ${ok} processed, ${failed} failed`);
}

async function addBaseWikiPlayer(link){
  const name = link.replace('_', ' ');
  const [player, created_player] = await findOrCreatePlayer(name, link);

  if (created_player){
      logger.info(`Player: ${player.name} created`)
  }
}

// Move everything from one player row onto another, then delete the extra row.
// Careers and squad links the keeper already has are dropped (they are the same data); the rest are moved.
async function absorbPlayer(keeperId, dupeId, t, c) {
  const keeperCareers = await Career.findAll({ where: { player_id: keeperId }, raw: true, transaction: t });
  const dupeCareers = await Career.findAll({ where: { player_id: dupeId }, transaction: t });
  for (const car of dupeCareers) {
    const has = keeperCareers.some(k => k.team_id === car.team_id && k.from_year === car.from_year &&
      k.to_year === car.to_year && k.type === car.type);
    if (has) { await car.destroy({ transaction: t }); c.droppedCareers++; }
    else { await car.update({ player_id: keeperId }, { transaction: t }); keeperCareers.push(car.get({ plain: true })); c.movedCareers++; }
  }

  const keeperLinks = new Set((await PlayerTeamSeason.findAll({ where: { player_id: keeperId }, raw: true, transaction: t })).map(l => l.team_season_id));
  const dupeLinks = await PlayerTeamSeason.findAll({ where: { player_id: dupeId }, transaction: t });
  for (const l of dupeLinks) {
    if (keeperLinks.has(l.team_season_id)) { await l.destroy({ transaction: t }); c.droppedLinks++; }
    else { await l.update({ player_id: keeperId }, { transaction: t }); keeperLinks.add(l.team_season_id); c.movedLinks++; }
  }

  await Player.destroy({ where: { id: dupeId }, transaction: t });
  c.deleted++;
}

const newCounters = () => ({ movedCareers: 0, droppedCareers: 0, movedLinks: 0, droppedLinks: 0, deleted: 0 });

// After scraping a new player: merge into an older row for the same person (same name_basic + birth date).
async function mergeIfDuplicate(playerId) {
  try {
    const p = await Player.findByPk(playerId, { raw: true });
    if (!p || !p.name_basic || !p.birth_date) return;
    const keeper = await Player.findOne({
      where: { name_basic: p.name_basic, birth_date: p.birth_date, id: { [Op.lt]: p.id } },
      order: [['id', 'ASC']],
      raw: true,
    });
    if (!keeper) return;
    await db.transaction(t => absorbPlayer(keeper.id, p.id, t, newCounters()));
    logger.info(`Merged duplicate ${p.name} (${p.wiki_link}, id ${p.id}) into existing player ${keeper.id} (${keeper.wiki_link})`);
  } catch (error) {
    logger.error(`Duplicate check failed for player ${playerId}: ${error.message}`);
  }
}

// Merge duplicate players that are already in the database.
//   default: same name_basic + birth date AND the same Wikipedia page (links compared decoded)
//   loose:   same name_basic + birth date even if the page differs (renamed pages, redirects)
// The lowest id (the original row) is kept. Dry run unless apply = true.
async function mergeDuplicatePlayers({ apply = false, loose = false } = {}) {
  const rows = await Player.findAll({
    where: { name_basic: { [Op.ne]: null }, birth_date: { [Op.ne]: null } },
    attributes: ['id', 'name', 'name_basic', 'birth_date', 'wiki_link'],
    order: [['id', 'ASC']],
    raw: true,
  });

  const groups = new Map();
  for (const r of rows) {
    const key = `${r.name_basic}|${new Date(r.birth_date).toISOString()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const clusters = [];   // [{ keeper, dupes: [..] }]
  const ambiguous = [];  // same name + dob, different page (only when not loose)
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    if (loose) {
      clusters.push({ keeper: members[0], dupes: members.slice(1) });
      continue;
    }
    const byLink = new Map();
    for (const m of members) {
      const k = m.wiki_link ? normalizeWikiLink(m.wiki_link) : `__null_${m.id}`;
      if (!byLink.has(k)) byLink.set(k, []);
      byLink.get(k).push(m);
    }
    for (const same of byLink.values()) {
      if (same.length > 1) clusters.push({ keeper: same[0], dupes: same.slice(1) });
    }
    if (byLink.size > 1) ambiguous.push(members);
  }

  const dupeCount = clusters.reduce((n, c) => n + c.dupes.length, 0);
  logger.info(`Duplicate players (${loose ? 'loose' : 'same page'}): ${clusters.length} people with extra rows, ${dupeCount} rows to merge away. Same name + birth date but different page (left alone): ${ambiguous.length} groups.`);
  for (const c of clusters.slice(0, 10)) {
    logger.info(`  e.g. keep ${c.keeper.id} ${c.keeper.name} (${c.keeper.wiki_link}); merge ${c.dupes.map(d => `${d.id} (${d.wiki_link})`).join(', ')}`);
  }
  for (const g of ambiguous.slice(0, 10)) {
    logger.info(`  ambiguous: ${g.map(m => `${m.id} ${m.name} (${m.wiki_link})`).join(' | ')}`);
  }
  if (!apply) {
    logger.info('Dry run only. Re-run with --apply to merge.');
    return { clusters: clusters.length, dupes: dupeCount, ambiguous: ambiguous.length, applied: false };
  }

  const counters = newCounters();
  for (const { keeper, dupes } of clusters) {
    await db.transaction(async (t) => {
      for (const dupe of dupes) await absorbPlayer(keeper.id, dupe.id, t, counters);
    });
  }
  logger.info(`Merged: ${counters.deleted} duplicate players deleted; careers moved ${counters.movedCareers}, dropped ${counters.droppedCareers}; squad links moved ${counters.movedLinks}, dropped ${counters.droppedLinks}.`);
  return { clusters: clusters.length, dupes: dupeCount, ambiguous: ambiguous.length, applied: true };
}

module.exports = {
  findOrCreatePlayer,
  mergeDuplicatePlayers,
  mergeIfDuplicate,
  normalizeWikiLink,
  extractSquadPlayers,
  currentSeasonStartYear,
  latestProcessedSeason,
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
  refreshPlayers,
  correctPlayerNameWikiDuplicates, 
  syncAltTeamImageToParentImage, 
  deleteDuplicatePlayers,
  setNullTeamImages,
  addBaseWikiPlayer
};