/* ==========================================================================
   ARENA ESTUDOS — parte 2: geradores infinitos, IA (Hugging Face),
   teoria, progresso e plano até a prova.
   ========================================================================== */
'use strict';

/* --------------------- 10. GERADORES INFINITOS (RLM) --------------------- */
function fmtNum(n) { const v = Number(n); return v.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }); }
function montarAlt(corretaTxt, distratores) {
  const todos = [corretaTxt, ...distratores].filter((v, i, a) => v != null && a.indexOf(v) === i);
  let k = 0; while (todos.length < 5) { todos.push('Nenhuma das anteriores' + (k ? ' ' + k : '')); k++; }
  const cinco = shuffle(todos.slice(0, 5));
  return { alternativas: cinco, correta: cinco.indexOf(corretaTxt) };
}
function mkGen(topico, dif, enunciado, corretaTxt, distratores, comentario) {
  const { alternativas, correta } = montarAlt(corretaTxt, distratores);
  return { id: 'GEN-' + Math.random().toString(36).slice(2, 9), materia: 'GEN', topico, dif, banca: 'Gerador Arena', ano: new Date().getFullYear(), enunciado, alternativas, correta, comentario };
}
const GERADORES = [
  {
    nome: '％ Porcentagem',
    gerar() {
      const tipo = rnd(1, 4), p = pick([5, 10, 12, 15, 20, 25, 30, 40, 60]), v = rnd(4, 40) * 25;
      if (tipo === 1) {
        const r = v * p / 100;
        return mkGen('Porcentagem', 'facil', `Um cargo de Analista Legislativo tem salário de R$ ${fmtNum(v)}. Se a lei concede um reajuste de ${p}%, qual será o novo salário?`,
          `R$ ${fmtNum(v + r)}`, [`R$ ${fmtNum(r)}`, `R$ ${fmtNum(v - r)}`, `R$ ${fmtNum(v * (1 + 2 * p / 100))}`, `R$ ${fmtNum(v + p)}`],
          `Reajuste = ${p}% de ${fmtNum(v)} = ${fmtNum(r)}. Novo salário = ${fmtNum(v)} + ${fmtNum(r)} = ${fmtNum(v + r)}. (Atalho: multiplicar por ${fmtNum(1 + p / 100)}.)`);
      }
      if (tipo === 2) {
        const r = v * p / 100;
        return mkGen('Porcentagem', 'media', `Após um desconto de ${p}%, um equipamento passou a custar R$ ${fmtNum(v - r)}. Qual era o preço original?`,
          `R$ ${fmtNum(v)}`, [`R$ ${fmtNum(v + r)}`, `R$ ${fmtNum(v - r + p)}`, `R$ ${fmtNum((v - r) * (1 + p / 100))}`, `R$ ${fmtNum(v * 2)}`],
          `Preço final = ${fmtNum(100 - p)}% do original → ${fmtNum(v - r)} = ${fmtNum((100 - p) / 100)} · x → x = ${fmtNum(v - r)} ÷ ${fmtNum((100 - p) / 100)} = R$ ${fmtNum(v)}. Cuidado: somar ${p}% ao valor final é o erro clássico.`);
      }
      if (tipo === 3) {
        const a = pick([10, 20, 25, 30]), b = pick([10, 20, 25]), f = 1 + a / 100, g = 1 - b / 100;
        const fim = v * f * g;
        return mkGen('Porcentagem', 'dificil', `O valor de R$ ${fmtNum(v)} sofreu um aumento de ${a}% e, em seguida, um desconto de ${b}% sobre o novo valor. Qual o valor final?`,
          `R$ ${nf(fim, 2)}`, [`R$ ${nf(v * (1 + (a - b) / 100), 2)}`, `R$ ${nf(v, 2)}`, `R$ ${nf(v * g, 2)}`, `R$ ${nf(v * f, 2)}`],
          `Aumentos e descontos são sucessivos e multiplicativos: ${fmtNum(v)} × ${fmtNum(f)} × ${fmtNum(g)} = R$ ${nf(fim, 2)}. Somar/subtrair as taxas (${a}% − ${b}% = ${a - b}%) é o erro mais comum.`);
      }
      const parte = rnd(2, 9) * 10;
      return mkGen('Porcentagem', 'media', `Em uma sessão da Assembleia com ${v} deputados presentes, ${parte}% votaram a favor de um projeto. Quantos deputados votaram a favor?`,
        `${fmtNum(v * parte / 100)}`, [`${fmtNum(v * parte / 100 / 2)}`, `${fmtNum(v * (100 - parte) / 100)}`, `${fmtNum(parte)}`, `${fmtNum(v / parte)}`],
        `${parte}% de ${v} = ${parte}/100 × ${v} = ${fmtNum(v * parte / 100)} deputados.`);
    }
  },
  {
    nome: '⚖️ Razão e proporção',
    gerar() {
      const a = rnd(2, 5), b = rnd(2, 6), k = rnd(2, 12) * 10, total = (a + b) * k;
      if (Math.random() < .35) {
        return mkGen('Divisão proporcional', 'media', `Um prêmio de R$ ${fmtNum(total)} será dividido entre dois servidores em partes diretamente proporcionais a ${a} e ${b}. Quanto receberá o servidor com a maior parte?`,
          `R$ ${fmtNum(Math.max(a, b) * k)}`, [`R$ ${fmtNum(Math.min(a, b) * k)}`, `R$ ${fmtNum(total / 2)}`, `R$ ${fmtNum(total / (a + b))}`, `R$ ${fmtNum(Math.max(a, b) * k * 2)}`],
          `Soma das partes = ${a} + ${b} = ${a + b}. Cada unidade vale ${fmtNum(total)} ÷ ${a + b} = ${fmtNum(k)}. As partes são R$ ${fmtNum(a * k)} e R$ ${fmtNum(b * k)}.`);
      }
      const x = rnd(3, 9), y = rnd(2, 8), mult = rnd(3, 12);
      const base = x * mult, alvo = y * mult;
      return mkGen('Razão e proporção', 'facil', `Em um setor da Assembleia, a razão entre processos protocolados por analistas e por técnicos é de ${x} para ${y}. Se os analistas protocolaram ${base} processos, quantos processos foram protocolados pelos técnicos?`,
        `${alvo}`, [`${y}`, `${x * y}`, `${x}`, `${base + alvo}`],
        `A razão é ${x}/${y}. Como ${base} ÷ ${x} = ${mult}, cada 'parte' da razão vale ${mult}. Logo, técnicos = ${y} × ${mult} = ${alvo}. (Regra de três: ${x}/${y} = ${base}/x_c → x_c = ${base} × ${y} ÷ ${x} = ${alvo}.)`);
    }
  },
  {
    nome: '🔧 Regra de três',
    gerar() {
      if (Math.random() < .5) {
        const n1 = rnd(3, 10), d1 = rnd(2, 15), n2 = rnd(3, 12);
        const r = n1 * d1 / n2;
        if (!Number.isInteger(r)) return this.gerar();
        return mkGen('Regra de três simples', 'facil', `${n1} servidores analisam ${d1} processos em um dia. Mantendo o mesmo ritmo, quantos processos ${n2} servidores analisariam no mesmo dia?`,
          `${r} processos`, [`${d1 + n2} processos`, `${n2 * d1} processos`, `${r + n1} processos`, `${r - n1} processos`],
          `Grandezas diretamente proporcionais: ${n1}/${d1} = ${n2}/x → x = (${n2} × ${d1}) ÷ ${n1} = ${r} processos.`);
      }
      const pint = rnd(3, 8), dias1 = rnd(4, 12), pint2 = rnd(2, 10);
      const r = pint * dias1 / pint2;
      if (!Number.isInteger(r)) return this.gerar();
      return mkGen('Regra de três simples (inversa)', 'media', `${pint} técnicos concluem um trabalho em ${dias1} dias. Se fossem ${pint2} técnicos, em quantos dias (com o mesmo desempenho) o trabalho ficaria pronto?`,
        `${r} dias`, [`${dias1 + pint2} dias`, `${Math.round(dias1 * pint2 / pint)} dias`, `${dias1} dias`, `${r + 2} dias`],
        `Grandezas inversamente proporcionais (mais técnicos → menos dias): ${pint} × ${dias1} = ${pint2} × x → x = (${pint} × ${dias1}) ÷ ${pint2} = ${r} dias.`);
    }
  },
  {
    nome: '💰 Juros simples',
    gerar() {
      const C = rnd(1, 20) * 500, i = pick([1, 2, 2.5, 3, 4, 5]), t = rnd(3, 24);
      const J = C * i / 100 * t, M = C + J;
      const pergunta = Math.random() < .5 ? 'juros' : 'montante';
      return mkGen('Juros simples', 'media', `Um valor de R$ ${fmtNum(C)} foi aplicado a juros simples de ${fmtNum(i)}% ao mês durante ${t} meses. Qual foi o valor dos ${pergunta}?`,
        pergunta === 'juros' ? `R$ ${nf(J, 2)}` : `R$ ${nf(M, 2)}`,
        pergunta === 'juros' ? [`R$ ${nf(M, 2)}`, `R$ ${nf(C * i / 100, 2)}`, `R$ ${nf(C * i / 100 * t * 2, 2)}`, `R$ ${nf(C, 2)}`]
          : [`R$ ${nf(J, 2)}`, `R$ ${nf(C * Math.pow(1 + i / 100, t), 2)}`, `R$ ${nf(C + i * t, 2)}`, `R$ ${nf(C * i / 100 * t, 2)}`],
        `Juros simples: J = C · i · t = ${fmtNum(C)} × ${nf(i / 100, 4)} × ${t} = R$ ${nf(J, 2)}. Montante M = C + J = R$ ${nf(M, 2)}.`);
    }
  },
  {
    nome: '📊 Média',
    gerar() {
      const n = 4, vals = Array.from({ length: n }, () => rnd(4, 19) * 0.5);
      const soma = vals.reduce((a, b) => a + b, 0);
      const falta = (Math.ceil(soma / (n + 1) * 2) / 2) * (n + 1) - soma;
      const alvo = (soma + falta) / (n + 1);
      return mkGen('Média', 'media', `Um candidato obteve as notas ${vals.map(v => nf(v, 1)).join(', ')} nas quatro primeiras matérias. Que nota ele precisa tirar na quinta matéria para que sua média final seja ${nf(alvo, 1)}?`,
        `${nf(falta, 1)}`, [`${nf(alvo, 1)}`, `${nf(soma / n, 1)}`, `${nf(falta + 1, 1)}`, `${nf(alvo * 2, 1)}`],
        `Média ${nf(alvo, 1)} com 5 matérias exige soma total = 5 × ${nf(alvo, 1)} = ${nf(alvo * 5, 1)}. Já obtido: ${nf(soma, 1)}. Falta = ${nf(alvo * 5, 1)} − ${nf(soma, 1)} = ${nf(falta, 1)}.`);
    }
  },
  {
    nome: '🔢 Sequências',
    gerar() {
      const t = rnd(1, 3);
      if (t === 1) { const a = rnd(2, 9), r = rnd(2, 9); const seq = [0, 1, 2, 3].map(i => a + i * r); return mkGen('Raciocínio sequencial', 'facil', `Observe a sequência: ${seq.join(', ')}, ... Qual é o próximo termo?`, `${a + 4 * r}`, [`${a + 3 * r + 1}`, `${a * r}`, `${a + 5 * r}`, `${(a + 4 * r) * r}`], `Progressão aritmética de razão ${r} (soma-se ${r} a cada termo). Próximo = ${seq[3]} + ${r} = ${a + 4 * r}.`); }
      if (t === 2) { const a = rnd(2, 4), q = rnd(2, 3); const seq = [0, 1, 2, 3].map(i => a * Math.pow(q, i)); return mkGen('Raciocínio sequencial', 'media', `Na sequência ${seq.join(', ')}, ... qual é o próximo termo?`, `${seq[3] * q}`, [`${seq[3] + q}`, `${seq[3] * 2}`, `${seq[3] + seq[2]}`, `${seq[3] * q * q}`], `Progressão geométrica de razão ${q} (multiplica-se por ${q}). Próximo = ${seq[3]} × ${q} = ${seq[3] * q}.`); }
      const a = rnd(1, 4), b = rnd(5, 9); const seq = [a, b, a + b, a + 2 * b, 2 * a + 3 * b];
      return mkGen('Raciocínio sequencial', 'dificil', `Considere a sequência de Fibonacci modificada: ${seq.slice(0, 4).join(', ')}, ... (cada termo é a soma dos dois anteriores). Qual é o 5º termo?`,
        `${seq[4]}`, [`${seq[3] + seq[1]}`, `${seq[3] * 2}`, `${seq[4] + 1}`, `${seq[3] + seq[0]}`], `Cada termo = soma dos dois anteriores: ${seq[2]} + ${seq[3]} = ${seq[4]}.`);
    }
  },
  {
    nome: '🎯 Conjuntos',
    gerar() {
      const a = rnd(15, 30), b = rnd(15, 30), i = rnd(4, 12);
      const u = a + b - i, fora = rnd(0, 6);
      return mkGen('Conjuntos', 'media', `Em uma pesquisa, ${a} servidores falam inglês, ${b} falam espanhol e ${i} falam as duas línguas. Se foram entrevistados ${u + fora} servidores e todos responderam, quantos NÃO falam nenhuma das duas línguas?`,
        `${fora}`, [`${fora + i}`, `${i}`, `${a + b - u}`, `${u}`], `n(A∪B) = n(A) + n(B) − n(A∩B) = ${a} + ${b} − ${i} = ${u}. Não falam nenhuma = total − união = ${u + fora} − ${u} = ${fora}.`);
    }
  },
  {
    nome: '🧠 Lógica proposicional',
    gerar() {
      const nomes = shuffle(['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa']).slice(0, 2);
      const props = [['estuda', 'passa'], ['chove', 'a sessão é suspensa'], ['há quórum', 'a votação ocorre']];
      const [P, Q] = pick(props);
      if (Math.random() < .5) {
        return mkGen('Lógica proposicional', 'media', `A proposição "Se ${P}, então ${Q}" é logicamente equivalente a:`,
          `Se não ${Q}, então não ${P}`, [`Se ${Q}, então ${P}`, `Se não ${P}, então não ${Q}`, `${P} e não ${Q}`, `${P} ou ${Q}`],
          `A condicional P → Q equivale à sua contrapositiva ¬Q → ¬P ("Se não ${Q}, então não ${P}"). A recíproca (Q → P) e a inversa (¬P → ¬Q) NÃO são equivalentes.`);
      }
      return mkGen('Lógica proposicional', 'media', `A negação da proposição "Todos os projetos foram aprovados" é:`,
        `Algum projeto não foi aprovado`, [`Nenhum projeto foi aprovado`, `Todos os projetos não foram aprovados`, `Alguns projetos foram aprovados`, `Os projetos foram aprovados ou não`],
        `A negação de "todo A é B" é "existe A que não é B" (algum não). Negar quantidade universal gera existencial: "Algum projeto não foi aprovado".`);
    }
  },
  {
    nome: '🎲 Probabilidade',
    gerar() {
      const bolas = rnd(4, 10), verdes = rnd(2, bolas - 2), tot = bolas + verdes;
      return mkGen('Probabilidade', 'media', `Uma urna tem ${bolas} bolas azuis e ${verdes} bolas verdes. Retirando-se uma bola ao acaso, qual a probabilidade de ela ser verde?`,
        `${verdes}/${tot}`, [`${bolas}/${tot}`, `${verdes}/${bolas}`, `1/${tot}`, `${tot}/${verdes}`],
        `Casos favoráveis / casos possíveis = ${verdes}/${tot} ≈ ${nf(verdes / tot * 100, 1)}%.`);
    }
  },
  {
    nome: '🧩 Problemas com equações',
    gerar() {
      const x = rnd(12, 60), k = rnd(3, 9), soma = x + k;
      return mkGen('Equações do 1º grau', 'media', `A soma de dois números é ${(x * 2 + k)}. O maior excede o menor em ${k} unidades. Qual é o menor número?`,
        `${x}`, [`${x + k}`, `${x + 2 * k}`, `${Math.round((x * 2 + k) / 2)}`, `${x - k}`],
        `Chamando o menor de x, o maior é x + ${k}. Então x + (x + ${k}) = ${x * 2 + k} → 2x = ${2 * x} → x = ${x}.`);
    }
  },
  {
    nome: '🧮 MMC e MDC',
    gerar() {
      const a = pick([6, 8, 9, 10, 12, 15]), b = pick([4, 8, 12, 15, 18, 20]).valueOf();
      const mmc = (x, y) => { const m = (p, q) => q ? m(q, p % q) : p; return x * y / m(x, y); };
      const r = mmc(a, b);
      return mkGen('MMC', 'media', `Um analista revisa um tipo de processo a cada ${a} dias e outro a cada ${b} dias. Se hoje ele revisou os dois tipos, em quantos dias voltará a revisá-los no mesmo dia?`,
        `${r} dias`, [`${a * b} dias`, `${a + b} dias`, `${Math.round(r / 2)} dias`, `${Math.max(a, b)} dias`],
        `A coincidência ocorre no MMC(${a}, ${b}) = ${r} dias. O produto ${a} × ${b} só coincidiria se os números fossem primos entre si.`);
    }
  },
  {
    nome: '🪑 Análise combinatória',
    gerar() {
      const n = rnd(4, 6), p = rnd(2, 3);
      const fat = k => k <= 1 ? 1 : k * fat(k - 1);
      if (Math.random() < .5) {
        const r = fat(n) / fat(n - p);
        return mkGen('Análise combinatória', 'media', `De quantas maneiras distintas ${p} servidores podem ocupar ${p} funções diferentes (presidente, vice e secretário) em uma comissão de ${n} pessoas?`,
          `${r}`, [`${fat(n) / (fat(p) * fat(n - p))}`, `${n * p}`, `${fat(p)}`, `${fat(n)}`],
          `A ordem importa → arranjo: A(${n},${p}) = ${n}!/(${n}−${p})! = ${r}. Se fosse combinação, dividiríamos por ${p}! = ${fat(p)}.`);
      }
      const c = fat(n) / (fat(p) * fat(n - p));
      return mkGen('Análise combinatória', 'dificil', `Uma comissão de ${p} membros será formada a partir de ${n} deputados. De quantas maneiras diferentes isso pode ser feito?`,
        `${c}`, [`${fat(n) / fat(n - p)}`, `${n * p}`, `${c * fat(p)}`, `${fat(n)}`],
        `A ordem não importa → combinação: C(${n},${p}) = ${n}!/[${p}!·(${n}−${p})!] = ${c}.`);
    }
  },
  {
    nome: '🗣️ Raciocínio verbal (relações)',
    gerar() {
      const nomes = shuffle(['Ana', 'Bruno', 'Carla', 'Diego', 'Eduardo']).slice(0, 4);
      const ord = shuffle(nomes);
      const n1 = ord[0], n2 = ord[1], n3 = ord[2], n4 = ord[3];
      const q = `Ana, Bruno, Carla e Diego são servidores com ${[1, 2, 3, 4].length} tempos de casa diferentes. Sabe-se que: (I) ${n1} tem mais tempo de casa que ${n2}; (II) ${n2} tem mais tempo que ${n3}; (III) ${n3} tem mais tempo que ${n4}. Quem é o servidor com MENOS tempo de casa?`;
      const pos = ['mais tempo', 'segundo mais tempo', 'terceiro mais tempo', 'menos tempo'];
      const perguntaQuem = 4;
      return { id: 'GEN-' + Math.random().toString(36).slice(2, 9), materia: 'GEN', topico: 'Raciocínio verbal', dif: 'media', banca: 'Gerador Arena', ano: new Date().getFullYear(), enunciado: q, ...montarAlt(n4, [n1, n2, n3, 'Não é possível determinar']), comentario: `Montando a ordem a partir das pistas: ${n1} > ${n2} > ${n3} > ${n4}. Logo, ${n4} é quem tem menos tempo de casa. Dica: escreva a "fila" em vez de tentar memorizar.` };
    }
  }
];

