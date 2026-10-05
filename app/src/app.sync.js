/* ==========================================================================
   ARENA ESTUDOS — parte 3:
   • Assistente de primeira abertura (inclui ONDE colocar a chave do HF)
   • Configuração guiada da IA (token + modelo + teste)
   • Sincronização do progresso entre aparelhos (Hugging Face)
   • PWA: instalar no celular e usar offline
   ========================================================================== */
'use strict';

/* Acesso seguro ao armazenamento do navegador (alguns previews/iframes bloqueiam) */
function lsGet(chave) { try { return localStorage.getItem(chave); } catch (e) { return null; } }
function lsSet(chave, valor) { try { localStorage.setItem(chave, valor); return true; } catch (e) { return false; } }

const HF_TOKENS_URL = 'https://huggingface.co/settings/tokens/new?tokenType=fineGrained&name=Arena%20Estudos%20ALEPA';
const HF_SIGNUP_URL = 'https://huggingface.co/join';

/* ------------------------- MODAL / ASSISTENTE ---------------------------- */
function abrirModal(html, largura) {
  fecharModal();
  const el = document.createElement('div');
  el.id = 'modal-root';
  el.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(5,8,18,.82);backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
  el.innerHTML = `<div style="width:100%;max-width:${largura || 620}px;background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:var(--shadow);margin:auto 0">${html}</div>`;
  el.addEventListener('click', e => { if (e.target === el) fecharModal(); });
  document.body.appendChild(el);
  return el;
}
function fecharModal() { const m = $('#modal-root'); if (m) m.remove(); }

/* ------------- CONFIGURAÇÃO DAS IAs (onde vai a chave!) ------------------ */
/* Cada IA tem a SUA chave e o SEU modelo. Você pode ligar várias: o app usa a
   principal e, se ela falhar, passa para as outras (reserva automática). */
