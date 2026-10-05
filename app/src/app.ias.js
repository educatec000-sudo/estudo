/* ============================================================================
   CAMADA DE IAs — Arena Estudos ALEPA
   Suporta vários provedores com chaves independentes, modelo por provedor,
   verificação da chave, listagem dos modelos reais do provedor e RESERVA
   automática (se a IA principal falhar, o app tenta a próxima configurada).
   ============================================================================ */

const PROVEDORES = {
  hf: {
    nome: 'Hugging Face', emoji: '🤗', tipo: 'openai',
    url: 'https://router.huggingface.co/v1/chat/completions',
    urlModelos: 'https://router.huggingface.co/v1/models',
    criar: 'https://huggingface.co/settings/tokens/new?tokenType=fineGrained&name=Arena%20Estudos%20ALEPA',
    ajuda: 'Grátis. Crie o token e marque a permissão “Make calls to Inference Providers”.',
    prefixo: 'hf_', custo: 'grátis (cota diária)',
    modelos: ['openai/gpt-oss-120b', 'Qwen/Qwen3-8B', 'meta-llama/Llama-3.1-8B-Instruct', 'google/gemma-3-4b-it', 'Qwen/Qwen2.5-7B-Instruct'],
    /* se algum sair do ar, o app descobre sozinho outro disponível para a sua conta */
    obs: 'Também é a IA usada para sincronizar o progresso entre aparelhos (precisa de permissão de escrita se você usar a nuvem).'
  },
  gemini: {
    nome: 'Google Gemini', emoji: '✨', tipo: 'gemini',
    urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/',
    urlModelos: 'https://generativelanguage.googleapis.com/v1beta/models',
    criar: 'https://aistudio.google.com/apikey',
    ajuda: 'Grátis. No Google AI Studio, clique em “Create API key” e copie a chave (começa com AIza).',
    prefixo: 'AIza', custo: 'grátis (cota diária generosa)',
    modelos: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'],
    obs: 'Ótima para explicar questões e resumir leis. Usa conexão especial que dispensa o bloqueio do navegador. Os modelos 2.5 estão sendo aposentados pelo Google — se um deles falhar, use ✨ “escolher por mim”.'
  },
  groq: {
    nome: 'Groq', emoji: '⚡', tipo: 'openai',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    urlModelos: 'https://api.groq.com/openai/v1/models',
    criar: 'https://console.groq.com/keys',
    ajuda: 'Grátis e muito rápido. Crie a chave em console.groq.com/keys (começa com gsk_).',
    prefixo: 'gsk_', custo: 'grátis (com limites por minuto)',
    modelos: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'],
    obs: 'A resposta mais rápida entre as gratuitas. A Groq aposenta modelos de tempos em tempos — se um nome sair do ar, toque em “buscas modelos” (o app também se corrige sozinho).'
  },
  openai: {
    nome: 'ChatGPT (OpenAI)', emoji: '💬', tipo: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    urlModelos: 'https://api.openai.com/v1/models',
    criar: 'https://platform.openai.com/api-keys',
    ajuda: 'Pago (precisa de créditos na conta). Crie a chave em platform.openai.com/api-keys (começa com sk-).',
    prefixo: 'sk-', custo: 'pago',
    modelos: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
    obs: 'Use “buscar modelos disponíveis” para ver os nomes atuais da sua conta.'
  },
  anthropic: {
    nome: 'Claude (Anthropic)', emoji: '🧠', tipo: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    urlModelos: 'https://api.anthropic.com/v1/models',
    criar: 'https://console.anthropic.com/settings/keys',
    ajuda: 'Pago (precisa de créditos). Crie a chave em console.anthropic.com/settings/keys (começa com sk-ant-).',
    prefixo: 'sk-ant-', custo: 'pago',
    modelos: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1'],
    obs: 'Muito bom em texto longo e explicações jurídicas.'
  },
  openrouter: {
    nome: 'OpenRouter (vários modelos)', emoji: '🔀', tipo: 'openai',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    urlModelos: 'https://openrouter.ai/api/v1/models',
    criar: 'https://openrouter.ai/settings/keys',
    ajuda: 'Tem modelos gratuitos (os que terminam com “:free”). Crie a chave em openrouter.ai/settings/keys (começa com sk-or-).',
    prefixo: 'sk-or-', custo: 'grátis em alguns modelos',
    modelos: ['deepseek/deepseek-chat-v3.1:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-235b-a22b:free', 'anthropic/claude-sonnet-4.5'],
    obs: 'Um só cadastro dá acesso a dezenas de IAs diferentes. Procure modelos com “:free” para não pagar nada.'
  },
  mistral: {
    nome: 'Mistral', emoji: '🌬️', tipo: 'openai',
    url: 'https://api.mistral.ai/v1/chat/completions',
    urlModelos: 'https://api.mistral.ai/v1/models',
    criar: 'https://console.mistral.ai/api-keys',
    ajuda: 'Tem plano gratuito de teste. Pegue a chave em console.mistral.ai/api-keys.',
    custo: 'grátis (plano de teste) / pago',
    modelos: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo'],
    obs: 'Modelos europeus, bons em múltiplos idiomas.'
  },
  deepseek: {
    nome: 'DeepSeek', emoji: '🐋', tipo: 'openai',
    url: 'https://api.deepseek.com/chat/completions',
    urlModelos: 'https://api.deepseek.com/models',
    criar: 'https://platform.deepseek.com/api_keys',
    ajuda: 'Pago, mas bem barato. Crie a chave em platform.deepseek.com/api_keys.',
    prefixo: 'sk-', custo: 'pago (baixo custo)',
    modelos: ['deepseek-chat', 'deepseek-reasoner'],
    obs: 'O “deepseek-reasoner” raciocina passo a passo — bom para questões de raciocínio lógico.'
  },
  xai: {
    nome: 'Grok (xAI)', emoji: '🛰️', tipo: 'openai',
    url: 'https://api.x.ai/v1/chat/completions',
    urlModelos: 'https://api.x.ai/v1/models',
    criar: 'https://console.x.ai',
    ajuda: 'Pago. Crie a chave no console.x.ai.',
    prefixo: 'xai-', custo: 'pago',
    modelos: ['grok-4', 'grok-3-mini'],
    obs: ''
  },
  ollama: {
    nome: 'IA no seu computador (Ollama/LM Studio)', emoji: '💻', tipo: 'openai', semChave: true,
    urlPadrao: 'http://localhost:11434/v1/chat/completions',
    urlModelos: 'http://localhost:11434/v1/models',
    criar: 'https://ollama.com/download',
    ajuda: 'Grátis e 100% offline: instale o Ollama, rode “ollama pull llama3.2” e pronto. No LM Studio, use http://localhost:1234/v1.',
    custo: 'grátis (roda no seu aparelho)',
    modelos: ['llama3.2', 'qwen2.5:7b', 'mistral', 'gemma3:4b'],
    obs: 'Só funciona com o app aberto no mesmo computador do Ollama (ou pelo servidor local). Não gasta internet nem cota.'
  },
  custom: {
    nome: 'Outra IA (compatível com OpenAI)', emoji: '🔧', tipo: 'openai', urlLivre: true, semChaveOpcional: true,
    criar: 'https://platform.openai.com/docs/api-reference',
    ajuda: 'Cole o endereço completo da API (…/v1/chat/completions) e a chave. Serve para Together, Fireworks, vLLM, texto local e qualquer serviço compatível com o padrão da OpenAI.',
    custo: 'depende do serviço',
    modelos: [],
    obs: 'Avançado: use se você já recebeu um endereço de API de outro serviço.'
  },
};

