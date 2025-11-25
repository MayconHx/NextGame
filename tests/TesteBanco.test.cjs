describe('DB quick check', () => {
  const base = 'http://localhost:3000';

  test('GET /games returns seeded rows (quick)', async () => {
    const res = await fetch(base + '/games');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  }, 20000);
});
