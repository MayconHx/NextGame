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


async function initQuiz() {
  quiz.innerHTML = "<p>Carregando perguntas...</p>";
  try {
    const res = await fetch("/questions");
    questions = await res.json();
    indice = 0;
    selectedOptions = [];
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
    // update avatar preview while answering
    updateAvatar();
  } else {
    enviarRespostas();
  }
}

function responder(optId) {
  selectedOptions.push(optId);
  indice++;
  mostrarPergunta();
}

// --- Avatar assembly logic ---
function getOptionById(id){
  for(const q of questions){
    const opt = q.options.find(o=>o.id===id);
    if(opt) return opt;
  }
  return null;
}

function getAccessoriesForSelected(selected){
  const acc = new Set();
  for(const id of selected){
    const opt = getOptionById(id);
    if(!opt || !opt.filters) continue;
    const f = opt.filters;
    // genre
    if(f.genre){
      for(const g of f.genre){
        const gg = String(g).toLowerCase();
        if(gg.includes('rpg')){ acc.add('cloak'); acc.add('sword'); }
        if(gg.includes('simulação')||gg.includes('simul')) acc.add('flower');
        if(gg.includes('criativo')) acc.add('paintbrush');
        if(gg.includes('puzzle')) acc.add('monocle');
        if(gg.includes('estratégia')) acc.add('shield');
      }
    }
    // difficulty
    if(f.difficulty){
      for(const d of f.difficulty){
        const dd = String(d).toLowerCase();
        if(dd.includes('muito')||dd.includes('alta')) acc.add('helmet');
      }
    }
    // mood
    if(f.mood){
      for(const m of f.mood){
        const mm = String(m).toLowerCase();
        if(mm.includes('relax')) acc.add('leaf');
        if(mm.includes('sombr')||mm.includes('desafiador')) acc.add('mask');
        if(mm.includes('épico')||mm.includes('epic')) acc.add('banner');
      }
    }
    // keywords
    if(f.keywords){
      for(const k of f.keywords){
        const kk = String(k).toLowerCase();
        if(kk.includes('multiplayer')||kk.includes('competitiv')) acc.add('headset');
        if(kk.includes('roguelike')||kk.includes('repet')) acc.add('compass');
        if(kk.includes('ação')||kk.includes('rápido')||kk.includes('acao')) acc.add('boots');
        if(kk.includes('construir')||kk.includes('custom')||kk.includes('constru')) acc.add('paintbrush');
      }
    }
  }
  // fallback: if none selected yet, show default cap
  if(acc.size===0) acc.add('cap');
  // limit number of accessories to 4
  return Array.from(acc).slice(0,4);
}

function renderAvatar(accessories){
  const avatarEl = document.getElementById('avatar');
  if(!avatarEl) return;
  // build simple SVG with base and accessory groups
  const labels = accessories.map(a=>`<span class="accessory-label">${a}</span>`).join('');
  const svg = `
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">
      <defs>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.25"/></filter>
      </defs>
      <!-- body -->
      <g id="base" filter="url(#soft)">
        <circle cx="100" cy="60" r="36" fill="#ffd8b6" />
        <rect x="60" y="100" width="80" height="90" rx="18" fill="#08303a" />
        <rect x="80" y="180" width="40" height="12" rx="6" fill="#022426" />
      </g>
      <!-- accessories -->
      ${accessories.includes('cap')?`<g id="cap"><path d="M64 48c8-18 72-18 88 0-12 18-80 18-88 0z" fill="#064e3b"/></g>`:''}
      ${accessories.includes('cloak')?`<g id="cloak"><path d="M60 110 q40 50 80 0 v-12 q-40 36 -80 0z" fill="#3b0f3b" opacity="0.95"/></g>`:''}
      ${accessories.includes('sword')?`<g id="sword" transform="translate(140,120) rotate(-20)"><rect x="0" y="0" width="6" height="64" fill="#cbd5e1"/><rect x="-6" y="64" width="18" height="8" fill="#92400e"/></g>`:''}
      ${accessories.includes('helmet')?`<g id="helmet"><ellipse cx="100" cy="46" rx="42" ry="22" fill="#9ca3af" opacity="0.95"/></g>`:''}
      ${accessories.includes('headset')?`<g id="headset"><rect x="56" y="44" width="12" height="24" rx="6" fill="#111827"/><rect x="132" y="44" width="12" height="24" rx="6" fill="#111827"/><path d="M68 52 q32 18 64 0" stroke="#111827" stroke-width="6" fill="none" stroke-linecap="round"/></g>`:''}
      ${accessories.includes('monocle')?`<g id="monocle"><circle cx="120" cy="60" r="8" stroke="#111827" stroke-width="2" fill="rgba(255,255,255,0.06)"/><line x1="128" y1="64" x2="150" y2="84" stroke="#d1d5db" stroke-width="1"/></g>`:''}
      ${accessories.includes('paintbrush')?`<g id="paintbrush" transform="translate(34,150) rotate(-20)"><rect x="0" y="0" width="48" height="6" rx="3" fill="#a16207"/><path d="M48 3 q12 6 18 0 q-6 -10 -18 0z" fill="#ef4444"/></g>`:''}
      ${accessories.includes('flower')?`<g id="flower" transform="translate(60,32)"><circle cx="0" cy="0" r="6" fill="#ffd166"/><path d="M8 0 a8 8 0 0 1 -8 8" stroke="#ff8c42" stroke-width="3"/></g>`:''}
      ${accessories.includes('shield')?`<g id="shield" transform="translate(8,120)"><path d="M16 0 l32 0 l8 20 q-24 20 -48 0z" fill="#0f1720" stroke="#94a3b8" stroke-width="2"/></g>`:''}
      ${accessories.includes('mask')?`<g id="mask"><rect x="76" y="56" width="48" height="18" rx="9" fill="#111827" opacity="0.95"/></g>`:''}
      ${accessories.includes('compass')?`<g id="compass" transform="translate(4,200)"><circle cx="12" cy="12" r="12" fill="#06b6d4"/><path d="M12 6 L15 12 L12 18 L9 12 Z" fill="#022426"/></g>`:''}
      ${accessories.includes('boots')?`<g id="boots"><rect x="70" y="186" width="18" height="8" rx="4" fill="#7c2d12"/><rect x="112" y="186" width="18" height="8" rx="4" fill="#7c2d12"/></g>`:''}
    </svg>`;
  avatarEl.innerHTML = svg + `<div class="accessory-labels">${labels}</div>`;
}

function updateAvatar(){
  const avatarEl = document.getElementById('avatar');
  if(!avatarEl) return;
  const acc = getAccessoriesForSelected(selectedOptions);
  renderAvatar(acc);
}

// update avatar when showing final result too
const origMostrarResultado = mostrarResultado;

function updateProgress(){
  const prog = document.getElementById('progress');
  if (!prog || !questions.length) return;
  // clamp percentage between 0 and 100
  let pct = Math.round((indice/questions.length)*100);
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  const bar = prog.querySelector('i');
  if (bar) bar.style.width = pct + '%';
  prog.setAttribute('aria-valuenow', pct);
}

async function enviarRespostas() {
  quiz.innerHTML = "";
  resultado.innerHTML = "<p>Calculando sua recomendação...</p>";

  try {
    const res = await fetch("/recomendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedOptions })
    });

    const data = await res.json();
    mostrarResultado(data.recomendacao);
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
  // update avatar to final accessories
  updateAvatar();
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
