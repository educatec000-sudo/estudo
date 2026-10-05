/* ============================================================
   Testa o Worker do Cloudflare (cloudflare/worker.js) sem internet:
   simula a KV do Cloudflare e valida as rotas, erros e segurança.
   Uso: cd /home/user/tests && node worker.mjs
   ============================================================ */
import fs from 'fs';

const origem = fs.readFileSync('/home/user/cloudflare/worker.js', 'utf8');
const tmp = '/home/user/tests/.worker-teste.mjs';
fs.writeFileSync(tmp, origem);
const worker = (await import('file://' + tmp + '?v=' + Date.now())).default;

let falhas = 0, total = 0;
function ok(nome, cond, extra) {
  total++;
  console.log((cond ? '  OK ' : '  FALHOU ') + nome + (cond ? '' : '  -> ' + (extra === undefined ? '' : extra)));
  if (!cond) falhas++;
}

/* --- KV falsa, igual à do Cloudflare (get/put por chave) --- */
function kvFalsa() {
  const mapa = new Map();
  return { mapa, get: async k => (mapa.has(k) ? mapa.get(k) : null), put: async (k, v) => { mapa.set(k, v); } };
}
const env = { PROGRESSO: kvFalsa() };
const base = 'https://alepa-progresso.exemplo.workers.dev';
const pedir = (caminho, opcoes) => worker.fetch(new Request(base + caminho, opcoes), env);
const pacote = JSON.stringify({ app: 'ArenaEstudos-ALEPA', versao: 1, atualizadoEm: Date.now(), hist: {}, resp: {}, geradas: [] });

console.log('1. Rotas básicas e CORS');
{
  const r = await worker.fetch(new Request(base + '/progresso?codigo=ALEPA-7K3F-92QX', { method: 'OPTIONS' }), env);
  ok('responde o pré-voo (OPTIONS) sem erro', r.status === 204, r.status);
  ok('libera qualquer origem (o app roda em pages.dev, vercel, etc.)', r.headers.get('Access-Control-Allow-Origin') === '*');
  const h = await pedir('/health');
  const hj = await h.json();
  ok('/health responde ok', h.status === 200 && hj.ok === true, JSON.stringify(hj));
  const nf = await pedir('/qualquer-outra');
  ok('rota desconhecida devolve 404 explicando', nf.status === 404 && /Rota não encontrada/.test((await nf.json()).erro));
}

console.log('\n2. Sem a KV ligada, ensina como resolver (o erro mais comum)');
{
  const r = await worker.fetch(new Request(base + '/progresso?codigo=ALEPA-7K3F-92QX'), {});
  const j = await r.json();
  ok('avisa que falta a gaveta (KV)', r.status === 503 && /PROGRESSO/.test(j.comoResolver || ''), JSON.stringify(j).slice(0, 120));
}

console.log('\n3. Código de progresso');
{
  const semCodigo = await pedir('/progresso');
  ok('sem código devolve 400 com instrução', semCodigo.status === 400 && /Código/.test((await semCodigo.json()).erro));
  const curto = await pedir('/progresso?codigo=AB');
  ok('código curto demais é recusado', curto.status === 400);
  const put = await pedir('/progresso?codigo=alepa 7k3f 92qx', { method: 'PUT', body: pacote });
  ok('aceita código digitado com espaço/minúsculas', put.status === 200, put.status);
  ok('guarda o código normalizado (maiúsculas)', env.PROGRESSO.mapa.has('progresso:ALEPA7K3F92QX'), [...env.PROGRESSO.mapa.keys()].join());
}

console.log('\n4. Enviar e baixar');
{
  const put = await pedir('/progresso?codigo=ALEPA-7K3F-92QX', { method: 'PUT', body: pacote });
  const pj = await put.json();
  ok('PUT grava e responde ok com o tamanho', put.status === 200 && pj.ok === true && pj.bytes > 0, JSON.stringify(pj));
  const get = await pedir('/progresso?codigo=ALEPA-7K3F-92QX');
  const texto = await get.text();
  ok('GET devolve exatamente o que foi enviado', get.status === 200 && JSON.stringify(JSON.parse(texto)) === JSON.stringify(JSON.parse(pacote)));
  ok('a resposta não é guardada em cache', /no-store/.test(get.headers.get('Cache-Control') || ''));

  const outro = await pedir('/progresso?codigo=ALEPA-OUTRO-99');
  const oj = await outro.json();
  ok('código diferente = gaveta separada (outra pessoa não vê seus dados)', outro.status === 404 && /Ainda não existe progresso/.test(oj.erro));
}

console.log('\n5. Conteúdo inválido é barrado');
{
  const naoJson = await pedir('/progresso?codigo=ALEPA-7K3F-92QX', { method: 'PUT', body: 'oi, tudo bem?' });
  ok('recusa texto que não é JSON', naoJson.status === 400 && /JSON válido/.test((await naoJson.json()).erro));
  const outroApp = await pedir('/progresso?codigo=ALEPA-7K3F-92QX', { method: 'PUT', body: JSON.stringify({ app: 'outro-app', atualizadoEm: 1 }) });
  ok('recusa JSON que não é do app', outroApp.status === 400 && /não parece ser um progresso/.test((await outroApp.json()).erro));
  const semData = await pedir('/progresso?codigo=ALEPA-7K3F-92QX', { method: 'PUT', body: JSON.stringify({ app: 'ArenaEstudos-ALEPA' }) });
  ok('recusa pacote sem carimbo de atualização', semData.status === 400);
  const gigante = await pedir('/progresso?codigo=ALEPA-7K3F-92QX', { method: 'PUT', body: JSON.stringify({ app: 'ArenaEstudos-ALEPA', atualizadoEm: 1, lixo: 'x'.repeat(600 * 1024) }) });
  ok('recusa progresso grande demais (protege a conta)', gigante.status === 413 && /grande demais/.test((await gigante.json()).erro));
  const metodo = await worker.fetch(new Request(base + '/progresso?codigo=ALEPA-7K3F-92QX', { method: 'DELETE' }), env);
  ok('método não permitido é recusado', metodo.status === 405);
}

console.log('\n6. O que a nuvem guarda (privacidade)');
{
  const texto = env.PROGRESSO.mapa.get('progresso:ALEPA-7K3F-92QX');
  ok('o Worker guarda só o JSON do progresso', /ArenaEstudos-ALEPA/.test(texto));
  ok('o Worker não guarda chave de IA (o app envia sem segredos)', !/hf_|gsk_|AIza|sk-/.test(texto));
}

fs.unlinkSync(tmp);
console.log('\n' + total + ' verificações — ' + (falhas === 0 ? '🎉 Worker funcionando.' : '❌ ' + falhas + ' falharam.'));
process.exit(falhas === 0 ? 0 : 1);