const IDS_IA = Object.keys(PROVEDORES);

/* MODO SIMPLES (padrão): aparecem só as três IAs gratuitas — Hugging Face, Gemini e Groq.
   As outras ficam escondidas atrás do botão "mostrar todas as IAs" na janela de configuracao.
   Uma IA que ja tenha chave salva NUNCA e escondida (ninguem perde acesso ao que ja usava). */
const IAS_SIMPLES = ['hf', 'gemini', 'groq'];
function iasVisiveis() {
  try {
    if (S.config.iaMostrarTodas) return IDS_IA;
    const configuradas = provedoresConfigurados();
    return IDS_IA.filter(id => IAS_SIMPLES.indexOf(id) >= 0 || configuradas.indexOf(id) >= 0);
  } catch (e) { return IAS_SIMPLES; }
}

/* ---------- estado da conexão (servidor local / proxy da Vercel) ---------- */
const IA_STATUS = { servidor: null, erro: '', erroSync: '', tokenNoServidor: false };

/* Existe um intermediário (server.py local ou função da Vercel) em /api/health? */
async function checarServidor() {
  try {
    const r = await fetchTimeout('api/health', { method: 'GET' }, 4000);
    const j = await r.json().catch(() => ({}));
    IA_STATUS.servidor = !!j.ok;
    IA_STATUS.tokenNoServidor = !!(j && j.tem_token_no_servidor);
    IA_STATUS.iaNoServidor = (j && j.app) || 'local';
    return IA_STATUS.servidor;
  } catch (e) { IA_STATUS.servidor = false; return false; }
}

