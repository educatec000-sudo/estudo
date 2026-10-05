#!/usr/bin/env python3
"""Build do app de estudos ALEPA/CETAP.
Gera um arquivo HTML único e autossuficiente (funciona offline no celular/PC).
Uso: python3 app/build.py
"""
import json, os, re, sys, glob, datetime

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
SRC = os.path.join(BASE, 'src')
QUESTOES = os.path.join(BASE, 'questoes')
DADOS = os.path.join(BASE, 'data')
OUT_APP = os.path.join(BASE, 'dist', 'index.html')          # servido pelo server.py
OUT_STANDALONE = os.path.join(ROOT, 'ALEPA_Estudos.html')   # arquivo único p/ baixar
OUT_DEPLOY = os.path.join(ROOT, 'publicar')                 # pacote pronto p/ Netlify/Cloudflare/GitHub Pages
PWA = os.path.join(BASE, 'pwa')
ASSETS = os.path.join(BASE, 'assets')

# ---------------------------------------------------------------- carregar questões
def carregar_questoes():
    banco, vistos, erros = [], set(), []
    arquivos = sorted(glob.glob(os.path.join(QUESTOES, '*.json')))
    for arq in arquivos:
        try:
            with open(arq, encoding='utf-8') as f:
                itens = json.load(f)
        except Exception as e:
            erros.append(f'{os.path.basename(arq)}: JSON inválido -> {e}')
            continue
        for q in itens:
            faltando = [c for c in ('id', 'materia', 'enunciado', 'alternativas', 'correta', 'comentario') if c not in q]
            if faltando:
                erros.append(f"{q.get('id','?')}: faltam campos {faltando}")
                continue
            if not (0 <= int(q['correta']) < len(q['alternativas'])):
                erros.append(f"{q['id']}: índice 'correta' fora do intervalo")
                continue
            if q['id'] in vistos:
                erros.append(f"{q['id']}: id duplicado")
                continue
            vistos.add(q['id'])
            banco.append(q)
    return banco, erros

def main():
    edital = json.load(open(os.path.join(DADOS, 'edital.json'), encoding='utf-8'))
    teoria_path = os.path.join(DADOS, 'teoria.json')
    teoria = json.load(open(teoria_path, encoding='utf-8')) if os.path.exists(teoria_path) else {}
    banco, erros = carregar_questoes()

    for e in erros:
        print('  ⚠️ ', e)

    mids = {m['id'] for m in edital['materias']}
    fora = {q['materia'] for q in banco} - mids
    if fora:
        print('  ⚠️  matérias desconhecidas no banco:', fora)

    counts = {}
    for q in banco:
        counts[q['materia']] = counts.get(q['materia'], 0) + 1
    print(f'  Banco: {len(banco)} questões')
    for m in edital['materias']:
        print(f"    - {m['id']:<6} {counts.get(m['id'],0):>3}  {m['nome']}")

    tpl = open(os.path.join(SRC, 'index.template.html'), encoding='utf-8').read()
    css = open(os.path.join(SRC, 'styles.css'), encoding='utf-8').read()
    core = open(os.path.join(SRC, 'app.core.js'), encoding='utf-8').read()
    ias = open(os.path.join(SRC, 'app.ias.js'), encoding='utf-8').read()
    extra = open(os.path.join(SRC, 'app.extra.js'), encoding='utf-8').read()
    sync = open(os.path.join(SRC, 'app.sync.js'), encoding='utf-8').read()
    imp = open(os.path.join(SRC, 'app.import.js'), encoding='utf-8').read()
    nuvem = open(os.path.join(SRC, 'app.nuvem.js'), encoding='utf-8').read()

    def js(obj):
        return json.dumps(obj, ensure_ascii=False).replace('</', '<\\/')

    html = tpl
    html = html.replace('/*__CSS__*/', css)
    html = html.replace('/*__EDITAL__*/', js(edital))
    html = html.replace('/*__BANCO__*/', js(banco))
    html = html.replace('/*__TEORIA__*/', js(teoria))
    html = html.replace('/*__CORE__*/', core)
    html = html.replace('/*__IAS__*/', ias)
    html = html.replace('/*__EXTRA__*/', extra)
    html = html.replace('/*__SYNC__*/', sync)
    html = html.replace('/*__IMPORT__*/', imp)
    html = html.replace('/*__NUVEM__*/', nuvem)

    os.makedirs(os.path.dirname(OUT_APP), exist_ok=True)
    for destino in (OUT_APP, OUT_STANDALONE):
        with open(destino, 'w', encoding='utf-8') as f:
            f.write(html)

    # ---- pacote para publicar (PWA): index.html + manifest + sw + ícones ----
    import shutil
    if os.path.isdir(OUT_DEPLOY):
        shutil.rmtree(OUT_DEPLOY)
    os.makedirs(OUT_DEPLOY, exist_ok=True)
    for origem, nome in ((OUT_APP, 'index.html'),
                         (os.path.join(PWA, 'manifest.webmanifest'), 'manifest.webmanifest'),
                         (os.path.join(PWA, 'sw.js'), 'sw.js'),
                         (os.path.join(ASSETS, 'icon-192.png'), 'icon-192.png'),
                         (os.path.join(ASSETS, 'icon-512.png'), 'icon-512.png'),
                         (os.path.join(PWA, 'vercel.json'), 'vercel.json'),
                         (os.path.join(PWA, 'netlify.toml'), 'netlify.toml'),
                         (os.path.join(PWA, '_headers'), '_headers'),
                         (os.path.join(PWA, 'LEIA-PUBLICAR.md'), 'LEIA-PUBLICAR.md')):
        if os.path.exists(origem):
            shutil.copy2(origem, os.path.join(OUT_DEPLOY, nome))
    os.makedirs(os.path.dirname(DIST), exist_ok=True) if False else None
    api_src = os.path.join(BASE, 'pwa', 'api')
    if os.path.isdir(api_src):
        shutil.copytree(api_src, os.path.join(OUT_DEPLOY, 'api'))
    for extra_nome in ('manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png'):
        origem = os.path.join(OUT_DEPLOY, extra_nome)
        if os.path.exists(origem):
            shutil.copy2(origem, os.path.join(os.path.dirname(OUT_APP), extra_nome))
    kb = len(html.encode('utf-8')) / 1024
    print(f'  ✅ {OUT_STANDALONE}  ({kb:.0f} KB)')
    print(f'  ✅ {OUT_APP}')
    print(f'  📦 pacote para publicar (PWA): {OUT_DEPLOY}/')
    print(f"  Teoria: {len(teoria)} matérias com resumo")
    return 0

if __name__ == '__main__':
    sys.exit(main())
