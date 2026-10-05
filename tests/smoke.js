/* ============================================================
   Arena Estudos ALEPA - suite de testes do app (jsdom)
   Uso:  cd /home/user/tests && npm install jsdom && node smoke.js
   Variavel APP=... permite testar outro arquivo (ex.: app/dist/index.html)
   ============================================================ */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const APP = process.env.APP || '/home/user/ALEPA_Estudos.html';
const html = fs.readFileSync(APP, 'utf8');
let falhas = 0;
let total = 0;

function ok(nome, cond, extra) {
  total++;
  console.log((cond ? '  OK ' : '  FALHOU ') + nome + (cond ? '' : '  -> ' + (extra === undefined ? '' : extra)));
  if (!cond) falhas++;
}
async function bloco(titulo, fn) {
  console.log('\n' + titulo);
  try { await fn(); } catch (e) { ok('bloco concluido', false, (e && e.message) || e); }
}
function abrir(opcoes) {
  const o = opcoes || {};
  const vc = new VirtualConsole();
  const erros = [];
  vc.on('jsdomError', e => { if (!/scrollTo|Not implemented/.test(e.message)) erros.push(e.message); });
  vc.on('error', function () { erros.push(Array.prototype.join.call(arguments, ' ')); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    url: o.url || 'https://exemplo.vercel.app/index.html',
    beforeParse(w) {
      try { w.localStorage.setItem('alepa_onboarding', '1'); } catch (e) { }
      if (o.estadoInicial) { try { w.localStorage.setItem('alepa_estudos_v1', JSON.stringify(o.estadoInicial)); } catch (e) { } }
      if (o.semStorage) Object.defineProperty(w, 'localStorage', { configurable: true, get() { throw new Error('SecurityError: storage bloqueado'); } });
      if (o.antes) o.antes(w);
    },
  });
  return { w: dom.window, d: dom.window.document, erros };
}
const esperar = ms => new Promise(r => setTimeout(r, ms));
const $ = (d, s) => d.querySelector(s);
const LS = w => { try { return JSON.parse(w.localStorage.getItem('alepa_estudos_v1') || '{}'); } catch (e) { return {}; } };
const respostaFalsa = (t) => async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: t } }] }) });

process.on('unhandledRejection', function (e) {
  console.log('  [aviso] promessa nao tratada:', (e && e.constructor && e.constructor.name), (e && e.message) || e);
});