function conteudoConfigIA() {
  migrarIA();
  const id = provAtualId(), p = PROVEDORES[id], c = cfgProv(id);
  const ligadas = provedoresConfigurados();
  return `
  <div class="row" style="justify-content:space-between;align-items:flex-start">
    <h3 style="margin:0">🔑 Escolha e configure a sua IA</h3>
    <button class="btn sm ghost" onclick="fecharModal()">✕</button>
  </div>
  ${(!S.config.iaMostrarTodas) ? `<div class="row tiny" style="margin-top:8px;justify-content:space-between"><span class="muted">Modo simples: <b>${esc(nomesSimples())}</b> — as três são gratuitas.</span>${S.config.iaMostrarTodas === false ? '' : ''}</div>` : ''}
  <div class="muted small" style="margin-top:6px">A chave de cada IA fica salva <b>somente neste aparelho</b>. Ligue mais de uma: o app usa a principal, passa para as outras sozinho se alguma falhar e — se você quiser — pergunta para <b>várias ao mesmo tempo</b> para comparar as respostas.</div>

  <label class="f" style="margin-top:12px">Qual IA usar como principal?</label>
  <select id="ia-prov">
    ${iasVisiveis().map(k => `<option value="${k}"${k === id ? ' selected' : ''}>${PROVEDORES[k].emoji} ${esc(PROVEDORES[k].nome)}${iaConfigurada(k) ? '  ✅' : ''}</option>`).join('')}
  </select>
  <div class="tiny muted" style="margin-top:4px">✅ = já tem chave salva neste aparelho · ${ligadas.length} IA(s) ligada(s): ${esc(resumoIA())}</div>
  <label class="row tiny muted" style="margin-top:6px;gap:6px;cursor:pointer">
    <input type="checkbox" id="ia-todas" style="width:auto" ${S.config.iaMostrarTodas ? 'checked' : ''}>
    mostrar todas as IAs (avançado: ChatGPT, Claude, OpenRouter, Mistral, DeepSeek, Grok, IA local…)
  </label>

  <div style="margin-top:12px;background:#0c1222;border:1px solid var(--line);border-radius:12px;padding:12px">
    <div class="row" style="justify-content:space-between">
      <b>${p.emoji} ${esc(p.nome)}</b>
      <span class="badge ${String(p.custo).indexOf('grátis') === 0 ? 'ok' : 'warn'}">${esc(p.custo)}</span>
    </div>
    <div class="small muted" style="margin-top:6px">${esc(p.ajuda)}</div>
    <div class="row" style="margin-top:8px">
      <a class="btn sm gold" href="${p.criar}" target="_blank" rel="noopener">🔗 Como conseguir a chave</a>
      ${p.obs ? `<span class="tiny muted">${esc(p.obs)}</span>` : ''}
    </div>

    ${p.semChave
      ? `<label class="f" style="margin-top:10px">Endereço da IA no seu computador</label>
         <input type="text" id="ia-base" placeholder="${esc(p.urlPadrao || 'http://localhost:11434/v1/chat/completions')}" value="${esc(c.baseUrl || p.urlPadrao || '')}">`
      : `<label class="f" style="margin-top:10px">Cole aqui a sua chave ${p.prefixo ? `(começa com <code>${esc(p.prefixo)}</code>)` : ''}</label>
         <input type="password" id="ia-token" placeholder="${esc(p.prefixo || 'sua chave')}..." value="${esc(c.token || '')}" autocomplete="off" spellcheck="false">
         <div class="row tiny muted" style="margin-top:5px">
           <label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="ia-mostrar" style="width:auto"> mostrar</label>
           <span>·</span><span>${iaConfigurada(id) ? '✅ já existe uma chave salva' : '⚠️ nenhuma chave ainda'}</span>
         </div>`}

    ${p.urlLivre ? `<label class="f" style="margin-top:8px">Endereço da API (…/v1/chat/completions)</label>
         <input type="text" id="ia-base" placeholder="https://servico.com/v1/chat/completions" value="${esc(c.baseUrl || '')}">` : ''}

    <label class="f" style="margin-top:8px">Modelo</label>
    <div class="row" style="align-items:stretch">
      <input type="text" id="ia-modelo" list="ia-modelos-lista" placeholder="${esc((p.modelos && p.modelos[0]) || 'nome do modelo')}" value="${esc(c.modelo || '')}" style="flex:1">
      <button class="btn sm" id="ia-buscar-modelos" title="Buscar os modelos que a sua chave enxerga">🔄 buscas modelos</button>
      <button class="btn sm" id="ia-auto2" title="Escolhe automaticamente um modelo de conversa que funcione e testa">✨ escolher por mim</button>
    </div>
    <datalist id="ia-modelos-lista">${(p.modelos || []).map(m => `<option value="${esc(m)}">`).join('')}</datalist>
    <div class="tiny muted" style="margin-top:4px" id="ia-modelos-hint">Sugestões: ${esc((p.modelos || []).slice(0, 4).join(' · ') || 'clique em “buscas modelos”')}</div>

    <div class="row" style="margin-top:10px">
      <label style="display:flex;gap:6px;align-items:center;cursor:pointer" class="small"><input type="checkbox" id="ia-reserva" style="width:auto" ${S.config.iaReserva !== false ? 'checked' : ''}> usar as outras IAs ligadas como reserva</label>
    </div>
  </div>

  ${ligadas.length > 1 ? `
  <div style="margin-top:12px;background:#0c1222;border:1px solid var(--line);border-radius:12px;padding:12px">
    <b>⚡ Uso simultâneo (comparar respostas / gerar questões em paralelo)</b>
    <div class="small muted" style="margin-top:4px">Marque quais IAs devem responder <b>ao mesmo tempo</b> quando você ativar o modo comparar ou o gerador paralelo. Máximo de 4 (para não estourar as cotas grátis). A principal aparece primeiro.</div>
    <div class="row" style="margin-top:8px;flex-wrap:wrap">
      ${ligadas.map(k => `<label style="display:flex;gap:6px;align-items:center;cursor:pointer" class="small"><input type="checkbox" data-paralelo="${k}" style="width:auto" ${(S.config.iaParalelo.length ? S.config.iaParalelo.indexOf(k) >= 0 : true) ? 'checked' : ''}> ${PROVEDORES[k].emoji} ${esc(PROVEDORES[k].nome)}</label>`).join('')}
    </div>
  </div>` : ''}

  <div style="margin-top:12px" id="ia-teste-out"></div>
  <div class="row" style="margin-top:10px">
    <button class="btn pri" id="ia-salvar-testar">💾 Salvar e testar</button>
    <button class="btn" id="ia-diag">🔍 Testar todas as minhas IAs</button>
    <button class="btn" id="ia-somente-salvar">Salvar sem testar</button>
  </div>
  <div class="tiny muted" style="margin-top:10px">🔒 Sobre segurança: a chave fica no seu aparelho e serve só para o app. Se usar uma chave com permissões restritas (como no Hugging Face: só “Inference Providers”), mesmo que ela vaze não dá acesso à sua conta. Você pode revogar quando quiser.</div>
  <div class="tiny muted" style="margin-top:6px">💡 Modo simples: <b>${esc(nomesSimples())}</b> — todas gratuitas. Precisa de outra? Marque "mostrar todas as IAs" ali em cima.</div>
  <div class="tiny muted" style="margin-top:6px">☁️ Para <b>sincronizar o progresso entre aparelhos</b> é preciso a chave do <b>Hugging Face</b> (com permissão de escrita) — é a única que guarda o arquivo do seu progresso.</div>`;
}

function abrirConfigIA() {
  migrarIA();
  abrirModal(conteudoConfigIA());
  ligarConfigIA();
}

