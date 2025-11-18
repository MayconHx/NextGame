import 'dotenv/config';
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { Client } from "pg";
import fetch from 'node-fetch';

/*
  NextGame - servidor simples
  - Carrega catálogo de jogos (Postgres ou db.json)
  - Fornece rotas: /games, /questions, /recomendar, /recomendar/top
  - Tenta enriquecer resultados com imagens/descrições da Steam
  Objetivo: código legível e direto para quem está começando.
*/

const app = express();
app.use(cors());
app.use(express.json());
// serviço de arquivos estáticos (index.html, style.css, script.js)
app.use(express.static(process.cwd()));

// Perguntas dinâmicas — texto em português para exibição no quiz
const questions = [
  {
    id: "q1",
    text: "Que tipo de experiência você quer agora?",
    options: [
      { id: "q1_opt1", text: "Imersiva, com história e decisões (RPG)", filters: { genre: ["RPG"], keywords: ["história","narrativa"] } },
      { id: "q1_opt2", text: "Calma e relaxante, sem pressa (Simulação)", filters: { genre: ["Simulação"], mood: ["relaxante"] } },
      { id: "q1_opt3", text: "Desafiadora e exigente — quero testar habilidades", filters: { difficulty: ["alta","muito alta"], keywords: ["desafio","difícil"] } },
      { id: "q1_opt4", text: "Criativa: construir, decorar ou inventar coisas", filters: { genre: ["Criativo"], keywords: ["construir","criativo"] } }
    ]
  },
  {
    id: "q2",
    text: "Como você prefere jogar?",
    options: [
      { id: "q2_opt1", text: "Sozinho, focado na história ou exploração", filters: { mood: ["imersivo"], genre: ["RPG","Plataforma"] } },
      { id: "q2_opt2", text: "Com amigos — coop ou competitivo", filters: { keywords: ["multiplayer","competitivo","equipe"] } },
      { id: "q2_opt3", text: "Resolver puzzles e pensar soluções", filters: { genre: ["Puzzle"], keywords: ["puzzle","inteligente"] } },
      { id: "q2_opt4", text: "Partidas rápidas, ação intensa", filters: { keywords: ["rápido","ação","adrenalina"] } }
    ]
  },
  {
    id: "q3",
    text: "Que clima você quer no jogo?",
    options: [
      { id: "q3_opt1", text: "Leve e acolhedor", filters: { mood: ["relaxante","calmo"] } },
      { id: "q3_opt2", text: "Sombrio e tenso", filters: { mood: ["sombrio","desafiador"] } },
      { id: "q3_opt3", text: "Estiloso e com personagens marcantes", filters: { keywords: ["personagens","estiloso"] } },
      { id: "q3_opt4", text: "Épico / estratégico, pensar a longo prazo", filters: { genre: ["Estratégia"], mood: ["épico"] } }
    ]
  },
  {
    id: "q4",
    text: "Qual mecânica te atrai mais?",
    options: [
      { id: "q4_opt1", text: "Combate rápido e técnico", filters: { keywords: ["combate","ação"] } },
      { id: "q4_opt2", text: "Explorar e descobrir segredos", filters: { keywords: ["explorar","mundo aberto"] } },
      { id: "q4_opt3", text: "Construção e customização (criatividade)", filters: { keywords: ["construir","customizar"] } },
      { id: "q4_opt4", text: "Sistema por turnos e escolhas táticas", filters: { keywords: ["turnos","estratégia"] , genre: ["Estratégia","RPG"] } }
    ]
  },
  {
    id: "q5",
    text: "Que nível de desafio você prefere?",
    options: [
      { id: "q5_opt1", text: "Quero um desafio sério (muito difícil)", filters: { difficulty: ["muito alta"] } },
      { id: "q5_opt2", text: "Desafio moderado (divertido e justo)", filters: { difficulty: ["média"] } },
      { id: "q5_opt3", text: "Fácil / relax — jogar sem frustração", filters: { difficulty: ["baixa"] } },
      { id: "q5_opt4", text: "Tanto faz — deixo o jogo me surpreender", filters: { } }
    ]
  },
  {
    id: "q6",
    text: "O que mais te interessa agora?",
    options: [
      { id: "q6_opt1", text: "História e diálogos profundos", filters: { keywords: ["narrativa","diálogos","história"] } },
      { id: "q6_opt2", text: "Rejogabilidade: quero algo que eu repita várias vezes", filters: { keywords: ["roguelike","repetível"] } },
      { id: "q6_opt3", text: "Competição e partidas rápidas com outros", filters: { keywords: ["multiplayer","competitivo"] } },
      { id: "q6_opt4", text: "Atmosfera visual e estilo marcante", filters: { keywords: ["estiloso"] } }
    ]
  }
];