/* ---------- configuração por provedor (chaves independentes) ---------- */
function migrarIA() {
  try {
    S.config.ias = S.config.ias || {};
    /* aproveita a configuração antiga (quando existia só o Hugging Face) */
    const hf = S.config.ias.hf;
    if ((!hf || !hf.token) && (S.config.tokenIA || S.config.modeloIA)) {
      S.config.ias.hf = Object.assign({}, hf, { token: (S.config.tokenIA || '').trim(), modelo: S.config.modeloIA || PROVEDORES.hf.modelos[0] });
    }
    if (!S.config.iaPrincipal) S.config.iaPrincipal = 'hf';
    if (typeof S.config.iaReserva !== 'boolean') S.config.iaReserva = true;
    if (!Array.isArray(S.config.iaParalelo)) S.config.iaParalelo = [];   /* vazio = todas as ligadas */
    if (typeof S.config.iaMostrarTodas !== 'boolean') S.config.iaMostrarTodas = false;  /* padrao: so HF, Gemini e Groq */
  } catch (e) { console.warn('migrarIA:', e); }
}
function cfgProv(id) {
  S.config.ias = S.config.ias || {};
  S.config.ias[id] = S.config.ias[id] || { token: '', modelo: '', baseUrl: '' };
  const c = S.config.ias[id];
  /* o modelo sugerido pode ser preenchido sozinho; o endereço/chave NÃO —
     só contam como "ligada" quando o estudante salva a configuração */
  if (!c.modelo && PROVEDORES[id] && PROVEDORES[id].modelos[0]) c.modelo = PROVEDORES[id].modelos[0];
  return c;
}
function provAtualId() { return (S.config.iaPrincipal && PROVEDORES[S.config.iaPrincipal]) ? S.config.iaPrincipal : 'hf'; }
function provAtual() { return PROVEDORES[provAtualId()]; }
function iaConfigurada(id) {
  const p = PROVEDORES[id]; if (!p) return false;
  const c = cfgProv(id);
  if (p.semChave) return !!String(c.baseUrl || '').trim();   /* IA no computador: só conta depois de configurada */
  return !!String(c.token || '').trim();
}
function provedoresConfigurados() { return IDS_IA.filter(iaConfigurada); }
function temChaveIA() { return provedoresConfigurados().length > 0; }
/* ordem de tentativa: a IA principal e, se a reserva estiver ligada, as outras já configuradas */
function ordemProvedores() {
  const principal = provAtualId();
  const lista = [principal];
  if (S.config.iaReserva !== false) provedoresConfigurados().forEach(id => { if (id !== principal) lista.push(id); });
  return lista;
}
function modeloDe(id) { const c = cfgProv(id); return c.modelo || (PROVEDORES[id].modelos[0] || ''); }
/* chave do provedor principal (compatibilidade com o resto do app) */
function tokenAtual() { const c = cfgProv(provAtualId()); return String(c.token || '').trim(); }
/* a nuvem de progresso usa especificamente o Hugging Face */
function tokenHF() { const c = cfgProv('hf'); return String(c.token || '').trim(); }
function rotuloIA() { const p = provAtual(); return (p.emoji || '🤖') + ' ' + p.nome + (modeloDe(provAtualId()) ? ' · ' + modeloDe(provAtualId()) : ''); }

/* Quais IAs participam do uso SIMULTÂNEO (comparar respostas / gerar questões).
   A principal vem primeiro e o limite é 4, para não estourar as cotas grátis. */
function iasParalelo() {
  const todas = provedoresConfigurados();
  if (!todas.length) return [];
  const escolhidas = (Array.isArray(S.config.iaParalelo) && S.config.iaParalelo.length)
    ? todas.filter(id => S.config.iaParalelo.indexOf(id) >= 0)
    : todas;
  const lista = escolhidas.length ? escolhidas : todas;
  const principal = provAtualId();
  const ordenado = ([principal].indexOf(principal) >= 0 && lista.indexOf(principal) >= 0 ? [principal] : []).concat(lista.filter(id => id !== principal));
  return ordenado.slice(0, 4);
}

/* Chamada pelo intermediário (server.py local ou função da Vercel). */
async function chamarViaServidor(id, mensagens, opts) {
  const cfg = cfgProv(id);
  const r = await fetchTimeout('api/ia', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provedor: id, modelo: cfg.modelo, baseUrl: cfg.baseUrl, token: cfg.token, mensagens, max_tokens: (opts && opts.max_tokens) || 1200, temperature: (opts && opts.temperature) === undefined ? 0.6 : opts.temperature }),
  }, (opts && opts.timeout) || 90000);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.content) { const x = new Error(j.error || ('HTTP ' + r.status)); x.__http = r.status; throw x; }
  return j.content;
}