function ligarConfigIA() {
  const id0 = provAtualId();
  const trocarProvedor = () => {
    S.config.iaPrincipal = $('#ia-prov').value;
    try { salvar(); } catch (e) { }
    abrirConfigIA();
  };
  $('#ia-prov').onchange = trocarProvedor;
  const mostrar = $('#ia-mostrar');
  if (mostrar) mostrar.onchange = e => { $('#ia-token').type = e.target.checked ? 'text' : 'password'; if (e.target.checked) $('#ia-token').focus(); };
  const reserva = $('#ia-reserva');
  if (reserva) reserva.onchange = e => { S.config.iaReserva = e.target.checked; try { salvar(); } catch (e2) { } };
  $('#ia-buscar-modelos').onclick = async e => {
    const id = provAtualId();
    if (!iaConfigurada(id)) { toast('Informe a chave primeiro e clique em buscar.'); return; }
    const b = e.target; b.innerHTML = '<span class="spin"></span> buscando…';
    try {
      const lista = await listarModelos(id);
      const dl = $('#ia-modelos-lista');
      if (dl) dl.innerHTML = lista.map(m => `<option value="${esc(m)}">`).join('');
      const hint = $('#ia-modelos-hint');
      if (hint) hint.textContent = lista.length ? lista.length + ' modelos encontrados — clique no campo Modelo para ver a lista' : 'Não encontrei modelos; digite o nome manualmente.';
      toast(lista.length + ' modelos encontrados ✅');
    } catch (err) { toast('Não consegui listar: ' + err.message, 5000); }
    b.textContent = '🔄 buscas modelos';
  };
  const verTodas = $('#ia-todas');
  if (verTodas) verTodas.onchange = e => {
    S.config.iaMostrarTodas = e.target.checked;
    try { salvar(); } catch (err) { }
    abrirConfigIA();
    toast(e.target.checked ? 'Mostrando todas as IAs' : 'Modo simples: Hugging Face, Gemini e Groq');
  };
  const auto2 = $('#ia-auto2'); if (auto2) auto2.onclick = acharModeloQueFunciona;
  document.querySelectorAll('[data-paralelo]').forEach(cx => {
    cx.onchange = () => {
      S.config.iaParalelo = Array.prototype.slice.call(document.querySelectorAll('[data-paralelo]')).filter(c => c.checked).map(c => c.dataset.paralelo);
      try { salvar(); } catch (err) { }
      toast(S.config.iaParalelo.length ? 'Simultâneo com: ' + S.config.iaParalelo.map(k => PROVEDORES[k].nome).join(', ') : 'Vazio = usa todas as ligadas');
    };
  });
  $('#ia-somente-salvar').onclick = () => { salvarConfigIA(); toast('Configuração salva ✅'); fecharModal(); atualizarAvisoIA(); };
  $('#ia-salvar-testar').onclick = async () => {
    salvarConfigIA();
    const out = $('#ia-teste-out'); out.innerHTML = '<span class="badge"><span class="spin"></span> testando a IA…</span>';
    const id = provAtualId();
    try {
      const r = await chamarIAProvedor(id, [{ role: 'user', content: 'Responda apenas: OK' }], { max_tokens: 10, temperature: 0 });
      out.innerHTML = `<div class="fb right"><div class="tt">✅ ${esc(PROVEDORES[id].nome)} funcionando!</div><div class="com">O modelo respondeu: "${esc(String(r).slice(0, 60))}". Agora use a aba IA para gerar questões e tirar dúvidas.</div></div>`;
      atualizarAvisoIA(); setTimeout(fecharModal, 1700);
    } catch (e) {
      out.innerHTML = `<div class="fb wrong"><div class="tt">❌ Não funcionou</div><div class="com" style="white-space:pre-wrap">${esc(e.message)}</div>
        <div class="row" style="margin-top:8px">
          <button class="btn sm gold" id="ia-auto-modelo">🔄 achar um modelo que funciona</button>
          <button class="btn sm" id="ia-diag2">🔍 Testar todas as minhas IAs</button>
        </div></div>`;
      const d2 = $('#ia-diag2'); if (d2) d2.onclick = rodarDiagnostico;
      const am = $('#ia-auto-modelo'); if (am) am.onclick = acharModeloQueFunciona;
    }
  };
  $('#ia-diag').onclick = rodarDiagnostico;
  void id0;
}
function salvarConfigIA() {
  const id = provAtualId(), c = cfgProv(id), p = PROVEDORES[id];
  const campoTok = $('#ia-token'), campoBase = $('#ia-base'), campoMod = $('#ia-modelo');
  if (campoTok) c.token = campoTok.value.trim();
  if (campoBase) c.baseUrl = campoBase.value.trim();
  if (campoMod) c.modelo = campoMod.value.trim();
  S.config.iaPrincipal = ($('#ia-prov') && $('#ia-prov').value) || id;
  if (p.semChave && !c.baseUrl) c.baseUrl = p.urlPadrao || '';
  if (!c.modelo) c.modelo = (p.modelos && p.modelos[0]) || c.modelo;
  try { salvar(); } catch (e) { }
}

