const request = require('supertest');
const server = require('../app');
const db = require('../database');
const { QueryTypes } = require('sequelize');

const TIMEOUT = 10000;

describe('API tests', () => {
  afterAll(async () => {
    await db.close(); // Close the database connection
  });

  test('GET /', async () => {
    const response = await request(server).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Welcome to TIMCHWAI backend!');
  });

  // Data freshness

  test('GET /last_sync', async () => {
    const response = await request(server).get('/last_sync');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('last_sync');
  }, TIMEOUT);

  // Leagues

  test('GET /leagues', async () => {
    const response = await request(server).get('/leagues');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /leagues_with_seasons', async () => {
    const response = await request(server).get('/leagues_with_seasons');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /league_seasons', async () => {
    const leagueIds = "1";
    const response = await request(server).get(`/league_seasons?leagueIds=${leagueIds}`);
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);
  
  test('GET /league_seasons', async () => {
    // No leagueIds
    const response = await request(server).get(`/league_seasons`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing leagueIds query parameter");
  }, TIMEOUT);

  // Team

  test('GET /teams', async () => {
    const response = await request(server).get('/teams');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /teams_in_seasons', async () => {
    const leagueSeasonIds = "24,25";
    const response = await request(server).get(`/teams_in_seasons?leagueSeasonIds=${leagueSeasonIds}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  }, TIMEOUT);

  test('GET /teams_in_seasons', async () => {
    // No leagueSeasonIds
    const response = await request(server).get(`/teams_in_seasons`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing leagueSeasonIds query parameter");
  }, TIMEOUT);

  // Player

  test('GET /players', async () => {
    const response = await request(server).get('/players');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /player', async () => {
    // Look up a real id instead of assuming one exists
    const list = await request(server).get('/players');
    expect(list.statusCode).toBe(200);
    const playerId = list.body[0].id;
    const response = await request(server).get(`/player?playerId=${playerId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBe(playerId);
    expect(response.body.name).toBeTruthy();
  }, TIMEOUT);

  test('GET /player', async () => {
    // No playerId
    const response = await request(server).get(`/player`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing playerId query parameter");
  }, TIMEOUT);

  test('GET /random_player', async () => {
    const response = await request(server).get('/random_player');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /player_in_team_seasons', async () => {
    // Find a league season + team that actually has players
    const [row] = await db.query(
      `SELECT ts.league_season_id AS "leagueSeasonId", ts.team_id AS "teamId"
       FROM team_seasons ts JOIN player_team_seasons pts ON pts.team_season_id = ts.id
       LIMIT 1`,
      { type: QueryTypes.SELECT }
    );
    const response = await request(server).get(`/player_in_team_seasons?leagueSeasonIds=${row.leagueSeasonId}&teamIds=${row.teamId}`);
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /player_in_team_seasons', async () => {
    // No teamIds
    const leagueSeasonIds = 24;
    const response = await request(server).get(`/player_in_team_seasons?leagueSeasonIds=${leagueSeasonIds}`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing teamIds query parameter");
  }, TIMEOUT);

  test('GET /player_in_team_seasons', async () => {
    // No leagueSeasonsIds
    const teamIds = 1;
    const response = await request(server).get(`/player_in_team_seasons?teamIds=${teamIds}`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing leagueSeasonIds query parameter");
  }, TIMEOUT);

});