// --- 2. Armazenamento de dados (memória / cache) ---
let db = { games: [] };

// Cache simples em memória para dados da Steam
const steamCache = {
  appList: { ts: 0, data: null }, // full app list (very large) - cached for 24h
  appDetails: new Map() // appid -> { ts, data }
};

// quando a Steam falhar repetidamente, evitaremos re-tentar por um curto período
let steamUnavailableUntil = 0;

const STEAM_APPLIST_TTL = 24 * 60 * 60 * 1000; // 24h
const STEAM_DETAILS_TTL = 60 * 60 * 1000; // 1h

async function fetchSteamAppList(force = false){
  const now = Date.now();
  if(now < steamUnavailableUntil && !force) throw new Error('steam temporarily unavailable');
  if(!force && steamCache.appList.data && (now - steamCache.appList.ts) < STEAM_APPLIST_TTL){
    return steamCache.appList.data;
  }
  const url = 'https://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json';
  // wrapper com timeout para evitar bloqueios longos
  const res = await Promise.race([
    fetch(url, { timeout: 20000 }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('steam applist timeout')), 20000))
  ]);
  if(!res.ok) {
    // se a Steam responder com erro, evitamos re-tentar por 60s
    steamUnavailableUntil = Date.now() + 60*1000;
    throw new Error(`Steam applist fetch failed: ${res.status}`);
  }
  const json = await res.json();
  // manter apenas o array de apps para simplificar o objeto em memória
  const apps = (json && json.applist && json.applist.apps) ? json.applist.apps : [];
  steamCache.appList = { ts: now, data: apps };
  return apps;
}