/* Um clique para resolver "esse modelo não existe mais": consulta a lista da
   própria conta, escolhe um modelo de conversa, salva e testa na hora. */
async function acharModeloQueFunciona() {
  const id = provAtualId(), out = $('#ia-teste-out');
  out.innerHTML = '<span class="badge"><span class="spin"></span> consultando a lista de modelos da ' + esc(PROVEDORES[id].nome) + '…</span>';
  try {
    const lista = await listarModelos(id);
    const bons = lista.filter(ehModeloDeConversa);
    if (!bons.length) throw new Error('Não encontrei nenhum modelo de conversa disponível na sua conta (' + lista.length + ' modelos listados).');
    const escolhido = escolherModeloBom(bons);
    cfgProv(id).modelo = escolhido;
    try { salvar(); } catch (e) { }
    const campo = $('#ia-modelo'); if (campo) campo.value = escolhido;
    const dl = $('#ia-modelos-lista'); if (dl) dl.innerHTML = lista.map(m => `<option value="${esc(m)}">`).join('');
    out.innerHTML = `<span class="badge"><span class="spin"></span> testando “${esc(escolhido)}”…</span>`;
    const r = await chamarIAProvedor(id, [{ role: 'user', content: 'Responda apenas: OK' }], { max_tokens: 128, temperature: 0 });
    out.innerHTML = `<div class="fb right"><div class="tt">✅ Resolvido! Agora usando “${esc(escolhido)}”</div>
      <div class="com">A ${esc(PROVEDORES[id].nome)} respondeu: "${esc(String(r).slice(0, 50))}". Já salvei essa escolha neste aparelho — pode fechar esta janela e usar a aba 🤖 IA.</div>
      <div class="tiny muted" style="margin-top:6px">A lista completa tem ${lista.length} modelos: clique no campo “Modelo” para escolher outro, se preferir.</div></div>`;
    atualizarAvisoIA();
  } catch (e) {
    out.innerHTML = `<div class="fb wrong"><div class="tt">❌ Não consegui resolver automaticamente</div><div class="com" style="white-space:pre-wrap">${esc(e.message)}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" id="ia-diag3">🔍 Testar todas as minhas IAs</button></div></div>`;
    const d3 = $('#ia-diag3'); if (d3) d3.onclick = rodarDiagnostico;
  }
}

async function rodarDiagnostico() {
  const out = $('#ia-teste-out');
  out.innerHTML = '<span class="badge"><span class="spin"></span> testando endereço, chave e modelos… (pode levar ~30s)</span>';
  let rel;
  try { rel = await diagnosticarIA(); } catch (e) { rel = 'Erro ao diagnosticar: ' + ((e && e.message) || e); }
  out.innerHTML = `<div class="fb" style="background:rgba(79,125,251,.08);border:1px solid rgba(79,125,251,.35)"><div class="tt">🔍 Diagnóstico do tutor de IA</div>
    <pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;margin:0;color:#dbe3f7">${esc(rel)}</pre>
    <div class="row" style="margin-top:8px">
      <button class="btn sm" id="ia-copiar-diag">📋 Copiar relatório</button>
      <button class="btn sm ghost" id="ia-fechar-diag">Fechar</button>
    </div></div>`;
  const b = $('#ia-copiar-diag'); if (b) b.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(rel).then(() => toast('Relatório copiado ✅')).catch(() => { }); };
  const f = $('#ia-fechar-diag'); if (f) f.onclick = () => { out.innerHTML = ''; };
}

/* aviso permanente no topo do painel quando não há chave */
function cartaoIA() {
  if (temChaveIA() || IA_STATUS.servidor) return '';
  return `<div class="card" style="border-color:rgba(251,191,36,.32);background:linear-gradient(180deg,rgba(251,191,36,.07),rgba(251,191,36,.015))">
    <div class="row" style="justify-content:space-between">
      <div><b>🤖 Nenhuma IA ligada ainda</b>
        <div class="small muted">Escolha a sua IA (Hugging Face, Google Gemini, Groq… — as gratuitas estão marcadas) e cole a chave. Leva 1 minuto e libera o tutor, os resumos e a geração de questões inéditas.</div>
      </div>
      <button class="btn gold" onclick="abrirConfigIA()">🔑 Escolher minha IA</button>
    </div>
  </div>`;
}
function atualizarAvisoIA() {
  const c = $('#cartao-ia'); if (c) c.innerHTML = cartaoIA();
  const b = $('#badge-ia');
  if (b) {
    const on = temChaveIA() || IA_STATUS.servidor;
    b.textContent = on ? ('🔑 ' + PROVEDORES[provAtualId()].nome.split(' ')[0] + ' ativa') : '🔑 Ligar uma IA';
    b.className = 'badge ' + (on ? 'ok' : 'warn');
  }
}

