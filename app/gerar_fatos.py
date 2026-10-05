#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera o banco curado de questões (estilo Fundação CETAP) a partir da base de fatos.

Cada fato da base (app/fatos/*.json) é um item
    [pergunta, resposta correta, comentario, referencia]
e rende TRÊS questões:

  1. direta            -> a própria pergunta, 5 alternativas
  2. assinale a correta-> mesma pergunta com comando explícito, alternativas diferentes
  3. correspondência    -> a resposta é dada e o candidato escolhe qual questionamento
                          corresponde a ela (alternativas = perguntas)

Os distratores saem sempre de fatos da MESMA categoria (mesmo tema), para ficarem
plausíveis. O `topico` de cada questão é a string exata do conteúdo programático
(edital.json), de modo que os filtros por tópico do app já funcionem.

Uso: python3 app/gerar_fatos.py
"""
import json, os, glob, random, re, unicodedata, sys

BASE = os.path.dirname(os.path.abspath(__file__))
FATOS = os.path.join(BASE, 'fatos')
SAIDA = os.path.join(BASE, 'questoes')
EDITAL = os.path.join(BASE, 'data', 'edital.json')

# ------------------------------------------------------------------ tópicos do edital
# (arquivo, categoria) -> tópico padrão | (tópico padrao, {indice_do_fato: topico})
MAPA = {
 ('01_constitucional.json', 'processo_legislativo_cf'): ('PL', {
     'padrao': 'Proposições legislativas: espécies e diferenças',
     4: 'Sanção, veto, promulgação e publicação',
     5: 'Sanção, veto, promulgação e publicação',
     8: 'Fases da elaboração legislativa',
     9: 'Sanção, veto, promulgação e publicação'}),
 ('01_constitucional.json', 'direitos_garantias'): ('DC', 'Direitos e garantias fundamentais; individuais e coletivos'),
 ('01_constitucional.json', 'organizacao_estado'): ('DC', 'Organização do Estado: organização político-administrativa e federalismo'),
 ('01_constitucional.json', 'administracao_publica_cf'): ('DC', 'Administração Pública na CF (disposições gerais)'),
 ('01_constitucional.json', 'poder_legislativo'): ('DC', 'Organização dos Poderes e freios e contrapesos'),
 ('01_constitucional.json', 'controle_constitucionalidade'): ('DPC', {
     'padrao': 'Jurisdição constitucional: controle difuso e concentrado',
     0: 'ADI, ADC e ADO (Lei nº 9.868/1999)',
     1: 'ADI, ADC e ADO (Lei nº 9.868/1999)',
     2: 'ADPF (Lei nº 9.882/1999)',
     3: 'ADI, ADC e ADO (Lei nº 9.868/1999)',
     4: 'Remédios constitucionais e suas leis (HC, HD, MS, MI, ação popular, ACP)',
     5: 'Súmulas vinculantes (Lei nº 11.417/2006) e reclamação',
     8: 'Súmulas vinculantes (Lei nº 11.417/2006) e reclamação'}),

 ('02_legislativo.json', 'lc95_estrutura'): ('PL', 'LC nº 95/1998: técnica legislativa (estrutura, articulação, redação e alteração de leis)'),
 ('02_legislativo.json', 'lc95_vigencia_alteracao'): ('PL', 'LC nº 95/1998: técnica legislativa (estrutura, articulação, redação e alteração de leis)'),
 ('02_legislativo.json', 'tramitacao_projeto'): ('PL', {
     'padrao': 'Fases da elaboração legislativa',
     0: 'Iniciativa no processo legislativo: executivo, legislativo e judiciário',
     1: 'Iniciativa no processo legislativo: executivo, legislativo e judiciário',
     5: 'Sanção, veto, promulgação e publicação'}),

 ('03_administrativo.json', 'principios_adm'): ('DA', 'Princípios constitucionais do direito administrativo'),
 ('03_administrativo.json', 'atos_administrativos'): ('DA', {
     'padrao': 'Atos administrativos: conceito, elementos, atributos e classificação',
     2: 'Extinção dos atos: revogação, anulação e cassação; convalidação',
     3: 'Extinção dos atos: revogação, anulação e cassação; convalidação',
     4: 'Extinção dos atos: revogação, anulação e cassação; convalidação',
     7: 'Vinculação e discricionariedade; atos nulos, anuláveis e inexistentes; decadência',
     8: 'Vinculação e discricionariedade; atos nulos, anuláveis e inexistentes; decadência',
     9: 'Atos administrativos em espécie; silêncio administrativo'}),
 ('03_administrativo.json', 'poderes_adm'): ('DA', 'Poderes e deveres da Administração Pública'),
 ('03_administrativo.json', 'licitacoes_14133'): ('DA', 'Licitações e contratos: Lei nº 14.133/2021'),
 ('03_administrativo.json', 'processo_adm_9784'): ('DA', None),

 ('04_etica_dados.json', 'improbidade'): ('LE', 'Lei nº 8.429/1992 e alterações (Lei nº 14.230/2021)'),
 ('04_etica_dados.json', 'abuso_autoridade'): ('DA', 'Abuso de poder: Lei nº 13.869/2019'),
 ('04_etica_dados.json', 'lai'): ('LE', 'Ética e responsabilidade social; ética e função pública'),
 ('04_etica_dados.json', 'lgpd'): ('LE', 'LGPD – Lei nº 13.709/2018'),
 ('04_etica_dados.json', 'anticorrupcao'): ('LE', 'Lei Anticorrupção – Lei nº 12.846/2013'),
 ('04_etica_dados.json', 'etica_servidor'): ('LE', 'Conduta ética e ética profissional'),

 ('05_civel_processual.json', 'civil_pessoas_fatos'): ('DCIV', {
     'padrao': 'Pessoas naturais: personalidade, capacidade, direitos da personalidade e domicílio',
     4: 'Prescrição e decadência',
     5: 'Prescrição e decadência',
     6: 'Bens imóveis, móveis e públicos',
     7: 'Fato jurídico e negócio jurídico: defeitos e invalidade',
     8: 'Responsabilidade civil objetiva e subjetiva; dano material e moral',
     9: 'Responsabilidade civil objetiva e subjetiva; dano material e moral',
     10: None, 11: None, 12: None, 13: None}),
 ('05_civel_processual.json', 'cpc_prazos_recursos'): ('DPCIV', {
     'padrao': 'Processos nos tribunais, recursos e ações de impugnação',
     0: 'Contestação, reconvenção, revelia e audiência de instrução',
     3: 'Atos processuais: forma, tempo, lugar, prazos, comunicações e nulidades',
     4: 'Processo de conhecimento: petição inicial, improcedência liminar, conciliação e mediação',
     5: 'Processo de conhecimento: petição inicial, improcedência liminar, conciliação e mediação',
     6: 'Contestação, reconvenção, revelia e audiência de instrução',
     10: 'Jurisprudência dos tribunais superiores',
     11: 'Processo de conhecimento: petição inicial, improcedência liminar, conciliação e mediação',
     12: 'Poderes, deveres e responsabilidade do juiz',
     13: 'Tutela provisória: tutela de urgência'}),

 ('06_prev_financeiro.json', 'previdencia'): ('DPREV', {
     'padrao': 'Regime próprio dos servidores públicos (EC nº 103/2019)',
     1: 'Espécies de benefícios e prestações; salário de benefício e renda mensal inicial',
     2: 'Regime geral de previdência social: segurados e dependentes',
     5: 'Espécies de benefícios e prestações; salário de benefício e renda mensal inicial',
     7: 'Espécies de benefícios e prestações; salário de benefício e renda mensal inicial',
     9: 'Filiação, inscrição e carência',
     10: 'Regime geral de previdência social: segurados e dependentes'}),
 ('06_prev_financeiro.json', 'financas_publicas'): ('DF', {
     'padrao': 'Lei Complementar nº 101/2000 (LRF): responsabilidade fiscal',
     0: 'Orçamento público na CF (arts. 165 a 169)',
     1: 'Lei de Diretrizes Orçamentárias (LDO)',
     2: 'Orçamento público na CF (arts. 165 a 169)',
     3: 'Plano Plurianual (PPA)',
     8: 'Lei nº 4.320/1964: orçamentos e balanços',
     9: 'Lei nº 4.320/1964: orçamentos e balanços',
     10: 'Lei nº 4.320/1964: orçamentos e balanços',
     11: 'Lei nº 4.320/1964: orçamentos e balanços',
     12: 'Orçamento público na CF (arts. 165 a 169)'}),

 ('07_informatica.json', 'word_recursos'): ('INFO', 'Ferramentas de escritório: Word, Excel e PowerPoint (2013 a O365)'),
 ('07_informatica.json', 'excel_funcoes'): ('INFO', 'Ferramentas de escritório: Word, Excel e PowerPoint (2013 a O365)'),
 ('07_informatica.json', 'apresentacoes'): ('INFO', 'Ferramentas de escritório: Word, Excel e PowerPoint (2013 a O365)'),
 ('07_informatica.json', 'seguranca'): ('INFO', 'Segurança da informação: fundamentos, antimalware, firewall, hardening, controle de USB'),
 ('07_informatica.json', 'redes_web'): ('INFO', 'Redes de computadores: conceitos básicos, Internet e intranet'),
 ('07_informatica.json', 'conceitos_hardware'): ('INFO', 'Hardware e periféricos de microcomputador'),

 ('08_portugues_secretaria.json', 'figuras_linguagem'): ('LP', 'Figuras de linguagem'),
 ('08_portugues_secretaria.json', 'vicios_linguagem'): ('LP', 'Ortografia'),
 ('08_portugues_secretaria.json', 'funcoes_linguagem'): ('LP', 'Compreensão e Interpretação de Textos'),
 ('08_portugues_secretaria.json', 'tipos_sujeito'): ('LP', 'Período simples e composto'),
 ('08_portugues_secretaria.json', 'concordancia_regras'): ('LP', 'Concordância nominal e verbal'),
 ('08_portugues_secretaria.json', 'crase_regras'): ('LP', 'Crase'),
 ('08_portugues_secretaria.json', 'pontuacao'): ('LP', 'Pontuação'),
 ('08_portugues_secretaria.json', 'redacao_oficial'): ('SEC', 'Manual de Redação da Presidência da República'),
 ('08_portugues_secretaria.json', 'arquivo_gestao'): ('SEC', 'Técnicas de arquivo'),

 ('09_direitos_humanos.json', 'declaracoes_tratados'): ('DH', 'Genealogia: origens clássicas, direitos naturais, revoluções e declarações'),
 ('09_direitos_humanos.json', 'sistema_interamericano'): ('DH', 'Fundamentação dos direitos humanos'),
 ('09_direitos_humanos.json', 'principios_dh'): ('DH', {
     'padrao': 'Características: imprescritibilidade, irrenunciabilidade, inalienabilidade, complementaridade e universalidade',
     3: 'Dimensões (gerações) dos direitos humanos',
     4: 'Dimensões (gerações) dos direitos humanos',
     5: 'Dimensões (gerações) dos direitos humanos'}),

 ('10_de_etica.json', 'estatuto_provimento'): ('DA', 'Agentes públicos: espécies, cargo, emprego e função'),
 ('10_de_etica.json', 'estatuto_disciplina'): ('DA', 'Agentes públicos: espécies, cargo, emprego e função'),
 ('10_de_etica.json', 'processo_disciplinar'): ('DA', 'Agentes públicos: espécies, cargo, emprego e função'),
 ('10_de_etica.json', 'estatuto_estadual'): ('DA', 'Lei nº 5.810/1994 (RJÚ dos servidores do Estado do Pará)'),
 ('10_de_etica.json', 'etica_gestao'): ('LE', 'Ética e moral; ética, princípios, valores e a lei'),

 ('11_et_p_par.json', 'motivacao'): ('SEC', 'Modelos de gestão: competência, processos, projetos e resultados'),
 ('11_et_p_par.json', 'lideranca_comunicacao'): ('SEC', 'Modelos de gestão: competência, processos, projetos e resultados'),
 ('11_et_p_par.json', 'rh_processos'): ('SEC', 'Modelos de gestão: competência, processos, projetos e resultados'),
 ('11_et_p_par.json', 'receita_publica'): ('DF', {
     'padrao': 'Lei nº 4.320/1964: orçamentos e balanços',
     4: 'Lei Complementar nº 101/2000 (LRF): responsabilidade fiscal',
     5: 'Orçamento público na CF (arts. 165 a 169)'}),
 ('11_et_p_par.json', 'controle_prestacao'): ('DF', {
     'padrao': 'Orçamento público na CF (arts. 165 a 169)',
     6: 'Lei Complementar nº 101/2000 (LRF): responsabilidade fiscal',
     7: 'Lei Complementar nº 101/2000 (LRF): responsabilidade fiscal',
     8: 'Lei Complementar nº 101/2000 (LRF): responsabilidade fiscal',
     9: 'Lei Complementar nº 101/2000 (LRF): responsabilidade fiscal'}),

 ('12_rlm.json', 'rl_porcentagem'): ('RL', 'Porcentagem'),
 ('12_rlm.json', 'rl_proporcao'): ('RL', {
     'padrao': 'Regra de três simples e composta',
     0: 'Números e grandezas proporcionais: razão e proporção',
     1: 'Divisão proporcional',
     2: 'Divisão proporcional',
     9: 'Números e grandezas proporcionais: razão e proporção',
     10: 'Números e grandezas proporcionais: razão e proporção',
     11: 'Números e grandezas proporcionais: razão e proporção'}),
 ('12_rlm.json', 'rl_sequencias'): ('RL', {
     'padrao': 'Raciocínio sequencial',
     6: 'Estrutura lógica de relações arbitrárias entre pessoas, lugares, objetos ou eventos',
     7: 'Estrutura lógica de relações arbitrárias entre pessoas, lugares, objetos ou eventos',
     8: 'Orientação espacial e temporal',
     9: 'Orientação espacial e temporal',
     11: 'Orientação espacial e temporal'}),
 ('12_rlm.json', 'rl_logica'): ('RL', 'Compreensão do processo lógico: hipóteses e conclusões válidas'),
 ('12_rlm.json', 'rl_operacoes'): ('RL', 'Problemas com as quatro operações, formas fracionária e decimal'),

 ('13_gestao_projetos.json', 'planejamento'): ('SEC', 'Planejamento: tipos de planos, abrangência e horizonte temporal'),
 ('13_gestao_projetos.json', 'pdca_5w2h'): ('SEC', {
     'padrao': 'Ciclo PDCA',
     3: 'Plano de Ação 5W2H',
     4: 'Plano de Ação 5W2H',
     5: 'Plano de Ação 5W2H'}),
 ('13_gestao_projetos.json', 'projetos'): ('SEC', {
     'padrao': 'Gerenciamento de projetos: conceito, projeto x processo, tipos, stakeholders, benefícios, ciclo de vida e papel do gerente',
     9: 'Modelos de gestão: competência, processos, projetos e resultados',
     10: 'Modelos de gestão: competência, processos, projetos e resultados'}),
 ('13_gestao_projetos.json', 'atendimento'): ('SEC', 'Noções de atendimento ao público'),
 ('13_gestao_projetos.json', 'documentos'): ('SEC', {
     'padrao': 'Controle de documentos: envio e recebimento',
     0: 'Noções básicas de secretaria: preparo, preenchimento e tratamento de documentos',
     3: 'Técnicas de arquivo',
     4: 'Técnicas de arquivo',
     5: 'Noções básicas de secretaria: preparo, preenchimento e tratamento de documentos'}),
}

COMANDOS = [
    'Assinale a alternativa correta. ',
    'Assinale a alternativa que responde corretamente ao questionamento a seguir. ',
]


def semacento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def chave(s):
    return re.sub(r'[^a-z0-9]+', ' ', semacento(s).lower()).strip()


def assinatura(txt):
    """Traços que fazem um distrator parecer plausível (números, unidades, tipo)."""
    t = semacento(txt).lower()
    sig = set()
    for num in re.findall(r'\d+', t):
        sig.add('n' + num)
    for unidade in ('dias', 'dia', 'anos', 'ano', 'meses', 'mes', 'horas', 'hora', 'minutos',
                    'r$', '%', 'uteis', 'quorum', 'art', 'incisos', 'paragrafos', 'reais'):
        if unidade in t:
            sig.add('u' + unidade)
    palavras = [w for w in chave(t).split() if len(w) > 4][:4]
    sig.update('p' + w for w in palavras)
    return sig


def ref_curta(ref):
    r = ref.strip().rstrip('.')
    if len(r) <= 58:
        return r
    partes = r.split(',')
    curto = partes[0]
    for p in partes[1:]:
        if len(curto) + len(p) + 2 <= 58:
            curto += ',' + p
        else:
            break
    return curto[:58].rstrip(' ,')


def escolher_distratores(fatos, i, rnd, n=4):
    certo = fatos[i][1]
    pool, pool_bruto, vistos_entrada = [], [], {chave(certo)}
    for j, f in enumerate(fatos):
        if j == i:
            continue
        alt = str(f[1]).strip()
        k = chave(alt)
        if not k or k in vistos_entrada:
            continue
        vistos_entrada.add(k)
        score = len(assinatura(certo) & assinatura(alt))
        if len(certo) < 60 and len(alt) < 60:
            score += 1
        pool_bruto.append((score, j, alt))
        if len(certo) < 40 and len(alt) > 3 * len(certo) + 20:
            continue  # não misturar resposta curta (prazo, número) com texto longo
        pool.append((score, j, alt))
    # mais parecidos com a resposta correta primeiro (distratores plausíveis)
    pool.sort(key=lambda x: (-x[0], x[1]))
    rnd.shuffle(pool[:8])
    pool.sort(key=lambda x: -x[0])
    escolhidos, vistos = [], set()
    for _, _, alt in pool:
        if chave(alt) in vistos:
            continue
        vistos.add(chave(alt))
        escolhidos.append(alt)
        if len(escolhidos) >= n:
            break
    if len(escolhidos) < 2:
        # categoria pequena: relaxa o critério de tamanho
        for _, _, alt in pool_bruto:
            k = chave(alt)
            if k in vistos:
                continue
            vistos.add(k)
            escolhidos.append(alt)
            if len(escolhidos) >= n:
                break
    return escolhidos


def montar_alternativas(certo, distratores, rnd):
    alts = [a.strip() for a in [certo] + distratores]
    # remove repetições preservando a correta
    vistas, uteis = set(), []
    for a in alts:
        k = chave(a)
        if k in vistas:
            continue
        vistas.add(k)
        uteis.append(a)
    idxs = list(range(len(uteis)))
    rnd.shuffle(idxs)
    ordenadas = [uteis[k] for k in idxs]
    correta = ordenadas.index(certo.strip())
    return ordenadas, correta


def dificuldade(resposta):
    if len(resposta) < 26:
        return 'facil'
    if len(resposta) > 120:
        return 'dificil'
    return 'media'


def gerar():
    edital = json.load(open(EDITAL, encoding='utf-8'))
    topicos_validos = {m['id']: set(m['topicos']) for m in edital['materias']}
    arquivos = sorted(glob.glob(os.path.join(FATOS, '*.json')))
    total, por_materia, por_variante, pulados = 0, {}, {}, []
    for arq in arquivos:
        nome = os.path.basename(arq)
        pref = 'F' + (re.match(r'(\d+)', nome).group(1) if re.match(r'(\d+)', nome) else '0')
        dados = json.load(open(arq, encoding='utf-8'))
        saida = []
        for cat in dados['categorias']:
            regra = MAPA.get((nome, cat['id']))
            if regra is None:
                pulados.append(f'{nome}/{cat["id"]}: sem mapeamento de tópico')
                continue
            materia, regra_top = regra
            padrao = regra_top if isinstance(regra_top, str) or regra_top is None else regra_top['padrao']
            overrides = {} if isinstance(regra_top, str) or regra_top is None else {int(k): v for k, v in regra_top.items() if k != 'padrao'}
            if padrao is not None and padrao not in topicos_validos.get(materia, set()):
                pulados.append(f'{nome}/{cat["id"]}: tópico fora do edital -> {padrao}')
                continue
            fatos = cat['fatos']
            for i, fato in enumerate(fatos):
                pergunta, resposta, comentario, referencia = [str(x).strip() for x in fato[:4]]
                topico = overrides.get(i, padrao)
                if topico is not None and topico not in topicos_validos.get(materia, set()):
                    pulados.append(f'{nome}/{cat["id"]}[{i}]: tópico inválido')
                    continue
                rnd = random.Random(f'{nome}|{cat["id"]}|{i}')
                dist = escolher_distratores(fatos, i, rnd, n=4)
                if len(dist) < 2:
                    pulados.append(f'{nome}/{cat["id"]}[{i}]: poucos distratores')
                    continue
                base = dict(materia=materia, topico=topico, dif=dificuldade(resposta),
                            banca='Estilo CETAP', ano=2026, origem='gerada',
                            ref=ref_curta(referencia),
                            comentario=f'{comentario} Fundamento: {referencia}')

                # 1) direta -------------------------------------------------
                alts, correta = montar_alternativas(resposta, dist, rnd)
                saida.append(dict(id=f'{pref}-{cat["id"]}-{i:03d}-A', enunciado=pergunta if pergunta.endswith('?') else pergunta + '?',
                                  alternativas=alts, correta=correta, **base))

                # 2) assinale a correta (distratores e ordem diferentes) -----
                dist2 = escolher_distratores(fatos, i, random.Random(f'{nome}|{cat["id"]}|{i}|2'), n=4)
                alts2, correta2 = montar_alternativas(resposta, dist2, random.Random(f'{nome}|{cat["id"]}|{i}|b'))
                comando = COMANDOS[i % len(COMANDOS)]
                enunciado2 = comando + (pergunta if pergunta.endswith('?') else pergunta + '?')
                saida.append(dict(id=f'{pref}-{cat["id"]}-{i:03d}-B', enunciado=enunciado2,
                                  alternativas=alts2, correta=correta2, **base))

                # 3) correspondência: dada a resposta, qual a pergunta? ------
                if len(resposta) >= 14 and not re.match(r'^(sim|n[aã]o)\b', chave(resposta)):
                    candidatos = []
                    tokens_resp = set(chave(resposta).split())
                    for j, f in enumerate(fatos):
                        if j == i:
                            continue
                        q = str(f[0]).strip()
                        if not q.endswith('?'):
                            continue
                        outro = set(chave(str(f[1])).split())
                        if outro and len(tokens_resp & outro) / max(1, len(outro)) > 0.75:
                            continue  # resposta igual à correta -> pergunta ambígua
                        sobrepos = len(set(chave(q).split()) & set(chave(pergunta).split())) / max(1, len(set(chave(pergunta).split())))
                        candidatos.append((sobrepos, j, q))
                    candidatos.sort(key=lambda x: (-x[0], x[1]))
                    escolhidas = [q for _, _, q in candidatos[:4]]
                    if len(escolhidas) >= 3:
                        alts3, correta3 = montar_alternativas(pergunta, escolhidas, random.Random(f'{nome}|{cat["id"]}|{i}|c'))
                        enunciado3 = (f'A resposta "{resposta}" corresponde a qual dos questionamentos a seguir? '
                                      f'(Tema: {cat["tema"]}.)')
                        saida.append(dict(id=f'{pref}-{cat["id"]}-{i:03d}-C', enunciado=enunciado3,
                                          alternativas=alts3, correta=correta3, **base))
        for q in saida:
            por_materia[q['materia']] = por_materia.get(q['materia'], 0) + 1
            por_variante[q['id'][-1]] = por_variante.get(q['id'][-1], 0) + 1
        total += len(saida)
        destino = os.path.join(SAIDA, '90_' + re.sub(r'^\d+_', '', nome))
        with open(destino, 'w', encoding='utf-8') as f:
            json.dump(saida, f, ensure_ascii=False, indent=1)
        print(f'  {os.path.basename(destino):38s} {len(saida):5d} questões')
    print(f'\n  TOTAL GERADO: {total} questões')
    print('  por matéria :', ', '.join(f'{k}={v}' for k, v in sorted(por_materia.items())))
    print('  por variante:', ', '.join(f'{k}={v}' for k, v in sorted(por_variante.items())))
    if pulados:
        print('\n  avisos (%d):' % len(pulados))
        for p in pulados[:20]:
            print('   -', p)


if __name__ == '__main__':
    gerar()
