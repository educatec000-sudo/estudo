/* ==========================================================================
   Worker do Cloudflare — guarda o progresso do app Arena Estudos ALEPA
   --------------------------------------------------------------------------
   Como funciona: o app faz
     PUT  /progresso?codigo=ALEPA-XXXX-XXXX   (envia o progresso)
     GET  /progresso?codigo=ALEPA-XXXX-XXXX   (baixa o progresso)

   O "código de progresso" funciona como a chave da gaveta: quem tem o código
   acessa aquela gaveta. Códigos diferentes = progressos separados (você e
   outra pessoa usam o app sem interferir um no outro).

   Não precisa de token, conta, senha nem repositório. Só do Worker publicado
   e de uma KV namespace ligada na variável PROGRESSO.
   ========================================================================== */

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const LIMITE_BYTES = 512 * 1024;   // 512 KB — o progresso real ocupa poucos KB

function responder(corpo, status, extra) {
  return new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CABECALHOS, extra || {}),
  });
}

/* aceita "alepa-7k3f-92qx", "ALEPA 7K3F 92QX" etc. e devolve ALEPA-7K3F-92QX */
function normalizarCodigo(bruto) {
  const limpo = String(bruto || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (limpo.length < 6 || limpo.length > 40) return null;
  return limpo;
}

function validarProgresso(texto) {
  let dados;
  try { dados = JSON.parse(texto); } catch (e) { return { erro: 'O conteúdo enviado não é um JSON válido.' }; }
  if (!dados || typeof dados !== 'object') return { erro: 'O conteúdo enviado está vazio ou em formato inesperado.' };
  if (dados.app !== 'ArenaEstudos-ALEPA') return { erro: 'Esse JSON não parece ser um progresso do app Arena Estudos ALEPA.' };
  if (!dados.atualizadoEm) return { erro: 'O progresso enviado não tem carimbo de atualização.' };
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* pré-voo do navegador (CORS) */
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CABECALHOS });

    if (!env || !env.PROGRESSO) {
      return responder({
        ok: false,
        erro: 'Falta ligar a gaveta (KV) neste Worker.',
        comoResolver: 'No painel do Cloudflare: abra o Worker → Settings → Bindings (ou "Variables") → Add → KV namespace → nome da variável: PROGRESSO → escolha a namespace criada → Save and Deploy.',
      }, 503);
    }

    if (url.pathname === '/health' || url.pathname === '/') {
      return responder({ ok: true, servico: 'alepa-progresso', versao: 1, hora: new Date().toISOString() });
    }

    if (url.pathname !== '/progresso') {
      return responder({ ok: false, erro: 'Rota não encontrada. Use /health ou /progresso.' }, 404);
    }

    const codigo = normalizarCodigo(url.searchParams.get('codigo'));
    if (!codigo) {
      return responder({ ok: false, erro: 'Código de progresso inválido. Use pelo menos 6 caracteres (letras, números e hífen).' }, 400);
    }
    const chave = 'progresso:' + codigo;

    /* ---------- baixar ---------- */
    if (request.method === 'GET') {
      const valor = await env.PROGRESSO.get(chave);
      if (!valor) return responder({ ok: false, erro: 'Ainda não existe progresso salvo com esse código. Clique em "Enviar progresso" no primeiro aparelho.' }, 404);
      return new Response(valor, { headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CABECALHOS) });
    }

    /* ---------- enviar ---------- */
    if (request.method === 'PUT' || request.method === 'POST') {
      const corpo = await request.text();
      if (!corpo) return responder({ ok: false, erro: 'Nada foi enviado.' }, 400);
      if (corpo.length > LIMITE_BYTES) {
        return responder({ ok: false, erro: 'Progresso grande demais (' + Math.round(corpo.length / 1024) + ' KB). O limite é ' + (LIMITE_BYTES / 1024) + ' KB.' }, 413);
      }
      const checagem = validarProgresso(corpo);
      if (checagem.erro) return responder({ ok: false, erro: checagem.erro }, 400);

      await env.PROGRESSO.put(chave, corpo);
      return responder({ ok: true, salvoEm: Date.now(), bytes: corpo.length });
    }

    return responder({ ok: false, erro: 'Método não permitido. Use GET para baixar e PUT para enviar.' }, 405);
  },
};