async function fetchSteamAppDetails(appid, force = false){
  const now = Date.now();
  const key = String(appid);
  if(!force && steamCache.appDetails.has(key)){
    const v = steamCache.appDetails.get(key);
    if((now - v.ts) < STEAM_DETAILS_TTL) return v.data;
  }
  const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(key)}`;
  const res = await Promise.race([
    fetch(url, { timeout: 15000 }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('steam appdetails timeout')), 15000))
  ]);
  if(!res.ok) {
    // marca indisponibilidade curta
    steamUnavailableUntil = Date.now() + 30*1000;
    throw new Error(`Steam appdetails fetch failed: ${res.status}`);
  }
  const json = await res.json();
  // a API retorna um objeto indexado pelo appid
  const data = json && json[key] ? json[key] : { success: false };
  steamCache.appDetails.set(key, { ts: now, data });
  return data;
}

// --- 3. DB helper (Postgres) ---
async function withPgClient(fn){
  if (!process.env.DB_HOST) return null;
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.POSTGRES_DB || process.env.DB_NAME || 'meu_banco_docker',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  });
  try{
    await client.connect();
    return await fn(client);
  }catch(err){
    console.warn('withPgClient error:', err && err.message ? err.message : err);
    return null;
  }finally{
    try{ await client.end(); }catch(e){}
  }
}

async function getSteamEnrichmentFromDb(gameId){
  return await withPgClient(async (client) => {
    const r = await client.query('SELECT appid, data, fetched_at FROM steam_enrichments WHERE game_id = $1', [gameId]);
    if(r.rows.length === 0) return null;
    return r.rows[0];
  });
}

async function saveSteamEnrichmentToDb(gameId, appid, data){
  return await withPgClient(async (client) => {
    const now = new Date();
    await client.query(`INSERT INTO steam_enrichments(game_id, appid, data, fetched_at)
      VALUES($1,$2,$3,$4)
      ON CONFLICT (game_id) DO UPDATE SET appid = EXCLUDED.appid, data = EXCLUDED.data, fetched_at = EXCLUDED.fetched_at`,
      [gameId, appid, data, now]
    );
    return true;
  });
}

// --- 4. Helpers: Steam match by name ---
async function findSteamAppIdByName(name){
  // procura pelo jogo usando o endpoint de busca do Steam Store
  // retorna objeto { id, image, variant } quando possível (image = tiny_image)
  if(!name) return null;
  const variants = [];
  const normalized = (s) => (s || '').trim();
  variants.push(normalized(name));
  // remover conteúdo entre parênteses, ex: "Portal (Classic)" -> "Portal"
  variants.push(normalized(name.replace(/\(.*\)/,'').trim()));
  // se existir ':', pegar antes (ex: "Game: Subtitle" -> "Game")
  if (name.indexOf(':') !== -1) variants.push(normalized(name.split(':')[0]));
  // pegar as primeiras 3-4 palavras como fallback curto
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length) variants.push(normalized(words.slice(0,4).join(' ')));
  // variação sem caracteres especiais
  variants.push(normalized(name.replace(/[^a-zA-Z0-9\s]/g,'')));

  // dedupe variants while preserving order
  const seen = new Set();
  const tries = variants.map(v=>v).filter(v=>{ if(!v) return false; if(seen.has(v.toLowerCase())) return false; seen.add(v.toLowerCase()); return true; });

  for(const termRaw of tries){
    try{
      const term = encodeURIComponent(termRaw);
      const url = `https://store.steampowered.com/api/storesearch/?cc=us&l=pt&term=${term}`;
      const res = await Promise.race([
        fetch(url, { timeout: 8000 }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('storesearch timeout')), 8000))
      ]);
      if(!res.ok) continue;
      const json = await res.json();
      if(json && Array.isArray(json.items) && json.items.length>0){
        const it = json.items[0];
        return { id: it.id, image: it.tiny_image || null, variant: termRaw };
      }
    }catch(e){
      // ignore this variant and try next
      continue;
    }
  }
  return null;
}
// --- 5. Carregar dados do catálogo (Postgres ou fallback `db.json`) ---
async function loadDb() {
  // Se estivermos com variáveis de conexão, tentamos o Postgres primeiro.
  if (process.env.DB_HOST) {
    const clientConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      database: process.env.POSTGRES_DB || process.env.DB_NAME || 'meu_banco_docker',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres'
    };

    // Tentativas simples para esperar o banco subir (ex: Docker Compose durante dev/CI)
    const maxRetries = 12;
    const delayMs = 5000;
    let lastErr = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const client = new Client(clientConfig);
      try {
        await client.connect();
        const res = await client.query('SELECT id, name, genre, difficulty, mood, description, image, keywords FROM games ORDER BY id');
        db = { games: res.rows.map(r => ({
          id: r.id,
          name: r.name,
          genre: r.genre,
          difficulty: r.difficulty,
          mood: r.mood,
          description: r.description,
          image: r.image,
          keywords: r.keywords
        })) };
        try { await client.end(); } catch (e) {}
        console.log('Loaded games from Postgres, count=', db.games.length);
        return;
      } catch (err) {
        lastErr = err;
        console.warn(`loadDb attempt ${attempt} failed:`, err && err.message ? err.message : err);
        try { await client.end(); } catch (e) {}
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, delayMs));
      }
    }
    console.error('Erro ao carregar dados do Postgres (excedeu tentativas):', lastErr);
    return;
  }

  // Se não tiver Postgres configurado, tentamos `db.json` no diretório do projeto.
  const dbPath = path.join(process.cwd(), "db.json");
  if (fs.existsSync(dbPath)) {
    try { db = JSON.parse(fs.readFileSync(dbPath, "utf-8")); }
    catch (err) { console.error('Erro ao ler db.json:', err && err.message ? err.message : err); }
  } else {
    console.warn('Nenhum DB configurado e db.json não encontrado; /games ficará vazio.');
  }
}

// Inicia a carga do DB ao carregar o módulo; rotas podem usar os dados carregados
loadDb().catch(err => console.error('Erro em loadDb:', err));

// Endpoint para retornar todos os jogos
// --- 6. API: games ---
app.get("/games", async (req, res) => {
  if ((!db.games || db.games.length === 0) && process.env.DB_HOST) await loadDb();
  res.json(db.games);
});

// Endpoint para retornar as perguntas (quiz)
app.get("/questions", (req, res) => {
  res.json(questions);
});

