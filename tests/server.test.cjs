// Simple container-based tests (use app running on localhost:3000)
describe('API basic (container)', () => {
  const base = 'http://localhost:3000';

  test('GET /questions returns array', async () => {
    const res = await fetch(base + '/questions');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('POST /recomendar returns recomendacao', async () => {
    const res = await fetch(base + '/recomendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedOptions: ['q1_opt2', 'q2_opt1'] })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('recomendacao');
  });
});
