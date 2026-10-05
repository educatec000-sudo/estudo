/* Proxy de IA para deploy na Vercel (função serverless).
   O app detecta sozinho em /api/health e passa a usar este intermediário:
   assim as chaves não ficam expostas no navegador e IAs que bloqueiam
   o navegador (como o Gemini em alguns navegadores) funcionam normalmente. */

const PROVEDORES = {
  hf: { tipo: 'openai', url: 'https://router.huggingface.co/v1/chat/completions' },
  gemini: { tipo: 'gemini', urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/' },
  groq: { tipo: 'openai', url: 'https://api.groq.com/openai/v1/chat/completions' },
  openai: { tipo: 'openai', url: 'https://api.openai.com/v1/chat/completions' },
  anthropic: { tipo: 'anthropic', url: 'https://api.anthropic.com/v1/messages' },
  openrouter: { tipo: 'openai', url: 'https://openrouter.ai/api/v1/chat/completions' },
  mistral: { tipo: 'openai', url: 'https://api.mistral.ai/v1/chat/completions' },
  deepseek: { tipo: 'openai', url: 'https://api.deepseek.com/chat/completions' },
  xai: { tipo: 'openai', url: 'https://api.x.ai/v1/chat/completions' },
  ollama: { tipo: 'openai', urlPadrao: 'http://localhost:11434/v1/chat/completions' },
  custom: { tipo: 'openai', urlLivre: true },
};

function montar(id, modelo, mensagens, token, baseUrl, maxTokens, temperatura) {
  const p = PROVEDORES[id];
  if (!p) throw new Error('Provedor desconhecido: ' + id);
  const cabecalhos = { 'Content-Type': 'application/json' };
  let url;
  if (p.urlLivre) {
    url = (baseUrl || '').trim();
    if (!url) throw new Error('Informe o endereço da API.');
  } else if (p.tipo === 'gemini') {
    url = p.urlBase + modelo + ':generateContent?key=' + (token || '');
  } else {
    url = p.url || p.urlPadrao;
  }
  if (p.tipo === 'gemini') {
    const sistema = mensagens.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const conversa = mensagens.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const corpo = { contents: conversa, generationConfig: { maxOutputTokens: maxTokens, temperature: temperatura } };
    if (sistema) corpo.systemInstruction = { parts: [{ text: sistema }] };
    return { url, cabecalhos, corpo };
  }
  if (p.tipo === 'anthropic') {
    const sistema = mensagens.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const conversa = mensagens.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
    cabecalhos['x-api-key'] = token || '';
    cabecalhos['anthropic-version'] = '2023-06-01';
    const corpo = { model: modelo, max_tokens: maxTokens, temperature: temperatura, messages: conversa };
    if (sistema) corpo.system = sistema;
    return { url, cabecalhos, corpo };
  }
  if (id !== 'ollama' && token) cabecalhos['Authorization'] = 'Bearer ' + token;
  if (id === 'openrouter') cabecalhos['X-Title'] = 'Arena Estudos ALEPA';
  return { url, cabecalhos, corpo: { model: modelo, messages: mensagens, max_tokens: maxTokens, temperature: temperatura } };
}

function lerResposta(id, j) {
  const p = PROVEDORES[id] || {};
  if (p.tipo === 'gemini') {
    const c = (j.candidates || [])[0] || {};
    const partes = (c.content && c.content.parts) || [];
    return partes.map(x => x.text || '').join('').trim();
  }
  if (p.tipo === 'anthropic') {
    const bloco = (j.content || []).find(x => x.type === 'text');
    return bloco ? bloco.text : '';
  }
  const e = (j.choices || [])[0];
  return (e && e.message && e.message.content) || '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  let dados = req.body;
  if (typeof dados === 'string') { try { dados = JSON.parse(dados); } catch (e) { dados = {}; } }
  dados = dados || {};
  const id = (dados.provedor || 'hf').trim();
  const modelo = (dados.modelo || '').trim();
  const token = (dados.token || '').trim() || process.env.HF_TOKEN || '';
  if (!PROVEDORES[id]) return res.status(400).json({ error: 'Provedor desconhecido: ' + id });
  const mensagens = dados.mensagens || [{ role: 'user', content: 'Oi' }];
  let req2;
  try {
    req2 = montar(id, modelo, mensagens, token, dados.baseUrl || '', dados.max_tokens || 1200, dados.temperature === undefined ? 0.6 : dados.temperature);
  } catch (e) { return res.status(400).json({ error: e.message }); }
  try {
    const r = await fetch(req2.url, { method: 'POST', headers: req2.cabecalhos, body: JSON.stringify(req2.corpo) });
    const txt = await r.text();
    let j = {}; try { j = JSON.parse(txt); } catch (e) { }
    if (!r.ok) return res.status(r.status).json({ error: (j.error && (j.error.message || j.error)) || txt.slice(0, 300) || ('HTTP ' + r.status) });
    const conteudo = lerResposta(id, j);
    if (!conteudo) return res.status(502).json({ error: 'A IA respondeu sem texto.' });
    return res.status(200).json({ content: conteudo, provedor: id, modelo });
  } catch (e) {
    return res.status(502).json({ error: 'Não consegui falar com a IA: ' + (e && e.message ? e.message : e) });
  }
}
