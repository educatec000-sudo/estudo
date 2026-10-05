/* ==========================================================================
   ARENA ESTUDOS — parte 5: PROGRESSO NA NUVEM COM CLOUDFLARE
   --------------------------------------------------------------------------
   Sem token, sem repositório e sem conta em serviço de arquivos: o app fala
   com um Worker SEU (arquivo em cloudflare/worker.js + guia LEIA-CLOUDFLARE.md).

   O "código de progresso" (ex.: ALEPA-7K3F-92QX) é a chave da gaveta:
     • mesmo código em dois aparelhos  -> mesmo progresso (celular + PC);
     • código diferente                -> progresso separado (outra pessoa).

   Enviar = mescla o que está na nuvem com o que está aqui e grava o resultado
   (assim nada se perde quando você usa os dois aparelhos). O pacote enviado
   NUNCA leva chaves de IA: isso fica só no aparelho.
   ========================================================================== */
'use strict';

const NUVEM_URL_EXEMPLO = 'https://alepa-progresso.SEU-USUARIO.workers.dev';
const NUVEM_LIMITE_MS = 15000;

function cfgNuvem() {
  S.config.nuvem = Object.assign({ url: '', codigo: '', auto: true, ultimo: 0, visto: 0 }, S.config.nuvem || {});
  const nv = S.config.nuvem;
  /* o código é sempre tratado em maiúsculas e sem espaços */
  const limpo = String(nv.codigo || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (limpo !== nv.codigo) nv.codigo = limpo;
  nv.url = String(nv.url || '').trim();
  return nv;
}
function nuvemUrl() { return String(cfgNuvem().url || '').trim().replace(/\/+$/, ''); }
function nuvemCodigo() { return String(cfgNuvem().codigo || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''); }
function nuvemUrlOk(u) { return /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(String(u || '').trim()); }
function nuvemCodigoOk(c) { return /^[A-Z0-9-]{6,40}$/.test(c || ''); }

/* gera um código legível: sem I, O, 0 e 1 (confundem na hora de digitar) */
function gerarCodigoNuvem() {
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bloco = n => Array.from({ length: n }, () => alfa[Math.floor(Math.random() * alfa.length)]).join('');
  return `ALEPA-${bloco(4)}-${bloco(4)}`;
}

/* ------------------------------ requisições ------------------------------ */
async function nuvemRequisicao(caminho, opcoes = {}) {
  const base = nuvemUrl();
  if (!base) throw new Error('Cole primeiro o endereço do seu Worker do Cloudflare (ex.: ' + NUVEM_URL_EXEMPLO + ').');
  if (!nuvemUrlOk(base)) throw new Error('Esse endereço não parece válido. Ele precisa começar com https:// e terminar em .workers.dev (ex.: ' + NUVEM_URL_EXEMPLO + ').');
  const codigo = nuvemCodigo();
  if (!nuvemCodigoOk(codigo)) throw new Error('Informe o código de progresso (6 caracteres ou mais). Clique em 🎲 gerar para criar um.');

  const controlador = (typeof AbortController === 'function') ? new AbortController() : null;
  const alarme = controlador ? setTimeout(() => controlador.abort(), NUVEM_LIMITE_MS) : null;
  let r;
  try {
    r = await fetch(base + caminho + '?codigo=' + encodeURIComponent(codigo), Object.assign({ signal: controlador ? controlador.signal : undefined }, opcoes));
  } catch (e) {
    throw new Error('Não consegui falar com o seu Worker. Confira: (1) o endereço está certo e começa com https://; (2) você já fez o "Deploy" no Cloudflare; (3) a internet do aparelho está funcionando.');
  } finally { if (alarme) clearTimeout(alarme); }

  let dados = null;
  try { dados = await r.json(); } catch (e) { }
  if (!r.ok) {
    const msg = (dados && (dados.erro || dados.error)) || ('O Worker respondeu ' + r.status + '.');
    if (r.status === 404 && String(opcoes.method || 'GET') === 'GET') return { vazio: true, erro: msg };
    throw new Error(msg);
  }
  return dados;
}

/* ------------------------- pacote / mesclagem ---------------------------- */
function progressoParaNuvem() {
  return {
    app: 'ArenaEstudos-ALEPA', versao: 1, atualizadoEm: Date.now(),
    hist: S.hist, resp: S.resp, fav: S.fav, notas: S.notas, teoria: S.teoria,
    geradas: S.geradas || [], importadas: S.importadas || [], provas: S.provas || [],
    config: configSemSegredos()
  };
}
/* soma as contagens por dia (questões feitas em cada aparelho) */
function _uniHist(a, b) {
  const out = {}, dias = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
  dias.forEach(d => {
    const x = (a || {})[d] || { q: 0, a: 0, min: 0 }, y = (b || {})[d] || { q: 0, a: 0, min: 0 };
    out[d] = { q: (x.q || 0) + (y.q || 0), a: (x.a || 0) + (y.a || 0), min: (x.min || 0) + (y.min || 0) };
  });
  return out;
}
/* para cada questão fica o registro com mais tentativas (empate: o mais recente) */
function _uniResp(a, b) {
  const out = {}, ids = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
  ids.forEach(id => {
    const x = (a || {})[id], y = (b || {})[id];
    if (!x) { out[id] = y; return; }
    if (!y) { out[id] = x; return; }
    out[id] = (y.t > x.t || (y.t === x.t && (y.ult || 0) > (x.ult || 0))) ? y : x;
  });
  return out;
}
/* junta listas sem repetir (chave: id ou data|total) */
function _uniLista(a, b, chave) {
  const out = [], vistos = new Set();
  (b || []).concat(a || []).forEach(item => {
    if (!item) return;
    const k = String(chave(item));
    if (vistos.has(k)) return;
    vistos.add(k); out.push(item);
  });
  return out;
}
function mesclarProgresso(local, remoto) {
  const l = local || {}, r = remoto || {};
  return {
    app: 'ArenaEstudos-ALEPA', versao: 1, atualizadoEm: Date.now(),
    hist: _uniHist(l.hist, r.hist),
    resp: _uniResp(l.resp, r.resp),
    fav: Object.assign({}, r.fav || {}, l.fav || {}),
    notas: Object.assign({}, r.notas || {}, l.notas || {}),
    teoria: Object.assign({}, r.teoria || {}, l.teoria || {}),
    geradas: _uniLista(l.geradas, r.geradas, q => q.id),
    importadas: _uniLista(l.importadas, r.importadas, q => q.id),
    provas: _uniLista(l.provas, r.provas, p => (p.data || 0) + '|' + (p.total || 0)),
    config: Object.assign({}, r.config || {}, l.config || {})
  };
}
function aplicarProgressoMesclado(m) {
  const tok = S.config.tokenIA, sync = S.config.sync, nuvem = Object.assign({}, cfgNuvem());
  S.hist = m.hist || {}; S.resp = m.resp || {}; S.fav = m.fav || {}; S.notas = m.notas || {};
  S.teoria = m.teoria || {}; S.geradas = m.geradas || []; S.importadas = m.importadas || []; S.provas = m.provas || [];
  const cfg = semApagarChaves(m.config);
  S.config = Object.assign(estadoInicial().config, cfg, { tokenIA: tok, sync: sync, nuvem: nuvem });
  migrarIA();
  salvar(); reindexar(); atualizarBadges();
}

/* ------------------------------ as ações -------------------------------- */
async function nuvemEnviar(silencioso) {
  try {
    let remoto = null;
    const atual = await nuvemRequisicao('/progresso');
    if (atual && !atual.vazio && atual.app === 'ArenaEstudos-ALEPA') remoto = atual;
    const pacote = mesclarProgresso(progressoParaNuvem(), remoto);
    const r = await nuvemRequisicao('/progresso', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pacote) });
    aplicarProgressoMesclado(pacote);
    cfgNuvem().ultimo = Date.now();
    salvar();
    if (!silencioso) toast('☁️ Progresso enviado' + (remoto ? ' (juntando o que já havia na nuvem)' : '') + ' ✅', 3200);
    return { ok: true, bytes: r && r.bytes, juntou: !!remoto };
  } catch (e) {
    if (silencioso) { console.warn('nuvem (envio):', e.message); return { ok: false, erro: e.message }; }
    desenharStatusNuvem('erro', e.message);
    toast('Não enviei: ' + e.message, 6000);
    return { ok: false, erro: e.message };
  }
}
async function nuvemBaixar(silencioso) {
  try {
    const remoto = await nuvemRequisicao('/progresso');
    if (remoto && remoto.vazio) {
      const msg = 'Ainda não existe progresso com esse código na nuvem. Clique em “Enviar progresso” neste aparelho primeiro.';
      if (silencioso) return { ok: false, erro: msg };
      desenharStatusNuvem('erro', msg); toast(msg, 6000); return { ok: false, erro: msg };
    }
    if (!remoto || remoto.app !== 'ArenaEstudos-ALEPA') throw new Error('A nuvem devolveu um conteúdo que não é do app.');
    const juntos = mesclarProgresso(progressoParaNuvem(), remoto);
    aplicarProgressoMesclado(juntos);
    cfgNuvem().visto = Date.now();
    salvar();
    if (!silencioso) toast('📥 Progresso baixado e juntado com o deste aparelho ✅', 3200);
    return { ok: true };
  } catch (e) {
    if (silencioso) { console.warn('nuvem (baixar):', e.message); return { ok: false, erro: e.message }; }
    desenharStatusNuvem('erro', e.message);
    toast('Não baixei: ' + e.message, 6000);
    return { ok: false, erro: e.message };
  }
}