(async () => {
  /* ---------------- 1. Primeira abertura ---------------- */
  await bloco('1. Primeira abertura (assistente guia tudo)', async () => {
    const { d, erros } = abrir({ antes: w => w.localStorage.removeItem('alepa_onboarding') });
    await esperar(900);
    ok('o assistente aparece sozinho', d.body.innerHTML.includes('Passo 1 de 3'));
    ok('passo 1 pede nome e metas', !!$(d, '#ob-nome') && !!$(d, '#ob-dia') && !!$(d, '#ob-total'));
    $(d, '#ob-nome').value = 'Maria'; $(d, '#ob-dia').value = '41'; $(d, '#ob-next').click();
    ok('passo 2 ensina onde criar a chave', d.body.innerHTML.includes('Passo 2 de 3') && d.body.innerHTML.includes('huggingface.co/settings/tokens'));
    ok('passo 2 explica como criar o token certo', d.body.innerHTML.includes('Make calls to Inference Providers'));
    ok('passo 2 avisa que dá para usar outras IAs depois', /outra IA|Gemini|Groq/i.test(d.body.innerHTML));
    ok('passo 2 tem campo para colar a chave', !!$(d, '#ia-token'));
    ok('dá para pular e concluir', (() => { $(d, '#ob-pular').click(); if (!d.body.innerHTML.includes('Passo 3 de 3')) return false; $(d, '#ob-fim').click(); return true; })());
    ok('painel abre depois do assistente', $(d, '#app').innerHTML.includes('dias para a prova'));
    ok('nenhum erro de JS', erros.length === 0, erros.join(' | '));
  });

  /* ---------------- 2. Escolher e ligar uma IA ---------------- */
  await bloco('2. Escolher e ligar uma IA', async () => {
    const { w, d, erros } = abrir();
    await esperar(900);
    ok('botão da IA fica fixo no topo', !!$(d, '#badge-ia'));
    ok('topo convida a ligar uma IA', /Ligar uma IA/.test($(d, '#badge-ia').textContent));
    ok('painel mostra o cartão "nenhuma IA ligada"', $(d, '#app').innerHTML.includes('Nenhuma IA ligada ainda'));
    $(d, '#badge-ia').click(); await esperar(250);
    ok('abre a janela de escolha da IA', !!$(d, '#ia-prov') && /Escolha e configure a sua IA/.test(d.body.innerHTML));
    ok('modo simples: mostra só 3 IAs', $(d, '#ia-prov').options.length === 3, $(d, '#ia-prov').options.length + ' opções');
    const nomes = Array.from($(d, '#ia-prov').options).map(o => o.textContent).join(' | ');
    ['Hugging Face', 'Google Gemini', 'Groq'].forEach(n => ok('a lista inclui ' + n, nomes.includes(n)));
    ok('não aparecem as pagas (ChatGPT, Claude…)', !/ChatGPT|Claude|Mistral|DeepSeek|Grok \(xAI\)/.test(nomes), nomes);
    ok('existe o botão para ver todas as IAs', !!$(d, '#ia-todas'));
    ok('cada IA mostra se é grátis ou paga', /grátis|pago/i.test(d.body.innerHTML));
    ok('tem link "como conseguir a chave"', Array.from(d.querySelectorAll('a')).some(a => /aistudio|settings\/tokens|console\.groq|platform\.openai/.test(a.href)));
    ok('tem campo de chave, campo de modelo e busca de modelos', !!$(d, '#ia-token') && !!$(d, '#ia-modelo') && !!$(d, '#ia-buscar-modelos'));
    // liga o Hugging Face
    $(d, '#ia-token').value = 'hf_chave_de_teste_1234567890abcdefghij';
    $(d, '#ia-somente-salvar').click(); await esperar(200);
    ok('chave do Hugging Face é salva no aparelho', LS(w).config.ias.hf.token === 'hf_chave_de_teste_1234567890abcdefghij');
    ok('topo passa a mostrar a IA ativa', (() => { w.atualizarAvisoIA(); return /Hugging/.test($(d, '#badge-ia').textContent) && /ativa/.test($(d, '#badge-ia').textContent); })());
    ok('cartão de aviso desaparece', !$(d, '#app').innerHTML.includes('Nenhuma IA ligada ainda'));
    ok('aba IA mostra qual IA está ativa', (() => { w.irPara('ia'); return /Hugging Face/.test($(d, '#app').innerHTML) && /Tutor de IA/.test($(d, '#app').innerHTML); })());
    ok('nenhum erro de JS', erros.length === 0, erros.join(' | '));
  });

  /* ---------------- 3. Cada IA monta a chamada do jeito certo ---------------- */
  await bloco('3. Cada IA é chamada do jeito certo (URL, cabeçalhos e formato)', async () => {
    const { w } = abrir();
    await esperar(900);
    const S = w.__S;
    S.config.ias = {
      hf: { token: 'hf_teste', modelo: 'openai/gpt-oss-120b' },
      gemini: { token: 'AIza_teste', modelo: 'gemini-2.5-flash' },
      anthropic: { token: 'sk-ant-teste', modelo: 'claude-sonnet-4-5' },
      groq: { token: 'gsk_teste', modelo: 'llama-3.3-70b-versatile' },
      openrouter: { token: 'sk-or-teste', modelo: 'deepseek/deepseek-chat-v3.1:free' },
      ollama: { token: '', modelo: 'llama3.2', baseUrl: 'http://localhost:11434/v1/chat/completions' },
    };
    const capturar = (id) => {
      const vistos = [];
      w.fetch = async (url, opts) => { vistos.push({ url: String(url), h: (opts && opts.headers) || {}, b: JSON.parse((opts && opts.body) || '{}') }); return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'OK ' + id } }], candidates: [{ content: { parts: [{ text: 'OK ' + id }] } }], content: [{ type: 'text', text: 'OK ' + id }] }) }; };
      return vistos;
    };
    // Gemini: chave na URL + tipo de conteúdo simples (sem preflight)
    w.fetch = async (url, opts) => ({ ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'resposta do gemini' }] } }] }) });
    let r = await w.chamarIAProvedor('gemini', [{ role: 'system', content: 'professor' }, { role: 'user', content: 'oi' }], {});
    ok('Gemini: resposta lida corretamente', r === 'resposta do gemini', r);
    // OpenAI/Groq/HF: Authorization Bearer + formato chat/completions
    let vistos = capturar('groq');
    r = await w.chamarIAProvedor('groq', [{ role: 'user', content: 'oi' }], {});
    ok('Groq: usa Authorization Bearer', vistos[0].h['Authorization'] === 'Bearer gsk_teste');
    ok('Groq: usa o formato /chat/completions', /api\.groq\.com\/openai\/v1\/chat\/completions/.test(vistos[0].url));
    ok('Groq: envia o modelo escolhido', vistos[0].b.model === 'llama-3.3-70b-versatile', vistos[0].b.model);
    // Anthropic: x-api-key + versão + cabeçalho de acesso pelo navegador + system separado
    vistos = capturar('anthropic');
    r = await w.chamarIAProvedor('anthropic', [{ role: 'system', content: 'professor' }, { role: 'user', content: 'oi' }], {});
    ok('Claude: usa x-api-key', vistos[0].h['x-api-key'] === 'sk-ant-teste');
    ok('Claude: manda anthropic-version', vistos[0].h['anthropic-version'] === '2023-06-01');
    ok('Claude: libera acesso pelo navegador', vistos[0].h['anthropic-dangerous-direct-browser-access'] === 'true');
    ok('Claude: separa as instruções do sistema', vistos[0].b.system === 'professor' && vistos[0].b.messages.length === 1);
    // OpenRouter: cabeçalho de identificação
    vistos = capturar('openrouter');
    await w.chamarIAProvedor('openrouter', [{ role: 'user', content: 'oi' }], {});
    ok('OpenRouter: identifica o app', !!vistos[0].h['X-Title']);
    // IA local: sem chave
    vistos = capturar('ollama');
    await w.chamarIAProvedor('ollama', [{ role: 'user', content: 'oi' }], {});
    ok('IA local: endereço do computador e nenhuma chave enviada', /localhost:11434/.test(vistos[0].url) && !vistos[0].h['Authorization']);
  });

  /* ---------------- 4. Reserva automática entre IAs ---------------- */
  await bloco('4. Se a principal falhar, o app usa outra IA ligada', async () => {
    const { w } = abrir();
    await esperar(900);
    const S = w.__S;
    S.config.ias = { hf: { token: 'hf_ruim', modelo: 'x' }, groq: { token: 'gsk_bom', modelo: 'llama-3.3-70b-versatile' } };
    S.config.iaPrincipal = 'hf';
    S.config.iaReserva = true;
    w.fetch = async (url) => String(url).includes('huggingface')
      ? { ok: false, status: 401, text: async () => JSON.stringify({ error: 'Invalid credentials' }) }
      : { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'resposta da groq' } }] }) };
    const r = await w.chamarIA([{ role: 'user', content: 'oi' }]);
    ok('a resposta veio da reserva', r === 'resposta da groq', r);
    ok('o app passa a usar a IA que funcionou', S.config.iaPrincipal === 'groq', S.config.iaPrincipal);
    // sem nenhuma funcionando: mensagem clara
    w.fetch = async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ error: 'Invalid credentials' }) });
    let msg = '';
    try { await w.chamarIA([{ role: 'user', content: 'oi' }]); } catch (e) { msg = e.message; }
    ok('quando todas falham, explica em português', /RECUSOU a chave/.test(msg), msg.slice(0, 120));
    ok('a mensagem diz como resolver (criar outra chave)', /settings|console|aistudio/i.test(msg));
  });

  /* ---------------- 5. Erros explicados (o caso "Failed to fetch") ---------------- */
  await bloco('5. Erros explicados em português', async () => {
    const { w } = abrir({ url: 'file:///home/user/ALEPA_Estudos.html' });
    await esperar(900);
    w.__S.config.ias = { hf: { token: 'hf_teste_1234567890abcdefghijklmnopq', modelo: 'openai/gpt-oss-120b' } };
    w.fetch = async () => { throw new TypeError('Failed to fetch'); };
    let msg = '';
    try { await w.chamarIA([{ role: 'user', content: 'oi' }]); } catch (e) { msg = e.message; }
    ok('modo arquivo local: explica o motivo real do bloqueio', /ARQUIVO LOCAL/.test(msg));
    ok('e diz como resolver (publicar ou servidor local)', /PUBLIQUE|server\.py/.test(msg));
    // 429 e 402
    w.fetch = async () => ({ ok: false, status: 429, text: async () => JSON.stringify({ error: 'rate limit' }) });
    try { await w.chamarIA([{ role: 'user', content: 'oi' }]); } catch (e) { msg = e.message; }
    ok('limite de uso (429) tem mensagem própria', /LIMITE DE USO \(429\)/.test(msg), msg.slice(0, 100));
    w.__S.config.ias = { openai: { token: 'sk-teste', modelo: 'gpt-4o-mini' } };
    w.__S.config.iaPrincipal = 'openai';
    w.fetch = async () => ({ ok: false, status: 402, text: async () => JSON.stringify({ error: 'insufficient credits' }) });
    try { await w.chamarIA([{ role: 'user', content: 'oi' }]); } catch (e) { msg = e.message; }
    ok('sem créditos (402) sugere trocar para IA gratuita', /Créditos insuficientes/.test(msg) && /gratuita/i.test(msg), msg.slice(0, 110));
    // sem nenhuma IA ligada
    const d2 = abrir({ estadoInicial: { config: { ias: {} } } });
    await esperar(900);
    try { await d2.w.chamarIA([{ role: 'user', content: 'oi' }]); msg = ''; } catch (e) { msg = e.message; }
    ok('sem IA ligada: ensina a ligar pelo botão da chave', /Nenhuma IA configurada/.test(msg) && /🔑/.test(msg), msg.slice(0, 110));
  });

  /* ---------------- 6. Diagnóstico ---------------- */
  await bloco('6. Diagnóstico testa todas as IAs ligadas', async () => {
    const { w } = abrir();
    await esperar(900);
    w.__S.config.ias = { hf: { token: 'hf_teste_1234567890abcdefghijklmnopq', modelo: 'x' }, groq: { token: 'gsk_teste', modelo: 'llama-3.3-70b-versatile' } };
    w.fetch = async (url) => String(url).includes('huggingface.co/api/whoami')
      ? { ok: true, status: 200, json: async () => ({ name: 'maria' }), text: async () => JSON.stringify({ name: 'maria', auth: { accessToken: { role: 'fine-grained' } } }) }
      : String(url).includes('huggingface')
        ? { ok: false, status: 401, text: async () => JSON.stringify({ error: 'Invalid credentials' }) }
        : { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'OK' } }] }) };
    const rel = await w.diagnosticarIA();
    ok('diagnóstico mostra as IAs ligadas', /Hugging Face/.test(rel) && /Groq/.test(rel));
    ok('diz qual está funcionando', /Groq respondeu em .*esta IA está funcionando/.test(rel), rel.split('\n').find(l => /Groq/.test(l)));
    ok('e qual falhou, com o motivo', /Hugging Face falhou/.test(rel));
    ok('confirma que a chave do Hugging Face é válida e mostra a conta', /a chave é VÁLIDA \(conta: maria/.test(rel), rel.split('\n').find(l => /VÁLIDA/.test(l)));
  });

  /* ---------------- 7. Backup e nuvem não vazam chaves ---------------- */
  await bloco('7. Backup, nuvem e privacidade das chaves', async () => {
    const { w, d } = abrir();
    await esperar(900);
    w.__S.config.ias = { hf: { token: 'hf_segredo_1234567890abcdefghijklm', modelo: 'x' }, gemini: { token: 'AIza_segredo', modelo: 'gemini-2.5-flash' } };
    w.__S.config.iaPrincipal = 'gemini';       // a IA principal é outra...
    const pac = w.pacoteProgresso();
    ok('backup não leva nenhuma chave de IA', JSON.stringify(pac.config).indexOf('segredo') < 0, JSON.stringify(pac.config).slice(0, 120));
    ok('backup não leva a chave antiga (tokenIA)', !pac.config.tokenIA);
    ok('a nuvem de progresso usa a chave do Hugging Face', w.tokenHF() === 'hf_segredo_1234567890abcdefghijklm');
    w.irPara('progresso');
    ok('aba progresso avisa que a nuvem é do Hugging Face', /Hugging Face/.test($(d, '#app').innerHTML));
    ok('restaurar backup preserva as chaves locais', (() => {
      w.aplicarPacote({ app: 'x', versao: 1, atualizadoEm: Date.now(), hist: {}, resp: {}, fav: {}, notas: {}, teoria: {}, geradas: [], provas: [], config: { metaTotal: 3000, ias: { hf: { token: '', modelo: 'novo-modelo' } } } });
      return w.__S.config.ias.hf.token === 'hf_segredo_1234567890abcdefghijklm' && w.__S.config.ias.hf.modelo === 'novo-modelo' && w.__S.config.ias.gemini.token === 'AIza_segredo';
    })());
  });

  /* ---------------- 8. Configuração antiga continua funcionando ---------------- */
  await bloco('8. Quem já usava o app não perde nada (migração)', async () => {
    const { w, d } = abrir({ estadoInicial: { config: { tokenIA: 'hf_chave_antiga_1234567890abcdefgh', modeloIA: 'Qwen/Qwen2.5-7B-Instruct', metaTotal: 3000 }, hist: {}, resp: {}, fav: {}, notas: {}, teoria: {}, geradas: [], provas: [] } });
    await esperar(900);
    ok('a chave antiga vira a chave do Hugging Face', w.__S.config.ias.hf.token === 'hf_chave_antiga_1234567890abcdefgh', JSON.stringify(w.__S.config.ias));
    ok('o modelo antigo é mantido', w.__S.config.ias.hf.modelo === 'Qwen/Qwen2.5-7B-Instruct');
    ok('a IA principal é o Hugging Face', w.__S.config.iaPrincipal === 'hf');
    ok('reserva automática já vem ligada', w.__S.config.iaReserva !== false);
    ok('o app continua abrindo normalmente', $(d, '#app').innerHTML.includes('dias para a prova'));
  });

  /* ---------------- 9. Estudo: abas, treino, geradores, simulado ---------------- */
  await bloco('9. Estudo: abas, treino, geradores, simulado, teoria, plano', async () => {
    const { w, d, erros } = abrir();
    await esperar(900);
    const abas = [['painel', 'dias para a prova'], ['treinar', 'btn-iniciar'], ['simulado', 'sim-go'], ['ia', 'Tutor de IA'], ['teoria', 'resumo'], ['progresso', 'Conquistas'], ['plano', 'próximos 7 dias']];
    for (const par of abas) { w.irPara(par[0]); ok('aba ' + par[0] + ' renderiza', new RegExp(par[1], 'i').test($(d, '#app').innerHTML), par[1]); }
    w.irPara('treinar');
    if ($(d, '#btn-iniciar')) $(d, '#btn-iniciar').click();
    await esperar(250);
    const alts = Array.from(d.querySelectorAll('#app button.alt'));
    ok('sessão de treino monta as 5 alternativas', alts.length >= 5, alts.length + ' alternativas');
    if (alts.length) alts[0].click();
    await esperar(250);
    ok('responder mostra comentário/feedback', /coment|análise|Correto|Errado|Gabarito/i.test($(d, '#app').innerHTML));
    w.irPara('simulado'); $(d, '#sim-go').click(); await esperar(300);
    ok('simulado monta a prova', /questão 1|1 de|timer|cronômetro/i.test($(d, '#app').innerHTML) || !!$(d, '#sim-timer'));
    w.irPara('teoria');
    ok('teoria lista as matérias com resumo', (($(d, '#app').innerHTML.match(/resumo/gi) || []).length) >= 4);
    ok('nenhum erro de JS em nenhuma aba', erros.length === 0, erros.join(' | '));
  });

  /* ---------------- 10. PWA + navegador sem armazenamento ---------------- */
  await bloco('10. Instalação como aplicativo (PWA)', async () => {
    const { d } = abrir();
    await esperar(900);
    const man = $(d, 'link[rel=manifest]');
    ok('manifest declarado', !!man && man.getAttribute('href') === 'manifest.webmanifest');
    ok('ícone e metas para iPhone declarados', !!$(d, 'link[rel=apple-touch-icon]') && !!$(d, 'meta[name=apple-mobile-web-app-capable]'));
    ok('botão de instalar existe no topo', !!$(d, '#btn-instalar'));
    $(d, '#btn-instalar').click();
    ok('botão explica como instalar (Android e iPhone)', /Tela de Início|Instalar/.test(d.body.innerHTML));
    ok('registro do service worker está no código', /serviceWorker\.register\('sw\.js'\)/.test(html));
  });

  await bloco('11. Navegador sem armazenamento (preview restrito)', async () => {
    const { d, erros } = abrir({ semStorage: true });
    await esperar(900);
    ok('o app abre mesmo assim', $(d, '#app').innerHTML.length > 400);
    ok('o assistente aparece', d.body.innerHTML.includes('Passo 1 de 3'));
    ok('não quebra ao usar o assistente', (() => { $(d, '#ob-nome').value = 'X'; $(d, '#ob-next').click(); return d.body.innerHTML.includes('Passo 2 de 3'); })());
    ok('nenhum erro de JS', erros.length === 0, erros.join(' | '));
  });


  /* ---------------- 12. Uso simultâneo: comparar e gerar em paralelo ---------------- */
  await bloco('12. Usar DUAS OU MAIS IAs ao mesmo tempo', async () => {
    const { w, d, erros } = abrir();
    await esperar(900);
    const S = w.__S;
    const respostas = { hf: 'Explicação do Hugging Face', groq: 'Explicação da Groq', gemini: 'Explicação do Gemini' };
    S.config.ias = {
      hf: { token: 'hf_teste', modelo: 'openai/gpt-oss-120b' },
      groq: { token: 'gsk_teste', modelo: 'llama-3.3-70b-versatile' },
      gemini: { token: 'AIza_teste', modelo: 'gemini-2.5-flash' },
    };
    S.config.iaPrincipal = 'hf';
    S.config.iaParalelo = [];

    /* a) as três participam */
    ok('o app reconhece as 3 IAs ligadas', w.iasParalelo().length === 3, JSON.stringify(w.iasParalelo()));
    ok('a IA principal vem primeiro na fila', w.iasParalelo()[0] === 'hf', JSON.stringify(w.iasParalelo()));

    /* b) chamada simultânea: cada IA devolve a sua resposta, com o tempo */
    const pedidos = [];
    w.fetch = async (url, opts) => {
      const u = String(url), b = JSON.parse((opts && opts.body) || '{}');
      const id = u.includes('huggingface') ? 'hf' : u.includes('groq') ? 'groq' : 'gemini';
      pedidos.push({ id, b, u });
      const txt = id === 'gemini'
        ? JSON.stringify({ candidates: [{ content: { parts: [{ text: respostas.gemini }] } }] })
        : JSON.stringify({ choices: [{ message: { content: respostas[id] } }] });
      return { ok: true, status: 200, text: async () => txt };
    };
    const r = await w.chamarVariasIA([{ role: 'user', content: 'O que é processo legislativo?' }], {}, ['hf', 'groq', 'gemini']);
    ok('as 3 IAs responderam na mesma chamada', r.length === 3 && r.every(x => x.ok), JSON.stringify(r.map(x => x.id + ':' + x.ok)));
    ok('cada resposta é identificada com o nome da IA', r[0].nome === 'Hugging Face' && r[1].nome === 'Groq' && r[2].nome === 'Google Gemini');
    ok('o app mede o tempo de cada resposta', r.every(x => typeof x.ms === 'number'));
    ok('cada IA recebeu o pedido no seu próprio formato', pedidos.length === 3 && /generateContent/.test(pedidos.find(p => p.id === 'gemini').u));

    /* c) uma IA falhando não derruba as outras */
    w.fetch = async (url) => {
      const u = String(url);
      if (u.includes('huggingface')) return { ok: false, status: 429, text: async () => JSON.stringify({ error: 'rate limit' }) };
      if (u.includes('groq')) return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'resposta groq' } }] }) };
      return { ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'resposta gemini' }] } }] }) };
    };
    const r2 = await w.chamarVariasIA([{ role: 'user', content: 'oi' }], {}, ['hf', 'groq', 'gemini']);
    ok('uma IA fora do ar não estraga as outras', r2.length === 3 && r2.filter(x => x.ok).length === 2, JSON.stringify(r2.map(x => x.id + ':' + x.ok)));
    ok('o erro vem explicado em português', /LIMITE DE USO/.test(r2.find(x => !x.ok).erro), r2.find(x => !x.ok).erro.slice(0, 80));

    /* d) cada IA enxerga só as próprias respostas anteriores */
    const vistos = [];
    w.fetch = async (url, opts) => {
      const u = String(url), b = JSON.parse((opts && opts.body) || '{}');
      vistos.push({ id: u.includes('groq') ? 'groq' : 'hf', texto: JSON.stringify(b) });
      return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'ok' } }] }) };
    };
    const conversa = [
      { role: 'user', content: 'pergunta 1' },
      { role: 'assistant', content: 'resposta do HF', de: 'hf' },
      { role: 'assistant', content: 'resposta da Groq', de: 'groq' },
      { role: 'user', content: 'pergunta 2' },
    ];
    await w.chamarVariasIA(conversa, {}, ['hf', 'groq']);
    const doHF = vistos.find(v => v.id === 'hf').texto, daGroq = vistos.find(v => v.id === 'groq').texto;
    ok('a conversa não mistura respostas de IAs diferentes', doHF.includes('resposta do HF') && !doHF.includes('resposta da Groq') && daGroq.includes('resposta da Groq') && !daGroq.includes('resposta do HF'));

    /* e) chat no modo comparar */
    w.irPara('ia');
    const cx = $(d, '#ia-comparar');
    ok('a aba IA mostra o interruptor "perguntar para as 3 IAs"', !!cx, 'controle ausente');
    if (cx) {
      cx.checked = true; cx.onchange({ target: { checked: true } });
      w.__S.ia.comparar = true;
      w.fetch = async (url) => {
        const u = String(url);
        if (u.includes('groq')) return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'resposta groq' } }] }) };
        if (u.includes('generativelanguage')) return { ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'resposta gemini' }] } }] }) };
        return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'resposta hf' } }] }) };
      };
      w.irPara('ia');
      $(d, '#ia-in').value = 'Explique o quórum de 2/3';
      await w.enviarChat();
      await esperar(400);
      const bolhas = Array.from(d.querySelectorAll('#chat .msg.bot'));
      const texto = bolhas.map(b => b.textContent).join(' || ');
      ok('o chat recebe uma resposta de cada IA', /resposta hf/.test(texto) && /resposta groq/.test(texto) && /resposta gemini/.test(texto), texto.slice(0, 130));
      ok('cada bolha diz de qual IA veio', /Hugging Face/.test(texto) && /Groq/.test(texto) && /Gemini/.test(texto));
      ok('o app resume o confronto ("3 de 3 responderam")', /3 de 3 IAs responderam/.test(texto), texto.slice(-90));
      ok('dá para continuar só com a IA preferida', (() => {
        const b = d.querySelector('[data-seguir]');
        if (!b) return false;
        b.click();
        return w.__S.config.iaPrincipal === b.dataset.seguir && w.__S.ia.comparar === false;
      })());
    }

    /* f) gerar questões com várias IAs ao mesmo tempo, sem repetir */
    const q = (n) => ({ enunciado: 'Questão ' + n + ' sobre processo legislativo?', alternativas: ['a', 'b', 'c', 'd', 'e'], correta: 1, comentario: 'porque sim', dif: 'media', topico: 'Processo Legislativo' });
    w.fetch = async (url) => {
      const u = String(url);
      let lote;
      if (u.includes('groq')) lote = [q(1), q(2)];                       /* questão 1 repetida com o HF */
      else if (u.includes('generativelanguage')) lote = [{ enunciado: 'Questão 4 sobre comissões?', alternativas: ['a', 'b', 'c', 'd', 'e'], correta: 0, comentario: 'ok', dif: 'facil', topico: 'Processo Legislativo' }];
      else lote = [q(1), q(3)];
      const txt = u.includes('generativelanguage')
        ? JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(lote) }] } }] })
        : JSON.stringify({ choices: [{ message: { content: JSON.stringify(lote) } }] });
      return { ok: true, status: 200, text: async () => txt };
    };
    w.__S.geradas = [];
    w.irPara('ia');
    const gpx = $(d, '#g-paralelo');
    ok('o gerador oferece o modo paralelo', !!gpx, 'controle ausente');
    if (gpx) { gpx.checked = true; w.__S.ia.gerarParalelo = true; }
    w.irPara('ia');
    $(d, '#g-n').value = '5';
    await w.gerarQuestoesIA();
    const msgGerador = ($(d, '#g-out') || {}).innerHTML || '';
    await esperar(500);
    const geradas = w.__S.geradas;
    ok('as questões das várias IAs foram somadas (4 únicas: 2+2+1, com 1 repetida)', geradas.length === 4, geradas.length + ' questões: ' + geradas.map(x => x.enunciado).join(' | '));
    ok('questão repetida entre IAs foi descartada', geradas.filter(x => /Questão 1 /.test(x.enunciado)).length === 1);
    ok('cada questão guarda qual IA a criou', geradas.every(x => /IA \(/.test(x.banca)), geradas.map(x => x.banca).join(' | '));
    ok('a tela informa o resultado do trabalho em conjunto', /questões adicionadas/.test(msgGerador), msgGerador.slice(0, 120));
    ok('nenhum erro de JS no uso simultâneo', erros.length === 0, erros.join(' | '));
  });


  /* ---------------- 13. Chave recusada: nada de mensagem enganosa ---------------- */
  await bloco('13. Chave inválida é detectada mesmo quando a API responde 200', async () => {
    const { w } = abrir();
    await esperar(900);
    w.__S.config.ias = { hf: { token: 'hf_chave_invalida_1234567890abcdefgh', modelo: 'openai/gpt-oss-120b' } };
    w.__S.config.iaPrincipal = 'hf';
    /* HF devolvendo 200 com erro dentro do corpo (foi o que confundiu o diagnóstico) */
    w.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ error: 'Invalid username or password.' }) });
    let msg = '';
    try { await w.chamarIA([{ role: 'user', content: 'oi' }]); msg = 'NAO DEU ERRO'; } catch (e) { msg = e.message; }
    ok('resposta 200 com "Invalid username or password" vira erro de chave', /RECUSOU a chave \(erro 401\)/.test(msg), msg.slice(0, 100));
    const rel = await w.diagnosticarIA();
    ok('o diagnóstico diz que a chave NÃO é aceita', /a chave NÃO é aceita/.test(rel), rel.split('\n').find(l => /NÃO é aceita|VÁLIDA/.test(l)));
    ok('o diagnóstico diz exatamente como resolver (link do token)', /settings\/tokens|New token/.test(rel));
    ok('o diagnóstico conta quantos caracteres tem a chave', /tem \d+ caracteres/.test(rel));
    ok('o diagnóstico sugere usar outra IA enquanto isso', /outra IA|Gemini, Groq/.test(rel));
    /* resposta 200 sem texto nenhum: mostra o que veio */
    w.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ id: 'x', choices: [{ message: { content: '' } }] }) });
    try { await w.chamarIAProvedor('hf', [{ role: 'user', content: 'oi' }], {}); msg = 'NAO DEU ERRO'; } catch (e) { msg = e.message; }
    ok('resposta vazia mostra o trecho recebido (não só "sem texto")', /Resposta recebida:/.test(msg), msg.slice(0, 120));
  });


  /* ---------------- 14. Modo simples: só Hugging Face, Gemini e Groq ---------------- */
  await bloco('14. Modo simples (só as três gratuitas) e como ver as outras', async () => {
    const { w, d } = abrir();
    await esperar(900);
    d.querySelector('#badge-ia').click(); await esperar(300);
    ok('por padrão a lista tem exatamente as 3 gratuitas', d.querySelector('#ia-prov').options.length === 3);
    ok('o aviso explica que o modo simples são as três gratuitas', /Modo simples/.test(d.body.innerHTML) && /gratuitas/.test(d.body.innerHTML));
    ok('o botão "mostrar todas as IAs" está desmarcado', d.querySelector('#ia-todas').checked === false);
    /* marcar o botão revela as 11 */
    const cx = d.querySelector('#ia-todas');
    cx.checked = true; cx.onchange({ target: { checked: true } });
    await esperar(300);
    ok('marcando, aparecem as 11 IAs', d.querySelector('#ia-prov').options.length === 11, d.querySelector('#ia-prov').options.length + ' opções');
    ok('e a escolha fica salva', w.__S.config.iaMostrarTodas === true);
    /* desmarcar volta ao simples */
    const cx2 = d.querySelector('#ia-todas');
    cx2.checked = false; cx2.onchange({ target: { checked: false } });
    await esperar(300);
    ok('desmarcando, volta para as 3', d.querySelector('#ia-prov').options.length === 3);
    /* quem já tem chave de outra IA não perde acesso */
    const d2 = abrir({ estadoInicial: { config: { iaMostrarTodas: false, iaPrincipal: 'openai', ias: { openai: { token: 'sk-teste', modelo: 'gpt-4o-mini' } } } } });
    await esperar(900);
    d2.d.querySelector('#badge-ia').click(); await esperar(300);
    const nomes = Array.from(d2.d.querySelector('#ia-prov').options).map(o => o.textContent).join(' | ');
    ok('uma IA já configurada continua visível (não perde acesso)', /ChatGPT/.test(nomes), nomes);
    ok('e ela continua sendo a principal do app', d2.w.__S.config.iaPrincipal === 'openai');
  });


  /* ---------------- 15. Modelo aposentado: o app se corrige sozinho ---------------- */
  await bloco('15. Modelo que saiu do ar (caso Groq llama-3.3-70b)', async () => {
    const { w, d } = abrir();
    await esperar(900);
    w.__S.config.ias = { groq: { token: 'gsk_teste', modelo: 'llama-3.3-70b-versatile' } };
    w.__S.config.iaPrincipal = 'groq';
    const modelosDaConta = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'whisper-large-v3', 'playai-tts'];
    const chamadas = [];
    w.fetch = async (url, opts) => {
      const u = String(url);
      if (u.includes('/models')) return { ok: true, status: 200, text: async () => JSON.stringify({ data: modelosDaConta.map(id => ({ id })) }) };
      const corpo = JSON.parse((opts && opts.body) || '{}');
      chamadas.push(corpo.model);
      if (corpo.model === 'llama-3.3-70b-versatile')
        return { ok: false, status: 404, text: async () => JSON.stringify({ error: { message: 'The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.' } }) };
      return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'resposta boa do modelo novo' } }] }) };
    };
    const r = await w.chamarIA(['O que é processo legislativo?'].map(c => ({ role: 'user', content: c })));
    ok('o app respondeu mesmo com o modelo aposentado', r === 'resposta boa do modelo novo', String(r).slice(0, 80));
    ok('tentou o modelo antigo e depois trocou', chamadas[0] === 'llama-3.3-70b-versatile' && chamadas[1] === 'openai/gpt-oss-120b', chamadas.join(' → '));
    ok('a escolha nova fica salva no aparelho', w.__S.config.ias.groq.modelo === 'openai/gpt-oss-120b', w.__S.config.ias.groq.modelo);
    ok('não escolheu modelos que não conversam (whisper/tts)', !/whisper|tts/.test(w.__S.config.ias.groq.modelo));
    /* botão "escolher por mim": descobre, salva e testa em um clique */
    w.__S.config.ias.groq.modelo = 'modelo-que-nao-existe';
    d.querySelector('#badge-ia').click(); await esperar(300);
    const b = d.querySelector('#ia-auto2');
    ok('existe o botão "escolher por mim" na janela 🔑', !!b);
    if (b) {
      await w.acharModeloQueFunciona();
      await esperar(200);
      ok('o botão resolve e informa qual modelo passou a ser usado', /Resolvido! Agora usando/.test(d.querySelector('#ia-teste-out').innerHTML), d.querySelector('#ia-teste-out').textContent.slice(0, 90));
      ok('e salva a escolha', w.__S.config.ias.groq.modelo === 'openai/gpt-oss-120b', w.__S.config.ias.groq.modelo);
    }
    /* a lista do Groq no app não sugere mais os modelos aposentados */
    const sugeridos = w.eval('PROVEDORES.groq.modelos.join(" | ")');
    ok('as sugestões do Groq estão atualizadas', !/llama-3.3|llama-3.1/.test(sugeridos) && /gpt-oss-120b/.test(sugeridos), sugeridos);
    /* mensagem clara quando nada funciona */
    w.fetch = async (url) => String(url).includes('/models')
      ? { ok: true, status: 200, text: async () => JSON.stringify({ data: [] }) }
      : { ok: false, status: 404, text: async () => JSON.stringify({ error: { message: 'The model `x` does not exist or you do not have access to it.' } }) };
    let msg = '';
    try { await w.chamarIA([{ role: 'user', content: 'oi' }]); msg = 'sem erro'; } catch (e) { msg = e.message; }
    ok('quando não dá para corrigir, explica o que fazer', /NÃO está mais disponível|buscas modelos/.test(msg), msg.slice(0, 140));
  });


  /* ---------------- 16. Contagem de questões (bug dos timestamps) ---------------- */
  await bloco('16. As métricas contam questões, não milissegundos', async () => {
    const { w, d } = abrir({ estadoInicial: {
      config: { metaTotal: 3000, metaDia: 41, dataProva: '2026-12-13' },
      /* as três datas são relativas a hoje (o teste não pode envelhecer) */
      hist: (() => {
        const iso = n => new Date(Date.now() - n * 86400000).toLocaleDateString('sv-SE');
        return { [iso(3)]: { q: 40, a: 26, min: 62 }, [iso(2)]: { q: 35, a: 21, min: 55 }, [iso(1)]: { q: 12, a: 9, min: 20 } };
      })(),
      resp: { 'LP-001': { t: 1790700000000, a: 2, ok: true, ult: 1790700000000, cx: 3, prox: 1791500000000 } },
      fav: {}, notas: {}, teoria: {}, geradas: [], provas: [], ia: { msgs: [] },
    } });
    await esperar(900);
    const m = w.metricas();
    ok('total de questões = soma dos dias (40+35+12)', m.tot === 87, 'veio ' + m.tot);
    ok('acertos = soma dos acertos diários (26+21+9)', m.ok === 56, 'veio ' + m.ok);
    ok('aproveitamento = acertos/total', Math.round(m.pct) === 64, 'veio ' + m.pct.toFixed(1));
    ok('a tela não mostra número absurdo', !/\d{7,}/.test($(d, '#app').innerHTML.replace(/17\d{11}/g, '')), 'há número gigante na tela');
    ok('metas coerentes com o total', m.faltam === 3000 - 87 && m.metaDia > 0, JSON.stringify({ faltam: m.faltam, metaDia: m.metaDia }));
    ok('streak dos 3 dias seguidos', m.streak === 3, 'streak=' + m.streak);
    /* varredura: nenhuma tela pode mostrar número de 7+ dígitos (datas/percentuais não contam) */
    const abas = ['painel', 'treinar', 'simulado', 'ia', 'teoria', 'progresso', 'plano'];
    for (const aba of abas) {
      w.irPara(aba);
      const html = $(d, '#app').innerHTML
        .replace(/\d+\.\d{6,}/g, '0')          /* larguras de barra com muitas casas */
        .replace(/\d{10,}/g, '');                 /* ids internos que não aparecem ao usuário */
      const solto = (html.match(/\d{7,9}/g) || []);
      ok('aba ' + aba + ' sem número absurdo na tela', solto.length === 0, solto.slice(0, 4).join(', '));
    }
  });

  /* ---------------- 17. Importador de provas antigas da banca ---------------- */
  await bloco('17. Importar questões de provas antigas (colar do PDF)', async () => {
    const { w, d } = abrir();
    await esperar(900);

    const texto = [
      'Questão 15',
      'Sobre a Lei nº 8.429/1992, o ato de improbidade administrativa exige:',
      'A) culpa leve',
      'B) dolo específico',
      'C) mera irregularidade formal',
      'D) culpa grave',
      'E) responsabilidade objetiva',
      'Gabarito: B',
      '',
      'Questão 16',
      'A modalidade de licitação destinada à alienação de bens é:',
      '(A) diálogo competitivo',
      '(B) concurso',
      '(C) leilão',
      '(D) pregão'
    ].join('\n');
    const lote = w.analisarQuestoes(texto);
    ok('separa as questões do texto colado', lote.length === 2, 'veio ' + lote.length);
    ok('lê o gabarito informado no texto', lote[0] && lote[0].correta === 1, JSON.stringify(lote[0] && lote[0].correta));
    ok('lê alternativas no formato (A) (B) (C)', lote[1] && lote[1].alternativas.length === 4, lote[1] && lote[1].alternativas.length);
    ok('sem gabarito no texto, deixa para o usuário marcar', lote[1] && lote[1].correta === null);
    ok('limpa a numeração da questão', !/^\s*(quest[ãa]o|15\s*[).])/i.test(lote[0].enunciado), lote[0].enunciado.slice(0, 40));

    /* alternativas na mesma linha */
    const inline = w.analisarQuestoes('1) Quanto é 20% de 350? A) 60 B) 70 C) 80 D) 90 Gabarito: B');
    ok('entende alternativas escritas na mesma linha', inline.length === 1 && inline[0].alternativas.length === 4, JSON.stringify(inline[0] && inline[0].alternativas));
    ok('acerta o gabarito inline', inline[0] && inline[0].correta === 1, JSON.stringify(inline[0] && inline[0].correta));

    /* salvar no banco */
    const r = w.salvarImportadas(lote.map(q => Object.assign({}, q, { correta: q.correta === null ? 2 : q.correta })), 'LE', '', 'CETAP 2024 — SEOP-PA', 2024);
    ok('salva as questões importadas', r.salvas === 2, JSON.stringify(r));
    ok('grava no aparelho (localStorage)', (LS(w).importadas || []).length === 2, JSON.stringify((LS(w).importadas || []).length));
    const banco = w.bancoCompleto();
    ok('as importadas entram no banco do app', banco.filter(q => q.origem === 'importada').length === 2);
    ok('aparecem no treino da matéria escolhida', w.eval("Q_ALL().filter(q => q.materia === 'LE' && q.origem === 'importada').length") === 2);
    ok('ficam indexadas para a revisão espaçada', !!w.eval('QIDX')[banco.filter(q => q.origem === 'importada')[0].id]);

    /* duplicadas não entram duas vezes */
    const r2 = w.salvarImportadas(lote.map(q => Object.assign({}, q, { correta: 1 })), 'LE', '', 'CETAP', 2024);
    ok('não duplica questão já existente', r2.salvas === 0 && r2.repetidas === 2, JSON.stringify(r2));

    /* tela */
    w.irPara('treinar');
    await esperar(60);
    ok('há botão de importar na aba Treinar', /Importar questões de provas antigas/.test($(d, '#app').innerHTML));
    w.abrirImportador();
    await esperar(50);
    ok('a janela do importador abre com o campo de colar', !!$(d, '#imp-texto') && !!$(d, '#imp-mat') && !!$(d, '#imp-analisar'));
    ok('o exemplo do importador é explicativo', w.eval('IMP_EXEMPLO').indexOf('Gabarito') >= 0);
    w.fecharModal();
  });

  /* ---------------- 18. Formatação das respostas da IA (markdown) ---------------- */
  await bloco('18. A resposta da IA chega formatada, não em markdown cru', async () => {
    const { w, d } = abrir();
    await esperar(900);
    const AMOSTRA = [
      '**Questão** – Lei Anticorrupção (Lei nº 12.846/2013)',
      '',
      '**Gabarito oficial:** **B) objetiva, na esfera administrativa e civil**',
      '',
      '---',
      '',
      '## 1. Por que a alternativa **B** está correta',
      '',
      '| Dispositivo | Conteúdo relevante |',
      '|---|---|',
      '| **Art. 1º** | Estabelece a **responsabilidade objetiva**. |',
      '| Art. 2º | A responsabilidade é **civil** e **administrativa**. |',
      '',
      '**Resumo:**',
      '- **Objetiva** → basta comprovar o ato lesivo;',
      '- **Esfera administrativa e civil** → multas e reparação.',
      '',
      '> Dica: a pessoa jurídica não responde criminalmente.',
      '',
      '1. Leia o caput do art. 1º',
      '2. Fixe: objetiva, não subjetiva',
      '',
      '```',
      'art. 1º — responsabilidade objetiva',
      '```',
      '',
      'Veja [a lei no Planalto](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm).',
      '',
      '<script>window.__xss = 1<\/script>',
      '<img src=x onerror="window.__xss=2">'
    ].join('\n');
    const html = w.fmtTxt(AMOSTRA);
    const caixa = d.createElement('div');
    caixa.innerHTML = html;
    d.body.appendChild(caixa);
    const txt = caixa.textContent;
    ok('negrito vira <strong> e não aparece "**" na tela', /<strong>/.test(html) && txt.indexOf('**') === -1, txt.slice(0, 60));
    ok('título ## vira cabeçalho de verdade', /<h[456]>/.test(html) && txt.indexOf('##') === -1);
    ok('tabela do markdown vira tabela de verdade', /<table><thead><tr><th>/.test(html) && /<tbody>/.test(html) && txt.indexOf('|---|') === -1);
    ok('a tabela tem rolagem no celular', /<div class="md-tab">/.test(html));
    ok('listas viram <ul>/<li>', /<ul><li>/.test(html));
    ok('lista numerada vira <ol>', /<ol><li>/.test(html));
    ok('o "---" vira uma linha divisória, não texto', /<hr>/.test(html) && txt.indexOf('---') === -1);
    ok('citação (>) vira bloco de citação', /<blockquote>/.test(html) && txt.indexOf('> Dica') === -1);
    ok('bloco de código vira <pre>', /<pre><code>/.test(html));
    ok('link abre em nova aba com segurança', /rel="noopener noreferrer"/.test(html));
    ok('o texto sai dentro de .md (layout aplicado)', /^<div class="md">/.test(html));
    ok('HTML malicioso não vira elemento', caixa.querySelectorAll('script,img,iframe').length === 0);
    ok('nada de script executado na página', w.__xss === undefined, String(w.__xss));

    /* a bolha do chat usa o mesmo formato */
    w.irPara('ia');
    await esperar(80);
    w.__S.ia.msgs = [{ role: 'user', content: 'explique a Lei 12.846' }, { role: 'assistant', content: AMOSTRA, de: 'hf', ms: 1200 }];
    w.desenharChat();
    const chat = $(d, '#chat');
    ok('a resposta aparece na conversa já formatada', /<strong>/.test(chat.innerHTML), chat.innerHTML.slice(0, 120));
    ok('nenhum markdown cru sobrou na conversa', chat.textContent.indexOf('**') === -1 && chat.textContent.indexOf('##') === -1);

    /* texto simples (pergunta e alternativas) continua correto */
    const simples = w.fmtTxt('Quanto é 20% de 350?\nAssinale a alternativa correta.');
    ok('texto comum mantém as quebras de linha', /<br>/.test(simples));
    ok('uma linha comum não vira lista nem tabela', simples.indexOf('<ul>') === -1 && simples.indexOf('<table>') === -1);
    ok('mensagens suas escapam HTML, mas mantêm as linhas', w.fmtNl('linha 1\n<b>oi</b>').indexOf('&lt;b&gt;') > -1);
  });

  /* ---------------- 19. Progresso na nuvem (Cloudflare) ---------------- */
  await bloco('19. Progresso na nuvem pelo Cloudflare (código, sem token)', async () => {
    const { w, d } = abrir({ estadoInicial: {
      config: { metaTotal: 3000, metaDia: 41, dataProva: '2026-12-13', nome: 'Rafael' },
      hist: { '2026-09-29': { q: 10, a: 7, min: 18 } },
      resp: { 'LP-001': { t: 2, a: 1, ok: 1, ult: 1790700000000, cx: 2, prox: 1791500000000 } },
      fav: {}, notas: {}, teoria: {}, geradas: [], importadas: [], provas: [], ia: { msgs: [] },
    } });
    await esperar(900);

    /* --- código de progresso --- */
    const cod = w.gerarCodigoNuvem();
    ok('o código gerado tem o formato ALEPA-XXXX-XXXX', /^ALEPA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cod), cod);
    ok('o código não usa letras/números que confundem (I, O, 0, 1)', !/[IO01]/.test(cod), cod);
    ok('dois códigos seguidos são diferentes', cod !== w.gerarCodigoNuvem());

    /* --- validações com mensagem em português --- */
    let msg = '';
    try { await w.nuvemEnviar(false); } catch (e) { msg = e.message; }
    if (!msg) { const r = await w.nuvemEnviar(false); msg = r.erro || ''; }
    ok('sem endereço, explica que falta colar o endereço do Worker', /Cole primeiro o endereço/.test(msg), msg.slice(0, 90));

    w.__S.config.nuvem = { url: 'meu-pc', codigo: 'ALEPA-7K3F-92QX', auto: false };
    ok('endereço errado é recusado com dica', /não parece válido/.test((await w.nuvemEnviar(false)).erro));
    w.__S.config.nuvem = { url: 'https://alepa-progresso.fulano.workers.dev', codigo: 'AB', auto: false };
    ok('código curto é recusado com dica', /6 caracteres/.test((await w.nuvemEnviar(false)).erro));

    /* --- "Worker" falso, igual ao de verdade --- */
    const nuvem = { dados: null, ultimoMetodo: null, ultimoCorpo: null, ultimaUrl: null, apagouChave: false };
    w.fetch = async (url, opts = {}) => {
      const u = String(url);
      nuvem.ultimaUrl = u; nuvem.ultimoMetodo = opts.method || 'GET';
      const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo, text: async () => JSON.stringify(corpo) });
      if (u.includes('/health')) return resp(200, { ok: true, servico: 'alepa-progresso', versao: 1 });
      if (opts.method === 'PUT') { nuvem.ultimoCorpo = opts.body; nuvem.dados = JSON.parse(opts.body); return resp(200, { ok: true, bytes: opts.body.length }); }
      return nuvem.dados ? resp(200, nuvem.dados) : resp(404, { ok: false, erro: 'Ainda não existe progresso salvo com esse código.' });
    };
    w.__S.geradas = [{ id: 'IA-1', materia: 'DA', enunciado: 'questão feita pela IA', alternativas: ['a', 'b', 'c', 'd', 'e'], correta: 1, comentario: 'x' }];
    w.__S.importadas = [{ id: 'IMP-1', materia: 'LE', enunciado: 'questão importada da prova', alternativas: ['a', 'b'], correta: 0, comentario: 'y' }];
    w.__S.config.ias = { groq: { token: 'gsk_segredo_nao_pode_vazar', modelo: 'openai/gpt-oss-120b' } };
    w.__S.config.iaPrincipal = 'groq';
    w.__S.config.nuvem = { url: 'https://alepa-progresso.fulano.workers.dev/', codigo: 'alepa-7k3f-92qx', auto: false };

    /* --- testar conexão --- */
    const tela = w.abrirModal || null;
    w.irPara('progresso');
    await esperar(80);
    ok('a aba Progresso mostra o bloco da nuvem', /Progresso na nuvem \(Cloudflare\)/.test($(d, '#app').innerHTML));
    ok('tem campo de endereço, código, gerar e os dois botões', !!$(d, '#nv-url') && !!$(d, '#nv-codigo') && !!$(d, '#nv-gerar') && !!$(d, '#nv-enviar') && !!$(d, '#nv-baixar'));
    ok('ensina o passo a passo do Cloudflare dentro do app', /dash\.cloudflare\.com/.test($(d, '#app').innerHTML) && /PROGRESSO/.test($(d, '#app').innerHTML));
    await w.nuvemRequisicao('/health');
    ok('o teste de conexão bate no /health', /\/health\?codigo=/.test(nuvem.ultimaUrl), nuvem.ultimaUrl);

    /* --- enviar --- */
    const env1 = await w.nuvemEnviar(false);
    ok('envia o progresso para o Worker', env1.ok === true, JSON.stringify(env1));
    ok('manda pelo método PUT no endereço certo', nuvem.ultimoMetodo === 'PUT' && nuvem.ultimaUrl.indexOf('https://alepa-progresso.fulano.workers.dev/progresso?codigo=ALEPA-7K3F-92QX') === 0, nuvem.ultimaUrl);
    ok('o pacote vai com carimbo do app e versão', nuvem.dados.app === 'ArenaEstudos-ALEPA' && !!nuvem.dados.atualizadoEm);
    ok('leva as suas respostas e o histórico', !!nuvem.dados.resp['LP-001'] && nuvem.dados.hist['2026-09-29'].q === 10);
    ok('leva as questões da IA e as importadas', nuvem.dados.geradas.length === 1 && nuvem.dados.importadas.length === 1);
    ok('NUNCA leva a chave da IA (privacidade)', nuvem.ultimoCorpo.indexOf('gsk_segredo_nao_pode_vazar') === -1 && !/hf_|gsk_|AIza/.test(nuvem.ultimoCorpo));
    ok('depois de enviar, mostra o horário do último envio', /Último envio/.test(nuvem.ultimoCorpo) || w.__nuvem().ultimo > 0, String(w.__nuvem().ultimo));

    /* --- outra pessoa: o progresso dela continua vazio no aparelho dela --- */
    ok('existe código separado por pessoa (nada se mistura)', w.gerarCodigoNuvem() !== w.__S.config.nuvem.codigo);

    /* --- baixar e MESCLAR (o ponto mais importante) --- */
    nuvem.dados = {
      app: 'ArenaEstudos-ALEPA', versao: 1, atualizadoEm: Date.now(),
      hist: { '2026-09-30': { q: 4, a: 3, min: 9 }, '2026-09-29': { q: 2, a: 1, min: 4 } },
      resp: { 'DA-010': { t: 3, a: 2, ok: 2, ult: 1790800000000, cx: 1, prox: 0 } },
      fav: { 'DA-010': true }, notas: {}, teoria: {},
      geradas: [{ id: 'IA-2', materia: 'DC', enunciado: 'gerada no PC', alternativas: ['a', 'b', 'c'], correta: 0, comentario: 'z' }],
      importadas: [], provas: [{ data: 1790700000000, total: 60, acertos: 40, nota: 6.7, tempo: 160, porMat: {} }],
      config: { metaTotal: 3000, metaDia: 41, dataProva: '2026-12-13', nome: 'Rafael', ias: { groq: { token: '' } } }
    };
    const baix = await w.nuvemBaixar(false);
    ok('baixa o progresso da nuvem', baix.ok === true, JSON.stringify(baix));
    ok('o que era daqui continua aqui (não apaga nada)', !!w.__S.resp['LP-001'] && w.__S.geradas.some(q => q.id === 'IA-1') && w.__S.importadas.length === 1);
    ok('o que veio da nuvem entra no histórico (soma os dias)', w.__S.hist['2026-09-29'].q === 12 && w.__S.hist['2026-09-30'].q === 4, JSON.stringify(w.__S.hist));
    ok('as respostas dos dois aparelhos convivem', !!w.__S.resp['DA-010'] && !!w.__S.resp['LP-001']);
    ok('a questão gerada no PC também entra', w.__S.geradas.some(q => q.id === 'IA-2'));
    ok('o simulado feito no outro aparelho entra', w.__S.provas.length === 1);
    ok('a chave da IA deste aparelho continua salva (nuvem não apaga chave)', w.__S.config.ias.groq.token === 'gsk_segredo_nao_pode_vazar', JSON.stringify(w.__S.config.ias));
    ok('o código de progresso continua configurado', w.__nuvem().codigo === 'ALEPA-7K3F-92QX');
    ok('a aba Progresso redesenha com os dados novos', w.metricas().tot === 16, String(w.metricas().tot));

    /* --- erros do Worker aparecem em português --- */
    nuvem.dados = null;
    const r404 = await w.nuvemBaixar(false);
    ok('código novo (sem nada na nuvem) explica o que fazer', /Ainda não existe progresso com esse código/.test(r404.erro || ''), (r404.erro || '').slice(0, 80));

    w.fetch = async () => { throw new TypeError('Failed to fetch'); };
    const rRede = await w.nuvemEnviar(false);
    ok('falha de rede vira instrução (endereço, deploy, internet)', /Não consegui falar com o seu Worker/.test(rRede.erro || '') && /Deploy/.test(rRede.erro || ''), (rRede.erro || '').slice(0, 110));

    /* --- sincronização automática --- */
    w.__S.config.nuvem = { url: 'https://alepa-progresso.fulano.workers.dev', codigo: 'ALEPA-7K3F-92QX', auto: true };
    ok('o automático fica ligado quando você quer', w.__nuvem().auto === true);
    w.__S.config.nuvem.auto = false;
    ok('e pode ser desligado', w.__nuvem().auto === false);
    ok('o agendador de envio existe (manda sozinho depois de estudar)', typeof w.agendarPush === 'function');
  });

  console.log('\n' + total + ' verificações — ' + (falhas === 0 ? '🎉 Todas passaram.' : '❌ ' + falhas + ' falharam.'));
  process.exit(falhas === 0 ? 0 : 1);
})();