/* Faz a MESMA pergunta para várias IAs AO MESMO TEMPO e devolve todas as respostas.
   Se o intermediário estiver ativo, as chaves não passam pelo navegador. */
async function chamarVariasIA(mensagens, opts = {}, idsEscolhidos) {
  migrarIA();
  const ids = (idsEscolhidos && idsEscolhidos.length) ? idsEscolhidos.filter(iaConfigurada) : iasParalelo();
  if (!ids.length) throw new Error('Nenhuma IA ligada. Toque no botão 🔑 no topo e ligue pelo menos uma.');
  const tarefas = ids.map(async (id) => {
    const t0 = Date.now();
    try {
      /* cada IA enxerga a conversa e as PRÓPRIAS respostas anteriores (não as das outras) */
      const hist = mensagens.filter(m => m.role !== 'assistant' || !m.de || m.de === id).map(m => ({ role: m.role, content: m.content }));
      const resposta = IA_STATUS.servidor ? await chamarViaServidor(id, hist, opts) : await chamarIAProvedor(id, hist, opts);
      return { id, nome: PROVEDORES[id].nome, emoji: PROVEDORES[id].emoji, ok: true, resposta, ms: Date.now() - t0 };
    } catch (e) {
      return { id, nome: PROVEDORES[id].nome, emoji: PROVEDORES[id].emoji, ok: false, erro: explicarErroIA(e, id), ms: Date.now() - t0 };
    }
  });
  return Promise.all(tarefas);
}

