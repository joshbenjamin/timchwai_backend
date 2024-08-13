const { 
    Career,
    Player, 
} = require('../models')

async function correctPlayerNames(){
    const players = await Player.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: '%†%' } },
          { name: { [Op.like]: '%¤%' } },
          { name: { [Op.like]: '%‡%' } },
          { name: { [Op.like]: '%/%' } },
          { name: { [Op.like]: '%U21%' } },
          { name: { [Op.like]: '%U23%' } },
          { name: { [Op.like]: '%HG[0-9]%' } },
          { name: { [Op.like]: '%HG%' } },
          { name: { [Op.like]: '%[L]%' } },
          { name: { [Op.like]: '%[R]%' } },
          { name: { [Op.like]: '%[S]%' } },
          { name: { [Op.like]: '%*%' } },
        ],
      },
    });
  
    if (!players){
      logger.info(`No players found to correct`);
      return;
    }
  
    const length = players.length;
  
    logger.info(`Correcting name for ${length} players`);
    const ans = await askQuestion(`Are you sure you want to correct ${length} players? `);
  
    for (const playerId in players){
      let player = players[playerId];
  
      let newName = player.name;
      newName = newName.replace(/[\u2020\u00A4\u2021]/g, ''); // Remove specific characters: †, ¤, and ‡
      newName = newName.replace(/U\d+/g, ''); // Remove 'UX' pattern (where X is a number)
      newName = newName.replace(/HG\d*\s*$/, ''); // Remove 'HG' followed by an optional number from the end of the string
      newName = newName.replace('/', '');
      newName = newName.replace('[L]', '');
      newName = newName.replace('[R]', '');
      newName = newName.replace('[S]', '');
      newName = newName.replace('*', '');
      newName = newName.trim();
  
      const samePlayer = await Player.findOne({
        where: {
          wiki_link: player.wiki_link,
          name: newName
        }
      });
  
      const nameBasic = replaceNameCharacters(newName);
  
      if (samePlayer){
        logger.info(`Found player with same name, need to transfer ${player.name}`);
  
        await PlayerTeamSeason.update({player_id: samePlayer.id}, {
          where: {
            id: player.id
          }
        }).then((result) => {
          logger.info(`Transferred PlayerTeamSeasons for ${player.name}`);
        }).catch((error) => {
          logger.error(`Error while transferring PlayerTeamSeason for ${player.name}`);
        });
  
        await Career.destroy({
          where: {
            player_id: player.id
          }
        });
  
        await Player.destroy({
          where: {
            id: player.id
          }
        });
      } else {
        logger.info(`Need to just change ${player.name}`);
  
        await Player.update({name: newName, name_basic: nameBasic}, {
          where: {
            id: player.id
          }
        }).then((result) => {
          logger.info(`Player updated: ${player.name}`);
        }).catch((error) => {
          logger.error(`Player not updated: ${player.name}\n${error}`);
        });
      }
    }
  
  }

async function correctCareerFromYear() {
    const careers = await Career.findAll({
        where: {
        from_year: 0
        }
    });

    if (!careers){
        logger.info(`No careers to correct`);
    }

    let length = careers.length;
    const ans = await askQuestion(`Are you sure you want to correct ${length} careers? `);

    for (const careerId in careers){
        let career = careers[careerId];

        if (career.to_year){
        await Career.update({from_year: career.to_year}, {
            where: {
            id: career.id
            }
        }).then((result) => {
            logger.info(`Updated from_year for career ID: ${career.id}`);
        }).catch((error) => {
            logger.info(`Error changing career id ${career.id}\n${error}`);
        })
        } else {
        logger.info(`No to_year for career ID ${career.id}`);
        }
    }

}

async function correctPlayerFullNameHeightPOB(){
  const players = await Player.findAll({
    where: {
      // Change to Op.and when done correcting
      [Op.or]: {
        full_name: null,
        birth_place: null,
        height: null
      },
      // id: 1
    }
  });
  let length = players.length;

  const ans = await askQuestion(`Do you want to process FullName, Height and POB of ${length} players`);

  for (const playerIdx in players){
    let player = players[playerIdx];
    logger.info(`Correcting FullName, Height and POB for ${player.name} - ${playerIdx} of ${length}`);
  
    if (!player.wiki_link){
      logger.info(`No wiki_link for: ${player.name}`);
      continue;
    }
  
    const response = await fetchWikiResponse(player.wiki_link);
  
    if (response.status === 200){
      const $ = cheerio.load(response.data);
      
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
        full_name: fullName,
        height: heightInMeters,
        birth_place: birthPlace, // corrected property name
      };
      
      logger.info(`\nInfo for ${player.name}\n${JSON.stringify(playerInfo)}\n`);
      
      Player.update(playerInfo, {
        where: {
          id: player.id
        }
      }).then((result) => {
        logger.info(`Player info updated: ${player.name}`);
      }).catch((error) => {
        logger.error(`Player info not updated: ${player.name}\n${error}`);
      });
      
    } else {
      throw new Error(`Response didn't make it`);
    }
    
  }
}

