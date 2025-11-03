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
    mostrarPergunta();
  } catch (err) {
    quiz.innerHTML = "<p>Erro ao carregar perguntas. Verifique o servidor.</p>";
    console.error(err);
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
    resultado.innerHTML = "<p>Erro ao conectar com o backend. Verifique se o servidor está rodando e atualize a página.</p>";
    console.error(err);
  }
}

function mostrarResultado(game) {
  // garante que o caminho da imagem seja absoluto e carregue da pasta /images
  const rawSrc = game.image ? (game.image.startsWith("/") ? game.image : "/" + game.image) : null;
  // encodeURI trata espaços e caracteres especiais (ex: "The Witcher 3.jpeg" -> "The%20Witcher%203.jpeg")
  const imgSrc = rawSrc ? encodeURI(rawSrc) : null;
  resultado.innerHTML = `
    <div class="result-card">
      ${imgSrc ? `<img src="${imgSrc}" alt="${game.name}" onerror="this.style.display='none'"/>` : ""}
      <div>
        <h3>${game.name}</h3>
        <p><em>${game.genre} • ${game.mood} • ${game.difficulty}</em></p>
        <p>${game.description}</p>
      </div>
    </div>
  `;
}