/* ---------- montagem e leitura das requisições ---------- */
function urlDoProvedor(id, cfg) {
  const p = PROVEDORES[id];
  if (p.urlLivre) return String(cfg.baseUrl || '').trim();
  if (p.tipo === 'gemini') return p.urlBase + encodeURIComponent(cfg.modelo || p.modelos[0]) + ':generateContent?key=' + encodeURIComponent(cfg.token || '');
  if (p.semChave) return String(cfg.baseUrl || p.urlPadrao || '').trim();   /* IA no próprio computador */
  return p.url;
}
function cabecalhosDoProvedor(id, cfg) {
  const p = PROVEDORES[id], h = {};
  if (p.tipo === 'gemini') {
    /* truque para o navegador não bloquear com "Failed to fetch":
       tipo de conteúdo "simples" dispensa o preflight (o Google aceita o JSON normalmente) */
    h['Content-Type'] = 'text/plain;charset=UTF-8';
  } else {
    h['Content-Type'] = 'application/json';
  }
  if (p.tipo === 'anthropic') {
    h['x-api-key'] = cfg.token || '';
    h['anthropic-version'] = '2023-06-01';
    h['anthropic-dangerous-direct-browser-access'] = 'true';
  } else if (!p.semChave && cfg.token) {
    h['Authorization'] = 'Bearer ' + cfg.token;
  }
  if (id === 'openrouter') { try { h['HTTP-Referer'] = location.origin; h['X-Title'] = 'Arena Estudos ALEPA'; } catch (e) { } }
  return h;
}
function corpoDoProvedor(id, cfg, mensagens, opts) {
  const p = PROVEDORES[id];
  const maxT = opts.max_tokens || 1200;
  const temp = opts.temperature ?? 0.6;
  if (p.tipo === 'gemini') {
    const sistema = mensagens.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const conversa = mensagens.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const b = { contents: conversa, generationConfig: { maxOutputTokens: maxT, temperature: temp } };
    if (sistema) b.systemInstruction = { parts: [{ text: sistema }] };
    return b;
  }
  if (p.tipo === 'anthropic') {
    const sistema = mensagens.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const conversa = mensagens.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
    const b = { model: cfg.modelo, max_tokens: maxT, temperature: temp, messages: conversa };
    if (sistema) b.system = sistema;
    return b;
  }
  return { model: cfg.modelo, messages: mensagens, max_tokens: maxT, temperature: temp };
}
function lerResposta(id, j) {
  const p = PROVEDORES[id];
  if (p.tipo === 'gemini') {
    const c = j && j.candidates && j.candidates[0];
    const partes = c && c.content && c.content.parts;
    if (partes && partes.length) return partes.map(x => x.text || '').join('').trim();
    if (j && j.promptFeedback && j.promptFeedback.blockReason) throw new Error('O Gemini bloqueou esta resposta (' + j.promptFeedback.blockReason + '). Tente reformular a pergunta.');
    return '';
  }
  if (p.tipo === 'anthropic') {
    const bloco = j && j.content && j.content.find(x => x.type === 'text');
    return bloco ? bloco.text : '';
  }
  return (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
}
function mensagemDeErro(id, status, txt, j) {
  const p = PROVEDORES[id];
  let msg = (j && j.error && (j.error.message || j.error)) || (j && j.message) || (txt || '').slice(0, 200);
  if (!msg && status) msg = 'HTTP ' + status;
  return String(msg).slice(0, 300);
}

/* ---------- erros explicados em português ---------- */
/* A chave é realmente aceita? Olha o conteúdo da resposta (algumas APIs devolvem
   200 com um erro dentro). Devolve {ok, motivo, conta}. */
async function conferirChaveHF(tok) {
  try {
    const r = await fetchTimeout('https://huggingface.co/api/whoami-v2', { headers: { Authorization: 'Bearer ' + tok } }, 20000);
    const txt = await r.text();
    let j = {}; try { j = JSON.parse(txt); } catch (e) { }
    if (j && j.error) return { ok: false, motivo: String(j.error) };
    if (j && j.name) return { ok: true, conta: j.name, tipo: j.type || '', perfil: ((j.auth || {}).accessToken || {}).role || '' };
    if (!r.ok) return { ok: false, motivo: 'HTTP ' + r.status };
    return { ok: false, motivo: 'resposta inesperada: ' + txt.slice(0, 80) };
  } catch (e) { return { ok: false, motivo: 'sem conexão: ' + ((e && e.message) || e) }; }
}

function ambienteRestrito() {
  try { return location.origin === 'null' || !/^https?:$/.test(location.protocol); } catch (e) { return true; }
}
function errRede(e) { const x = new Error((e && e.message) || String(e)); x.__rede = true; x.__abort = !!(e && e.name === 'AbortError'); return x; }
function errHTTP(status, msg) { const x = new Error(msg || ('HTTP ' + status)); x.__http = status; return x; }
function fetchTimeout(url, opts, ms) {
  if (typeof AbortController === 'undefined') return fetch(url, opts);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 60000);
  return fetch(url, Object.assign({}, opts, { signal: ctl.signal })).finally(() => clearTimeout(t));
}
function explicarErroIA(e, provedorId) {
  const p = PROVEDORES[provedorId] || { nome: 'IA' };
  const m = String((e && e.message) || e || 'erro desconhecido');
  if (e && e.__rede) {
    if (e.__abort) return 'A resposta demorou demais e foi cancelada (60 s). Tente de novo ou escolha um modelo mais leve no botão 🔑.';
    if (ambienteRestrito()) return 'O navegador bloqueou a conversa com a IA porque o app está aberto como ARQUIVO LOCAL (file://) ou dentro de um visualizador restrito.\n\nComo resolver (qualquer uma serve):\n1) PUBLIQUE o app e abra pelo link https:// (Opção A do LEIA-ME);\n2) ou rode: python3 app/server.py e acesse http://localhost:8000';
    return 'Não consegui falar com o serviço da ' + p.nome + '. Verifique sua internet (ou VPN, antivírus, DNS/firewall bloqueando). Detalhe: ' + m;
  }
  if (e && e.__http) {
    const s = e.__http;
    /* modelo aposentado/indisponível: mensagem específica, com o caminho da solução */
    if (ERRO_MODELO.test(m)) return 'O modelo “' + (modeloDe(provedorId) || 'escolhido') + '” NÃO está mais disponível na ' + p.nome + ' — os provedores aposentam modelos de tempos em tempos.\n\nComo resolver: toque em ✨ “escolher por mim” (na janela 🔑): o app consulta a lista da sua conta, escolhe um modelo de conversa que funciona e já testa. O app também tenta isso automaticamente.'
      + (provedorId === 'groq' ? '\n\nNa Groq, os modelos de hoje são: openai/gpt-oss-120b, openai/gpt-oss-20b e qwen/qwen3.6-27b (os llama-3.3 e llama-3.1 saíram do ar em 16/08/2026).' : '')
      + (provedorId === 'gemini' ? '\n\nNo Gemini, os modelos atuais são gemini-3.8-flash, gemini-3.5-flash e gemini-3.5-flash-lite (os 2.5 estão sendo aposentados).' : '');
    if (s === 401 || s === 403) return 'A ' + p.nome + ' RECUSOU a chave (erro ' + s + '). Isso acontece quando o token foi copiado incompleto, expirou, foi revogado ou não tem a permissão necessária.\n\nComo resolver: crie outra chave em ' + (p.criar || '') + ' e cole de novo.';
    if (s === 404) return 'O modelo “' + (modeloDe(provedorId) || 'escolhido') + '” não existe ou não está disponível na ' + p.nome + ' (404). Toque em 🔄 “buscar modelos disponíveis” na janela 🔑 e escolha um da lista.';
    if (s === 429) return 'A ' + p.nome + ' recusou por LIMITE DE USO (429). Espere um minuto e tente de novo — a cota gratuita renova sozinha.' + (p.custo.indexOf('grátis') === 0 ? '' : '');
    if (s === 402) return 'Créditos insuficientes na ' + p.nome + ' (erro 402). Recarregue a conta ou troque para uma IA gratuita (Hugging Face, Groq, Gemini ou OpenRouter com modelos “:free”).';
    if (s === 400 && /credit|balance|quota|billing/i.test(m)) return 'A conta da ' + p.nome + ' está sem créditos (400): ' + m;
    if (s === 503) return 'O serviço da ' + p.nome + ' está sobrecarregado (503). Tente de novo em uns 20 segundos.';
    return 'A ' + p.nome + ' respondeu ' + s + ': ' + m;
  }
  return m;
}