/* -------------------------------- a tela -------------------------------- */
function nuvemStatusTexto() {
  const nv = cfgNuvem();
  if (!nuvemUrl() || !nuvemCodigo()) return '<span class="muted">Cole o endereço do seu Worker e o código de progresso para ativar.</span>';
  const quando = nv.ultimo ? new Date(nv.ultimo).toLocaleString('pt-BR') : null;
  return quando ? 'Último envio: <b>' + esc(quando) + '</b>' : 'Pronto para usar (nada enviado ainda).';
}
function desenharStatusNuvem(tipo, msg) {
  const el = $('#nv-status'); if (!el) return;
  el.innerHTML = tipo === 'erro'
    ? `<div class="fb wrong" style="margin-top:8px"><div class="tt">⚠️ Não deu</div><div class="com">${esc(msg)}</div></div>`
    : nuvemStatusTexto();
  if (tipo === 'erro') return;
  const b = $('#nv-estado'); if (b) b.textContent = '';
}
function blocoNuvem() {
  const nv = cfgNuvem();
  return `
  <h3 style="margin-top:0">☁️ Progresso na nuvem (Cloudflare) — simples, sem token</h3>
  <div class="muted small">Use o <b>mesmo código</b> no celular e no PC para os dois ficarem iguais. Outra pessoa gera <b>o código dela</b> e passa a ter o progresso separado do seu. Nada de token e nada de repositório.</div>
  <div class="grid c2" style="margin-top:10px">
    <div><label class="f">Endereço do seu Worker</label><input type="text" id="nv-url" value="${esc(nv.url || '')}" placeholder="${esc(NUVEM_URL_EXEMPLO)}"></div>
    <div><label class="f">Código de progresso</label>
      <div class="row" style="gap:8px;flex-wrap:nowrap">
        <input type="text" id="nv-codigo" value="${esc(nv.codigo || '')}" placeholder="ALEPA-7K3F-92QX" style="text-transform:uppercase">
        <button class="btn sm" id="nv-gerar" title="criar um código novo">🎲 gerar</button>
      </div>
    </div>
  </div>
  <label class="row tiny muted" style="margin-top:8px;gap:6px;cursor:pointer">
    <input type="checkbox" id="nv-auto" style="width:auto" ${nv.auto ? 'checked' : ''}>
    sincronizar sozinho (busca novidades ao abrir o app e envia quando você termina de estudar)
  </label>
  <div class="row" style="margin-top:10px">
    <button class="btn pri" id="nv-enviar">⬆️ Enviar progresso</button>
    <button class="btn ok" id="nv-baixar">⬇️ Baixar progresso</button>
    <button class="btn sm" id="nv-testar">🔌 Testar conexão</button>
  </div>
  <div id="nv-status" class="small muted" style="margin-top:8px">${nuvemStatusTexto()}</div>
  <details style="margin-top:8px">
    <summary class="small">📖 Como montar em 5 minutos (grátis) — passo a passo</summary>
    <div class="small muted" style="margin-top:8px;line-height:1.7">
      <b>1.</b> Crie a conta grátis em <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener">dash.cloudflare.com</a> (não pede cartão).<br>
      <b>2.</b> No painel: <b>Compute (Workers)</b> → <b>Workers &amp; Pages</b> → <b>Create</b> → <b>Workers</b> → nome <b>alepa-progresso</b> → <b>Deploy</b>.<br>
      <b>3.</b> Clique em <b>Edit code</b>, apague o exemplo e cole o conteúdo do arquivo <b>worker.js</b> (ele está na pasta <b>cloudflare/</b> do kit) → <b>Deploy</b>.<br>
      <b>4.</b> Crie a gaveta: <b>Storage &amp; Databases</b> → <b>KV</b> → <b>Create instance</b> → nome <b>alepa_progresso</b>.<br>
      <b>5.</b> Volte no Worker → <b>Settings</b> → <b>Bindings</b> (ou <i>Variables</i>) → <b>Add</b> → <b>KV namespace</b> → variável <b>PROGRESSO</b> → escolha <b>alepa_progresso</b> → <b>Save and Deploy</b>.<br>
      <b>6.</b> Copie o endereço <b>https://alepa-progresso.SEU-USUARIO.workers.dev</b>, cole acima, clique em <b>🎲 gerar</b> e depois em <b>⬆️ Enviar progresso</b>.<br>
      <span class="tiny">Tutorial completo, com as dúvidas mais comuns: arquivo <b>LEIA-CLOUDFLARE.md</b>.</span>
    </div>
  </details>`;
}
function ligarNuvem() {
  const g = id => $('#' + id);
  if (!g('nv-url')) return;
  const salvarCfg = () => {
    const nv = cfgNuvem();
    nv.url = g('nv-url').value.trim();
    nv.codigo = g('nv-codigo').value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    g('nv-codigo').value = nv.codigo;
    salvar();
  };
  g('nv-url').onchange = () => { salvarCfg(); desenharStatusNuvem('ok'); };
  g('nv-codigo').onchange = () => { salvarCfg(); desenharStatusNuvem('ok'); };
  g('nv-gerar').onclick = () => { g('nv-codigo').value = gerarCodigoNuvem(); salvarCfg(); toast('Código novo gerado. Use o mesmo nos seus aparelhos 📱💻'); desenharStatusNuvem('ok'); };
  g('nv-auto').onchange = e => { cfgNuvem().auto = e.target.checked; salvar(); toast(e.target.checked ? 'Sincronização automática ligada' : 'Sincronização automática desligada'); };
  g('nv-testar').onclick = async e => {
    const b = e.target; const antes = b.textContent; b.innerHTML = '<span class="spin"></span> testando…'; b.disabled = true;
    salvarCfg();
    try {
      const r = await nuvemRequisicao('/health');
      desenharStatusNuvem('ok');
      const el = $('#nv-status');
      el.innerHTML = `<div class="fb" style="border-color:rgba(52,211,153,.45);background:rgba(52,211,153,.07)"><div class="tt">✅ Conexão funcionando</div><div class="com">O Worker respondeu (${esc((r && r.servico) || 'ok')}). Agora clique em “⬆️ Enviar progresso”.</div></div>`;
    } catch (err) { desenharStatusNuvem('erro', err.message); }
    b.textContent = antes; b.disabled = false;
  };
  g('nv-enviar').onclick = async e => { const b = e.target; const antes = b.textContent; b.innerHTML = '<span class="spin"></span> enviando…'; b.disabled = true; salvarCfg(); await nuvemEnviar(false); configurarTextoNuvem(); b.textContent = antes; b.disabled = false; };
  g('nv-baixar').onclick = async e => { const b = e.target; const antes = b.textContent; b.innerHTML = '<span class="spin"></span> baixando…'; b.disabled = true; salvarCfg(); await nuvemBaixar(false); configurarTextoNuvem(); b.textContent = antes; b.disabled = false; };
}
function configurarTextoNuvem() { const el = $('#nv-status'); if (el && !el.querySelector('.fb')) el.innerHTML = nuvemStatusTexto(); }
