const http = require('http');

function waitForUrl(url, timeout = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function tryReq() {
      http.get(url, res => {
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('timeout'));
        setTimeout(tryReq, 200);
      });
    })();
  });
}

describe('Containerized app integration (docker-compose)', () => {
  const base = 'http://localhost:3000';

  test('container app /games returns seeded rows', async () => {
    await waitForUrl(base + '/games', 60000);
    const res = await fetch(base + '/games');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  }, 70000);
});