/* Pega a lista real do provedor (com a chave do usuário) e escolhe um modelo de conversa. */
async function descobrirModeloQueFunciona(id) {
  const lista = (await listarModelos(id)).filter(ehModeloDeConversa);
  if (!lista.length) throw new Error('não encontrei nenhum modelo de conversa disponível na sua conta');
  return escolherModeloBom(lista);
}

/* ---------- chamada unificada, com reserva automática ---------- */
/* modelos que não servem para conversar */
function ehModeloDeConversa(m) { return !/whisper|tts|guard|prompt-guard|embed|moderation|vision-only|rerank|audio|image/i.test(String(m)); }

/* escolhe, na lista do provedor, o modelo mais adequado para o tutor */
function escolherModeloBom(lista) {
  const preferencia = [/gpt-oss-120b/i, /gpt-oss/i, /versatile/i, /qwen3?[.-]?\d/i, /(sonnet|opus|pro|large|70b|120b|405b)/i, /flash|mini|small|instant|8b|7b/i];
  for (const re of preferencia) { const achado = lista.find(m => re.test(m)); if (achado) return achado; }
  return lista[0];
}

/* o erro é "esse modelo não existe mais / não tenho acesso"? */
const ERRO_MODELO = /does not exist|no access|not found|decommission|deprecat|invalid model|model_not_found|unsupported model|model.*not.*available|no longer/i;

async function chamarIAProvedor(id, mensagens, opts) {
  const p = PROVEDORES[id], cfg = cfgProv(id);
  if (!p) throw new Error('Provedor de IA desconhecido: ' + id);
  if (opts && opts.modelo) cfg.modelo = opts.modelo;
  const url = urlDoProvedor(id, cfg);
  if (!url) throw new Error('Falta o endereço da API na configuração da ' + p.nome + ' (janela 🔑).');
  const r = await fetchTimeout(url, {
    method: 'POST',
    headers: cabecalhosDoProvedor(id, cfg),
    body: JSON.stringify(corpoDoProvedor(id, cfg, mensagens, opts || {})),
  }, (opts && opts.timeout) || 60000);
  const txt = await r.text();
  let j = {}; try { j = JSON.parse(txt); } catch (e) { }
  if (!r.ok) {
    const msgErro = mensagemDeErro(id, r.status, txt, j);
    /* AUTOCORREÇÃO: modelo aposentado/indisponível → descobre um modelo válido e tenta de novo */
    if (ERRO_MODELO.test(msgErro) && !(opts && opts.__semAutocorrecao)) {
      const novo = await descobrirModeloQueFunciona(id).catch(() => '');
      if (novo && novo !== cfg.modelo) {
        try {
          const conteudo = await chamarIAProvedor(id, mensagens, Object.assign({}, opts, { modelo: novo, __semAutocorrecao: true }));
          cfg.modelo = novo; try { salvar(); } catch (e) { }
          if (typeof toast === 'function') toast('O modelo anterior saiu do ar — passei a usar ' + novo);
          return conteudo;
        } catch (e2) { /* se o novo também falhar, mostra o erro original */ }
      }
    }
    throw errHTTP(r.status, msgErro);
  }
  const conteudo = lerResposta(id, j);
  if (!conteudo) {
    /* algumas APIs devolvem 200 com um erro dentro do corpo — trata como erro de verdade */
    if (/invalid username or password|unauthorized|token.*invalid|invalid.*token/i.test(txt)) {
      throw errHTTP(401, 'Invalid username or password.');
    }
    if (/quota|rate limit|too many requests/i.test(txt)) throw errHTTP(429, txt.slice(0, 160));
    throw new Error('A ' + p.nome + ' respondeu sem texto. Resposta recebida: ' + String(txt || '(vazia)').slice(0, 180));
  }
  return conteudo;
}

