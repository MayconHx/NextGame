/*
  script.js - lógica do quiz (cliente)
  - Carrega perguntas via `/questions`
  - Renderiza cartões de missão (mission cards)
  - Envia seleções para `/recomendar/top` e mostra resultados
*/

const quiz = document.getElementById("quiz");
const resultado = document.getElementById("resultado");
const modal = document.getElementById("modal");
const startBtn = document.getElementById("startBtn");

let questions = [];
let selectedOptions = [];
let indice = 0;

startBtn.addEventListener("click", () => {
  modal.style.display = "none";
  initQuiz();
});


// Inicia o quiz: busca as perguntas e renderiza a primeira.
async function initQuiz() {
  quiz.innerHTML = "<p>Carregando perguntas...</p>";
  try {
    const res = await fetch("/questions");
    questions = await res.json();
    indice = 0;
    selectedOptions = [];
    const steamContainer = document.getElementById('steamSearchContainer');
    if (steamContainer) steamContainer.style.display = 'none';
    // mostrar a barra de progresso
    const prog = document.getElementById('progress');
    if (prog) { prog.style.display = 'block'; updateProgress(); }
    mostrarPergunta();
  } catch (err) {
    console.error(err);
    quiz.innerHTML = `
      <div class="question-card">
        <p><strong>Erro ao conectar com o servidor.</strong></p>
        <p>Verifique se o backend está rodando e clique em "Tentar novamente". Se você estiver usando Docker, certifique-se de que o serviço do app e do Postgres estão levantados.</p>
        <div style="margin-top:12px">
          <button id="retryBtn">Tentar novamente</button>
        </div>
      </div>
    `;
    const rb = document.getElementById('retryBtn');
    if (rb) rb.addEventListener('click', () => initQuiz());
  }
}

function mostrarPergunta() {
  if (indice < questions.length) {
    const q = questions[indice];

    // utilitário: mapear filtros -> dificuldade / foco / tempo
    const mapDifficulty = (filters) => {
      if (!filters) return 'Média';
      const d = filters.difficulty || [];
      if (d.some(x=>/muito|muito alta|muitoalto/i.test(x))) return 'Alta';
      if (d.some(x=>/alta/i.test(x))) return 'Alta';
      if (d.some(x=>/média|media/i.test(x))) return 'Média';
      if (d.some(x=>/baixa/i.test(x))) return 'Baixa';
      return 'Média';
    };
    const mapFocus = (filters) => {
      if (!filters) return 'Exploração';
      const g = (filters.genre||[]).join(' ').toLowerCase();
      const k = (filters.keywords||[]).join(' ').toLowerCase();
      if (/rpg|história|historia|narrativa/.test(g+k)) return 'História';
      if (/simulação|simulacao|simulação|simulacao|simulador|simulador/.test(g+k)) return 'Simulação';
      if (/multiplayer|competitivo|equipe/.test(k)) return 'Multiplayer';
      if (/puzzle|inteligente/.test(k)) return 'Puzzle';
      if (/construir|construção|construcao|criativo/.test(k+g)) return 'Criatividade';
      return 'Exploração';
    };
    const mapTime = (filters) => {
      if (!filters) return 'Médio';
      const m = (filters.mood||[]).join(' ').toLowerCase();
      const k = (filters.keywords||[]).join(' ').toLowerCase();
      if (/rápido|rapido|curto/.test(k+m)) return 'Curto';
      if (/relaxante|calmo|relax/.test(m+k)) return 'Longo';
      return 'Médio';
    };

    const iconFor = (filters, text) => {
      const g = (filters && filters.genre)? (filters.genre.join(' ').toLowerCase()) : '';
      const k = (filters && filters.keywords)? (filters.keywords.join(' ').toLowerCase()) : '';
      if (/rpg|jrpg|rpg/.test(g+k)) return '🗡️';
      if (/simulação|simulacao|simulator|simulador|sim/.test(g+k)) return '🌿';
      if (/desafio|difícil|difícil|alta|muito alta|muitoalta/.test(g+k)) return '⚔️';
      if (/criativ|construir|customiz|construção/.test(g+k)) return '🎨';
      if (/multiplayer|competitiv|equipe/.test(k)) return '🤝';
      if (/puzzle|puzzle/.test(k)) return '🧩';
      if (/história|historia|narrativa/.test(text.toLowerCase())) return '🎭';
      return '🎮';
    };

    const cards = q.options.map(o => {
      const diff = mapDifficulty(o.filters);
      const focus = mapFocus(o.filters);
      const time = mapTime(o.filters);
      const icon = iconFor(o.filters, o.text);
      return `
        <div class="mission-card" role="button" tabindex="0" data-opt-id="${o.id}">
          <div class="icon">${icon}</div>
          <h4>${o.text}</h4>
          <p class="desc">${o.text}</p>
          <div class="status">
            <span>⭐ Dificuldade: ${diff}</span>
            <span>🎲 Foco: ${focus}</span>
            <span>⏳ Tempo: ${time}</span>
          </div>
        </div>
      `;
    }).join('');

    quiz.innerHTML = `
      <div class="question-card">
        <p><strong>${q.text}</strong></p>
        <div class="mission-grid">${cards}</div>
      </div>
    `;
    updateProgress();

    // anexar manipuladores de clique e teclado aos cartões de missão
    document.querySelectorAll('.mission-card').forEach(card => {
      card.addEventListener('click', () => {
        const optId = card.getAttribute('data-opt-id');
        responder(optId);
      });
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const optId = card.getAttribute('data-opt-id');
          responder(optId);
        }
      });
    });
  } else {
    enviarRespostas();
  }
}

