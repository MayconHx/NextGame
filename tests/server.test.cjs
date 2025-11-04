const { spawn } = require('child_process');
const http = require('http');

function waitForUrl(url, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function tryReq() {
      http.get(url, res => {
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('timeout'));
        setTimeout(tryReq, 100);
      });
    })();
  });
}

describe('API basic (spawn server)', () => {
  let serverProc;
  const PORT = 3010;
  const base = `http://localhost:${PORT}`;

  beforeAll(async () => {
    serverProc = spawn(process.execPath, ['server.js'], {
      cwd: process.cwd(),
      env: Object.assign({}, process.env, { PORT: String(PORT), NODE_ENV: 'ci' }),
      stdio: 'ignore'
    });

    await waitForUrl(base + '/questions', 5000);
  }, 20000);

  afterAll(() => {
    return new Promise((resolve) => {
      if (!serverProc || serverProc.killed) return resolve();
      // try graceful kill
      serverProc.kill();
      const timeout = setTimeout(() => {
        try { serverProc.kill('SIGKILL'); } catch (e) {}
        resolve();
      }, 2000);
      serverProc.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  });

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