async function chamarIA(mensagens, opts = {}) {
  migrarIA();
  const ordem = ordemProvedores();
  if (!ordem.some(iaConfigurada)) {
    throw new Error('Nenhuma IA configurada ainda. Toque no botão 🔑 no topo da tela: escolha uma IA (Hugging Face, Gemini, Groq…) e cole a sua chave. É grátis e leva 1 minuto.');
  }
  /* 1) servidor local/published com proxy: a chave não viaja no navegador */
  if (IA_STATUS.servidor) {
    try { return await chamarViaServidor(provAtualId(), mensagens, opts); }
    catch (e) {
      IA_STATUS.erro = String((e && e.message) || e);
      if (e && e.__http && e.__http !== 404 && e.__http !== 502) throw new Error(explicarErroIA(e, provAtualId()));
      /* 404/502 = intermediário sem suporte a essa IA: segue pela chamada direta */
    }
  }
  /* 2) chamada direta do navegador, tentando a principal e depois as reservas */
  let ultimoErro = null, ultimoProv = provAtualId();
  for (const id of ordem) {
    ultimoProv = id;
    try {
      const conteudo = await chamarIAProvedor(id, mensagens, opts);
      if (id !== provAtualId()) {                     /* a principal falhou: passa a usar a que funcionou */
        const antigo = provAtualId();
        S.config.iaPrincipal = id;
        try { salvar(); } catch (e) { }
        if (typeof toast === 'function') toast('Usei a ' + PROVEDORES[id].nome + ' (a ' + PROVEDORES[antigo].nome + ' não respondeu)');
      }
      return conteudo;
    } catch (e) {
      /* marca se foi falha de rede (o TypeError seco do navegador) para explicar direito */
      ultimoErro = (e && e.__http) ? e : errRede(e);
      if (ultimoErro.__http && (ultimoErro.__http === 401 || ultimoErro.__http === 403)) {
        /* chave inválida: se houver outra IA configurada, segue para ela; senão, explica */
        if (ordem.filter(iaConfigurada).length > 1) continue;
        throw new Error(explicarErroIA(e, id));
      }
    }
  }
  throw new Error(explicarErroIA(ultimoErro, ultimoProv));
}