async function correctScandinavianNames(){

  const players = await Player.findAll({
    where: {
      name: {
        [Op.regexp]: '[ØøÅåÄäÖöÜüÐðÞþ]'
      },
    },
  });


  if (players){
    let length = players.length;
    const ans = await askQuestion(`Do you want to correct ${length} player Scandi names?`);

    for (const playerIdx in players){
      let player = players[playerIdx];
      const newNameBasic = replaceNameCharacters(player.name);

      Player.update({name_basic: newNameBasic}, {
        where: {
          id: player.id
        }
      }).then((result) => {
        logger.info(`Updated name_basic for ${player.name}`);
      }).catch((error) => {
        logger.error(`Error updating name_basic for ${player.name}:\n${error}`);
      });
    }
  } else {
    logger.error(`No Scandi players found`);
  }
}

async function updatePlayerDOBs(){
  const players = await Player.findAll({
    where: {
      birth_date: null
    }
  });

  if (!players){
    logger.info(`No players without DOBs`);
    return;
  } else {
    let length = players.length;
    const ans = await askQuestion(`Would you like to correct DOBs for ${length} player?`);

    for (const playerIdx in players){
      let player = players[playerIdx]
      logger.info(`Getting DOB for ${player.name} - ${playerIdx}`);

      if (!player.wiki_link){
        logger.info(`No wiki_link for: ${player.name}`);
        continue;
      }
    
      const response = await fetchWikiResponse(player.wiki_link);
    
      if (response.status === 200){
        const $ = cheerio.load(response.data);    
        const dateOfBirthElem = $('span.bday');

        if (dateOfBirthElem.length == 0){
          logger.info(`Player ${player.name} does not have a bday elem`);
          continue;
        }

        const dateOfBirthText = dateOfBirthElem.text();
        logger.info(`DOB Text: ${dateOfBirthText}`);
        const dateOfBirth = moment.utc(dateOfBirthText, 'YYYY-MM-DD').toISOString().split('T')[0];
        logger.info(`BDay for ${player.name} - ${dateOfBirth}`);

        Player.update({birth_date: dateOfBirth}, {
          where: {
            id: player.id
          }
        }).then((result) => {
          logger.info(`DOB updated for ${player.name}`);
        }).catch((error) => {
          logger.error(`Error for ${player.name}:\n${error}`)
        });
      } else {
        logger.error(`Response not 200 for ${player.name}`);
        continue;
      }
    }
  }
}

async function correctPlayerCareerLoans(){
  Player.associate(models);
  Career.associate(models);

  const players = await Player.findAll({
    include: [
      {
        model: Career,
        where: { loan: false },
      },
    ],
  });

  let length = players.length;

  const ans = await askQuestion(`Do you want to process careers of ${length} players`);

  for (const playerIdx in players){
    let player = players[playerIdx];
    logger.info(`Correcting FullName, Height and POB for ${player.name} - ${playerIdx} of ${length}`);
  
    if (!player.wiki_link){
      logger.info(`No wiki_link for: ${player.name}`);
      continue;
    }
  
    const response = await fetchWikiResponse(player.wiki_link);
  
    if (response.status === 200){
      const $ = cheerio.load(response.data);
  
      const tableRows = $('table.infobox tbody tr:not(:has(table.infobox-subbox))');
      let currentType = '';
      let careersFound = false;
  
      const numRows = tableRows.length;
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
  
            let teamElement = row.find('td.infobox-data, td.infobox-data-a').first();
  
            if (!teamElement){
              logger.error(`No teamElement found at ${index} for ${player.name}`);
              continue;
            }

            let onLoan = false;
            if (teamElement.text().toLowerCase().includes('loan')) {
              onLoan = true;
            }

            if (onLoan === false){
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
            
            teamElement.find('sup.reference').remove();
            let teamAnchor = teamElement.find('a');
  
            const teamExtracted = teamElement.find('a');
            logger.info(`Team Extracted element: ${teamExtracted}`);
  
            let teamName = teamAnchor.length ? teamAnchor.text() : teamElement.text();
            teamName = teamName.replace(/(→|loan|\(|\))/g, '').trim();
            const teamUrlFull = teamElement.find('a').attr('href');
            const teamUrl = teamUrlFull ? teamUrlFull.split('/').pop() : null;
  
            const team = await Team.findOne({
              where: {
                name: teamName,
                wiki_link: teamUrl,
              }
            })

            if (!team){
              logger.error(`No team found with teamName: ${teamName}`);
              continue;
            }

            Career.update({loan: onLoan}, {
              where: {
                player_id: player.id,
                from_year: fromYear,
                team_id: team.id,
                type: currentType
              }
            }).then((result) => {
              logger.info(`Updated Career for ${player.name} at ${team.name}`);
            }).catch((error) => {
              logger.error(`Error updating Career for ${player.name} at ${team.name}\n${error}`);
            })
          }
        }
      };
    
    } else {
      throw new Error(`Response didn't make it`);
    }
    
  }
}

async function resetTeamImages(){
  const teams = await Team.findAll({
    where: {
      image: {
        [Op.like]: '%cloudinary%'
      }
    }
  });

  logger.info(`Going to reset for ${teams.length} teams`);

  for (const team of teams){
    const response = await fetchWikiResponse(team.wiki_link);
    const $ = cheerio.load(response.data);
    const imageElement = $('.infobox-image img');
    const imageSource = imageElement.attr('src');

    Team.update({image: imageSource}, {
      where: {
        id: team.id
      }
    }).then((result) => {
      logger.info(`Successfully updated image for team: ${team.name}`);
    }).catch((error) => {
      logger.error(`Error updating image for team: ${team.name}`);
    })
  }
}