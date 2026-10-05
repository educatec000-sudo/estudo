/* ==========================================================================
   ARENA ESTUDOS — ALEPA 002/2026 (Fundação CETAP) — Cargo 15
   Núcleo: estado, painel, treino, simulado, geradores infinitos
   ========================================================================== */
'use strict';

/* --------------------------- 1. UTILITÁRIOS ------------------------------ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LSKEY = 'alepa_estudos_v1';
const hojeISO = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local
const dia = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const nf = (n, d = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const uniq = a => [...new Set(a)];
function toast(msg, ms = 2100) {
  $$('.toast').forEach(t => t.remove());
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg;
  document.body.appendChild(d); setTimeout(() => d.remove(), ms);
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const diffDias = (a, b) => Math.round((dia(a) - dia(b)) / 86400000);
const fmtData = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/* ------------------------------ 2. ESTADO -------------------------------- */
const EDITAL = window.__EDITAL__;
const BANCO = window.__BANCO__;
const TEORIA = window.__TEORIA__ || {};
const MATERIAS = EDITAL.materias;
const MATBYID = Object.fromEntries(MATERIAS.map(m => [m.id, m]));

function estadoInicial() {
  return {
    v: 1, criado: Date.now(),
    config: {
      metaDia: 41, metaTotal: 3000, dataProva: EDITAL.data_prova,
      tempoProvaMin: 240, nome: '', modeloIA: 'openai/gpt-oss-120b', tokenIA: ''
    },
    resp: {},        // qid -> {t,a,ok,ult,cx,prox}
    hist: {},        // 'YYYY-MM-DD' -> {q,a,min}
    fav: {}, notas: {}, teoria: {},
    geradas: [],     // questões criadas pela IA
    importadas: [],  // questões de provas antigas coladas pelo usuário
    provas: [],      // simulados concluídos
    ia: { msgs: [], comparar: false, gerarParalelo: false }
  };
}
let S = (() => {
  try { const raw = localStorage.getItem(LSKEY); if (raw) return Object.assign(estadoInicial(), JSON.parse(raw)); } catch (e) { }
  return estadoInicial();
})();
let AVISO_STORAGE = false;
function storageOk() { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch (e) { return false; } }
function salvar() {
  try { localStorage.setItem(LSKEY, JSON.stringify(S)); }
  catch (e) {
    if (!AVISO_STORAGE) { AVISO_STORAGE = true; toast('⚠️ Este navegador/preview não permite salvar o progresso. Baixe o arquivo HTML e abra no seu navegador para gravar seus dados.', 6000); }
  }
}

/* índice de questões: banco curado + geradas pela IA */
function bancoCompleto() {
  return BANCO
    .concat(S.geradas.map(g => Object.assign({ ia: true }, g)))
    .concat((S.importadas || []).map(q => Object.assign({ importada: true }, q)));
}
let QIDX = {};
function reindexar() { QIDX = {}; bancoCompleto().forEach(q => QIDX[q.id] = q); }
reindexar();
const Q_ALL = () => bancoCompleto().filter(q => MATBYID[q.materia]);
const porMateria = mid => Q_ALL().filter(q => q.materia === mid);
const statQ = qid => S.resp[qid] || null;

/* ------------------------- 3. REGISTRO DE RESPOSTA ----------------------- */
const CAIXAS = [0, 1, 2, 4, 9, 20]; // dias entre revisões (Leitner)
function registrarResposta(qid, acertou, opts = {}) {
  const nome = qid;
  let r = S.resp[qid] || { t: 0, a: 0, ok: 0, ult: 0, cx: 0, prox: 0 };
  r.t++; if (acertou) r.ok++;
  r.ult = Date.now();
  r.cx = acertou ? Math.min((r.cx || 0) + 1, CAIXAS.length - 1) : 0;
  r.prox = Date.now() + CAIXAS[r.cx] * 86400000;
  S.resp[qid] = r;
  const h = S.hist[hojeISO()] || { q: 0, a: 0, min: 0 };
  h.q++; if (acertou) h.a++;
  S.hist[hojeISO()] = h;
  if (opts.tempo) h.min = (h.min || 0) + opts.tempo;
  salvar(); atualizarBadges();
  if (typeof agendarPush === 'function') agendarPush();
}
function marcarTempo(seg) {
  const h = S.hist[hojeISO()] || { q: 0, a: 0, min: 0 };
  h.min = (h.min || 0) + seg / 60; S.hist[hojeISO()] = h; salvar();
}

/* ------------------------------ 4. MÉTRICAS ------------------------------ */
function metricas() {
  const ids = Object.keys(S.resp);
  const resp = ids.length ? ids.map(i => S.resp[i]) : [];
  /* "questões feitas" = soma do que foi respondido em cada dia (inclui repetições);
     "acertos" vem do mesmo histórico. Antes daqui saía a soma dos *timestamps*. */
  const tot = Object.keys(S.hist).reduce((s, d) => s + (S.hist[d] && S.hist[d].q || 0), 0);
  const ok = Object.keys(S.hist).reduce((s, d) => s + (S.hist[d] && S.hist[d].a || 0), 0);
  const hoje = S.hist[hojeISO()] || { q: 0, a: 0, min: 0 };
  const dias = Object.keys(S.hist).filter(d => S.hist[d].q > 0).sort();
  // streak
  let streak = 0;
  if (dias.length) {
    let d = dia(new Date());
    if (!(hoje.q > 0)) d = new Date(d.getTime() - 86400000);
    for (; ;) {
      const k = d.toLocaleDateString('sv-SE');
      if (S.hist[k] && S.hist[k].q > 0) { streak++; d = new Date(d.getTime() - 86400000); } else break;
    }
  }
  const prova = dia(new Date(S.config.dataProva + 'T12:00:00'));
  const restam = diffDias(prova, dia(new Date()));
  const metaTotal = S.config.metaTotal || 3000;
  const faltam = Math.max(0, metaTotal - tot);
  const metaDia = restam > 0 ? Math.ceil(faltam / restam) : faltam;
  return { tot, ok, pct: tot ? ok / tot * 100 : 0, hoje, streak, dias: dias.length, restam, faltam, metaTotal, metaDia, unicas: ids.length, provas: S.provas.length };
}
function statsMateria(mid) {
  const qs = porMateria(mid); let t = 0, ok = 0, vistas = 0;
  qs.forEach(q => { const r = statQ(q.id); if (r) { t++; ok += r.ok ? 1 : 0; vistas++; } });
  return { banco: qs.length, vistas, t, ok, pct: t ? ok / t * 100 : 0, cobertura: qs.length ? vistas / qs.length * 100 : 0 };
}
function emRevisao(qid) { const r = statQ(qid); return !!r && r.prox <= Date.now(); }

