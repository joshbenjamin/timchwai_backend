const request = require('supertest');
const server = require('../app');
const db = require('../database');

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

  // Leagues

  test('GET /api/leagues', async () => {
    const response = await request(server).get('/api/leagues');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /api/leagues_with_seasons', async () => {
    const response = await request(server).get('/api/leagues_with_seasons');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /api/league_seasons', async () => {
    const leagueIds = "1";
    const response = await request(server).get(`/api/league_seasons?leagueIds=${leagueIds}`);
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);
  
  test('GET /api/league_seasons', async () => {
    // No leagueIds
    const response = await request(server).get(`/api/league_seasons`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing leagueIds query parameter");
  }, TIMEOUT);

  // Team

  test('GET /api/teams', async () => {
    const response = await request(server).get('/api/teams');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /api/teams_in_seasons', async () => {
    const leagueSeasonIds = "24,25";
    const response = await request(server).get(`/api/teams_in_seasons?leagueSeasonIds=${leagueSeasonIds}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(23);
  }, TIMEOUT);

  test('GET /api/teams_in_seasons', async () => {
    // No leagueSeasonIds
    const response = await request(server).get(`/api/teams_in_seasons`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing leagueSeasonIds query parameter");
  }, TIMEOUT);

  // Player

  test('GET /api/players', async () => {
    const response = await request(server).get('/api/players');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /api/player', async () => {
    const playerId = "2337" // Mason
    const response = await request(server).get(`/api/player?playerId=${playerId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe("Mason Mount");
  }, TIMEOUT);

  test('GET /api/player', async () => {
    // No playerId
    const response = await request(server).get(`/api/player`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing playerId query parameter");
  }, TIMEOUT);

  test('GET /api/random_player', async () => {
    const response = await request(server).get('/api/random_player');
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /api/player_in_team_seasons', async () => {
    const leagueSeasonIds = 24;
    const teamIds = 1;
    const response = await request(server).get(`/api/player_in_team_seasons?leagueSeasonIds=${leagueSeasonIds}&teamIds=${teamIds}`);
    expect(response.statusCode).toBe(200);
  }, TIMEOUT);

  test('GET /api/player_in_team_seasons', async () => {
    // No teamIds
    const leagueSeasonIds = 24;
    const response = await request(server).get(`/api/player_in_team_seasons?leagueSeasonIds=${leagueSeasonIds}`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing teamIds query parameter");
  }, TIMEOUT);

  test('GET /api/player_in_team_seasons', async () => {
    // No leagueSeasonsIds
    const teamIds = 1;
    const response = await request(server).get(`/api/player_in_team_seasons?teamIds=${teamIds}`);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing leagueSeasonIds query parameter");
  }, TIMEOUT);

});