function responder(optId) {
  selectedOptions.push(optId);
  indice++;
  mostrarPergunta();
}


function updateProgress(){
  const prog = document.getElementById('progress');
  if (!prog || !questions.length) return;
  // calcular porcentagem: perguntas respondidas / total
  let pct = 0;
  const total = questions.length;
  if (total > 0) {
    pct = Math.round((Math.min(indice, total) / total) * 100);
  }
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  const bar = prog.querySelector('i');
  if (bar) bar.style.width = pct + '%';
  prog.setAttribute('aria-valuenow', pct);
}

async function enviarRespostas() {
  quiz.innerHTML = "";
  resultado.innerHTML = "<p>Calculando suas recomendações...</p>";

  try {
    const res = await fetch("/recomendar/top", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedOptions, n: 5 })
    });

    const data = await res.json();
    // servidor agora retorna objetos compactos: { id, name, genres, shortDescription, image, score, steamLink, usedSteam }
    mostrarResultados(data.recomendacoes || []);
  } catch (err) {
    console.error(err);
    resultado.innerHTML = `
      <div class="question-card">
        <p><strong>Erro ao conectar com o backend.</strong></p>
        <p>Verifique se o servidor está rodando. Você pode tentar novamente abaixo.</p>
        <div style="margin-top:12px">
          <button id="retrySend">Tentar novamente</button>
        </div>
      </div>
    `;
    const r2 = document.getElementById('retrySend');
    if (r2) r2.addEventListener('click', () => enviarRespostas());
  }
}

function mostrarResultados(list){
  if(!Array.isArray(list) || list.length===0){
    resultado.innerHTML = '<div class="question-card">Nenhuma recomendação disponível.</div>';
    return;
  }
  // renderizar até 6 cartões
  const PLACEHOLDER = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='%23060b06'/><text x='50%' y='50%' font-family='Arial' font-size='18' fill='%2339FF14' dominant-baseline='middle' text-anchor='middle'>Imagem indisponível</text></svg>`);
  const cardsHtml = list.slice(0,6).map(item => {
    // garante que imagens locais tenham caminho absoluto e caracteres escapados
    let imgSrc = item.image || null;
    if (imgSrc) {
      if (!/^https?:\/\//i.test(imgSrc)) {
        imgSrc = imgSrc.startsWith('/') ? imgSrc : '/' + imgSrc;
        imgSrc = encodeURI(imgSrc);
      }
    } else {
      imgSrc = `data:image/svg+xml;utf8,${PLACEHOLDER}`;
    }
    const imgTag = `<div class="card-img"><img src="${imgSrc}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,${PLACEHOLDER}'"/></div>`;
    const genres = Array.isArray(item.genres) ? item.genres.join(' • ') : (item.genres||'');
    const short = item.shortDescription || '';
    const steamUrl = item.steamLink ? item.steamLink : `https://store.steampowered.com/search/?term=${encodeURIComponent(item.name)}`;
    const steamBtn = `<a class="btn secondary steam-btn" href="${steamUrl}" target="_blank" rel="noopener">Ver na Steam</a>`;
    return `
      <article class="rec-card">
        ${imgTag}
        <div class="rec-body">
          <h3 class="rec-title">${item.name}</h3>
          <div class="rec-meta">${genres}</div>
          <p class="rec-desc">${short}</p>
          <div class="rec-foot">
            <span class="rec-score">Score: <strong>${item.score}</strong></span>
            <div class="rec-actions">${steamBtn}</div>
          </div>
        </div>
      </article>
    `;
  }).join('');
  resultado.innerHTML = `<div id="recs">${cardsHtml}</div>`;

  const prog = document.getElementById('progress');
  if (prog) {
    const bar = prog.querySelector('i');
    if (bar) bar.style.width = '100%';
    prog.setAttribute('aria-valuenow', 100);
  }
  try {
    launchConfetti(24);
  } catch (e) { /* ignorar erros visuais */ }
}



function launchConfetti(amount = 150){
  const colors = ['#FFD166','#06B6D4','#06D6A0','#FF6B6B','#8ECAE6','#39FF14'];
  for (let i=0;i<amount;i++){
    const el = document.createElement('div');
    el.className = 'confetti-piece confetti-pop';
    el.style.left = (20 + Math.random()*60) + 'vw';
    el.style.top = (10 + Math.random()*10) + 'vh';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.width = (6 + Math.random()*10) + 'px';
    el.style.height = (6 + Math.random()*10) + 'px';
    el.style.borderRadius = (Math.random()>0.5? '2px' : '50%');
    el.style.transform = `rotate(${Math.random()*360}deg)`;
    el.style.opacity = 0.95;
    el.style.zIndex = 9999;
    document.body.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 1200 + Math.random()*1400);
  }
}

