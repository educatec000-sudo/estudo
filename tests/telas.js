/* ============================================================
   Gera imagens (telas) do app para conferir o visual.
   Uso: cd /home/user/tests && node telas.js
   ============================================================ */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP || 'file:///home/user/ALEPA_Estudos.html';
const SAIDA = process.env.SAIDA || '/home/user/views';
const sobe = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto(APP, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.setItem('alepa_onboarding', '1'); } catch (e) { } });
  await page.reload({ waitUntil: 'load' });
  await sobe(800);

  /* enche o app de dados plausíveis, para as telas ficarem "vivas" */
  await page.evaluate(() => {
    const S = window.__S, banco = window.__BANCO__ || [];
    const DIA = 86400000, hoje = Date.now();
    for (let d = 0; d < 34; d++) {
      if (d % 7 === 3) continue;
      const iso = new Date(hoje - d * DIA).toISOString().slice(0, 10);
      const q = 16 + ((d * 7) % 26), a = Math.round(q * (0.60 + ((d * 13) % 28) / 100));
      S.hist[iso] = { q: q, a: a, min: Math.round(q * 1.7) };
    }
    banco.forEach((q, i) => {
      const bom = (Math.sin(i * 1.7) + 1) / 2 > 0.32;
      S.resp[q.id] = {
        t: hoje - (i % 30) * DIA, a: bom ? q.correta : (q.correta + 1 + (i % 3)) % 5, ok: bom,
        ult: hoje - (i % 18) * DIA, cx: bom ? 3 : 1, prox: hoje + (i % 5) * DIA
      };
    });
    S.provas = [
      { data: hoje - 26 * DIA, total: 60, acertos: 31, nota: 5.2, tempo: 178, porMat: {} },
      { data: hoje - 19 * DIA, total: 60, acertos: 35, nota: 5.8, tempo: 171, porMat: {} },
      { data: hoje - 12 * DIA, total: 60, acertos: 39, nota: 6.5, tempo: 165, porMat: {} },
      { data: hoje - 5 * DIA, total: 60, acertos: 44, nota: 7.3, tempo: 158, porMat: {} },
    ];
    const mats = (window.__EDITAL__ || { materias: [] }).materias;
    mats.slice(0, 5).forEach(m => (m.topicos || []).slice(0, 2).forEach(t => { S.teoria[m.id + '|' + t] = true; }));
    S.config.nome = 'Estudante';
    S.ia.msgs = [
      { role: 'user', content: 'Explique a diferença entre decreto legislativo e resolução da ALEPA.' },
      { role: 'assistant', content: [
        '**Decreto legislativo x Resolução** — cai muito na CETAP.',
        '',
        '### Como separar os dois',
        '| Ato | Para que serve | Efeito |',
        '|---|---|---|',
        '| **Decreto legislativo** | Matérias que **extrapolam** os interesses internos da Casa | **Externo** |',
        '| **Resolução** | Assuntos **internos** (Regimento, estrutura, licenças) | **Interno** |',
        '',
        '**Exemplos de decreto legislativo:**',
        '- ratificar tratados internacionais;',
        '- julgar as contas do Governador;',
        '- sustar atos do Executivo que exorbitem do poder regulamentar.',
        '',
        '> Dica de prova: efeito **externo** → decreto legislativo; efeito **interno** → resolução.',
        '',
        'Se cair "quem aprecia o veto?", lembre: o Congresso aprecia em sessão conjunta e o **decreto legislativo** é que formaliza a rejeição.'].join('\n'), de: 'groq', ms: 2100 },
    ];
    try { salvar(); reindexar(); atualizarBadges(); } catch (e) { }
  });
  await sobe(400);

  const telas = [];
  const tela = async (nome, preparar) => {
    await page.evaluate(() => { window.scrollTo(0, 0); });
    if (preparar) await page.evaluate(preparar);
    await sobe(650);
    const arquivo = path.join(SAIDA, nome + '.png');
    await page.screenshot({ path: arquivo, fullPage: false });
    telas.push(arquivo);
    console.log('  ·', nome);
  };

  console.log('Gerando telas (desktop 1280×900):');
  await tela('01-painel', () => { irPara('painel'); });
  await tela('02-treinar', () => { irPara('treinar'); const b = document.querySelector('#btn-iniciar'); if (b) b.click(); });
  await tela('03-simulado', () => { irPara('simulado'); const b = document.querySelector('#sim-go'); if (b) b.click(); });
  await tela('04-ia', () => { irPara('ia'); });
  await tela('05-teoria', () => { irPara('teoria'); });
  await tela('06-progresso', () => { irPara('progresso'); });
  await tela('07-plano', () => { irPara('plano'); });
  await tela('08-config-ia', () => { irPara('ia'); abrirConfigIA(); });
  await tela('09-questao-respondida', () => {
    fecharModal(); irPara('treinar');
  });

  await tela('13-importador', async () => {
    fecharModal(); irPara('treinar'); abrirImportador();
    await new Promise(r => setTimeout(r, 150));
    document.querySelector('#imp-exemplo').click();
    document.querySelector('#imp-analisar').click();
  });

  await tela('15-explicacao-ia', async () => {
    fecharModal(); irPara('treinar');
    const b = document.querySelector('#btn-iniciar'); if (b) b.click();
    await new Promise(r => setTimeout(r, 250));
    const q = (window.eval('typeof SESSAO !== "undefined" && SESSAO && SESSAO.qs && SESSAO.qs[0]') || (window.__BANCO__ || [])[0]);
    const EXPLICACAO = [
      '**Questão** – ' + q.enunciado.slice(0, 70),
      '',
      '**Gabarito oficial: ' + String.fromCharCode(65 + q.correta) + '** — ' + q.alternativas[q.correta].slice(0, 90),
      '',
      '---',
      '',
      '## 1. Por que a alternativa correta é a certa',
      '',
      '| Dispositivo | Conteúdo relevante |',
      '|---|---|',
      '| **Fundamento** | É exatamente o que a lei prevê para a situação descrita no enunciado. |',
      '| **Pegadinha** | A banca troca o prazo/quem pratica o ato para derrubar o candidato apressado. |',
      '',
      '**Resumo para memorizar:**',
      '- **Quem**: o agente competente definido na lei;',
      '- **Prazo**: o que está na norma, contado na forma do dispositivo;',
      '- **Efeito**: o previsto expressamente, sem interpretação extensiva.',
      '',
      '> Dica de prova: leia o enunciado até o fim — a troca de sujeito é a pegadinha mais comum.',
      '',
      '1. Confira sempre a fonte na lei seca',
      '2. Faça uma questão desse tema por dia'
    ].join('\n');
    window.fetch = async (url) => String(url).includes('/models')
      ? { ok: true, status: 200, text: async () => JSON.stringify({ data: [] }) }
      : { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: EXPLICACAO } }] }) };
    window.eval('S.config.ias = { groq: { token: "gsk_teste_123456", modelo: "openai/gpt-oss-120b" } }; S.config.iaPrincipal = "groq";');
    await window.explicarComIA(q, (q.correta + 1) % q.alternativas.length);
  });

  await tela('16-nuvem-cloudflare', async () => {
    window.fetch = async (url, opts = {}) => {
      const u = String(url);
      const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo, text: async () => JSON.stringify(corpo) });
      if (u.includes('/health')) return resp(200, { ok: true, servico: 'alepa-progresso', versao: 1 });
      if ((opts.method || 'GET') === 'PUT') return resp(200, { ok: true, bytes: (opts.body || '').length });
      return resp(200, { app: 'ArenaEstudos-ALEPA', atualizadoEm: Date.now(), hist: {}, resp: {}, geradas: [], provas: [] });
    };
    irPara('progresso');
    await new Promise(r => setTimeout(r, 120));
    const u = document.querySelector('#nv-url'); if (u) { u.value = 'https://alepa-progresso.rafael.workers.dev'; u.dispatchEvent(new Event('change')); }
    const c = document.querySelector('#nv-codigo'); if (c) { c.value = 'ALEPA-7K3F-92QX'; c.dispatchEvent(new Event('change')); }
    const b = document.querySelector('#nv-enviar'); if (b) b.click();
    await new Promise(r => setTimeout(r, 400));
    const alvo = document.querySelector('#nv-url'); if (alvo) alvo.scrollIntoView({ block: 'center' });
  });

  console.log('Gerando telas (celular 390×844):');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await sobe(400);
  await tela('10-mobile-painel', () => { fecharModal(); irPara('painel'); });
  await tela('11-mobile-treinar', () => { irPara('treinar'); const b = document.querySelector('#btn-iniciar'); if (b) b.click(); });
  await tela('12-mobile-ia', () => { irPara('ia'); });
  await tela('14-mobile-importador', async () => {
    fecharModal(); irPara('treinar'); abrirImportador();
    await new Promise(r => setTimeout(r, 150));
    document.querySelector('#imp-exemplo').click();
    document.querySelector('#imp-analisar').click();
  });

  await browser.close();
  console.log('\nArquivos em ' + SAIDA + ':', fs.readdirSync(SAIDA).length);
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
