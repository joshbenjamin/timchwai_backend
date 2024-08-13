const axios = require('axios');
const logger = require('../logger');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWikiResponse(wikiLink, delay = 300) {
  const url = `https://en.wikipedia.org/wiki/${wikiLink}`;

  logger.info(`URL: ${url}`);
  try {
    const response = await axios.get(url);
    if (response){
      let date = new Date();
      logger.info(`Response received for ${url} at ${date.toUTCString()}`);
      await sleep(delay); // Wait for the specified delay
      return response;
    } else {
      logger.info(`No response received for ${url}`);
      return null;
    }
  } catch (error) {
    logger.info(`Error while trying to get response from ${url}, trying again but replacing fullstops`);

    let modifiedUrl = url.replace(/\./g, '');

    try {
      const response = await axios.get(modifiedUrl);
      if (response){
        let date = new Date();
        logger.info(`Response received for modified ${modifiedUrl} at ${date.toUTCString()}`);
        await sleep(delay); // Wait for the specified delay
        return response;
      } else {
        logger.info(`No response received for modified ${modifiedUrl}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error fetching Wikipedia page at modified ${modifiedUrl}: ${error}`);
      return null;
    }
  }
}

async function fetchWikiImage(url, delay = 500) {
  logger.info(`URL: ${url}`);
  try {
    const response = await axios.get(url);
    if (response){
      let date = new Date();
      logger.info(`Response received for ${url} at ${date.toUTCString()}`);
      await sleep(delay); // Wait for the specified delay
      return response;
    } else {
      logger.info(`No response received for ${url}`);
      logger.error(`Error while fetching image '${url}': ${error}`)
      return null;
    }
  } catch (error) {
    logger.error(`Error while fetching image again '${url}': ${error}`)
    return null
  }
}

module.exports = fetchWikiResponse;
