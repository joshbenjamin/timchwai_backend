const Player = require('../Player');
const logger = require('../../logger');

// "Data last updated" = the most recent time any player was modified. The scraper updates a
// player's row every time it (re)processes that player and rewrites their careers, so this
// moves automatically with every sync or refresh. No separate bookkeeping needed.
exports.getLastSync = async (req, res) => {
  try {
    const lastUpdated = await Player.max('updatedAt');
    res.json({ last_sync: lastUpdated || null });
  } catch (error) {
    logger.error(error);
    res.status(500).send('Internal Server Error');
  }
};