/* --------------------------- PRIMEIRA ABERTURA --------------------------- */
function talvezOnboarding() {
  if (lsGet('alepa_onboarding')) return;
  passo1();
}
function passo1() {
  abrirModal(`
    <div style="text-align:center;margin-bottom:6px;font-size:40px">🎯</div>
    <h2 style="margin:0 0 4px;text-align:center">Bem-vindo ao seu app de estudos!</h2>
    <div class="muted small" style="text-align:center;margin-bottom:14px">ALEPA 002/2026 · Fundação CETAP · Cargo 15 — Assistência Legislativa · prova em <b>13/12/2026</b></div>
    <label class="f">Como você quer ser chamado?</label>
    <input type="text" id="ob-nome" placeholder="Seu nome ou apelido" value="${esc(S.config.nome || '')}">
    <div class="grid c2" style="margin-top:6px">
      <div><label class="f">Meta de questões até a prova</label><input type="number" id="ob-total" value="${S.config.metaTotal || 3000}"></div>
      <div><label class="f">Questões por dia (sugestão)</label><input type="number" id="ob-dia" value="${S.config.metaDia || 41}"></div>
    </div>
    <div class="row" style="margin-top:14px;justify-content:space-between">
      <span class="tiny muted">Passo 1 de 3</span>
      <button class="btn pri" id="ob-next">Continuar →</button>
    </div>`);
  $('#ob-next').onclick = () => {
    S.config.nome = $('#ob-nome').value.trim();
    S.config.metaTotal = +$('#ob-total').value || 3000;
    S.config.metaDia = +$('#ob-dia').value || 41;
    salvar(); atualizarBadges(); passo2();
  };
}
function passo2() {
  abrirModal(`
    <h2 style="margin:0 0 6px">🤖 Passo 2 de 3 — Ligar a IA (opcional, mas recomendado)</h2>
    <div class="muted small" style="margin-bottom:12px">A IA serve para: explicar qualquer questão que você errar, resumir matérias do edital e <b>criar questões inéditas</b> sobre qualquer tópico. É gratuita e usa a sua conta do Hugging Face.</div>
    <div class="card" style="margin:0 0 12px;background:var(--card2)">
      <b class="small">Onde colocar a chave — em 5 passos</b>
      <ol class="small" style="margin:8px 0 0;padding-left:20px;line-height:1.7">
        <li>Acesse <a href="${HF_SIGNUP_URL}" target="_blank" rel="noopener">huggingface.co/join</a> e crie a conta grátis (sem cartão).</li>
        <li>Abra <a href="${HF_TOKENS_URL}" target="_blank" rel="noopener">huggingface.co/settings/tokens → New token</a>.</li>
        <li>Escolha <b>Fine-grained</b> e marque <b>“Make calls to Inference Providers”</b>.</li>
        <li>Copie o código que começa com <b>hf_</b>.</li>
        <li>Cole no campo abaixo ⇩ e toque em <b>Salvar e testar</b>.</li>
      <li><b>Prefere outra IA?</b> Dá para usar Google Gemini, Groq, ChatGPT, Claude, OpenRouter, DeepSeek… Depois de concluir, toque no botão <b>🔑 no topo</b> e escolha a sua — cada uma tem o seu campo de chave e o app testa para você.</li>
      </ol>
    </div>
    <label class="f">Sua chave do Hugging Face</label>
    <input type="password" id="ia-token" placeholder="hf_... (pode pular e colocar depois)" autocomplete="off" spellcheck="false">
    <div id="ia-teste-out" style="margin-top:10px"></div>
    <div class="row" style="margin-top:14px;justify-content:space-between">
      <div class="row">
        <button class="btn" id="ob-voltar">← Voltar</button>
        <button class="btn ghost" id="ob-pular">Pular por enquanto</button>
      </div>
      <button class="btn pri" id="ob-salvar">Salvar e testar →</button>
    </div>`);
  $('#ob-voltar').onclick = passo1;
  $('#ob-pular').onclick = passo3;
  $('#ob-salvar').onclick = async () => {
    S.config.tokenIA = $('#ia-token').value.trim(); salvar();
    if (!temChaveIA()) { toast('Sem IA por enquanto — você pode ligar depois pelo botão 🔑'); return passo3(); }
    const out = $('#ia-teste-out'); out.innerHTML = '<span class="badge"><span class="spin"></span> testando…</span>';
    try { await chamarIA([{ role: 'user', content: 'Responda apenas: OK' }], { max_tokens: 10, temperature: 0 }); out.innerHTML = '<div class="fb right"><div class="tt">✅ Chave funcionando!</div></div>'; setTimeout(passo3, 900); }
    catch (e) {
      out.innerHTML = `<div class="fb wrong"><div class="tt">❌ Deu erro</div><div class="com" style="white-space:pre-wrap">${esc(e.message)}</div>
        <div class="row" style="margin-top:8px"><button class="btn sm" onclick="passo3()">Continuar mesmo assim →</button></div></div>`;
    }
  };
}
function passo3() {
  const podeInstalar = !!window.__INSTALAR_PWA;
  abrirModal(`
    <h2 style="margin:0 0 6px">✅ Passo 3 de 3 — Você está pronto!</h2>
    <div class="small" style="line-height:1.8">
      <b>Como estudar todo dia:</b>
      <div>1. <b>Painel → “Treinar agora”</b>: as ${S.config.metaDia} questões do dia.</div>
      <div>2. <b>Geradores infinitos</b> (aba Treinar): questões de matemática novas a cada clique.</div>
      <div>3. <b>🤖 IA</b>: peça resumos e gere questões inéditas dos tópicos mais fracos.</div>
      <div>4. <b>⏱️ Simulado</b>: 2 vezes por semana, 60 questões, cronometrado.</div>
    </div>
    <div class="card" style="margin:12px 0 0;background:var(--card2)">
      <b class="small">💾 Para não perder nada</b>
      <div class="small muted" style="margin-top:4px">Seu progresso fica salvo neste aparelho. Use a aba <b>Progresso → Exportar</b> para guardar um backup, ou ative a <b>sincronização em nuvem</b> (também pela aba Progresso) para estudar no celular e no computador com o mesmo histórico.</div>
    </div>
    ${podeInstalar ? '<div class="row" style="margin-top:12px"><button class="btn" onclick="instalarPWA()">📲 Instalar no celular (tela inicial)</button></div>' : ''}
    <div class="row" style="margin-top:14px;justify-content:space-between">
      <button class="btn" id="ob-ia">🔑 Abrir configuração da IA</button>
      <button class="btn pri" id="ob-fim">Começar a estudar 🚀</button>
    </div>`);
  lsSet('alepa_onboarding', '1');
  $('#ob-fim').onclick = () => { fecharModal(); atualizarAvisoIA(); irPara('painel'); };
  $('#ob-ia').onclick = () => { fecharModal(); irPara('ia'); setTimeout(abrirConfigIA, 200); };
}