/* ---------- listar os modelos que a chave realmente enxerga ---------- */
async function listarModelos(id) {
  const p = PROVEDORES[id], cfg = cfgProv(id);
  if (!p) return [];
  let url = p.urlModelos;
  const cab = {};
  if (p.tipo === 'gemini') { if (!cfg.token) throw new Error('Informe a chave primeiro.'); url = p.urlModelos + '?key=' + encodeURIComponent(cfg.token); }
  else {
    if (p.semChave) url = (cfg.baseUrl || p.urlPadrao || '').replace(/\/chat\/completions\/?$/, '/models');
    else {
      if (!cfg.token) throw new Error('Informe a chave primeiro.');
      cab['Authorization'] = 'Bearer ' + cfg.token;
    }
    if (p.tipo === 'anthropic') { delete cab['Authorization']; cab['x-api-key'] = cfg.token; cab['anthropic-version'] = '2023-06-01'; cab['anthropic-dangerous-direct-browser-access'] = 'true'; }
  }
  if (!url) throw new Error('Falta o endereço da API.');
  const r = await fetchTimeout(url, { method: 'GET', headers: cab }, 25000);
  const txt = await r.text();
  let j = {}; try { j = JSON.parse(txt); } catch (e) { }
  if (!r.ok) throw new Error(mensagemDeErro(id, r.status, txt, j));
  let ids = [];
  if (p.tipo === 'gemini') ids = (j.models || []).filter(m => (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0).map(m => String(m.name || '').replace(/^models\//, ''));
  else ids = (j.data || j.models || []).map(m => m.id || m.name || m.model).filter(Boolean).map(String);
  ids = Array.from(new Set(ids));
  const peso = m => (/(flash|mini|small|instant|8b|7b|nemo|free)/i.test(m) ? 0 : 1);
  return ids.sort((a, b) => peso(a) - peso(b) || a.localeCompare(b)).slice(0, 300);
}

/* ---------- diagnóstico de todas as IAs ---------- */
async function diagnosticarIA() {
  migrarIA();
  const L = [];
  const add = (i, t) => L.push(i + ' ' + t);
  add('•', 'Endereço do app: ' + ((typeof location !== 'undefined' && location.href) || '').slice(0, 70));
  if (ambienteRestrito()) add('❌', 'O app está aberto como arquivo local (file://) ou em visualizador restrito: o navegador BLOQUEIA a IA nesse modo. Publique o app (Opção A do LEIA-ME) ou rode: python3 app/server.py');
  else add('✅', 'O app está aberto por um endereço http(s) — modo correto.');
  if (IA_STATUS.servidor) add('✅', 'Existe um servidor/proxy ativo — as chaves são usadas por trás, sem exposição.');
  const configurados = provedoresConfigurados();
  if (!configurados.length) { add('❌', 'Nenhuma IA configurada. Toque no botão 🔑 e cole a chave de uma das IAs.'); return L.join('\n'); }
  add('•', 'IA principal: ' + PROVEDORES[provAtualId()].nome + ' · modelo ' + (modeloDe(provAtualId()) || '(padrão)'));
  add('•', 'Reserva automática: ' + (S.config.iaReserva === false ? 'desligada' : 'ligada'));
  /* quem já está configurado */
  configurados.forEach(id => {
    const c = cfgProv(id), p = PROVEDORES[id];
    if (p.semChave) add('✅', p.nome + ': endereço ' + (c.baseUrl || p.urlPadrao));
    else add('✅', p.nome + ': chave ' + String(c.token).slice(0, 7) + '…' + String(c.token).slice(-4) + ' (' + String(c.token).length + ' caracteres)');
    const pref = p.prefixo;
    if (pref && c.token && String(c.token).indexOf(pref) !== 0) add('⚠️', 'A chave do ' + p.nome + ' normalmente começa com “' + pref + '” — confira se copiou o campo certo.');
  });
  /* teste real de cada uma (menos no modo arquivo local) */
  for (const id of configurados) {
    if (ambienteRestrito() && !IA_STATUS.servidor) { add('⚠️', PROVEDORES[id].nome + ': não testado (app em modo arquivo local).'); continue; }
    try {
      const t0 = Date.now();
      let resposta;
      if (IA_STATUS.servidor) {
        const cfg = cfgProv(id);
        const r = await fetchTimeout('api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provedor: id, modelo: cfg.modelo, baseUrl: cfg.baseUrl, token: cfg.token, mensagens: [{ role: 'user', content: 'Responda apenas: OK' }], max_tokens: 128, temperature: 0 }) }, 30000);
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
        resposta = j.content;
      } else {
        resposta = await chamarIAProvedor(id, [{ role: 'user', content: 'Responda apenas: OK' }], { max_tokens: 128, temperature: 0, timeout: 30000 });
      }
      add('✅', PROVEDORES[id].nome + ' respondeu em ' + ((Date.now() - t0) / 1000).toFixed(1) + 's (“' + String(resposta).trim().slice(0, 20) + '”) — esta IA está funcionando.');
    } catch (e) {
      add('❌', PROVEDORES[id].nome + ' falhou: ' + explicarErroIA(e, id).split('\n')[0]);
      if (id === 'hf') {
        const c = await conferirChaveHF(cfgProv('hf').token);
        if (c.ok) add('✅', 'Hugging Face: a chave é VÁLIDA (conta: ' + c.conta + (c.perfil ? ', perfil ' + c.perfil : '') + ').');
        else {
          add('❌', 'Hugging Face: a chave NÃO é aceita — ' + c.motivo);
          add('👉', 'Como resolver: abra ' + PROVEDORES.hf.criar + ' → “New token” → tipo Fine-grained → marque “Make calls to Inference Providers” → copie o código hf_… e cole no campo acima. A chave mostrada agora tem ' + String(cfgProv('hf').token).length + ' caracteres.');
          add('💡', 'Se você já tem uma chave de outra IA (Gemini, Groq…), pode usá-la enquanto isso: escolha na lista “Qual IA usar como principal?”.');
        }
      }
    }
  }
  add('•', 'Se pelo menos uma apareceu ✅, o tutor de IA vai funcionar. Você pode deixar várias configuradas: o app usa a principal e passa para as outras sozinho se alguma falhar.');
  return L.join('\n');
}

/* as três gratuitas, para textos de ajuda */
function nomesSimples() { return IAS_SIMPLES.map(id => PROVEDORES[id].nome).join(', '); }

/* ajuda: descreve o que está configurado, para mostrar na aba IA */
function resumoIA() {
  const ids = provedoresConfigurados();
  if (!ids.length) return 'Nenhuma IA configurada ainda.';
  return ids.map(id => PROVEDORES[id].nome + (id === provAtualId() ? ' (principal)' : '')).join(', ');
}

/* aproveita a configuração de quem já usava o app (só Hugging Face) */
try { migrarIA(); } catch (e) { }
