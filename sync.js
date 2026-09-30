/* /api/sync — guarda/lê o progresso num repositório privado de dataset do
   Hugging Face usando a chave do usuário (a mesma ideia do server.py local).
   Assim a sincronização funciona também quando o app está publicado. */

const HF_API = 'https://huggingface.co/api';

async function hf(url, token, metodo = 'GET', dados, cabecalhos) {
  const opcoes = {
    method: metodo,
    headers: Object.assign({ Authorization: 'Bearer ' + token, 'User-Agent': 'ArenaEstudos-ALEPA/1.0' }, cabecalhos || {}),
  };
  if (dados !== undefined) opcoes.body = JSON.stringify(dados);
  const r = await fetch(url, opcoes);
  const txt = await r.text();
  return { status: r.status, txt };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let dados = req.method === 'POST' ? req.body : (req.query || {});
  if (typeof dados === 'string') { try { dados = JSON.parse(dados); } catch (e) { dados = {}; } }
  dados = dados || {};
  const token = String(dados.token || process.env.HF_TOKEN || '').trim();
  const acao = String(dados.acao || 'pull').trim();
  const repo = String(dados.repo || '').trim().replace(/^\/+|\/+$/g, '');
  if (!token) return res.status(400).json({ error: 'Chave do Hugging Face não informada.' });
  if (!repo || !repo.includes('/')) return res.status(400).json({ error: 'Repositório inválido. Use usuario/nome-repo.' });

  try {
    if (acao === 'push') {
      const corpo = String(dados.dados || '');
      if (!corpo) return res.status(400).json({ error: 'Nada para enviar.' });
      const env = { file: 'progresso.json', content: corpo, summary: 'Progresso de estudos (Arena Estudos ALEPA)' };
      let r = await hf(`${HF_API}/datasets/${repo}/upload/main/progresso.json`, token, 'POST', env, { 'Content-Type': 'application/json' });
      if (r.status === 404) {
        await hf(`${HF_API}/repos/create`, token, 'POST', { type: 'dataset', name: repo.split('/').pop(), private: true }, { 'Content-Type': 'application/json' });
        r = await hf(`${HF_API}/datasets/${repo}/upload/main/progresso.json`, token, 'POST', env, { 'Content-Type': 'application/json' });
      }
      if (r.status === 200 || r.status === 201) return res.status(200).json({ ok: true, repo });
      return res.status(502).json({ error: `Hugging Face respondeu ${r.status}: ${r.txt.slice(0, 300)}` });
    }
    if (acao === 'pull') {
      const r = await hf(`https://huggingface.co/datasets/${repo}/resolve/main/progresso.json?download=true`, token);
      if (r.status === 200) {
        try { return res.status(200).json(JSON.parse(r.txt)); } catch (e) { return res.status(502).json({ error: 'Arquivo de progresso inválido.' }); }
      }
      return res.status(404).json({ error: `Ainda não há progresso nesse repositório (HF ${r.status}).` });
    }
    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (e) {
    return res.status(502).json({ error: 'Erro ao falar com o Hugging Face: ' + (e && e.message ? e.message : e) });
  }
}
