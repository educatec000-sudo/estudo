/* ============================================================
   Teste dos 13 geradores infinitos + filtros + métricas
   Uso: cd /home/user/tests && node geradores.js
   ============================================================ */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const APP = process.env.APP || '/home/user/ALEPA_Estudos.html';
const html = fs.readFileSync(APP, 'utf8');
const vc = new VirtualConsole();
const erros = [];
vc.on('jsdomError', e => { if (!/scrollTo|Not implemented/.test(e.message)) erros.push(e.message); });

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://exemplo.vercel.app/' });
const w = dom.window;

setTimeout(() => {
  console.log('Banco de questões:');
  const banco = w.__BANCO__ || [];
  const porMateria = {};
  banco.forEach(q => { porMateria[q.materia] = (porMateria[q.materia] || 0) + 1; });
  console.log('  total: ' + banco.length + ' questões em ' + Object.keys(porMateria).length + ' matérias' + (banco.length >= 1500 ? '  (meta ≥1500 ✔)' : '  (ABAIXO de 1500 ✗)'));
  console.log('  ' + Object.entries(porMateria).map(([m, n]) => m + ' ' + n).join(' | '));

  console.log('\nGeradores infinitos:');
  const G = w.eval('typeof GERADORES !== "undefined" ? GERADORES : []');
  let totalGeradas = 0, problemas = [];
  G.forEach(g => {
    for (let i = 0; i < 25; i++) {
      try {
        const qs = g.gerar();
        (Array.isArray(qs) ? qs : [qs]).forEach(q => {
          totalGeradas++;
          if (!q.enunciado) problemas.push(g.tipo + ': sem enunciado');
          if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) problemas.push(g.tipo + ': alternativas != 5');
          if (typeof q.correta !== 'number' || q.correta < 0 || q.correta > 4) problemas.push(g.tipo + ': correta inválida');
          if (!q.comentario) problemas.push(g.tipo + ': sem comentário');
          if (new Set(q.alternativas).size !== 5) problemas.push(g.tipo + ': alternativas repetidas');
        });
      } catch (e) { problemas.push(g.tipo + ': ' + e.message); }
    }
  });
  console.log('  ' + G.length + ' tipos de gerador × 25 = ' + totalGeradas + ' questões geradas');
  console.log('  problemas encontrados: ' + (problemas.length ? problemas.slice(0, 5).join(' | ') : 'nenhum 🎉'));

  console.log('\nFiltros e métricas:');
  const todas = w.selecionarQuestoes({ materia: 'todas', topico: 'todos', dif: 'todas', modo: 'todas', n: 9999 });
  const da = w.selecionarQuestoes({ materia: 'DA', topico: 'todos', dif: 'todas', modo: 'todas', n: 9999 });
  const rev = w.selecionarQuestoes({ materia: 'todas', topico: 'todos', dif: 'todas', modo: 'revisao', n: 9999 });
  console.log('  todas=' + todas.length + ' | Direito Administrativo=' + da.length + ' | fila de revisão inicial=' + rev.length);
  const m = w.metricas();
  console.log('  métricas: meta total ' + m.metaTotal + ' | meta diária ' + m.metaDia + ' | dias até a prova ' + m.restam);

  const falhas = problemas.length + (banco.length < 1500 ? 1 : 0) + (G.length !== 13 ? 1 : 0) + (erros.length ? 1 : 0);
  console.log('\n' + (falhas === 0 ? '🎉 Geradores, banco e filtros OK.' : '❌ ' + falhas + ' problema(s).'));
  process.exit(falhas === 0 ? 0 : 1);
}, 1500);
