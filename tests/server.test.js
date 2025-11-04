import request from 'supertest';
import app from '../server.js';

describe('API básica', () => {
  test('GET /questions retorna perguntas', async () => {
    const res = await request(app).get('/questions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('POST /recomendar retorna recomendacao', async () => {
    const res = await request(app)
      .post('/recomendar')
      .send({ selectedOptions: ['q1_opt2', 'q2_opt1'] })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('recomendacao');
  });
});
