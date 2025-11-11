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

// --- Steam search UI binding ---
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('steamSearchBtn');
  const input = document.getElementById('steamQuery');
  if (btn && input) {
    btn.addEventListener('click', async () => {
      const q = input.value.trim();
      if (!q) return;
      await performSteamSearch(q);
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') btn.click();
    });
  }
});

async function performSteamSearch(q){
  const resultsEl = document.getElementById('steamResults');
  const detailsEl = document.getElementById('steamDetails');
  if(resultsEl) resultsEl.innerHTML = '<div class="question-card">Buscando...</div>';
  if(detailsEl) detailsEl.innerHTML = '';
  try{
    const res = await fetch(`/steam/search?q=${encodeURIComponent(q)}&limit=20`);
    if(!res.ok) throw new Error('Erro na busca');
    const json = await res.json();
    renderSteamResults(json.results || []);
  }catch(err){
    console.error('steam search error', err);
    if(resultsEl) resultsEl.innerHTML = `<div class="question-card"><strong>Erro ao buscar na Steam:</strong> ${String(err)}</div>`;
  }
}

function renderSteamResults(items){
  const resultsEl = document.getElementById('steamResults');
  if(!resultsEl) return;
  if(!items || items.length===0){ resultsEl.innerHTML = '<div class="question-card">Nenhum resultado encontrado.</div>'; return; }
  resultsEl.innerHTML = '';
  for(const it of items){
    const div = document.createElement('div');
    div.className = 'steam-result';
    div.textContent = `${it.name} (${it.appid})`;
    div.addEventListener('click', () => showSteamDetails(it.appid));
    resultsEl.appendChild(div);
  }
}

async function showSteamDetails(appid){
  const detailsEl = document.getElementById('steamDetails');
  if(!detailsEl) return;
  detailsEl.innerHTML = '<div class="question-card">Carregando detalhes...</div>';
  try{
    const res = await fetch(`/steam/app/${encodeURIComponent(appid)}`);
    if(!res.ok) throw new Error('Erro ao obter detalhes');
    const json = await res.json();
    const body = json.details && json.details.data ? json.details.data : null;
    if(!body || !json.details.success){
      detailsEl.innerHTML = `<div class="question-card">Detalhes indisponíveis para appid ${appid}.</div>`;
      return;
    }
    // Render some useful fields
    const name = body.name || '—';
    const desc = body.short_description || body.about_the_game || '';
    const header = `<h4>${name} — ${appid}</h4>`;
    const htmlDesc = `<p>${desc}</p>`;
    const img = (body.header_image) ? `<img src="${body.header_image}" alt="${name}" style="max-width:220px;border-radius:8px;margin-bottom:8px"/>` : '';
    const meta = [];
    if(body.release_date && body.release_date.date) meta.push(`Lançamento: ${body.release_date.date}`);
    if(body.developers) meta.push(`Dev: ${Array.isArray(body.developers)?body.developers.join(', '):body.developers}`);
    if(body.publishers) meta.push(`Publisher: ${Array.isArray(body.publishers)?body.publishers.join(', '):body.publishers}`);
    const metaHtml = `<p>${meta.join(' • ')}</p>`;
    detailsEl.innerHTML = `${img}${header}${metaHtml}${htmlDesc}`;
  }catch(err){
    console.error('showSteamDetails error', err);
    detailsEl.innerHTML = `<div class="question-card">Erro ao obter detalhes: ${String(err)}</div>`;
  }
}

async function initQuiz() {
  quiz.innerHTML = "<p>Carregando perguntas...</p>";
  try {
    const res = await fetch("/questions");
    questions = await res.json();
    indice = 0;
    selectedOptions = [];
    // hide steam search when (re)starting quiz
    const steamContainer = document.getElementById('steamSearchContainer');
    if (steamContainer) steamContainer.style.display = 'none';
    // show progress bar
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
    if (rb) rb.addEventListener('click', () => {
      initQuiz();
    });
  }
}

function mostrarPergunta() {
  if (indice < questions.length) {
    const q = questions[indice];
    const optionsHtml = q.options.map(o => `
      <button class=\"opt-btn\" data-opt-id=\"${o.id}\">${o.text}</button>
    `).join("");

    quiz.innerHTML = `
      <div class="question-card">
        <p><strong>${q.text}</strong></p>
        <div class="options">${optionsHtml}</div>
      </div>
    `;
    updateProgress();

    // attach listeners
    document.querySelectorAll('.opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const optId = btn.getAttribute('data-opt-id');
        responder(optId);
      });
    });
    // avatar removed: no preview update
  } else {
    enviarRespostas();
  }
}

function responder(optId) {
  selectedOptions.push(optId);
  indice++;
  mostrarPergunta();
}

// avatar feature removed per user request

