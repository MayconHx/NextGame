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
