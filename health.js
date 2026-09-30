/* /api/health — diz ao app que existe um intermediário disponível neste
   deploy (assim ele passa a mandar as chaves por aqui em vez de expô-las
   no navegador). */
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    modelo: process.env.IA_MODELO || 'escolhido no app',
    tem_token_no_servidor: !!process.env.HF_TOKEN,
    provedor: 'proxy serverless (Vercel) — suporta Hugging Face, Gemini, Groq, OpenAI, Claude, OpenRouter, Mistral, DeepSeek, Grok e IA local',
    app: 'serverless',
  });
}
