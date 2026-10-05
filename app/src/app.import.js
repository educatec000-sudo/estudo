/* ==========================================================================
   ARENA ESTUDOS — parte 4: IMPORTADOR DE PROVAS ANTIGAS
   Cola o texto das questões de PDFs da banca (QConcursos, Tec, ProvasBrasil,
   site da Fundação CETAP…) e o app transforma em questões do seu banco.
   ========================================================================== */
'use strict';

/* --------------------------- 1. PARSER DO TEXTO -------------------------- */
const IMP_RE_QUESTAO = /^\s*(?:quest[ãa]o|q\.?)\s*(\d{1,3})\s*([).\-–—:]|\s|$)/i;
const IMP_RE_NUMERO = /^\s*(\d{1,3})\s*[).\-–—]\s+/;
const IMP_RE_LINHA_ALT = /^\s*\(?\s*([A-Ea-e])\s*[).\-–—:]\s*(.*)$/;
const IMP_RE_GABARITO = /(gabarito|resposta|correta|alternativa\s+correta)\s*[:\-–—]?\s*\(?\s*([A-Ea-e])\s*\)?/i;

function impLimpar(t) {
  return String(t || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u00ad/g, '')
    .replace(/\r/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[ \t]+/g, ' ')
    .split('\n').map(l => l.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* separa o texto em blocos de questão */
function impBlocos(txt) {
  const linhas = txt.split('\n');
  const inicios = [];
  linhas.forEach((l, i) => { if (IMP_RE_QUESTAO.test(l) || (IMP_RE_NUMERO.test(l) && !IMP_RE_LINHA_ALT.test(l))) inicios.push(i); });
  if (inicios.length) {
    const blocos = [];
    inicios.forEach((ini, k) => {
      const fim = (k + 1 < inicios.length) ? inicios[k + 1] : linhas.length;
      const bloco = linhas.slice(ini, fim).join('\n').trim();
      if (bloco) blocos.push(bloco);
    });
    return blocos;
  }
  /* sem numeração: agrupa pelo padrão "linha terminando em ?" seguida de alternativas */
  const blocos = [];
  let atual = [];
  linhas.forEach(l => {
    if (!l) { return; }
    if (IMP_RE_LINHA_ALT.test(l) && /^\s*\(?\s*[Aa]\s*[).\-–—:]/.test(l)) {
      if (atual.length) blocos.push(atual.join('\n').trim());
      atual = [l];
      return;
    }
    atual.push(l);
  });
  if (atual.length) blocos.push(atual.join('\n').trim());
  return blocos;
}

/* converte um bloco em { enunciado, alternativas, correta } */
function impBloco(bloco) {
  let texto = impLimpar(bloco);
  let letraGabarito = null;
  const mGab = texto.match(IMP_RE_GABARITO);
  if (mGab) {
    letraGabarito = mGab[2].toUpperCase();
    texto = texto.replace(mGab[0], ' ');
  }
  texto = texto.replace(IMP_RE_QUESTAO, ' ').replace(IMP_RE_NUMERO, ' ');
  const linhas = texto.split('\n');
  const alts = [];
  let enunciadoLinhas = [];
  linhas.forEach(l => {
    if (!l) return;
    const m = l.match(IMP_RE_LINHA_ALT);
    const ehAlternativa = m && (alts.length || /[?:]\s*$/.test(enunciadoLinhas.join(' ')) || enunciadoLinhas.length > 0);
    if (ehAlternativa) { alts.push({ letra: m[1].toUpperCase(), texto: m[2].trim() }); }
    else if (alts.length) { alts[alts.length - 1].texto += ' ' + l; }
    else { enunciadoLinhas.push(l); }
  });
  /* alternativas escritas na mesma linha: "A) x B) y C) z" */
  if (alts.length < 2) {
    const plano = enunciadoLinhas.join(' ').replace(/\s+/g, ' ');
    const partes = plano.split(/\s*\(?([A-E])\s*[).\-–—]\s+/);
    if (partes.length >= 5) {
      enunciadoLinhas = [partes[0].trim()];
      for (let i = 1; i + 1 < partes.length; i += 2) alts.push({ letra: partes[i].toUpperCase(), texto: partes[i + 1].trim() });
    }
  }
  const alternativas = alts.map(a => a.texto.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let correta = null;
  if (letraGabarito) {
    const k = alts.findIndex(a => a.letra === letraGabarito);
    if (k >= 0 && k < alternativas.length) correta = k;
  }
  const enunciado = enunciadoLinhas.join(' ').replace(/\s+/g, ' ').trim();
  return { enunciado, alternativas, correta, letraGabarito };
}

/* função pública usada pelo app e pelos testes */
function analisarQuestoes(texto) {
  const t = impLimpar(texto);
  if (!t) return [];
  return impBlocos(t).map(impBloco).filter(q => q.enunciado && q.enunciado.length >= 10 && q.alternativas.length >= 2);
}

/* --------------------------- 2. ESTADO / BANCO --------------------------- */
function chaveQuestao(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);
}
function idImportada(i) { return 'IMP-' + Date.now().toString(36) + '-' + i; }

function salvarImportadas(lista, materia, topico, banca, ano) {
  const existentes = new Set(bancoCompleto().map(q => chaveQuestao(q.enunciado)));
  let salvas = 0, repetidas = 0, invalidas = 0;
  lista.forEach((q, i) => {
    if (!q.selecionada && q.selecionada !== undefined) return;
    if (q.correta === null || q.correta === undefined || q.correta < 0 || q.correta >= q.alternativas.length) { invalidas++; return; }
    const k = chaveQuestao(q.enunciado);
    if (existentes.has(k)) { repetidas++; return; }
    existentes.add(k);
    S.importadas.push({
      id: idImportada(i), materia: materia, topico: topico || undefined, dif: 'media',
      banca: banca || 'Prova antiga CETAP', ano: ano || undefined, origem: 'importada',
      enunciado: q.enunciado, alternativas: q.alternativas, correta: q.correta,
      comentario: 'Questão importada por você de prova anterior da banca.' + (q.letraGabarito ? ' Gabarito original: ' + q.letraGabarito + '.' : ''),
      ref: banca || 'Prova antiga'
    });
    salvas++;
  });
  if (salvas) { reindexar(); salvar(); }
  return { salvas, repetidas, invalidas };
}

/* ------------------------------ 3. A TELA -------------------------------- */
const IMP_EXEMPLO = [
  'Questão 1',
  'De acordo com a Lei nº 8.429/1992, o ato de improbidade administrativa exige:',
  'A) culpa leve',
  'B) dolo específico',
  'C) mera irregularidade formal',
  'D) culpa grave',
  'E) responsabilidade objetiva',
  'Gabarito: B',
  '',
  'Questão 2',
  'Quanto à Lei nº 14.133/2021, a modalidade destinada à alienação de bens imóveis ou de bens móveis inservíveis é:',
  'A) diálogo competitivo',
  'B) concurso',
  'C) leilão',
  'D) pregão',
  'E) tomada de preços'
].join('\n');

function opcoesTopicos(mid) {
  const m = MATBYID[mid];
  if (!m) return '<option value="">(sem tópico específico)</option>';
  return '<option value="">(sem tópico específico)</option>' + m.topicos.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
}

function abrirImportador(materiaInicial) {
  const mid = materiaInicial && MATBYID[materiaInicial] ? materiaInicial : (FILTRO && FILTRO.materia !== 'todas' && MATBYID[FILTRO.materia] ? FILTRO.materia : MATERIAS[0].id);
  abrirModal(`
  <div class="row" style="justify-content:space-between;align-items:flex-start">
    <h3 style="margin:0">📥 Importar questões de provas antigas</h3>
    <button class="btn sm ghost" onclick="fecharModal()">✕</button>
  </div>
  <div class="muted small" style="margin-top:6px">
    Baixe o PDF da prova anterior da banca (QConcursos, Tec, ProvasBrasil, site da CETAP…), selecione as questões no leitor,
    copie (<b>Ctrl+C</b>) e cole aqui. O app separa enunciado, alternativas e gabarito sozinho — depois é só revisar e salvar.
  </div>
  <textarea id="imp-texto" rows="9" placeholder="Cole aqui o texto das questões (com as alternativas A, B, C… e, se tiver, o gabarito)" style="margin-top:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px"></textarea>
  <div class="row" style="margin-top:8px">
    <button class="btn sm" id="imp-exemplo">📋 Ver exemplo</button>
    <button class="btn sm pri" id="imp-analisar">🔍 Analisar texto colado</button>
    <span class="tiny muted" id="imp-dica"></span>
  </div>

  <div class="grid c2" style="margin-top:12px">
    <div>
      <label class="f">Matéria</label>
      <select id="imp-mat">${MATERIAS.map(m => `<option value="${m.id}"${m.id === mid ? ' selected' : ''}>${esc(m.nome)}</option>`).join('')}</select>
    </div>
    <div>
      <label class="f">Tópico do edital (opcional)</label>
      <select id="imp-top">${opcoesTopicos(mid)}</select>
    </div>
    <div>
      <label class="f">Prova / banca</label>
      <input type="text" id="imp-banca" value="CETAP — prova anterior" placeholder="Ex.: CETAP 2024 — SEOP-PA">
    </div>
    <div>
      <label class="f">Ano</label>
      <input id="imp-ano" type="number" min="1990" max="2030" value="2024">
    </div>
  </div>

  <div id="imp-lista" style="margin-top:14px"></div>

  <div class="row" style="margin-top:14px;justify-content:space-between">
    <div class="row">
      <button class="btn ok" id="imp-salvar" disabled>✔ Salvar no meu banco</button>
      <button class="btn sm" id="imp-exportar">⬇ Exportar minhas questões (.json)</button>
      <label class="btn sm" style="cursor:pointer">⬆ Importar arquivo .json<input type="file" id="imp-arquivo" accept=".json,application/json" style="display:none"></label>
    </div>
    <button class="btn sm ghost" id="imp-apagar" ${S.importadas.length ? '' : 'disabled'}>🗑 Excluir importadas (${S.importadas.length})</button>
  </div>
  <div class="tiny muted" style="margin-top:8px">
    Suas importadas ficam <b>somente neste aparelho</b>, entram no treino, no simulado, nas estatísticas por matéria/tópico e na revisão espaçada.
    Use “Exportar minhas questões” para levar o arquivo para outro aparelho. Fonte: banco com <b>${BANCO.length}</b> questões curadas + <b>${S.geradas.length}</b> da IA + <b>${S.importadas.length}</b> importadas.
  </div>`, 760);

  let ultimoLote = [];
  const lista = $('#imp-lista');

  const desenharLote = () => {
    if (!ultimoLote.length) { lista.innerHTML = ''; $('#imp-salvar').disabled = true; return; }
    lista.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <b>${ultimoLote.length} questão(ões) encontrada(s)</b>
        <span class="tiny muted">clique no círculo para marcar a alternativa correta (quando o gabarito não vier no texto)</span>
      </div>
      <div style="max-height:44vh;overflow:auto;margin-top:8px;display:grid;gap:10px">
      ${ultimoLote.map((q, i) => `
        <div class="card" style="padding:12px" data-imp="${i}">
          <div class="row" style="justify-content:space-between">
            <span class="badge ${q.correta === null ? 'warn' : 'ok'}">${q.correta === null ? 'defina o gabarito' : 'gabarito ' + LETRAS[q.correta]}</span>
            <button class="btn sm ghost" data-remover="${i}">remover</button>
          </div>
          <div style="margin-top:6px;font-size:14px">${esc(q.enunciado)}</div>
          <div style="margin-top:8px;display:grid;gap:4px">
            ${q.alternativas.map((a, k) => `
              <label class="row tiny" style="gap:8px;cursor:pointer">
                <input type="radio" name="imp-c-${i}" data-c="${i}-${k}" ${q.correta === k ? 'checked' : ''} style="width:auto">
                <span><b>${LETRAS[k] || '?'})</b> ${esc(a)}</span>
              </label>`).join('')}
          </div>
        </div>`).join('')}
      </div>`;
    $('#imp-salvar').disabled = false;
    $$('[data-c]', lista).forEach(r => r.onchange = () => {
      const [i, k] = r.dataset.c.split('-').map(Number);
      ultimoLote[i].correta = k;
      desenharLote();
    });
    $$('[data-remover]', lista).forEach(b => b.onclick = () => {
      ultimoLote.splice(Number(b.dataset.remover), 1);
      desenharLote();
    });
  };

  $('#imp-exemplo').onclick = () => { $('#imp-texto').value = IMP_EXEMPLO; $('#imp-dica').textContent = 'exemplo carregado — clique em “Analisar texto colado”'; };
  $('#imp-mat').onchange = e => { $('#imp-top').innerHTML = opcoesTopicos(e.target.value); };
  $('#imp-analisar').onclick = () => {
    const texto = $('#imp-texto').value;
    ultimoLote = analisarQuestoes(texto);
    if (!ultimoLote.length) {
      lista.innerHTML = '<div class="badge warn">Não consegui identificar questões nesse texto. Confira se as alternativas estão com A), B), C)… e tente de novo.</div>';
      $('#imp-salvar').disabled = true;
      return;
    }
    const semGab = ultimoLote.filter(q => q.correta === null).length;
    $('#imp-dica').textContent = ultimoLote.length + ' questão(ões) encontrada(s)' + (semGab ? ` · ${semGab} sem gabarito no texto (marque na mão)` : ' · gabaritos identificados');
    desenharLote();
  };
  $('#imp-salvar').onclick = () => {
    const r = salvarImportadas(ultimoLote, $('#imp-mat').value, $('#imp-top').value, $('#imp-banca').value.trim(), Number($('#imp-ano').value) || undefined);
    if (!r.salvas) {
      toast(r.repetidas ? 'Todas já estavam no banco (duplicadas).' : 'Falta marcar o gabarito das questões.', 4200);
      return;
    }
    fecharModal();
    toast(`✅ ${r.salvas} questão(ões) importada(s)` + (r.repetidas ? ` · ${r.repetidas} duplicada(s) ignorada(s)` : '') + (r.invalidas ? ` · ${r.invalidas} sem gabarito` : ''), 5000);
    if (typeof irPara === 'function') irPara('treinar'); else renderTreinar($('#app'));
  };
  $('#imp-exportar').onclick = () => {
    if (!S.importadas.length) { toast('Você ainda não importou questões.'); return; }
    const blob = new Blob([JSON.stringify(S.importadas, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'minhas-questoes-importadas.json';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Arquivo gerado com ' + S.importadas.length + ' questões.');
  };
  $('#imp-arquivo').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const itens = JSON.parse(fr.result);
        if (!Array.isArray(itens)) throw new Error('formato inesperado');
        const r = salvarImportadas(itens.map(q => ({ enunciado: q.enunciado, alternativas: q.alternativas, correta: q.correta, letraGabarito: null })),
          $('#imp-mat').value, $('#imp-top').value, $('#imp-banca').value.trim(), Number($('#imp-ano').value) || undefined);
        toast(`✅ ${r.salvas} importada(s)` + (r.repetidas ? ` · ${r.repetidas} duplicada(s)` : ''), 5000);
        if (r.salvas && typeof irPara === 'function') { fecharModal(); irPara('treinar'); }
      } catch (err) { toast('Não consegui ler o arquivo: ' + err.message, 5000); }
    };
    fr.readAsText(f);
  };
  $('#imp-apagar').onclick = () => {
    if (!S.importadas.length) return;
    if (!confirm('Excluir as ' + S.importadas.length + ' questões importadas? (as curadas e as da IA não são afetadas)')) return;
    S.importadas = [];
    reindexar(); salvar(); fecharModal();
    toast('Questões importadas excluídas.');
    if (typeof irPara === 'function') irPara('treinar');
  };
  desenharLote();
}