/* --------------- 11. IA: telas de tutoria e geração de questões ----------
   (a lógica dos provedores de IA está em app.ias.js: Hugging Face, Gemini,
    Groq, OpenAI, Claude, OpenRouter, Mistral, DeepSeek, Grok e IA local)      */
const IAPERSONA = `Você é um professor de cursinho especialista em concursos públicos brasileiros, focado na banca Fundação CETAP e no concurso da Assembleia Legislativa do Estado do Pará (ALEPA 002/2026), cargo de Analista Legislativo – Assistência Legislativa (cargo 15).
Regras: responda em português do Brasil, direto e didático, com base na legislação vigente (CF/88, Constituição do Pará, Leis 14.133/2021, 8.429/1992, LC 101/2000, LC 95/1998, LGPD, Lei 5.810/1994, Regimento Interno da ALEPA). Cite o dispositivo quando souber; se não tiver certeza de um artigo específico, explique o instituto sem inventar número de artigo. Use tópicos curtos e, quando ajudar, um exemplo prático de prova.
Formatação (importante): responda em markdown simples e legível. Prefira títulos curtos (### Título), listas com marcadores e **negrito** para os pontos-chave. Não use tabelas com mais de 3 colunas nem blocos enormes: o texto vira tela de estudo. Evite cercas de código, emojis em excesso e linhas de separação (---) seguidas.`;