/* --------------------------- 5. NAVEGAÇÃO (TABS) ------------------------- */
/* As funções de render estão em dois arquivos; usamos wrappers para resolver
   cada uma apenas no momento da renderização (evita erro de ordem de carga). */
const TABS = [
  { id: 'painel', nome: '🎯 Painel', render: r => renderPainel(r) },
  { id: 'treinar', nome: '✍️ Treinar', render: r => renderTreinar(r) },
  { id: 'simulado', nome: '⏱️ Simulado', render: r => renderSimulado(r) },
  { id: 'ia', nome: '🤖 IA / Hugging Face', render: r => renderIA(r) },
  { id: 'teoria', nome: '📚 Teoria', render: r => renderTeoria(r) },
  { id: 'progresso', nome: '📈 Progresso', render: r => renderProgresso(r) },
  { id: 'plano', nome: '🗓️ Plano até a prova', render: r => renderPlano(r) }
];
let TAB = 'painel';
function atualizarBadges() {
  const m = metricas();
  const el = $('#badge-hoje'); if (el) el.textContent = `${m.hoje.q}/${S.config.metaDia} hoje`;
  const up = $('#badge-up'); if (up) up.textContent = `${m.restam} dias`;
}
function irPara(tab) {
  TAB = tab; location.hash = tab;
  const t = TABS.find(x => x.id === tab) || TABS[0];
  $$('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t.id));
  const app = $('#app'); app.innerHTML = ''; t.render(app);
  atualizarBadges(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function montarTabs() {
  const nav = $('nav.tabs');
  nav.innerHTML = TABS.map(t => `<button data-tab="${t.id}"${t.id === TAB ? ' class="active"' : ''}>${t.nome}</button>`).join('');
  nav.onclick = e => { const b = e.target.closest('button[data-tab]'); if (b) irPara(b.dataset.tab); };
}

/* ------------------------------- 6. PAINEL ------------------------------- */
/* Largura de barra em %: numero simples entre 0 e 100 (nunca notacao cientifica,
   que o navegador ignora silenciosamente). */
function larguraPct(x) { const v = Number(x); if (!isFinite(v)) return 0; return Math.max(0, Math.min(100, +v.toFixed(1))); }

function renderPainel(root) {
  const m = metricas();
  const pctMeta = Math.min(100, m.hoje.q / Math.max(1, S.config.metaDia) * 100);
  const ultimos = [];
  for (let i = 34; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); const k = d.toLocaleDateString('sv-SE'); const h = S.hist[k] || { q: 0 }; ultimos.push({ k, d, q: h.q }); }
  const max = Math.max(1, ...ultimos.map(u => u.q));

  root.innerHTML = `
  ${typeof cartaoIA === 'function' ? cartaoIA() : ''}
  <div class="card">
    <div class="row" style="justify-content:space-between">
      <div>
        <h2 style="margin-bottom:2px">Olá${S.config.nome ? ', ' + esc(S.config.nome) : ''}! Bora bater a meta de hoje? 🚀</h2>
        <div class="muted small">${EDITAL.orgao} · ${EDITAL.banca} · Cargo 15 (Assistência Legislativa) · Prova em ${fmtData(new Date(S.config.dataProva + 'T12:00:00'))}/${new Date(S.config.dataProva + 'T12:00:00').getFullYear()}</div>
      </div>
      <div style="text-align:right">
        <div class="timer" style="font-size:34px;color:var(--gold)">${m.restam}</div>
        <div class="muted tiny">dias para a prova</div>
      </div>
    </div>
    <div style="margin-top:14px">
      <div class="row" style="justify-content:space-between"><b>Meta de hoje: ${m.hoje.q} / ${S.config.metaDia} questões</b>
      <span class="muted small">${m.hoje.q >= S.config.metaDia ? '✅ meta batida!' : `faltam ${S.config.metaDia - m.hoje.q}`} · acerto hoje ${m.hoje.q ? nf(m.hoje.a / m.hoje.q * 100, 0) : 0}%</span></div>
      <div class="bar gold" style="margin-top:6px"><i style="width:${larguraPct(pctMeta)}%"></i></div>
    </div>
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="iniciarTreinoRapido()">▶ Treinar agora (${S.config.metaDia > 20 ? 20 : S.config.metaDia} questões)</button>
      <button class="btn" onclick="iniciarRevisao()">🔁 Revisar o que errei (${filaRevisao().length})</button>
      <button class="btn" onclick="irPara('simulado')">⏱️ Fazer simulado</button>
    </div>
  </div>

  <div class="grid c4">
    <div class="kpi"><b>${m.tot}</b><span>questões feitas</span></div>
    <div class="kpi"><b style="color:${m.pct >= 60 ? 'var(--ok)' : m.pct >= 50 ? 'var(--warn)' : 'var(--err)'}">${nf(m.pct, 0)}%</b><span>aproveitamento</span></div>
    <div class="kpi"><b style="color:var(--gold)">${m.streak}</b><span>dias seguidos 🔥</span></div>
    <div class="kpi"><b>${Math.round(ultimos.reduce((s, u) => s + u.q, 0) > 0 ? Object.values(S.hist).reduce((s, h) => s + (h.min || 0), 0) : 0)}</b><span>minutos estudados</span></div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">🎯 Rumo às ${m.metaTotal} questões</h3>
    <div class="bar"><i style="width:${larguraPct(m.tot / m.metaTotal * 100)}%"></i></div>
    <div class="row" style="justify-content:space-between;margin-top:6px">
      <span class="muted small">${m.tot} de ${m.metaTotal} (${nf(m.tot / m.metaTotal * 100, 0)}%)</span>
      <span class="muted small">faltam <b style="color:#fff">${m.faltam}</b> → <b style="color:var(--pri2)">${m.metaDia}/dia</b> até 13/12</span>
    </div>
    <div class="small muted" style="margin-top:8px">Banco curado: <b>${BANCO.length}</b> questões comentadas · Geradas pela IA: <b>${S.geradas.length}</b> · Provas antigas importadas: <b>${(S.importadas || []).length}</b> · Tópicos do edital: <b>${MATERIAS.reduce((s, x) => s + x.topicos.length, 0)}</b> · Simulados feitos: <b>${S.provas.length}</b></div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">🗓️ Últimos 35 dias</h3>
    <div class="heat">${ultimos.map(u => `<i class="${u.q === 0 ? '' : u.q < max * .25 ? 'l1' : u.q < max * .5 ? 'l2' : u.q < max * .85 ? 'l3' : 'l4'}" title="${fmtData(u.d)}: ${u.q} questões"></i>`).join('')}</div>
    <div class="streak" style="margin-top:10px">${ultimos.slice(-14).map(u => `<i class="${u.q > 0 ? 'on' : ''}" title="${fmtData(u.d)}"></i>`).join('')}</div>
    <div class="tiny muted" style="margin-top:6px">Sequência atual: <b style="color:var(--gold)">${m.streak} dia(s)</b> · dias com estudo: ${m.dias}</div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">📊 Desempenho por matéria</h3>
    ${MATERIAS.map(mat => { const s = statsMateria(mat.id); return `
      <div style="margin:10px 0">
        <div class="row" style="justify-content:space-between">
          <span><b>${esc(mat.nome)}</b> <span class="badge">${s.banco} no banco</span></span>
          <span class="muted small">${s.t ? `${nf(s.pct, 0)}% em ${s.t} respostas` : 'não treinado'}</span>
        </div>
        <div class="bar ${s.pct >= 60 ? 'ok' : 'gold'}" style="margin-top:5px"><i style="width:${larguraPct(s.t ? s.pct : 0)}%"></i></div>
        <div class="tiny muted" style="margin-top:3px">cobertura do conteúdo: ${nf(s.cobertura, 0)}% (${s.vistas}/${s.banco})</div>
      </div>`; }).join('')}
  </div>`;
}

/* ------------------------------ 7. TREINO -------------------------------- */
let FILTRO = { materia: 'todas', topico: 'todos', dif: 'todas', modo: 'todas', n: 20 };
let SESSAO = null;

function filaRevisao() { return Q_ALL().filter(q => { const r = statQ(q.id); return r && (r.prox <= Date.now() || (r.t > 0 && r.ok / r.t < 0.6)); }); }

function selecionarQuestoes(f = FILTRO) {
  let qs = Q_ALL();
  if (f.materia !== 'todas') qs = qs.filter(q => q.materia === f.materia);
  if (f.topico !== 'todos') qs = qs.filter(q => q.topico === f.topico);
  if (f.dif !== 'todas') qs = qs.filter(q => q.dif === f.dif);
  if (f.modo === 'novas') qs = qs.filter(q => !statQ(q.id));
  if (f.modo === 'erradas') qs = qs.filter(q => { const r = statQ(q.id); return r && r.ok < r.t; });
  if (f.modo === 'pendentes') qs = qs.filter(q => emRevisao(q.id));
  if (f.modo === 'favoritas') qs = qs.filter(q => S.fav[q.id]);
  return qs;
}
function iniciarTreinoRapido() {
  FILTRO = Object.assign({}, FILTRO, { modo: 'todas', materia: 'todas', topico: 'todos', dif: 'todas' });
  const n = Math.min(20, S.config.metaDia);
  abrirSessao(selecionarQuestoes(), n, 'Treino');
}
function iniciarRevisao() { abrirSessao(filaRevisao(), 30, 'Revisão de erros'); }

function renderTreinar(root) {
  const m = metricas();
  const topicos = FILTRO.materia !== 'todas' ? MATBYID[FILTRO.materia].topicos : [];
  const disp = selecionarQuestoes();
  root.innerHTML = `
  <div class="card">
    <h2>✍️ Treinar por matéria e tópico</h2>
    <div class="muted small">Banco com <b>${BANCO.length}</b> questões comentadas + <b>${S.geradas.length}</b> geradas pela IA + <b>${(S.importadas || []).length}</b> importadas de provas antigas + geradores infinitos de RLM. Suas respostas alimentam a revisão espaçada automática.</div>
    <div class="grid c2" style="margin-top:12px">
      <div>
        <label class="f">Matéria</label>
        <select id="f-mat">
          <option value="todas">Todas as matérias (${Q_ALL().length})</option>
          ${MATERIAS.map(x => `<option value="${x.id}"${FILTRO.materia === x.id ? ' selected' : ''}>${esc(x.nome)} (${porMateria(x.id).length})</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="f">Tópico do edital</label>
        <select id="f-top" ${FILTRO.materia === 'todas' ? 'disabled' : ''}>
          <option value="todos">Todos os tópicos</option>
          ${topicos.map(t => `<option value="${esc(t)}"${FILTRO.topico === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="f">Dificuldade</label>
        <select id="f-dif">
          <option value="todas">Todas</option>
          <option value="facil"${FILTRO.dif === 'facil' ? ' selected' : ''}>Fácil</option>
          <option value="media"${FILTRO.dif === 'media' ? ' selected' : ''}>Média</option>
          <option value="dificil"${FILTRO.dif === 'dificil' ? ' selected' : ''}>Difícil</option>
        </select>
      </div>
      <div>
        <label class="f">Modo</label>
        <select id="f-modo">
          <option value="todas">Todas as questões</option>
          <option value="novas">Só as que ainda não vi</option>
          <option value="erradas">Caderno de erros</option>
          <option value="pendentes">Revisão de hoje (espaçada)</option>
          <option value="favoritas">Favoritas ⭐</option>
        </select>
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <span class="badge pri">${disp.length} questões disponíveis com esse filtro</span>
    </div>
    <h3>Quantidade e modo de feedback</h3>
    <div class="row">
      <select id="f-n" style="max-width:190px">
        <option value="10">10 questões</option>
        <option value="20" selected>20 questões</option>
        <option value="30">30 questões</option>
        <option value="50">50 questões</option>
        <option value="100">100 questões</option>
        <option value="0">Sessão livre (sem limite)</option>
      </select>
      <select id="f-fb" style="max-width:260px">
        <option value="imediato">Feedback imediato + comentário</option>
        <option value="final">Feedback só no final (estilo prova)</option>
      </select>
      <button class="btn pri" id="btn-iniciar">▶ Começar sessão</button>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">⚡ Sessão turbinada: geradores infinitos (Raciocínio Lógico/Matemática)</h3>
    <div class="muted small">Cada clique gera questões <b>inéditas</b> com resolução comentada automática — não acabam nunca. Excelentes para chegar rápido às ${m.metaTotal} questões.</div>
    <div class="row" style="margin-top:10px">
      ${GERADORES.map((g, i) => `<button class="btn sm" data-ger="${i}">${g.nome}</button>`).join('')}
      <button class="btn sm ok" data-ger="mix">🎲 MIX de todos (30 seguidas)</button>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">📌 Atalhos</h3>
    <div class="row">
      <button class="btn sm" onclick="iniciarRevisao()">🔁 Revisar erros (${filaRevisao().length})</button>
      <button class="btn sm" onclick="iniciarPorMateria('LP')">Língua Portuguesa</button>
      <button class="btn sm" onclick="iniciarPorMateria('PL')">Processo Legislativo/RIALEPA</button>
      <button class="btn sm" onclick="iniciarPorMateria('DA')">Direito Administrativo</button>
      <button class="btn sm" onclick="iniciarPorMateria('RL')">Raciocínio Lógico</button>
      <button class="btn sm gold" onclick="abrirImportador()">📥 Importar questões de provas antigas da CETAP (${(S.importadas || []).length})</button>
    </div>
  </div>`;

  $('#f-mat').onchange = e => { FILTRO.materia = e.target.value; FILTRO.topico = 'todos'; renderTreinar($('#app')); };
  $('#f-top').onchange = e => { FILTRO.topico = e.target.value; renderTreinar($('#app')); };
  $('#f-dif').onchange = e => { FILTRO.dif = e.target.value; renderTreinar($('#app')); };
  $('#f-modo').onchange = e => { FILTRO.modo = e.target.value; renderTreinar($('#app')); };
  $('#btn-iniciar').onclick = () => {
    const n = +$('#f-n').value, fb = $('#f-fb').value;
    const qs = selecionarQuestoes(FILTRO);
    if (!qs.length) return toast('Nenhuma questão com esse filtro. Tente outro modo.');
    abrirSessao(qs, n, 'Treino', fb === 'final');
  };
  root.querySelectorAll('[data-ger]').forEach(b => b.onclick = () => {
    const k = b.dataset.ger;
    if (k === 'mix') { iniciarGeradores(GERADORES.map((_, i) => i), 30); }
    else iniciarGeradores([+k], 15);
  });
}
function iniciarPorMateria(mid) { FILTRO = { materia: mid, topico: 'todos', dif: 'todas', modo: 'todas', n: 20 }; irPara('treinar'); }

/* --------- Sessão de questões (treino / geradores) --------- */
function abrirSessao(qs, n, titulo, fbFinal = false) {
  qs = shuffle(qs); if (n > 0) qs = qs.slice(0, n);
  SESSAO = { tipo: 'treino', titulo, qs, i: 0, respostas: {}, fbFinal, fbDado: {}, inicio: Date.now(), geradas: ['GER'] };
  renderSessao($('#app'));
}
function iniciarGeradores(ids, n) {
  const qs = []; for (let i = 0; i < n; i++) qs.push(GERADORES[ids[i % ids.length]].gerar());
  SESSAO = { tipo: 'gerador', titulo: 'Gerador infinito', qs, i: 0, respostas: {}, fbFinal: false, fbDado: {}, inicio: Date.now() };
  renderSessao($('#app'));
}
function renderSessao(root) {
  const s = SESSAO, q = s.qs[s.i];
  if (!q) return finalizarSessao();
  const ja = s.respostas[s.i];
  const mostrarFB = ja !== undefined && !s.fbFinal;
  const mat = MATBYID[q.materia], gen = q.materia === 'GEN';
  root.innerHTML = `
  <div class="card">
    <div class="row" style="justify-content:space-between">
      <div class="row">
        <span class="badge pri">${esc(s.titulo)}</span>
        <span class="badge">${gen ? '⚡ gerador infinito' : esc(mat ? mat.nome : '')}</span>
        ${q.topico ? `<span class="badge">${esc(q.topico)}</span>` : ''}
        ${q.dif ? `<span class="badge ${q.dif === 'dificil' ? 'err' : q.dif === 'media' ? 'warn' : 'ok'}">${q.dif === 'facil' ? 'fácil' : q.dif === 'media' ? 'média' : 'difícil'}</span>` : ''}
        ${q.ia ? '<span class="badge warn">gerada por IA 🤖</span>' : ''}
      </div>
      <div class="row">
        <span class="muted small">Questão <b style="color:#fff">${s.i + 1}</b>/${s.qs.length}</span>
        <button class="btn sm" id="btn-sair">✖ Sair</button>
      </div>
    </div>
    <div class="bar" style="margin:10px 0 16px"><i style="width:${larguraPct((s.i) / s.qs.length * 100)}%"></i></div>
    <div class="qhead">
      <span class="badge">${q.banca || 'CETAP'} ${q.ano || ''}</span>
      ${q.ref ? `<span class="tiny muted">${esc(q.ref)}</span>` : ''}
    </div>
    <div class="qtext">${fmtTxt(q.enunciado)}</div>
    <div id="alts" style="margin-top:14px">
      ${q.alternativas.map((a, i) => `<button class="alt" data-i="${i}" ${mostrarFB ? 'disabled' : ''}>
        <span class="ltr">${LETRAS[i]}</span><span class="tx">${fmtTxt(a)}</span></button>`).join('')}
    </div>
    <div id="fb"></div>
    <div class="row" style="margin-top:16px;justify-content:space-between">
      <div class="row">
        <button class="btn sm" id="btn-prev" ${s.i === 0 ? 'disabled' : ''}>◀ Anterior</button>
        <button class="btn sm" id="btn-fav">${S.fav[q.id] ? '⭐ Favorita' : '☆ Favoritar'}</button>
        ${!gen && q.ia ? '' : ''}
        <button class="btn sm" id="btn-nota">📝 Anotação</button>
      </div>
      <div class="row">
        ${ja !== undefined && s.fbFinal ? '<span class="badge pri">respondida — correção no final</span>' : ''}
        <button class="btn pri" id="btn-next">${s.i === s.qs.length - 1 ? 'Finalizar ✔' : 'Próxima ▶'}</button>
      </div>
    </div>
    <div id="nota-area"></div>
  </div>`;

  if (ja !== undefined && !s.fbFinal) pintarFeedback(q, ja, true);
  else if (ja !== undefined) { const b = root.querySelector(`.alt[data-i="${ja}"]`); if (b) b.classList.add('sel'); }

  $$('#alts .alt').forEach(b => b.onclick = () => responder(+b.dataset.i));
  $('#btn-next').onclick = () => { if (s.respostas[s.i] === undefined) return toast('Escolha uma alternativa 🙂'); if (s.i === s.qs.length - 1) finalizarSessao(); else { s.i++; renderSessao($('#app')); } };
  $('#btn-prev').onclick = () => { s.i--; renderSessao($('#app')); };
  $('#btn-sair').onclick = () => { if (confirm('Encerrar a sessão?')) finalizarSessao(true); };
  $('#btn-fav').onclick = () => { S.fav[q.id] = !S.fav[q.id]; if (!S.fav[q.id]) delete S.fav[q.id]; salvar(); renderSessao($('#app')); };
  $('#btn-nota').onclick = () => {
    $('#nota-area').innerHTML = `<label class="f">Sua anotação sobre esta questão</label>
      <textarea id="ta-nota" rows="3">${esc(S.notas[q.id] || '')}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn sm pri" id="ok-nota">Salvar</button></div>`;
    $('#ok-nota').onclick = () => { S.notas[q.id] = $('#ta-nota').value; salvar(); toast('Anotação salva 📝'); $('#nota-area').innerHTML = ''; };
  };
  function responder(i) {
    if (s.respostas[s.i] !== undefined) return;
    s.respostas[s.i] = i;
    const acertou = i === q.correta;
    if (q.materia !== 'GEN') registrarResposta(q.id, acertou);
    else { const h = S.hist[hojeISO()] || { q: 0, a: 0, min: 0 }; h.q++; if (acertou) h.a++; S.hist[hojeISO()] = h; salvar(); atualizarBadges(); }
    pintarFeedback(q, i);
  }
  function pintarFeedback(q, i, silencioso) {
    const acertou = i === q.correta;
    $$('#alts .alt').forEach((b, k) => {
      b.disabled = true;
      if (k === q.correta) b.classList.add('right');
      if (k === i && !acertou) b.classList.add('wrong');
    });
    $('#fb').innerHTML = `
      <div class="fb ${acertou ? 'right' : 'wrong'}">
        <div class="tt">${acertou ? '✅ Você acertou!' : `❌ Errou. Gabarito: <span style="color:#6ee7b7">${LETRAS[q.correta]}</span>`}</div>
        <div class="com">${fmtTxt(q.comentario || 'Sem comentário.')}</div>
        ${q.analise ? `<div class="explica"><b>Análise das alternativas:</b><div class="com">${fmtTxt(q.analise)}</div></div>` : ''}
        ${!acertou && q.materia !== 'GEN' ? `<div class="row" style="margin-top:10px"><button class="btn sm gold" id="btn-ia-expl">🤖 Pedir explicação detalhada à IA</button></div>` : ''}
      </div>`;
    const be = $('#btn-ia-expl');
    if (be) be.onclick = () => explicarComIA(q, i);
  }
}
function finalizarSessao(sair) {
  if (!SESSAO) return irPara('painel');
  const s = SESSAO;
  const itens = Object.keys(s.respostas);
  const acertos = itens.filter(k => s.respostas[k] === s.qs[k].correta).length;
  const total = itens.length;
  const min = Math.round((Date.now() - s.inicio) / 60000);
  marcarTempo((Date.now() - s.inicio) / 1000);
  SESSAO = null;
  const app = $('#app');
  const porMat = {};
  itens.forEach(k => { const q = s.qs[k]; const mm = q.materia === 'GEN' ? 'GER' : q.materia; porMat[mm] = porMat[mm] || { t: 0, ok: 0 }; porMat[mm].t++; if (s.respostas[k] === q.correta) porMat[mm].ok++; });
  app.innerHTML = `
  <div class="card">
    <h2>${total ? '📋 Resultado da sessão' : 'Sessão encerrada'}</h2>
    <div class="grid c4">
      <div class="kpi"><b>${total}</b><span>respondidas</span></div>
      <div class="kpi"><b style="color:var(--ok)">${acertos}</b><span>acertos</span></div>
      <div class="kpi"><b style="color:${total && acertos / total >= .6 ? 'var(--ok)' : 'var(--warn)'}">${total ? nf(acertos / total * 100, 0) : 0}%</b><span>aproveitamento</span></div>
      <div class="kpi"><b>${min}</b><span>minutos</span></div>
    </div>
    <table style="margin-top:12px">
      <tr><th>Matéria</th><th>Acertos</th><th>%</th></tr>
      ${Object.entries(porMat).map(([k, v]) => `<tr><td>${k === 'GER' ? '⚡ Geradores' : esc(MATBYID[k] ? MATBYID[k].nome : k)}</td><td>${v.ok}/${v.t}</td><td>${nf(v.ok / v.t * 100, 0)}%</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Nada respondido.</td></tr>'}
    </table>
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="iniciarTreinoRapido()">▶ Mais 20 questões</button>
      <button class="btn" onclick="iniciarRevisao()">🔁 Revisar erros</button>
      <button class="btn" onclick="irPara('painel')">🎯 Painel</button>
    </div>
  </div>`;
  atualizarBadges(); salvar();
}
/* --------------------- 7b. TEXTO DA IA -> HTML LIMPO ---------------------- */
/* As IAs respondem em markdown (**negrito**, ### títulos, listas, tabelas |a|b|).
   Aqui esse texto vira HTML apresentável. A ordem é: escapar primeiro, formatar
   depois — assim nada do que a IA escreve consegue injetar HTML no app. */
function mdInline(s) {
  return String(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])__([^_\n]+)__(?=[\s).,;:!?]|$)/g, '$1<strong>$2</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
function mdLista(itens, ordenada) {
  const tag = ordenada ? 'ol' : 'ul';
  let html = `<${tag}>`, aninhada = false;
  itens.forEach(it => {
    if (it.nivel > 0) {
      if (!aninhada) { html += '<ul>'; aninhada = true; }
      html += `<li>${mdInline(it.txt)}</li>`;
    } else {
      if (aninhada) { html += '</ul>'; aninhada = false; }
      html += `<li>${mdInline(it.txt)}</li>`;
    }
  });
  if (aninhada) html += '</ul>';
  return html + `</${tag}>`;
}
function fmtTxt(t) {
  const bruto = String(t == null ? '' : t).replace(/\r\n?/g, '\n');
  if (!bruto.trim()) return '';
  const linhas = esc(bruto).split('\n');
  const ehTab = l => /^\s*\|.*\|\s*$/.test(l);
  const ehSep = l => /\|/.test(l) && /^[\s|:\-–—]+$/.test(l) && /-/.test(l);
  const ehInicio = l => /^\s*$/.test(l) || /^(#{1,6})\s+/.test(l) || /^\s*[-*•]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l) ||
    /^\s*&gt;/.test(l) || /^```/.test(l.trim()) || ehTab(l) || /^([-*_])\1{2,}$/.test(l.trim());
  const out = [];
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i], s = l.trim();
    if (!s) { i++; continue; }
    /* bloco de código ``` */
    if (/^```/.test(s)) {
      i++;
      const buf = [];
      while (i < linhas.length && !/^```/.test(linhas[i].trim())) { buf.push(linhas[i]); i++; }
      i++;
      out.push('<pre><code>' + buf.join('\n') + '</code></pre>');
      continue;
    }
    /* linha horizontal: ---  ***  ___ */
    if (/^([-*_])\1{2,}$/.test(s)) { out.push('<hr>'); i++; continue; }
    /* tabela markdown |a|b| */
    if (ehTab(l) && i + 1 < linhas.length && ehSep(linhas[i + 1])) {
      const cel = x => x.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const cab = cel(l);
      i += 2;
      const corpo = [];
      while (i < linhas.length && ehTab(linhas[i])) { corpo.push(cel(linhas[i])); i++; }
      out.push('<div class="md-tab"><table><thead><tr>' + cab.map(c => `<th>${mdInline(c)}</th>`).join('') +
        '</tr></thead><tbody>' + corpo.map(r => '<tr>' + r.map(c => `<td>${mdInline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }
    /* título */
    const mh = s.match(/^(#{1,6})\s+(.*)$/);
    if (mh) {
      const n = Math.min(6, mh[1].length + 3);
      out.push(`<h${n}>${mdInline(mh[2].trim())}</h${n}>`);
      i++;
      continue;
    }
    /* citação */
    if (/^&gt;/.test(s)) {
      const buf = [];
      while (i < linhas.length && /^\s*&gt;/.test(linhas[i])) { buf.push(linhas[i].trim().replace(/^&gt;\s?/, '')); i++; }
      out.push('<blockquote>' + mdInline(buf.join(' ')) + '</blockquote>');
      continue;
    }
    /* lista com marcadores */
    if (/^\s*[-*•]\s+/.test(l)) {
      const itens = [];
      while (i < linhas.length && /^\s*[-*•]\s+/.test(linhas[i])) {
        const m = linhas[i].match(/^(\s*)[-*•]\s+(.*)$/);
        itens.push({ nivel: Math.min(2, Math.floor(m[1].replace(/\t/g, '  ').length / 2)), txt: m[2] });
        i++;
      }
      out.push(mdLista(itens, false));
      continue;
    }
    /* lista numerada */
    if (/^\s*\d+[.)]\s+/.test(l)) {
      const itens = [];
      while (i < linhas.length && /^\s*\d+[.)]\s+/.test(linhas[i])) {
        const m = linhas[i].match(/^(\s*)\d+[.)]\s+(.*)$/);
        itens.push({ nivel: Math.min(2, Math.floor(m[1].replace(/\t/g, '  ').length / 2)), txt: m[2] });
        i++;
      }
      out.push(mdLista(itens, true));
      continue;
    }
    /* parágrafo (junta as linhas até um bloco novo) */
    const buf = [l.trim()];
    i++;
    while (i < linhas.length && !ehInicio(linhas[i])) { buf.push(linhas[i].trim()); i++; }
    out.push('<p>' + buf.map(x => mdInline(x)).join('<br>') + '</p>');
  }
  return '<div class="md">' + out.join('') + '</div>';
}
/* texto simples (mensagens suas, avisos): escapa e mantém as quebras de linha */
function fmtNl(t) { return esc(t).replace(/\n/g, '<br>'); }

/* ------------------------- 8. SIMULADO (estilo CETAP) -------------------- */
let SIM = null;
function renderSimulado(root) {
  root.innerHTML = `
  <div class="card">
    <h2>⏱️ Simulado no estilo CETAP</h2>
    <div class="muted small">Monte uma prova com a distribuição que você quiser, com cronômetro e correção detalhada por matéria no final (como no dia da prova).</div>
    <div class="grid c2" style="margin-top:12px">
      ${MATERIAS.map(m => `<div><label class="f">${esc(m.nome)} <span class="muted">(disp. ${porMateria(m.id).length})</span></label>
        <input type="number" min="0" max="60" value="${sugestaoSim(m.id)}" data-sim="${m.id}"></div>`).join('')}
    </div>
    <div class="grid c3" style="margin-top:12px">
      <div><label class="f">Tempo (minutos)</label><input type="number" id="sim-tempo" value="240" min="10"></div>
      <div><label class="f">Embaralhar alternativas?</label><select id="sim-emb"><option value="n">Não</option><option value="s">Sim</option></select></div>
      <div><label class="f">Feedback</label><select id="sim-fb"><option value="final">Só no final (realista)</option><option value="imediato">Imediato</option></select></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" id="sim-go">▶ Iniciar simulado</button>
      <button class="btn" id="sim-60">Preset: 60 questões / 4h</button>
      <button class="btn" id="sim-ralo">Preset: só específicas (40q)</button>
    </div>
  </div>`;
  $('#sim-go').onclick = () => {
    const dist = {}; $$('[data-sim]').forEach(i => { const v = +i.value; if (v > 0) dist[i.dataset.sim] = v; });
    const qs = [];
    Object.entries(dist).forEach(([mid, n]) => { qs.push(...shuffle(porMateria(mid)).slice(0, n)); });
    if (!qs.length) return toast('Escolha ao menos 1 questão.');
    abrirProva(shuffle(qs), +$('#sim-tempo').value, $('#sim-emb').value === 's', $('#sim-fb').value === 'imediato');
  };
  $('#sim-60').onclick = () => { $$('[data-sim]').forEach(i => i.value = sugestaoSim60(i.dataset.sim)); };
  $('#sim-ralo').onclick = () => { $$('[data-sim]').forEach(i => { i.value = ['LP', 'LE', 'INFO', 'RL'].includes(i.dataset.sim) ? 0 : sugestaoSim(i.dataset.sim); }); };
}
function sugestaoSim(mid) { return Math.min(porMateria(mid).length, { LP: 10, LE: 6, INFO: 6, RL: 8, SEC: 4, DA: 8, DC: 6, DPC: 3, PL: 10, DF: 3, DPREV: 2, DCIV: 4, DPCIV: 3, DH: 2 }[mid] ?? 4); }
function sugestaoSim60(mid) { const base = { LP: 12, LE: 7, INFO: 6, RL: 8, SEC: 3, DA: 8, DC: 5, DPC: 2, PL: 12, DF: 3, DPREV: 2, DCIV: 4, DPCIV: 3, DH: 2 }; return Math.min(porMateria(mid).length, base[mid] ?? 3); }
function abrirProva(qs, minutos, embaralhar, fbImediato) {
  qs = qs.map(q => {
    if (!embaralhar) return q;
    const pares = shuffle(q.alternativas.map((a, i) => ({ a, i })));
    return Object.assign({}, q, { alternativas: pares.map(p => p.a), correta: pares.findIndex(p => p.i === q.correta) });
  });
  SIM = { qs, i: 0, respostas: {}, fim: Date.now() + minutos * 60000, minutos, inicio: Date.now(), fb: fbImediato, flags: {} };
  clearInterval(SIM.tick);
  SIM.tick = setInterval(() => { const el = $('#sim-timer'); if (!el) return; const r = SIM.fim - Date.now(); if (r <= 0) { clearInterval(SIM.tick); return finalizarProva(true); } el.textContent = `${String(Math.floor(r / 60000)).padStart(2, '0')}:${String(Math.floor(r % 60000 / 1000)).padStart(2, '0')}`; }, 500);
  renderProva($('#app'));
}
function renderProva(root) {
  const s = SIM, q = s.qs[s.i], ja = s.respostas[s.i];
  const r = Math.max(0, s.fim - Date.now());
  root.innerHTML = `
  <div class="card">
    <div class="row" style="justify-content:space-between">
      <div class="row">
        <span class="badge pri">SIMULADO</span>
        <span class="badge">${esc(MATBYID[q.materia] ? MATBYID[q.materia].nome : '')}</span>
        <span class="badge">Q ${s.i + 1}/${s.qs.length}</span>
      </div>
      <div class="row">
        <span class="timer" id="sim-timer">${String(Math.floor(r / 60000)).padStart(2, '0')}:${String(Math.floor(r % 60000 / 1000)).padStart(2, '0')}</span>
        <button class="btn sm ok" id="sim-fim">Entregar prova</button>
      </div>
    </div>
    <div class="metrics small muted" style="margin:8px 0">Respondidas: <b>${Object.keys(s.respostas).length}</b>/${s.qs.length}</div>
    <div class="qnav" style="margin-bottom:12px">
      ${s.qs.map((_, i) => `<button data-goto="${i}" class="${s.respostas[i] !== undefined ? 'done' : ''} ${i === s.i ? 'cur' : ''} ${s.flags[i] ? 'flag' : ''}">${i + 1}</button>`).join('')}
    </div>
    <div class="qtext">${fmtTxt(q.enunciado)}</div>
    <div id="alts" style="margin-top:12px">
      ${q.alternativas.map((a, i) => `<button class="alt ${ja === i ? 'sel' : ''}" data-i="${i}"><span class="ltr">${LETRAS[i]}</span><span class="tx">${fmtTxt(a)}</span></button>`).join('')}
    </div>
    <div id="fb"></div>
    <div class="row" style="margin-top:14px;justify-content:space-between">
      <div class="row">
        <button class="btn sm" id="p-prev" ${s.i === 0 ? 'disabled' : ''}>◀</button>
        <button class="btn sm" id="p-flag">${s.flags[s.i] ? '🚩 Marcada' : '🏳️ Marcar p/ revisar'}</button>
        <button class="btn sm" id="p-limpar">Limpar resposta</button>
      </div>
      <button class="btn pri" id="p-next">${s.i === s.qs.length - 1 ? 'Última' : 'Próxima ▶'}</button>
    </div>
  </div>`;
  $$('#alts .alt').forEach(b => b.onclick = () => {
    s.respostas[s.i] = +b.dataset.i;
    if (s.fb) { const ok = +b.dataset.i === q.correta; $$('#alts .alt').forEach((x, k) => { x.classList.add(k === q.correta ? 'right' : ''); if (k === +b.dataset.i && !ok) x.classList.add('wrong'); }); $('#fb').innerHTML = `<div class="fb ${ok ? 'right' : 'wrong'}"><div class="tt">${ok ? '✅ Correto' : '❌ Incorreto — gabarito ' + LETRAS[q.correta]}</div><div class="com">${fmtTxt(q.comentario || '')}</div></div>`; }
    else { $$('#alts .alt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); }
  });
  $('#p-next').onclick = () => { if (s.i < s.qs.length - 1) { s.i++; renderProva($('#app')); } else toast('Use "Entregar prova" para finalizar.'); };
  $('#p-prev').onclick = () => { s.i--; renderProva($('#app')); };
  $('#p-flag').onclick = () => { s.flags[s.i] = !s.flags[s.i]; renderProva($('#app')); };
  $('#p-limpar').onclick = () => { delete s.respostas[s.i]; renderProva($('#app')); };
  $('#sim-fim').onclick = () => { if (confirm('Entregar a prova agora?')) finalizarProva(false); };
  $$('[data-goto]').forEach(b => b.onclick = () => { s.i = +b.dataset.goto; renderProva($('#app')); });
}
function finalizarProva(tempo) {
  clearInterval(SIM.tick);
  const s = SIM; SIM = null;
  const bruto = Object.keys(s.respostas).length;
  const acertos = Object.keys(s.respostas).filter(k => s.respostas[k] === s.qs[k].correta).length;
  const porMat = {};
  s.qs.forEach((q, i) => {
    const mid = q.materia; porMat[mid] = porMat[mid] || { t: 0, ok: 0, itens: [] };
    porMat[mid].t++; const ac = s.respostas[i] === q.correta; if (ac) porMat[mid].ok++;
    porMat[mid].itens.push({ q, marcou: s.respostas[i], ac });
    if (s.respostas[i] !== undefined) registrarResposta(q.id, ac);
  });
  marcarTempo((Date.now() - s.inicio) / 1000);
  const nota = s.qs.length ? acertos / s.qs.length * 10 : 0;
  const rec = { data: Date.now(), total: s.qs.length, resp: bruto, acertos, nota, tempo: Math.round((Date.now() - s.inicio) / 60000), porMat };
  S.provas.push({ data: rec.data, total: rec.total, acertos, nota, tempo: rec.tempo, porMat: Object.fromEntries(Object.entries(porMat).map(([k, v]) => [k, { t: v.t, ok: v.ok }])) });
  salvar(); atualizarBadges();
  $('#app').innerHTML = `
  <div class="card">
    <h2>${tempo ? '⏰ Tempo esgotado!' : '✅ Prova entregue'}</h2>
    <div class="grid c4">
      <div class="kpi"><b style="color:${nota >= 6 ? 'var(--ok)' : 'var(--err)'}">${nf(nota, 1)}</b><span>nota (0–10)</span></div>
      <div class="kpi"><b>${acertos}/${s.qs.length}</b><span>acertos</span></div>
      <div class="kpi"><b>${nf(acertos / s.qs.length * 100, 0)}%</b><span>aproveitamento</span></div>
      <div class="kpi"><b>${rec.tempo}</b><span>minutos</span></div>
    </div>
    <table style="margin-top:14px"><tr><th>Matéria</th><th>Acertos</th><th>%</th><th>Diagnóstico</th></tr>
    ${Object.entries(porMat).map(([k, v]) => { const p = v.ok / v.t * 100; return `<tr><td>${esc(MATBYID[k] ? MATBYID[k].nome : k)}</td><td>${v.ok}/${v.t}</td><td>${nf(p, 0)}%</td><td>${p >= 70 ? '💪 forte' : p >= 50 ? '⚠️ atenção' : '🚨 prioridade'}</td></tr>`; }).join('')}
    </table>
    <div class="muted small" style="margin-top:10px">Respondidas ${bruto} de ${s.qs.length} · em branco: ${s.qs.length - bruto} (em prova real, chute branco não pontua — sempre marque uma alternativa!)</div>
    <h3>Correção comentada</h3>
    <div style="max-height:60vh;overflow:auto">
    ${s.qs.map((q, i) => { const mar = s.respostas[i], ac = mar === q.correta; return `
      <details>
        <summary>${ac ? '✅' : '❌'} Q${i + 1} — ${esc(MATBYID[q.materia] ? MATBYID[q.materia].nome : '')}${mar === undefined ? ' (em branco)' : ''}</summary>
        <div class="small muted">${esc(q.topico || '')}</div>
        <div style="margin:8px 0">${fmtTxt(q.enunciado)}</div>
        ${q.alternativas.map((a, k) => `<div class="tiny" style="padding:3px 0;color:${k === q.correta ? '#6ee7b7' : k === mar ? '#fda4af' : 'var(--txt2)'}"><b>${LETRAS[k]})</b> ${esc(a)}</div>`).join('')}
        <div class="fb" style="margin-top:8px"><div class="com">${fmtTxt(q.comentario || '')}</div>${q.analise ? `<div class="explica">${fmtTxt(q.analise)}</div>` : ''}</div>
      </details>`; }).join('')}
    </div>
    <div class="row" style="margin-top:14px">
      <button class="btn pri" onclick="irPara('simulado')">⏱️ Novo simulado</button>
      <button class="btn" onclick="iniciarRevisao()">🔁 Revisar os erros deste simulado</button>
      <button class="btn" onclick="irPara('painel')">🎯 Painel</button>
    </div>
  </div>`;
}

/* --------- 9. Inicialização --------- */
window.addEventListener('DOMContentLoaded', () => {
  $('#app-nome').value = S.config.nome || '';
  $('#app-meta').value = S.config.metaDia;
  $('#app-prova').value = S.config.dataProva;
  $('#app-meta-total').value = S.config.metaTotal || 3000;
  montarTabs();
  const h = location.hash.replace('#', '');
  irPara(TABS.some(t => t.id === h) ? h : 'painel');
  atualizarBadges();
});
window.iniciarTreinoRapido = iniciarTreinoRapido;
window.iniciarRevisao = iniciarRevisao;
window.irPara = irPara;
window.iniciarPorMateria = iniciarPorMateria;