// Endpoint principal de recomendação (um jogo)
// --- 7. API: recomendar (single) ---
app.post("/recomendar", (req, res) => {
  if (!db.games || db.games.length === 0) return res.status(503).json({ error: 'No games available' });
  const selected = req.body.selectedOptions || [];
  // build filters list
  const selectedFilters = [];
  for (const id of selected) for (const q of questions) {
    const opt = q.options.find(o => o.id === id);
    if (opt) selectedFilters.push(opt.filters || {});
  }
  const weights = { genre: 3, difficulty: 2, mood: 2, keywords: 1 };
  const scores = computeScores(selectedFilters, db.games, weights);
  // pick best
  const maxScore = Math.max(...Object.values(scores));
  let recommendation = db.games[Math.floor(Math.random() * db.games.length)];
  if (isFinite(maxScore) && maxScore > 0) {
    const bestIds = Object.entries(scores).filter(([_, v]) => v === maxScore).map(([k]) => Number(k));
    const chosen = bestIds[Math.floor(Math.random() * bestIds.length)];
    recommendation = db.games.find(g => g.id === chosen);
  }
  res.json({ recomendacao: recommendation, scores });
});

// Novo endpoint: top-N recomendações enriquecidas com dados da Steam
// --- 8. API: recomendar/top (top N + enriquecimento Steam) ---
app.post('/recomendar/top', async (req, res) => {
  if (!db.games || db.games.length === 0) {
    console.warn('/recomendar/top called but no games loaded');
    return res.status(503).json({ error: 'No games available' });
  }
  const selected = req.body.selectedOptions || [];
  const topN = Math.min(10, Math.max(1, Number(req.body.n) || 5));
  console.log('/recomendar/top called with', selected, 'n=', topN);
  // build selectedFilters
  const selectedFilters = [];
  for (const id of selected) for (const q of questions) {
    const opt = q.options.find(o => o.id === id);
    if (opt) selectedFilters.push(opt.filters || {});
  }
  const weights = { genre: 3, difficulty: 2, mood: 2, keywords: 1 };
  const scores = computeScores(selectedFilters, db.games, weights);

  // prepare sorted list
  const scored = db.games.map(g => ({ game: g, score: scores[g.id] || 0 }));
  scored.sort((a,b) => b.score - a.score);

  // if top scores are all zero, fallback: random sample
  const maxScore = scored.length ? Math.max(...scored.map(s=>s.score)) : 0;
  let candidates = scored;
  if (!isFinite(maxScore) || maxScore === 0) {
    const shuffled = [...scored].sort(() => Math.random()-0.5);
    candidates = shuffled.slice(0, topN).map(s => ({ game: s.game, score: s.score }));
  } else {
    candidates = scored.slice(0, topN);
  }

  // Enriquecer com dados da Steam
  // Usamos um limitador simples de concorrência para não sobrecarregar a Steam
  async function mapWithConcurrency(list, limit, fn) {
    const results = [];
    let i = 0;
    const workers = new Array(Math.min(limit, list.length)).fill(0).map(async () => {
      while (i < list.length) {
        const idx = i++;
        try { results[idx] = await fn(list[idx], idx); }
        catch (err) { results[idx] = { error: String(err) }; }
      }
    });
    await Promise.all(workers);
    return results;
  }

  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  const results = await mapWithConcurrency(candidates, 3, async (entry) => {
    const g = entry.game;
    let usedSteam = false;
    let imageUrl = null;
    let steamLink = null;
    let shortDescription = g.description || '';

    try{
      // find appid (with timeout) - may also return tiny_image
      const storeInfo = await withTimeout(findSteamAppIdByName(g.name), 5000);
      const steamId = storeInfo && storeInfo.id ? storeInfo.id : null;
      if (steamId) {
        // mark that we contacted Steam (storesearch at least)
        usedSteam = true;
        // fetch details (with timeout)
        let details = null;
        try{
          details = await withTimeout(fetchSteamAppDetails(steamId), 7000);
        }catch(e){
          // ok — we still may have tiny_image from storesearch
          details = null;
        }
        if (details && details.success && details.data) {
          const d = details.data;
          imageUrl = d.header_image || d.website_background || imageUrl || null;
          if (!imageUrl && Array.isArray(d.screenshots) && d.screenshots.length) imageUrl = d.screenshots[0].path_full || imageUrl;
          shortDescription = d.short_description || d.about_the_game || shortDescription;
        }
        // if still no image, try tiny_image from storesearch
        if(!imageUrl && storeInfo.image) imageUrl = storeInfo.image;
        steamLink = `https://store.steampowered.com/app/${steamId}/`;
        // save best-effort (store both details and storesearch image)
        try{ await saveSteamEnrichmentToDb(g.id, steamId, { details, storeImage: storeInfo.image || null }); }catch(e){ /* ignore */ }
      }
    }catch(e){
      console.warn('steam enrich failed for', g.name, e && e.message ? e.message : e);
    }

    if(!imageUrl && g.image) imageUrl = g.image.startsWith('/') ? g.image : '/' + g.image;

    // retornar payload compacto para facilitar o render no cliente
    return {
      id: g.id,
      name: g.name,
      genres: g.genre,
      shortDescription,
      image: imageUrl,
      score: entry.score,
      steamLink,
      usedSteam
    };
  });

  return res.json({ recomendacoes: results, scores });
});