/* Resumo do Anexo II (cargo 15) usado como contexto nas conversas com as IAs. */
function editalResumo() {
  try {
    const linhas = (MATERIAS || []).map(m => {
      const tops = (m.topicos || []);
      return '\u2022 ' + m.nome + ': ' + tops.slice(0, 12).join('; ') + (tops.length > 12 ? ' \u2026' : '');
    });
    const cab = 'Concurso ' + EDITAL.orgao + ' \u2014 banca ' + EDITAL.banca + ', cargo 15 (Analista Legislativo \u2013 Assist\u00eancia Legislativa). Prova em 13/12/2026.';
    return cab + '\nMat\u00e9rias e t\u00f3picos do Anexo II:\n' + linhas.join('\n');
  } catch (e) {
    return 'Concurso ALEPA 002/2026 (Funda\u00e7\u00e3o CETAP), cargo 15 \u2014 Analista Legislativo/Assist\u00eancia Legislativa. Prova em 13/12/2026.';
  }
}

function renderIA(root) {
  const srv = IA_STATUS.servidor;
  const msgs = S.ia.msgs;
  root.innerHTML = `
  <div class="card">
    <h2>🤖 Tutor de IA + gerador de questões</h2>
    <div class="muted small">Estude as <b>35+ páginas</b> do Anexo II conversando: peça explicações, resumos, mnemônicos, comparações e questões inéditas sobre qualquer tópico do edital. Funciona com as <b>três IAs gratuitas</b> — Hugging Face, Google Gemini e Groq (e ainda aceita outras, se você quiser).</div>
    <div class="row" style="margin-top:10px">
      <button class="btn gold" onclick="abrirConfigIA()">🔑 ${temChaveIA() ? 'Minhas IAs / trocar a chave' : 'Ligar uma IA grátis'}</button>
      <span class="badge ${srv ? 'ok' : 'warn'}" id="ia-status">${srv === null ? 'verificando conexão…' : srv ? '✅ servidor local ativo (chaves protegidas)' : (temChaveIA() ? '⚠️ modo navegador (usa sua chave direto)' : '⚠️ nenhuma IA ligada ainda')}</span>
      <span class="badge">${esc(rotuloIA())}</span>
    </div>
    <div class="row" style="margin-top:8px">
      <span class="muted tiny">Ligadas: ${esc(resumoIA())}</span>
      <button class="btn sm ghost" id="ia-limpar">🧹 Limpar conversa</button>
    </div>
  </div>

  <div class="card">
    <div class="row" style="margin-bottom:8px">
      <b>⚡ Gerar questões inéditas sobre um tópico</b>
      <span class="muted small">a IA escreve a questão, as alternativas e o comentário fundamentado</span>
    </div>
    <div class="grid c3">
      <div><label class="f">Matéria</label><select id="g-mat">${MATERIAS.map(m => `<option value="${m.id}">${esc(m.nome)}</option>`).join('')}</select></div>
      <div><label class="f">Tópico</label><select id="g-top"></select></div>
      <div><label class="f">Quantidade</label><select id="g-n"><option>3</option><option selected>5</option><option>10</option></select></div>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="btn pri" id="g-go">🧠 Gerar questões agora</button>
      <button class="btn" id="g-treinar" ${S.geradas.length ? '' : 'disabled'}>▶ Treinar as ${S.geradas.length} questões geradas</button>
      <button class="btn" id="g-limpar" ${S.geradas.length ? '' : 'disabled'}>🗑️ Apagar geradas</button>
    </div>
    ${iasParalelo().length > 1 ? `<label class="row tiny" style="margin-top:8px;gap:6px;cursor:pointer"><input type="checkbox" id="g-paralelo" style="width:auto" ${S.ia.gerarParalelo ? 'checked' : ''}> ⚡ <b>usar todas as ${iasParalelo().length} IAs ligadas ao mesmo tempo</b> — cada uma gera o mesmo lote (sai muito mais questão de uma vez, e as repetidas são descartadas automaticamente)</label>` : ''}
    <div id="g-out" class="small muted" style="margin-top:8px"></div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">💬 Conversar com o tutor <span class="muted tiny">(${esc(rotuloIA())})</span></h3>
    <div class="chat" id="chat">
      ${msgs.length ? '' : '<div class="msg sys">Ex.: "Explique o processo legislativo estadual do início ao fim", "Faça um resumo de licitações da Lei 14.133/2021 com pegadinhas da CETAP", "Não entendi a diferença entre decreto legislativo e resolução".</div>'}
    </div>
    <div class="row" style="margin:10px 0 4px">
      ${['Resumo geral do edital', 'Pegadinhas da CETAP em Português', 'Como estudar Processo Legislativo em 30 dias', 'Diferenças: decreto legislativo x resolução x lei'].map(s => `<button class="btn sm" data-qs="${esc(s)}">${esc(s)}</button>`).join('')}
    </div>
    ${iasParalelo().length > 1 ? `<label class="row tiny" style="margin:0 0 6px;gap:6px;cursor:pointer"><input type="checkbox" id="ia-comparar" style="width:auto" ${S.ia.comparar ? 'checked' : ''}> ⚖️ <b>perguntar para as ${iasParalelo().length} IAs ao mesmo tempo</b> (${iasParalelo().map(id => PROVEDORES[id].emoji).join(' ')}) — compare as explicações e escolha a melhor</label>` : `<div class="tiny muted" style="margin:0 0 6px">💡 Ligue uma segunda IA no botão 🔑 para poder <b>perguntar para várias ao mesmo tempo</b> e comparar as respostas.</div>`}
    <div class="chatbar">
      <textarea id="ia-in" placeholder="Pergunte qualquer coisa do edital… (Enter envia)"></textarea>
      <button class="btn pri" id="ia-send">Enviar</button>
    </div>
  </div>`;

  const gm = $('#g-mat'), gt = $('#g-top');
  const povoarTop = () => { const m = MATBYID[gm.value]; gt.innerHTML = m.topicos.map(t => `<option>${esc(t)}</option>`).join('') + '<option>Aleatório dentro da matéria</option>'; };
  gm.onchange = povoarTop; povoarTop();
  $('#ia-limpar').onclick = () => { S.ia.msgs = []; salvar(); renderIA($('#app')); };
  $('#g-go').onclick = gerarQuestoesIA;
  const gpara = $('#g-paralelo');
  if (gpara) gpara.onchange = e => { S.ia.gerarParalelo = e.target.checked; try { salvar(); } catch (err) { } };
  const comp = $('#ia-comparar');
  if (comp) comp.onchange = e => { S.ia.comparar = e.target.checked; try { salvar(); } catch (err) { } };
  $('#g-treinar').onclick = () => { if (!S.geradas.length) return; abrirSessao(S.geradas.map(g => g), 0, 'Questões geradas pela IA'); };
  $('#g-limpar').onclick = () => { if (confirm('Apagar todas as questões geradas pela IA?')) { S.geradas = []; salvar(); reindexar(); renderIA($('#app')); } };
  $$('[data-qs]').forEach(b => b.onclick = () => { $('#ia-in').value = b.dataset.qs; enviarChat(); });
  const inp = $('#ia-in');
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarChat(); } };
  $('#ia-send').onclick = enviarChat;
  desenharChat();
}
function desenharChat() {
  const box = $('#chat'); if (!box) return;
  box.innerHTML = S.ia.msgs.length ? S.ia.msgs.map(m => {
    if (m.role === 'user') return `<div class="msg user">${fmtNl(m.content)}</div>`;
    const p = m.de && PROVEDORES[m.de];
    const rotulo = p ? `${p.emoji} <b>${esc(p.nome)}</b>${m.ms ? ' · ' + (m.ms / 1000).toFixed(1) + 's' : ''}` : '🤖 Tutor';
    const botao = (p && iasParalelo().length > 1 && S.ia.comparar) ? ` <button class="btn sm ghost" data-seguir="${m.de}">seguir só com esta</button>` : '';
    return `<div class="msg bot"><div class="tiny muted" style="margin-bottom:5px">${rotulo}${botao}</div>${fmtTxt(m.content)}</div>`;
  }).join('') : '<div class="msg sys">Comece a conversa! 👇</div>';
  box.onclick = e => {
    const b = e.target.closest('[data-seguir]'); if (!b) return;
    S.config.iaPrincipal = b.dataset.seguir; S.ia.comparar = false;
    try { salvar(); } catch (err) { }
    toast('Agora as respostas vêm só da ' + PROVEDORES[b.dataset.seguir].nome + ' 🎯');
    atualizarAvisoIA(); renderIA($('#app'));
  };
  box.scrollTop = box.scrollHeight;
}
async function enviarChat() {
  const inp = $('#ia-in'); const txt = inp.value.trim(); if (!txt) return;
  inp.value = '';
  S.ia.msgs.push({ role: 'user', content: txt }); salvar(); desenharChat();
  const box = $('#chat');
  const varias = S.ia.comparar && iasParalelo().length > 1;
  const quem = varias ? iasParalelo() : [provAtualId()];
  box.insertAdjacentHTML('beforeend', `<div class="msg bot" id="ia-wait"><span class="spin"></span> ${varias ? 'perguntando para ' + quem.length + ' IAs ao mesmo tempo (' + quem.map(id => PROVEDORES[id].emoji).join(' ') + ')…' : 'pensando…'}</div>`);
  box.scrollTop = box.scrollHeight;
  const hist = S.ia.msgs.slice(-9, -1).map(m => ({ role: m.role, content: m.content, de: m.de }));
  const conversa = [{ role: 'system', content: IAPERSONA + '\n\nContexto do concurso:\n' + editalResumo() }, ...hist, { role: 'user', content: txt }];
  try {
    const w = $('#ia-wait'); if (w) w.remove();
    if (varias) {
      const respostas = await chamarVariasIA(conversa, { max_tokens: 1400 }, quem);
      respostas.forEach(r => {
        S.ia.msgs.push(r.ok
          ? { role: 'assistant', content: r.resposta, de: r.id, ms: r.ms }
          : { role: 'assistant', content: '⚠️ Não respondeu: ' + r.erro, de: r.id });
      });
      S.ia.msgs.push({ role: 'assistant', content: '⚖️ ' + respostas.filter(r => r.ok).length + ' de ' + respostas.length + ' IAs responderam. Compare as explicações e clique em “seguir só com esta” na que você preferir.', de: null });
    } else {
      const out = await chamarIA(conversa, { max_tokens: 1400 });
      S.ia.msgs.push({ role: 'assistant', content: out, de: quem[0] });
    }
    salvar(); desenharChat();
  } catch (e) {
    const w = $('#ia-wait'); if (w) w.remove();
    box.insertAdjacentHTML('beforeend', `<div class="msg sys">⚠️ ${fmtNl(e.message)}</div>`);
  }
}
async function gerarQuestoesIA() {
  const mid = $('#g-mat').value, top = $('#g-top').value, n = +$('#g-n').value;
  const mat = MATBYID[mid];
  const varias = $('#g-paralelo') && $('#g-paralelo').checked && iasParalelo().length > 1;
  const ides = varias ? iasParalelo() : [provAtualId()];
  const out = $('#g-out');
  out.innerHTML = varias
    ? `<span class="spin"></span> gerando ${n} questões com CADA uma das ${ides.length} IAs ligadas (${ides.map(id => PROVEDORES[id].emoji).join(' ')}) — até ${n * ides.length} de uma vez…`
    : `<span class="spin"></span> gerando ${n} questões sobre "${esc(top)}"… (pode levar até 1 minuto)`;
  const prompt = `Gere ${n} questões de múltipla escolha INÉDITAS, no estilo da banca Fundação CETAP (5 alternativas A–E, apenas uma correta), sobre o tópico "${top}" da matéria ${mat.nome}, no nível de concurso para Analista Legislativo da ALEPA.
Responda SOMENTE com um JSON válido (sem texto antes ou depois, sem markdown), no formato:
[{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"comentario":"explicação fundamentada com base legal e o motivo de cada distrator estar errado","dif":"facil|media|dificil","topico":"${top}"}]
Regras: use `+ '`'+`...`+'`'+ ` para destacar termos; "correta" é o índice (0 a 4) da alternativa certa; comentários devem citar a base normativa quando houver (ex.: CF art. 59; Lei 14.133/2021 art. 28; LC 95/1998 art. 3º); não repita a mesma pergunta; evite afirmativas ambíguas.`;
  try {
    /* pede o MESMO lote para cada IA em paralelo e junta tudo, sem repetir questões */
    let arr = [], falhas = [];
    if (varias) {
      const respostas = await chamarVariasIA([{ role: 'system', content: IAPERSONA }, { role: 'user', content: prompt }], { max_tokens: 3000, temperature: 0.8 }, ides);
      respostas.forEach(r => {
        if (!r.ok) { falhas.push(r.emoji + ' ' + r.nome); return; }
        const lista = parseJSONArr(r.resposta) || [];
        lista.forEach(q => { if (q) arr.push(Object.assign({}, q, { __ia: r.nome })); });
      });
    } else {
      const txt = await chamarIA([{ role: 'system', content: IAPERSONA }, { role: 'user', content: prompt }], { max_tokens: 3000, temperature: 0.8 });
      arr = parseJSONArr(txt) || [];
    }
    /* remove questões repetidas (entre IAs diferentes ou dentro do mesmo lote) */
    const vistos = {};
    arr = arr.filter(q => {
      if (!q || !q.enunciado) return false;
      const chave = normalizarParaComparar(q.enunciado).slice(0, 90);
      if (vistos[chave]) return false;
      vistos[chave] = true; return true;
    });
    if (!arr.length) throw new Error('a IA não devolveu JSON válido — tente de novo');
    let ok = 0;
    arr.forEach(q => {
      if (!q || !q.enunciado || !Array.isArray(q.alternativas) || q.alternativas.length < 3) return;
      const idx = Number(q.correta);
      if (!(idx >= 0 && idx < q.alternativas.length)) return;
      S.geradas.push({
        id: 'IA-' + Date.now().toString(36) + '-' + (ok + 1), materia: mid, topico: q.topico || top, dif: q.dif || 'media',
        banca: 'IA' + (q.__ia ? ' (' + q.__ia + ')' : '') + ' · Fundação CETAP', ano: new Date().getFullYear(),
        enunciado: q.enunciado, alternativas: q.alternativas.slice(0, 5), correta: idx, comentario: q.comentario || '', analise: '', ia: true
      }); ok++;
    });
    salvar(); reindexar();
    out.innerHTML = ok
      ? `✅ ${ok} questões adicionadas ao seu banco${varias ? ` (geradas por ${ides.length - falhas.length} IA(s))` : ''}! Já valem no treino, no simulado e nas estatísticas.${falhas.length ? ' Não responderam: ' + esc(falhas.join(', ')) + '.' : ''}`
      : '⚠️ Nenhuma questão válida retornada. Tente novamente.';
    if (ok) { toast(`${ok} questões novas 🤖`); setTimeout(() => iniciarSessaoGeradasIA(ok), 400); }
  } catch (e) { out.innerHTML = `⚠️ ${esc(e.message)}`; }
}
function iniciarSessaoGeradasIA() {
  const ult = S.geradas.slice(-20);
  abrirSessao(ult, 0, 'Questões geradas pela IA 🤖');
}
/* texto normalizado, para comparar questões e achar repetidas (ignora acentos/pontuação) */
function normalizarParaComparar(t) {
  return String(t || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function parseJSONArr(txt) {
  if (!txt) return null;
  let t = String(txt).trim();
  t = t.replace(/```json/gi, '```').split('```').filter((s, i) => i % 2 === 1).join('\n') || t;
  const i = t.indexOf('['), j = t.lastIndexOf(']');
  if (i < 0 || j < 0) return null;
  let raw = t.slice(i, j + 1);
  const tenta = s => { try { return JSON.parse(s); } catch (e) { return null; } };
  return tenta(raw) || tenta(raw.replace(/,\s*([\]}])/g, '$1').replace(/[\u201c\u201d]/g, '"')) || null;
}
async function explicarComIA(q, marcou) {
  toast('Pedindo explicação à IA…');
  const prompt = `Questão de concurso (${MATBYID[q.materia] ? MATBYID[q.materia].nome : q.materia} — ${q.topico}):
"${q.enunciado}"
Alternativas:
${q.alternativas.map((a, i) => `${LETRAS[i]}) ${a}`).join('\n')}
Gabarito: ${LETRAS[q.correta]}. O candidato marcou: ${LETRAS[marcou]}.
Explique passo a passo por que a alternativa correta é a certa, por que a que ele marcou está errada e o que ele deve memorizar para não errar de novo. Cite a base legal se aplicável e dê uma dica de memorização.`;
  try {
    const out = await chamarIA([{ role: 'system', content: IAPERSONA }, { role: 'user', content: prompt }], { max_tokens: 1200 });
    const box = $('#fb'); if (box) box.insertAdjacentHTML('afterbegin', `<div class="fb" style="border-color:#1e3a8a"><div class="tt">🤖 Explicação da IA</div><div class="com">${fmtTxt(out)}</div></div>`);
    else { S.ia.msgs.push({ role: 'user', content: prompt }, { role: 'assistant', content: out }); salvar(); toast('Resposta salva na aba IA 💬'); }
  } catch (e) { toast('Erro: ' + e.message, 4000); }
}

/* ------------------------------ 12. TEORIA ------------------------------- */
function renderTeoria(root) {
  const tem = Object.keys(TEORIA).length > 0;
  root.innerHTML = `
  <div class="card">
    <h2>📚 Teoria essencial (resumos de bolso)</h2>
    <div class="muted small">Resumos diretos ao ponto para revisar antes de treinar. Marque o que já dominou — isso alimenta seu painel de progresso.</div>
  </div>
  ${MATERIAS.map(m => {
    const t = TEORIA[m.id];
    const marcados = m.topicos.filter(x => S.teoria[m.id + '|' + x]).length;
    return `<div class="card">
      <div class="row" style="justify-content:space-between">
        <h3 style="margin:0">${esc(m.nome)}</h3>
        <span class="badge ${marcados === m.topicos.length ? 'ok' : ''}">${marcados}/${m.topicos.length} tópicos marcados</span>
      </div>
      ${t ? Object.entries(t).map(([titulo, conteudo]) => `
        <details><summary>${esc(titulo)}</summary><div class="small" style="white-space:pre-wrap;color:#dfe6ff">${esc(conteudo)}</div></details>`).join('')
        : '<div class="muted small" style="margin-top:8px">Sem resumo pronto nesta versão — use o tutor de IA para gerar um resumo completo desta matéria.</div>'}
      <details><summary>📋 Tópicos cobrados no edital (${m.topicos.length})</summary>
        ${m.topicos.map(x => `<label class="row" style="margin:4px 0;cursor:pointer"><input type="checkbox" data-t="${esc(m.id + '|' + x)}" ${S.teoria[m.id + '|' + x] ? 'checked' : ''} style="width:auto;margin-right:8px"><span class="small">${esc(x)}</span></label>`).join('')}
      </details>
      <div class="row" style="margin-top:9px">
        <button class="btn sm pri" onclick="treinarTopico('${m.id}')">✍️ Treinar ${esc(m.nome)}</button>
        <button class="btn sm" onclick="pedirResumoIA('${m.id}')">🤖 Pedir resumo completo à IA</button>
      </div>
    </div>`;
  }).join('')}`;
  $$('[data-t]').forEach(c => c.onchange = () => { const k = c.dataset.t; if (c.checked) S.teoria[k] = 1; else delete S.teoria[k]; salvar(); });
}
function treinarTopico(mid) { FILTRO = { materia: mid, topico: 'todos', dif: 'todas', modo: 'todas', n: 20 }; irPara('treinar'); }
function pedirResumoIA(mid) {
  const m = MATBYID[mid];
  S.ia.msgs.push({ role: 'user', content: `Faça um resumo de estudo completo e organizado de "${m.nome}" para a prova da ALEPA (CETAP), cobrindo estes tópicos: ${m.topicos.join('; ')}. Use tópicos curtos, números de artigos e um "pegadinhas da banca" no final.` });
  salvar(); irPara('ia'); setTimeout(enviarChat, 250);
}

/* ---------------------------- 13. PROGRESSO ------------------------------ */
function renderProgresso(root) {
  const m = metricas();
  const ranking = MATERIAS.map(x => ({ x, s: statsMateria(x.id) })).filter(r => r.s.t > 0).sort((a, b) => a.s.pct - b.s.pct);
  const pontosFracos = ranking.slice(0, 4);
  const provas = S.provas.slice(-12);
  const maxNota = Math.max(10, ...provas.map(p => p.nota));
  // tópicos mais errados
  const porTopico = {};
  /* conta respostas (1 por questão vista), não o instante em que foram respondidas */
  Object.entries(S.resp).forEach(([qid, r]) => { const q = QIDX[qid]; if (!q) return; const k = (MATBYID[q.materia] ? MATBYID[q.materia].nome : '') + ' · ' + (q.topico || '—'); porTopico[k] = porTopico[k] || { t: 0, ok: 0 }; porTopico[k].t++; porTopico[k].ok += r.ok ? 1 : 0; });
  const piores = Object.entries(porTopico).filter(([, v]) => v.t >= 2).map(([k, v]) => ({ k, pct: v.ok / v.t * 100, t: v.t })).sort((a, b) => a.pct - b.pct).slice(0, 10);
  const conquistas = [
    ['🥇', 'Primeira questão', m.tot >= 1], ['💯', '100 questões', m.tot >= 100], ['🚀', '500 questões', m.tot >= 500],
    ['🏆', '1000 questões', m.tot >= 1000], ['🔥', '7 dias seguidos', m.streak >= 7], ['⚡', '3000 questões', m.tot >= 3000],
    ['📝', 'Primeiro simulado', S.provas.length >= 1], ['🎖️', '10 simulados', S.provas.length >= 10], ['🧠', '50 questões de IA', S.geradas.length >= 50]
  ];
  root.innerHTML = `
  <div class="card">
    <h2>📈 Seu progresso</h2>
    <div class="grid c4">
      <div class="kpi"><b>${m.tot}</b><span>respostas</span></div>
      <div class="kpi"><b>${m.unicas}</b><span>questões distintas</span></div>
      <div class="kpi"><b>${nf(m.pct, 0)}%</b><span>aproveitamento geral</span></div>
      <div class="kpi"><b>${m.streak}🔥</b><span>sequência</span></div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">🚨 Prioridades (onde você erra mais)</h3>
    ${pontosFracos.length ? pontosFracos.map(r => `<div class="row" style="justify-content:space-between;margin:7px 0">
        <span>${esc(r.x.nome)}</span><span class="badge ${r.s.pct < 50 ? 'err' : 'warn'}">${nf(r.s.pct, 0)}% (${r.s.t} respostas)</span>
      </div>
      <div class="row"><button class="btn sm" onclick="iniciarPorMateria('${r.x.id}')">treinar agora</button>
      <button class="btn sm" onclick="pedirResumoIA('${r.x.id}')">🤖 resumo da IA</button></div>`).join('')
      : '<div class="muted small">Treine algumas questões para o diagnóstico aparecer.</div>'}
    ${piores.length ? `<h3>Top tópicos para revisar</h3><table><tr><th>Tópico</th><th>Respostas</th><th>%</th></tr>
      ${piores.map(p => `<tr><td>${esc(p.k)}</td><td>${p.t}</td><td><span class="badge ${p.pct < 50 ? 'err' : 'warn'}">${nf(p.pct, 0)}%</span></td></tr>`).join('')}</table>` : ''}
  </div>

  <div class="card">
    <h3 style="margin-top:0">⏱️ Histórico de simulados</h3>
    ${provas.length ? `
      <svg viewBox="0 0 300 90" style="width:100%;height:110px;background:#0b1020;border:1px solid var(--line);border-radius:10px;padding:6px">
        <polyline fill="none" stroke="#60a5fa" stroke-width="2" points="${provas.map((p, i) => `${8 + i * (284 / Math.max(1, provas.length - 1))},${86 - p.nota / maxNota * 74}`).join(' ')}"/>
        ${provas.map((p, i) => `<circle cx="${8 + i * (284 / Math.max(1, provas.length - 1))}" cy="${86 - p.nota / maxNota * 74}" r="3" fill="#facc15"><title>${nf(p.nota, 1)} em ${new Date(p.data).toLocaleDateString('pt-BR')}</title></circle>`).join('')}
      </svg>
      <table style="margin-top:10px"><tr><th>Data</th><th>Questões</th><th>Acertos</th><th>Nota</th><th>Tempo</th></tr>
      ${S.provas.slice().reverse().slice(0, 10).map(p => `<tr><td>${new Date(p.data).toLocaleDateString('pt-BR')}</td><td>${p.total}</td><td>${p.acertos}</td><td><b style="color:${p.nota >= 6 ? 'var(--ok)' : 'var(--err)'}">${nf(p.nota, 1)}</b></td><td>${p.tempo} min</td></tr>`).join('')}</table>`
      : '<div class="muted small">Nenhum simulado ainda. Faça um para acompanhar sua evolução.</div>'}
  </div>

  <div class="card">
    <h3 style="margin-top:0">🏅 Conquistas</h3>
    <div class="grid c3">${conquistas.map(([e, t, on]) => `<div class="kpi" style="${on ? '' : 'opacity:.4'}"><b>${e}</b><span>${t}</span></div>`).join('')}</div>
  </div>

  <div class="card">
    ${typeof blocoNuvem === 'function' ? blocoNuvem() : ''}
    ${typeof blocoSync === 'function' ? blocoSync() : ''}
  </div>

  <div class="card">
    <h3 style="margin-top:0">💾 Backup e configurações</h3>
    <div class="grid c3">
      <div><label class="f">Seu nome</label><input type="text" id="p-nome" value="${esc(S.config.nome || '')}"></div>
      <div><label class="f">Meta diária de questões</label><input type="number" id="p-meta" value="${S.config.metaDia}"></div>
      <div><label class="f">Meta total (rumo a…)</label><input type="number" id="p-metatotal" value="${S.config.metaTotal || 3000}"></div>
      <div><label class="f">Data da prova</label><input type="date" id="p-prova" value="${S.config.dataProva}"></div>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="btn pri" id="p-salvar">Salvar configurações</button>
      <button class="btn" id="p-export">⬇️ Exportar progresso (JSON)</button>
      <button class="btn" id="p-import">⬆️ Importar backup</button>
      <button class="btn" id="p-reset" style="border-color:#7f1d1d;color:#fda4af">🧨 Zerar tudo</button>
    </div>
    <input type="file" id="p-file" accept=".json" class="hidden">
    <div class="tiny muted" style="margin-top:8px">Seus dados ficam somente no seu aparelho (localStorage). Exporte o JSON de vez em quando — se limpar o cache do navegador, o progresso se perde.</div>
  </div>`;
  if (typeof ligarSync === 'function') ligarSync();
  if (typeof ligarNuvem === 'function') ligarNuvem();
  $('#p-salvar').onclick = () => { S.config.nome = $('#p-nome').value; S.config.metaDia = +$('#p-meta').value || 41; S.config.metaTotal = +$('#p-metatotal').value || 3000; S.config.dataProva = $('#p-prova').value; salvar(); atualizarBadges(); toast('Configurações salvas ✅'); $('#app-nome') && ($('#app-nome').value = S.config.nome); };
  $('#p-export').onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup-alepa-${hojeISO()}.json`; a.click();
  };
  $('#p-import').onclick = () => $('#p-file').click();
  $('#p-file').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { S = Object.assign(estadoInicial(), JSON.parse(r.result)); salvar(); reindexar(); toast('Backup restaurado ✅'); irPara('painel'); } catch (err) { toast('Arquivo inválido'); } }; r.readAsText(f); };
  $('#p-reset').onclick = () => { if (confirm('Isso apaga TODO o seu progresso. Continuar?') && confirm('Tem certeza? Não dá para desfazer.')) { S = estadoInicial(); salvar(); reindexar(); toast('Progresso zerado'); irPara('painel'); } };
}

