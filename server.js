import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (index.html, style.css, script.js, imagens, etc.)
// Usa a pasta atual do projeto como raiz estática para simplicidade.
app.use(express.static(process.cwd()));

// Perguntas dinâmicas com 4 opções elaboradas cada.
// Cada opção tem um id único e um objeto `filters` com atributos a serem usados na recomendação.
const questions = [
  {
    id: "q1",
    text: "Que tipo de experiência você quer agora?",
    options: [
      {
        id: "q1_opt1",
        text: "Uma história profunda e imersiva, com escolhas que importam (narrativa/RPG)",
        filters: { genre: ["RPG"], keywords: ["história", "narrativa", "historia"] }
      },
      {
        id: "q1_opt2",
        text: "Sessões curtas e relaxantes, algo para desestressar (simulação/casual)",
        filters: { genre: ["Simulação"], mood: ["relaxante", "relaxante"] }
      },
      {
        id: "q1_opt3",
        text: "Desafio técnico e combate exigente — quero testar minhas habilidades",
        filters: { difficulty: ["alta", "muito alta"], keywords: ["desafio", "difícil", "difícil"] }
      },
      {
        id: "q1_opt4",
        text: "Criatividade e liberdade: construir, decorar ou criar algo do zero",
        filters: { genre: ["Criativo"], keywords: ["construir", "criativo", "customizar"] }
      }
    ]
  },
  {
    id: "q2",
    text: "Como você prefere jogar?",
    options: [
      { id: "q2_opt1", text: "Sozinho, focado em narrativa e imersão", filters: { mood: ["imersivo", "épico"], genre: ["RPG"] } },
      { id: "q2_opt2", text: "Com amigos ou em modo competitivo", filters: { keywords: ["multiplayer", "competitivo", "equipe"] } },
      { id: "q2_opt3", text: "Puzzles inteligentes e desafios de lógica", filters: { genre: ["Puzzle"], keywords: ["puzzle", "inteligente"] } },
      { id: "q2_opt4", text: "Partidas rápidas e intensas", filters: { keywords: ["rápido", "ação", "adrenalina"] } }
    ]
  },
  {
    id: "q3",
    text: "Qual tom/atmosfera você prefere?",
    options: [
      { id: "q3_opt1", text: "Calmo e relaxante (ideal para baixar o ritmo)", filters: { mood: ["relaxante", "calmo"] } },
      { id: "q3_opt2", text: "Sombrio e misterioso", filters: { mood: ["sombrio"], keywords: ["sombrio", "mistério"] } },
      { id: "q3_opt3", text: "Estiloso e com personagens marcantes", filters: { keywords: ["personagens", "estiloso"] } },
      { id: "q3_opt4", text: "Épico e estratégico, pensar a longo prazo", filters: { genre: ["Estratégia"], mood: ["épico"] } }
    ]
  },
  {
    id: "q4",
    text: "Que tipo de mecânica te chama mais atenção?",
    options: [
      { id: "q4_opt1", text: "Combate rápido e agressivo", filters: { keywords: ["combate", "ação", "rápido"] } },
      { id: "q4_opt2", text: "Exploração e descoberta em mundo aberto", filters: { keywords: ["explorar", "mundo aberto"] } },
      { id: "q4_opt3", text: "Construção, customização e criatividade", filters: { keywords: ["construir", "customizar", "criativo"] } },
      { id: "q4_opt4", text: "Sistema de turnos e decisões táticas", filters: { keywords: ["turnos", "estratégia"], genre: ["Estratégia", "RPG"] } }
    ]
  },
  {
    id: "q5",
    text: "Qual nível de desafio você quer?",
    options: [
      { id: "q5_opt1", text: "Muito difícil — quero um teste sério", filters: { difficulty: ["muito alta"] } },
      { id: "q5_opt2", text: "Desafio moderado e justo", filters: { difficulty: ["média"] } },
      { id: "q5_opt3", text: "Fácil / relax — não quero frustração", filters: { difficulty: ["baixa"] } },
      { id: "q5_opt4", text: "Indiferente — o jogo pode me surpreender", filters: { } }
    ]
  },
  {
    id: "q6",
    text: "Algo mais que te interessa?",
    options: [
      { id: "q6_opt1", text: "Boas histórias e diálogos inteligentes", filters: { keywords: ["narrativa", "diálogos", "história"] } },
      { id: "q6_opt2", text: "Multiplayer e interação com outros jogadores", filters: { keywords: ["multiplayer", "coop", "equipe"] } },
      { id: "q6_opt3", text: "Rejogabilidade — mecânicas que mudam a cada partida", filters: { keywords: ["roguelike", "repetível"] } },
      { id: "q6_opt4", text: "Gráficos e estética marcantes", filters: { keywords: ["estiloso"] } }
    ]
  }
];

const dbPath = path.join(process.cwd(), "db.json");
let db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

// Endpoint para retornar todos os jogos (opcional)
app.get("/games", (req, res) => {
  res.json(db.games);
});

// Endpoint para retornar as perguntas (cada uma com 4 opções elaboradas)
app.get("/questions", (req, res) => {
  res.json(questions);
});

// Endpoint principal de recomendação
app.post("/recomendar", (req, res) => {
  // Espera body.selectedOptions = ["q1_opt2", "q2_opt1", ...]
  const selected = req.body.selectedOptions || [];

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
    // fallback aleatório
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
