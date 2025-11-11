import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { Client } from "pg";

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (index.html, style.css, script.js, imagens, etc.)
app.use(express.static(process.cwd()));

// Perguntas dinâmicas — texto reformulado para clareza e leitura rápida
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

let db = { games: [] };

async function loadDb() {
  // If DB_HOST is defined, try Postgres first
  if (process.env.DB_HOST) {
    const client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      database: process.env.POSTGRES_DB || process.env.DB_NAME || 'meu_banco_docker',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres'
    });
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
    } catch (err) {
      console.error('Erro ao carregar dados do Postgres:', err);
    } finally {
      try { await client.end(); } catch (e) {}
    }
    return;
  }

  // Fallback: read local file if exists
  const dbPath = path.join(process.cwd(), "db.json");
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    } catch (err) {
      console.error('Erro ao ler db.json:', err);
    }
  } else {
    console.warn('db.json não encontrado e nenhuma configuração de DB presente; endpoints /games podem retornar vazio.');
  }
}

// Start loading DB at module load; servers/tests will use whatever is loaded.
loadDb().catch(err => console.error('Erro em loadDb:', err));

// Endpoint para retornar todos os jojos 
app.get("/games", async (req, res) => {
  // If no data loaded yet and Postgres is configured, try loading on demand
  if ((!db.games || db.games.length === 0) && process.env.DB_HOST) {
    try {
      await loadDb();
    } catch (err) {
      console.error('Erro ao recarregar DB on-demand:', err);
    }
  }
  res.json(db.games);
});

// Endpoint para retornar as perguntas 
app.get("/questions", (req, res) => {
  res.json(questions);
});

// Endpoint principal de recomendação
app.post("/recomendar", (req, res) => {
  // Espera body.selectedOptions = ["q1_opt2", "q2_opt1", ...]
  const selected = req.body.selectedOptions || [];
  console.log('/recomendar called with', selected);

  // Monta filtros a partir das opções selecionadas
  const selectedFilters = [];
  for (const optId of selected) {
    for (const q of questions) {
      const opt = q.options.find(o => o.id === optId);
      if (opt) selectedFilters.push(opt.filters || {});
    }
  }

  // Pontuação por jogo: cada match soma pontos com pesos por tipo
  const weights = { genre: 3, difficulty: 2, mood: 2, keywords: 1 };
  const scores = {};
  for (const g of db.games) scores[g.id] = 0;

  for (const filters of selectedFilters) {
    for (const g of db.games) {
      // genre
      if (filters.genre && filters.genre.length) {
        for (const val of filters.genre) {
          if (String(g.genre).toLowerCase().includes(String(val).toLowerCase())) scores[g.id] += weights.genre;
        }
      }
      // difficulty
      if (filters.difficulty && filters.difficulty.length) {
        for (const val of filters.difficulty) {
          if (String(g.difficulty).toLowerCase().includes(String(val).toLowerCase())) scores[g.id] += weights.difficulty;
        }
      }
      // mood
      if (filters.mood && filters.mood.length) {
        for (const val of filters.mood) {
          if (String(g.mood).toLowerCase().includes(String(val).toLowerCase())) scores[g.id] += weights.mood;
        }
      }
      // keywords
      if (filters.keywords && filters.keywords.length) {
        const gk = (g.keywords || []).map(k => String(k).toLowerCase());
        for (const val of filters.keywords) {
          if (gk.some(k => k.includes(String(val).toLowerCase()))) scores[g.id] += weights.keywords;
        }
      }
    }
  }

  // Seleciona o(s) melhor(es)
  const maxScore = Math.max(...Object.values(scores));
  let recommendation;
  if (!isFinite(maxScore) || maxScore === 0) {
    recommendation = db.games[Math.floor(Math.random() * db.games.length)];
  } else {
    const bestIds = Object.entries(scores).filter(([_, v]) => v === maxScore).map(([k]) => Number(k));
    const chosenId = bestIds[Math.floor(Math.random() * bestIds.length)];
    recommendation = db.games.find(g => g.id === chosenId);
  }

  res.json({ recomendacao: recommendation, scores });
});

// Rota raiz explícita (garante que index.html seja enviada quando acessar '/').
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

// Health check for quick diagnostics
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

// Export app for testing. When running tests (NODE_ENV === 'test'), don't start the server.
export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
}
