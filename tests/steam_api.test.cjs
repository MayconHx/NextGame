describe('Steam public API', () => {
  test('storesearch returns items for a common term', async () => {
    const term = 'Portal';
    const url = `https://store.steampowered.com/api/storesearch/?cc=us&l=pt&term=${encodeURIComponent(term)}`;
    const res = await fetch(url);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(400);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
  }, 20000);
});
