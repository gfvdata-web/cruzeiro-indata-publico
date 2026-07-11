async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar ${path}: ${res.status}`);
  return res.json();
}

function fmt(v, digits) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number" && digits !== undefined) return v.toFixed(digits);
  return v;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABELS = {
  SCHEDULED: "Agendada",
  TIMED: "Agendada",
  IN_PLAY: "Em andamento",
  PAUSED: "Em andamento",
  FINISHED: "Encerrada",
  POSTPONED: "Adiada",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

// ---------------------------------------------------------------------------
// Tabela genérica: ordenável por clique no cabeçalho.
// ---------------------------------------------------------------------------
function makeSortableTable(tableEl, rows, renderRowFn, defaultSort) {
  const tbody = tableEl.querySelector("tbody");
  const headers = tableEl.querySelectorAll("th[data-sort]");
  let sort = { ...defaultSort };

  function render() {
    const sorted = [...rows].sort((a, b) => {
      let va = a[sort.key];
      let vb = b[sort.key];
      if (va === null || va === undefined) va = typeof vb === "string" ? "" : -Infinity;
      if (vb === null || vb === undefined) vb = typeof va === "string" ? "" : -Infinity;
      if (typeof va === "string" || typeof vb === "string") {
        return sort.asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      }
      return sort.asc ? va - vb : vb - va;
    });

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${headers.length || 20}" class="empty-msg">Sem dados para os filtros atuais.</td></tr>`;
    } else {
      tbody.innerHTML = sorted.map(renderRowFn).join("");
    }

    headers.forEach(th => th.classList.toggle("sorted", th.dataset.sort === sort.key));
    return sorted;
  }

  headers.forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      sort.asc = sort.key === key ? !sort.asc : false;
      sort.key = key;
      render();
    });
  });

  render();
  return { render, setRows(newRows) { rows = newRows; return render(); } };
}

function buildCards(container, cards) {
  container.innerHTML = cards.map(c => `
    <div class="card">
      <div class="value">${c.value}</div>
      <div class="label">${c.label}</div>
    </div>
  `).join("");
}

// ---------------------------------------------------------------------------
// Estado global de dados + filtro de temporada compartilhado entre abas
// ---------------------------------------------------------------------------
const state = {
  season: null,
  matches: [],
  standings: [],
  scorers: [],
};

function setupSeasonFilter() {
  const seasons = [...new Set(state.matches.map(m => m.season))].sort((a, b) => b - a);
  const select = document.getElementById("season-filter");
  select.innerHTML = seasons.map(s => `<option value="${s}">${s}</option>`).join("");
  state.season = seasons[0] ?? null;
  select.value = state.season;

  select.addEventListener("change", () => {
    state.season = Number(select.value);
    renderPartidas();
    renderClassificacao();
    renderArtilheiros();
  });
}

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

// ---------------------------------------------------------------------------
// Aba Partidas
// ---------------------------------------------------------------------------
let partidasTable = null;

function renderPartidas() {
  const rows = state.matches.filter(m => m.season === state.season);

  const finished = rows.filter(m => m.status === "FINISHED");
  const scheduled = rows.filter(m => m.status === "SCHEDULED" || m.status === "TIMED");

  buildCards(document.getElementById("partidas-cards"), [
    { label: "Partidas na temporada", value: rows.length },
    { label: "Encerradas", value: finished.length },
    { label: "Agendadas", value: scheduled.length },
  ]);

  const rowHtml = m => {
    const score = (m.home_score === null || m.home_score === undefined)
      ? "—" : `${m.home_score} x ${m.away_score}`;
    return `
      <tr>
        <td>${fmtDate(m.utc_date)}</td>
        <td>${m.matchday ?? "—"}</td>
        <td>${m.home_team}</td>
        <td><span class="tag">${score}</span></td>
        <td>${m.away_team}</td>
        <td>${STATUS_LABELS[m.status] ?? m.status}</td>
      </tr>
    `;
  };

  if (!partidasTable) {
    partidasTable = makeSortableTable(
      document.getElementById("partidas-table"), rows, rowHtml, { key: "utc_date", asc: true }
    );
  } else {
    partidasTable.setRows(rows);
  }
}

// ---------------------------------------------------------------------------
// Aba Classificação
// ---------------------------------------------------------------------------
let classificacaoTable = null;

function renderClassificacao() {
  const rows = state.standings.filter(s => s.season === state.season);

  const rowHtml = s => `
    <tr>
      <td>${s.position}</td>
      <td>${s.team}</td>
      <td>${fmt(s.played)}</td>
      <td>${fmt(s.won)}</td>
      <td>${fmt(s.draw)}</td>
      <td>${fmt(s.lost)}</td>
      <td>${fmt(s.goals_for)}</td>
      <td>${fmt(s.goals_against)}</td>
      <td>${fmt(s.goal_diff)}</td>
      <td>${fmt(s.points)}</td>
    </tr>
  `;

  if (!classificacaoTable) {
    classificacaoTable = makeSortableTable(
      document.getElementById("classificacao-table"), rows, rowHtml, { key: "position", asc: true }
    );
  } else {
    classificacaoTable.setRows(rows);
  }
}

// ---------------------------------------------------------------------------
// Aba Artilheiros
// ---------------------------------------------------------------------------
let artilheirosTable = null;
let artilheirosSearch = "";

function renderArtilheiros() {
  const rows = state.scorers.filter(s =>
    s.season === state.season &&
    (s.player.toLowerCase().includes(artilheirosSearch) || s.team.toLowerCase().includes(artilheirosSearch))
  );

  const rowHtml = s => `
    <tr>
      <td>${s.player}</td>
      <td>${s.team}</td>
      <td>${fmt(s.goals)}</td>
      <td>${fmt(s.assists)}</td>
      <td>${fmt(s.penalties)}</td>
    </tr>
  `;

  if (!artilheirosTable) {
    artilheirosTable = makeSortableTable(
      document.getElementById("artilheiros-table"), rows, rowHtml, { key: "goals", asc: false }
    );
  } else {
    artilheirosTable.setRows(rows);
  }
}

// ---------------------------------------------------------------------------
async function main() {
  [state.matches, state.standings, state.scorers] = await Promise.all([
    loadJSON("data/fd_matches.json"),
    loadJSON("data/fd_standings.json"),
    loadJSON("data/fd_scorers.json"),
  ]);

  setupTabs();
  setupSeasonFilter();
  renderPartidas();
  renderClassificacao();
  renderArtilheiros();

  document.getElementById("artilheiros-search").addEventListener("input", e => {
    artilheirosSearch = e.target.value.trim().toLowerCase();
    renderArtilheiros();
  });
}

main().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML("afterbegin",
    `<p style="color:#e2453c;text-align:center;padding:1rem">Erro ao carregar dados: ${err.message}</p>`);
});