// --- Helper: calcular pontuações a partir dos filtros (lógica centralizada) ---
function computeScores(selectedFilters, games, weights){
  const scores = {};
  for (const g of games) scores[g.id] = 0;
  for (const filters of selectedFilters) {
    for (const g of games) {
      // genre
      if (filters.genre && filters.genre.length) for (const val of filters.genre)
        if (String(g.genre).toLowerCase().includes(String(val).toLowerCase())) scores[g.id] += weights.genre;
      // difficulty
      if (filters.difficulty && filters.difficulty.length) for (const val of filters.difficulty)
        if (String(g.difficulty).toLowerCase().includes(String(val).toLowerCase())) scores[g.id] += weights.difficulty;
      // mood
      if (filters.mood && filters.mood.length) for (const val of filters.mood)
        if (String(g.mood).toLowerCase().includes(String(val).toLowerCase())) scores[g.id] += weights.mood;
      // keywords
      if (filters.keywords && filters.keywords.length){
        const gk = (g.keywords || []).map(k => String(k).toLowerCase());
        for (const val of filters.keywords) if (gk.some(k => k.includes(String(val).toLowerCase()))) scores[g.id] += weights.keywords;
      }
    }
  }
  return scores;
}

// Rota raiz explícita (garante que `index.html` seja enviada ao acessar '/').
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

// Endpoint de health check para diagnóstico rápido
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helpers para a Steam API
// Retorna metadados básicos sobre o applist em cache (contagem) ou a lista completa se ?full=1
app.get('/steam/applist', async (req, res) => {
  try{
    const full = req.query.full === '1' || req.query.full === 'true';
    const force = req.query.refresh === '1' || req.query.refresh === 'true';
    const apps = await fetchSteamAppList(force);
    if(full) return res.json({ count: apps.length, apps });
    return res.json({ count: apps.length });
  }catch(err){
    console.error('Error fetching steam applist:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Busca no applist da Steam por nome (usa o applist em cache ou fará fetch)
app.get('/steam/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 12));
  if(!q) return res.status(400).json({ error: 'missing query parameter q' });
  try{
    const apps = await fetchSteamAppList();
    const ql = q.toLowerCase();
    const matches = [];
    for(const a of apps){
      if(!a || !a.name) continue;
      if(a.name.toLowerCase().includes(ql)){
        matches.push(a);
        if(matches.length >= limit) break;
      }
    }
    return res.json({ query: q, count: matches.length, results: matches });
  }catch(err){
    console.error('Error searching steam applist:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Proxy para os detalhes do Steam Store para um appid específico
app.get('/steam/app/:appid', async (req, res) => {
  const appid = req.params.appid;
  if(!appid) return res.status(400).json({ error: 'missing appid' });
  try{
    const details = await fetchSteamAppDetails(appid);
    return res.json({ appid, details });
  }catch(err){
    console.error('Error fetching steam app details for', appid, err);
    return res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;

// Export app for testing. When running tests (NODE_ENV === 'test'), don't start the server.
export default app;

// Inicia o servidor após tentar carregar o DB para que as rotas tenham dados quando possível.
async function startServer() {
  try {
    await loadDb();
  } catch (err) {
    console.error('Erro during initial loadDb:', err);
  }
  app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
