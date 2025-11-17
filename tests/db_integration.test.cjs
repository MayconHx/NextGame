// Simple check against container app running on localhost:3000
describe('Container-based DB check', () => {
  const base = 'http://localhost:3000';

  test('GET /games returns seeded rows from Postgres', async () => {
    const res = await fetch(base + '/games');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  }, 60000);
});