function updateProgress(){
  const prog = document.getElementById('progress');
  if (!prog || !questions.length) return;
  // compute percentage: number of answered questions over total
  // when indice equals questions.length treat as 100
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
  // render up to 5 cards with Steam link + details button when available
  const cardsHtml = list.slice(0,5).map(item => {
    const g = item.game;
    const steamObj = item.steam;
    const steam = steamObj && steamObj.details && steamObj.details.data ? steamObj.details.data : null;
    const appid = steamObj && steamObj.appid ? steamObj.appid : null;
    const img = steam && steam.header_image ?
      `<img src="${steam.header_image}" alt="${g.name}" style="width:220px;height:120px;object-fit:cover;border-radius:8px"/>` :
      (g.image?`<img src="${encodeURI('/'+g.image)}" style="width:220px;height:120px;object-fit:cover;border-radius:8px"/>`:'');
    const short = steam ? (steam.short_description || steam.about_the_game || '') : (g.description || '');
    const steamLink = appid ? `https://store.steampowered.com/app/${appid}/` : null;
    return `
      <div class="result-card">
        ${img}
        <div class="result-meta">
          <h3>${g.name}</h3>
          <p class="muted"><em>${g.genre} • ${g.mood} • ${g.difficulty}</em></p>
          <p class="short">${short}</p>
          <p style="font-weight:700">Score: ${item.score}</p>
          <div class="result-actions">
            ${appid ? `<a class="btn" href="${steamLink}" target="_blank" rel="noopener">Ver na Steam</a>` : ''}
            ${appid ? `<button class="btn secondary" data-appid="${appid}" onclick="showSteamDetails(${appid})">Detalhes</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  resultado.innerHTML = cardsHtml;
  // Ensure progress shows 100% now that recommendations are displayed
  const prog = document.getElementById('progress');
  if (prog) {
    const bar = prog.querySelector('i');
    if (bar) bar.style.width = '100%';
    prog.setAttribute('aria-valuenow', 100);
  }
  // show steam search container so user can further explore
  const steamContainer = document.getElementById('steamSearchContainer');
  if (steamContainer) steamContainer.style.display = 'block';
}

function mostrarResultado(game) {
  // ensure progress shows 100%
  const prog = document.getElementById('progress');
  if (prog) {
    const bar = prog.querySelector('i');
    if (bar) bar.style.width = '100%';
    prog.setAttribute('aria-valuenow', 100);
  }
  // garante que o caminho da imagem seja absoluto e carregue da pasta /images
  const rawSrc = game.image ? (game.image.startsWith("/") ? game.image : "/" + game.image) : null;
  // encodeURI trata espaços e caracteres especiais (ex: "The Witcher 3.jpeg" -> "The%20Witcher%203.jpeg")
  const imgSrc = rawSrc ? encodeURI(rawSrc) : null;
  resultado.innerHTML = `
    <div class="result-card celebrate-scale" id="resultCard">
      ${imgSrc ? `<img id="resultImg" src="${imgSrc}" alt="${game.name}" onerror="this.style.display='none'"/>` : ""}
      <div>
        <h3>${game.name}</h3>
        <p><em>${game.genre} • ${game.mood} • ${game.difficulty}</em></p>
        <p>${game.description}</p>
        <div class="badge" id="badge"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.9 6.3L21 9.2l-5 3.9L17 21l-5-3.2L7 21l1-7.9-5-3.9 6.1-0.9L12 2z" fill="#052021"/></svg> Conquistou <span class="xp-counter" id="xpCounter">+0 XP</span></div>
      </div>
    </div>
  `;

  // animate XP counter
  const xpEl = document.getElementById('xpCounter');
  const resultCard = document.getElementById('resultCard');
  if (xpEl) {
    let xp = 0;
    const target = 50; // award 50 XP for completing quiz
    const step = Math.max(1, Math.floor(target / 25));
    const iv = setInterval(() => {
      xp += step;
      if (xp >= target) { xp = target; clearInterval(iv); }
      xpEl.textContent = `+${xp} XP`;
    }, 20);
  }

  // small confetti burst
  launchConfetti(18);
}

function launchConfetti(amount = 12){
  const colors = ['#FFD166','#06B6D4','#06D6A0','#FF6B6B','#8ECAE6'];
  for (let i=0;i<amount;i++){
    const el = document.createElement('div');
    el.className = 'confetti-piece confetti-fall';
    el.style.left = Math.random()*100 + 'vw';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.width = (8+Math.random()*10) + 'px';
    el.style.height = (6+Math.random()*10) + 'px';
    el.style.transform = `rotate(${Math.random()*360}deg)`;
    document.body.appendChild(el);
    // remove after animation
    setTimeout(()=>{ el.remove(); }, 2000 + Math.random()*800);
  }
}