/* ------------------------------ 14. PLANO -------------------------------- */
function renderPlano(root) {
  const m = metricas();
  const pesos = { LP: 12, LE: 8, INFO: 8, RL: 10, SEC: 5, DA: 12, DC: 9, DPC: 4, PL: 14, DF: 4, DPREV: 3, DCIV: 6, DPCIV: 4, DH: 3 };
  const totalPeso = MATERIAS.reduce((s, x) => s + (pesos[x.id] || 5), 0);
  // cronograma: blocos de matérias por dia, priorizando o que está mais fraco
  const dias = Math.max(1, m.restam);
  const plano7 = [];
  for (let d = 0; d < 7; d++) {
    const data = new Date(Date.now() + d * 86400000);
    const ordem = MATERIAS.slice().sort((a, b) => (statsMateria(a.id).pct || 50) - (statsMateria(b.id).pct || 50));
    const picks = [ordem[d % ordem.length], ordem[(d + 5) % ordem.length], ordem[(d + 9) % ordem.length]];
    plano7.push({ data, itens: picks });
  }
  root.innerHTML = `
  <div class="card">
    <h2>🗓️ Plano até 13/12/2026 — ${m.restam} dias</h2>
    <div class="grid c3">
      <div class="kpi"><b>${m.metaDia}</b><span>questões/dia para chegar a ${m.metaTotal}</span></div>
      <div class="kpi"><b>${m.faltam}</b><span>questões faltando</span></div>
      <div class="kpi"><b>${nf(m.tot / m.metaTotal * 100, 1)}%</b><span>da meta concluída</span></div>
    </div>
    <h3>Como o peso do edital se distribui</h3>
    ${MATERIAS.map(x => `<div style="margin:6px 0"><div class="row" style="justify-content:space-between"><span class="small">${esc(x.nome)}</span><span class="tiny muted">~${nf((pesos[x.id] || 5) / totalPeso * 100, 0)}% da prova</span></div>
      <div class="bar"><i style="width:${larguraPct((pesos[x.id] || 5) / Math.max(...Object.values(pesos)) * 100)}%"></i></div></div>`).join('')}
    <div class="tiny muted" style="margin-top:6px">Pesos estimados a partir da relevância dos blocos do Anexo II (o edital não divulga o número de questões por matéria — ajuste conforme o seu desempenho).</div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">📅 Seus próximos 7 dias</h3>
    ${plano7.map(p => `<div style="border-left:3px solid var(--pri);padding:2px 0 2px 10px;margin:10px 0">
      <b>${DIAS[p.data.getDay()]}, ${fmtData(p.data)}</b>
      <div class="small muted">Meta: ${m.metaDia} questões · ~50 min de teoria</div>
      <div>${p.itens.map(it => `<button class="btn sm" style="margin:4px 4px 0 0" onclick="irPara('teoria');setTimeout(()=>{},0)">${esc(it.nome)}</button>`).join('')}</div>
    </div>`).join('')}
    <div class="row" style="margin-top:12px">
      <button class="btn pri" onclick="iniciarTreinoRapido()">▶ Fazer as ${Math.min(20, m.metaDia)} questões de agora</button>
      <button class="btn" onclick="iniciarRevisao()">🔁 Revisar erros</button>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">🧭 Estratégia recomendada (CETAP / ALEPA – cargo 15)</h3>
    <div class="small" style="white-space:pre-wrap;color:#dfe6ff">${esc(ESTRATEGIA)}</div>
  </div>`;
}
const ESTRATEGIA = `1) PROCESSO LEGISLATIVO E RIALEPA é o coração da prova deste cargo: é o bloco mais extenso do Anexo II (proposições, comissões, quóruns, regimes de tramitação, PPA/LDO/LOA, decretos legislativos e resoluções). Estude com o Regimento Interno aberto ao lado e treine questões todos os dias.
2) TÉCNICA LEGISLATIVA (LC 95/1998): decore a estrutura da lei (parte preliminar, normativa, final), a ordem dos artigos (art. 1º = objeto; últimos artigos = vigência) e as regras de alteração/revogação. É conteúdo de altíssimo retorno.
3) DIREITO ADMINISTRATIVO + CONSTITUCIONAL: a banca cobra literalidade da lei e da CF. Leia a Lei 14.133/2021 (licitações) pelo menos nas partes mais cobradas: modalidades, prazos, dispensas e inexigibilidade.
4) LÍNGUA PORTUGUESA: treine interpretação com textos oficiais e revise crase, concordância, regência e pontuação. Redação oficial (Manual da Presidência) cai junto de "comunicação assertiva".
5) LEGISLAÇÃO E ÉTICA: LGPD, Lei Anticorrupção e improbidade (Lei 8.429/1992 com a 14.230/2021) são presença garantida. Decore prazos de prescrição e sanções.
6) RLM: não é decoreba — é treino. Use os geradores infinitos aqui do app todo dia por 15 minutos; ganho rápido de pontos.
7) Ritmo: 40 questões/dia + 1 simulado de 60 questões por semana. Corrija o simulado no mesmo dia e mande as erradas para a revisão espaçada.
8) Na reta final (últimos 15 dias): diminua teoria, aumente simulados e revisão de erros. Releia os resumos de bolso deste app.`;