/* ------------------- SINCRONIZAÇÃO (Hugging Face) ------------------------ */
/* Usa um repositório de DATASET privado na sua conta do Hugging Face para
   guardar o arquivo "progresso.json". Assim o mesmo histórico aparece no
   celular e no computador. */
function cfgSync() {
  try { S.config.sync = S.config.sync || { repo: '', auto: true, ultimo: 0 }; return S.config.sync; }
  catch (e) { return { repo: '', auto: false, ultimo: 0 }; }
}
/* Configuração sem NENHUMA chave de IA — backup e nuvem nunca levam segredos. */
function configSemSegredos() {
  const c = Object.assign({}, S.config, { tokenIA: '' });
  if (c.ias) {
    const limpo = {};
    Object.keys(c.ias).forEach(k => { limpo[k] = Object.assign({}, c.ias[k], { token: '' }); });
    c.ias = limpo;
  }
  return c;
}
function pacoteProgresso() {
  return { app: 'ArenaEstudos-ALEPA', versao: 1, atualizadoEm: Date.now(), hist: S.hist, resp: S.resp, fav: S.fav, notas: S.notas, teoria: S.teoria, geradas: S.geradas, provas: S.provas, config: configSemSegredos() };
}
async function hfApi(caminho, opts = {}) {
  const tok = tokenHF();
  if (!tok) throw new Error('Informe a chave do Hugging Face primeiro (botão 🔑).');
  const r = await fetch('https://huggingface.co' + caminho, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + tok }, opts.headers || {}) }));
  if (!r.ok) { let d = ''; try { d = (await r.text()).slice(0, 200); } catch (e) { } throw new Error('Hugging Face respondeu ' + r.status + (d ? ' — ' + d : '')); }
  return r;
}
async function criarRepoProgresso(repo) {
  const nome = repo.includes('/') ? repo.split('/')[1] : repo;
  const org = repo.includes('/') ? repo.split('/')[0] : null;
  const corpo = { type: 'dataset', name: nome, private: true };
  if (org && org.toLowerCase() !== (S.config.userHF || '').toLowerCase()) corpo.organization = org;
  try { await hfApi('/api/repos/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }); }
  catch (e) { if (!/409|already|existe/i.test(e.message)) throw e; }
}
async function empurrarProgresso(repo) {
  repo = repo || cfgSync().repo;
  if (!repo) throw new Error('Informe o repositório (ex.: seunome/alepa-progresso).');
  const dados = JSON.stringify(pacoteProgresso());
  if (IA_STATUS.servidor) {
    const r = await fetch('api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'push', repo, dados, token: tokenHF() }) });
    if (r.ok) return (await r.json());
    throw new Error((await r.json().catch(() => ({}))).error || 'falha no servidor');
  }
  await hfApi(`/api/datasets/${repo}/upload/main/progresso.json`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: dados });
  return { ok: true };
}
async function puxarProgresso(repo) {
  repo = repo || cfgSync().repo;
  if (!repo) throw new Error('Informe o repositório.');
  if (IA_STATUS.servidor) {
    const r = await fetch('api/sync?acao=pull&repo=' + encodeURIComponent(repo) + '&token=' + encodeURIComponent(tokenHF() || ''));
    if (r.ok) return await r.json();
    throw new Error((await r.json().catch(() => ({}))).error || 'falha no servidor');
  }
  const r = await hfApi(`/datasets/${repo}/resolve/main/progresso.json?download=true`);
  return await r.json();
}
/* aplica o pacote mantendo as chaves já salvas neste aparelho */
function semApagarChaves(configRecebida) {
  const c = Object.assign({}, configRecebida || {});
  delete c.tokenIA;
  if (c.ias) {
    const local = S.config.ias || {};
    Object.keys(c.ias).forEach(k => {
      const guardada = (local[k] && local[k].token) || '';
      c.ias[k] = Object.assign({}, c.ias[k], { token: guardada });
    });
    Object.keys(local).forEach(k => { if (!c.ias[k]) c.ias[k] = local[k]; });
  } else {
    c.ias = S.config.ias;
  }
  return c;
}
function aplicarPacote(p, substituir = true) {
  if (!p || !p.atualizadoEm) throw new Error('arquivo de progresso inválido');
  if (substituir) {
    const tok = S.config.tokenIA, sync = S.config.sync;
    S.hist = p.hist || {}; S.resp = p.resp || {}; S.fav = p.fav || {}; S.notas = p.notas || {}; S.teoria = p.teoria || {}; S.geradas = p.geradas || []; S.provas = p.provas || [];
    const cfgRecebida = semApagarChaves(p.config);
    S.config = Object.assign(estadoInicial().config, cfgRecebida, { tokenIA: tok, sync: sync });
    migrarIA();
  }
  salvar(); reindexar(); atualizarBadges();
}
async function sincronizar(acao, silencioso) {
  const sc = cfgSync();
  if (!sc.repo) { if (!silencioso) toast('Configure o repositório de sincronização primeiro'); return; }
  try {
    if (acao === 'push') { await empurrarProgresso(); sc.ultimo = Date.now(); salvar(); if (!silencioso) toast('☁️ Progresso enviado para a nuvem'); }
    else {
      const p = await puxarProgresso();
      if (!p || !p.atualizadoEm) { if (!silencioso) toast('Ainda não há progresso salvo na nuvem'); return; }
      const localT = Math.max(0, ...Object.values(S.hist || {}).map(() => 0), sc.ultimo || 0);
      if (p.atualizadoEm <= localT && !silencioso && !confirm('A cópia da nuvem parece mais antiga que a sua. Substituir mesmo assim?')) return;
      aplicarPacote(p, true); if (!silencioso) toast('☁️ Progresso baixado! Estatísticas atualizadas.');
    }
    atualizarAvisoIA();
  } catch (e) { if (!silencioso) toast('Erro na sincronização: ' + e.message, 5000); IA_STATUS.erroSync = e.message; }
}
let SYNC_TIMER = null;
let NUVEM_TIMER = null;
function agendarPush() {
  const sc = cfgSync();
  if (sc.auto && sc.repo) { clearTimeout(SYNC_TIMER); SYNC_TIMER = setTimeout(() => sincronizar('push', true), 20000); }
  /* nuvem (Cloudflare): mesmo comportamento, no seu Worker */
  try {
    const nv = (typeof cfgNuvem === 'function') ? cfgNuvem() : null;
    if (nv && nv.auto && typeof nuvemEnviar === 'function' && nuvemUrl() && nuvemCodigo()) {
      clearTimeout(NUVEM_TIMER);
      NUVEM_TIMER = setTimeout(() => nuvemEnviar(true), 20000);
    }
  } catch (e) { }
}
function blocoSync() {
  const temHF = !!tokenHF();
  const sc = cfgSync();
  return `
  <h3 style="margin-top:0">☁️ Sincronizar progresso (estudar no celular e no PC)</h3>
  <div class="muted small">O app guarda seu progresso num repositório <b>privado</b> da sua própria conta do Hugging Face. Nada passa por servidores de terceiros.</div>
  <div class="grid c2" style="margin-top:10px">
    <div><label class="f">Repositório (ex.: seuusuario/alepa-progresso)</label><input type="text" id="sy-repo" value="${esc(sc.repo || '')}" placeholder="seuusuario/alepa-progresso"></div>
    <div><label class="f">Sincronização automática</label>
      <select id="sy-auto"><option value="1"${sc.auto ? ' selected' : ''}>Ligada (envia sozinho a cada sessão)</option><option value="0"${!sc.auto ? ' selected' : ''}>Desligada (só manual)</option></select></div>
  </div>
  <div class="row" style="margin-top:10px">
    <button class="btn pri" id="sy-criar">1️⃣ Criar repositório privado</button>
    <button class="btn ok" id="sy-push">⬆️ Enviar progresso</button>
    <button class="btn" id="sy-pull">⬇️ Baixar progresso</button>
  </div>
  <div id="sy-out" class="small muted" style="margin-top:8px">${sc.ultimo ? 'Último envio: ' + new Date(sc.ultimo).toLocaleString('pt-BR') : 'Ainda não sincronizado.'}</div>
  ${temHF ? '' : '<div class="fb wrong" style="margin-top:8px"><div class="tt">⚠️ Falta a chave do Hugging Face</div><div class="com">A nuvem de progresso usa o Hugging Face (as outras IAs servem para conversar, não para guardar arquivos). Toque no botão 🔑 no topo, escolha “Hugging Face” e cole uma chave com permissão de escrita — ou use o backup por arquivo logo abaixo, que funciona sempre.</div></div>'}
  <div class="tiny muted" style="margin-top:6px">A chave usada aqui precisa ter permissão de <b>escrita</b> (token Fine-grained com “Write access to contents of repos” ou um token Read/Write clássico). Se você usou só “Make calls to Inference Providers”, use o botão de backup por arquivo abaixo.</div>`;
}
function ligarSync() {
  const g = id => $('#' + id);
  if (!g('sy-repo')) return;
  g('sy-repo').onchange = g('sy-auto').onchange = () => { S.config.sync = { repo: g('sy-repo').value.trim(), auto: g('sy-auto').value === '1', ultimo: cfgSync().ultimo }; salvar(); };
  g('sy-criar').onclick = async () => {
    const repo = g('sy-repo').value.trim(); if (!repo) return toast('Digite o repositório, ex.: seuusuario/alepa-progresso');
    g('sy-out').innerHTML = '<span class="spin"></span> criando repositório privado…';
    try { await criarRepoProgresso(repo); cfgSync().repo = repo; salvar(); g('sy-out').textContent = '✅ Repositório pronto (' + repo + '). Agora clique em Enviar progresso.'; }
    catch (e) { g('sy-out').innerHTML = '⚠️ ' + esc(e.message) + '<br><span class="tiny">Se o repositório já existir, pode seguir direto para “Enviar progresso”.</span>'; }
  };
  g('sy-push').onclick = async () => { g('sy-out').innerHTML = '<span class="spin"></span> enviando…'; await sincronizar('push'); g('sy-out').textContent = 'Último envio: ' + new Date(cfgSync().ultimo || Date.now()).toLocaleString('pt-BR'); };
  g('sy-pull').onclick = async () => { g('sy-out').innerHTML = '<span class="spin"></span> baixando…'; await sincronizar('pull'); g('sy-out').textContent = 'Progresso atualizado a partir da nuvem.'; };
}

/* ------------------------------- PWA ------------------------------------- */
let INSTALAR_PWA = null;
function instalarPWA() { if (INSTALAR_PWA) { INSTALAR_PWA.prompt(); INSTALAR_PWA = null; } else toast('No iPhone: toque em Compartilhar → “Adicionar à Tela de Início”. No Android: menu ⋮ → “Instalar aplicativo”.', 6000); }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALAR_PWA = e; window.__INSTALAR_PWA = true; });
window.addEventListener('load', () => {
  try {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').then(() => { window.__OFFLINE_OK = true; }).catch(() => { });
    }
  } catch (e) { }
  try {
    const sc = cfgSync();
    if (sc.auto && sc.repo) sincronizar('pull', true);
  } catch (e) { }
  try {
    const nv = (typeof cfgNuvem === 'function') ? cfgNuvem() : null;
    if (nv && nv.auto && nuvemUrl() && nuvemCodigo()) nuvemBaixar(true);
  } catch (e) { }
  try { atualizarAvisoIA(); } catch (e) { }
  try { if (!lsGet('alepa_onboarding')) talvezOnboarding(); } catch (e) { console.warn('onboarding:', e); }
});
/* gancho de depuração (útil para inspecionar o estado pelo console e nos testes) */
try { window.__S = S; window.__estado = () => S; } catch (e) { }
window.abrirConfigIA = abrirConfigIA;
window.__nuvem = () => (typeof cfgNuvem === 'function' ? cfgNuvem() : null);
window.fecharModal = fecharModal;
window.instalarPWA = instalarPWA;
window.passo3 = passo3;
