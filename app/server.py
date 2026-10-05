#!/usr/bin/env python3
"""Servidor local do Arena Estudos ALEPA/CETAP.

- Serve o app (arquivo único já com todas as questões).
- Expõe /api/chat, que conversa com o Hugging Face usando o token do próprio
  navegador (o token chega no corpo da requisição e nunca é gravado em disco)
  ou, se preferir, a variável de ambiente HF_TOKEN.
- Sem dependências externas: só a biblioteca padrão do Python.

Rodar:  python3 app/server.py   → http://localhost:8000
Variáveis:  PORTA (padrão 8000) · HF_MODEL (modelo padrão) · HF_TOKEN (opcional)
"""
import json, os, sys, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(BASE, 'dist')
PORTA = int(os.environ.get('PORTA', '8000'))
MODELO = os.environ.get('HF_MODEL', 'openai/gpt-oss-120b')
try:
    from provedores import PROVEDORES, montar as montar_req, ler_resposta
except ImportError:  # quando rodado de outra pasta
    import importlib.util as _ilu, os as _os
    _sp = _ilu.spec_from_file_location('provedores', _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'provedores.py'))
    _m = _ilu.module_from_spec(_sp); _sp.loader.exec_module(_m)
    PROVEDORES, montar_req, ler_resposta = _m.PROVEDORES, _m.montar, _m.ler_resposta

HF_URLS = [
    'https://router.huggingface.co/v1/chat/completions',
    'https://api-inference.huggingface.co/v1/chat/completions',
]
HF_API = 'https://huggingface.co/api'


def hf_request(url, token, metodo='GET', dados=None, cabecalhos=None, timeout=60):
    """Chamada simples à API do Hugging Face usando só a biblioteca padrão."""
    payload = json.dumps(dados).encode('utf-8') if dados is not None else None
    req = urllib.request.Request(url, data=payload, method=metodo, headers=dict({
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'ArenaEstudos-ALEPA/1.0',
    }, **(cabecalhos or {})))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'ignore')[:400]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIST, **kw)

    def log_message(self, fmt, *args):
        if '/api/' in (self.path or ''):
            sys.stderr.write('  · %s\n' % (fmt % args))

    # ---------------------------------------------------------------- helpers
    def _json(self, code, obj):
        corpo = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(corpo)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(corpo)

    def _corpo(self):
        n = int(self.headers.get('Content-Length') or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode('utf-8'))
        except Exception:
            return {}

    # ---------------------------------------------------------------- rotas
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

    def _sync(self, dados):
        """Guarda/lê o progresso do estudante num repositório privado de dataset
        no Hugging Face (usando a chave do próprio usuário)."""
        from urllib.parse import urlparse, parse_qs
        token = (dados.get('token') or os.environ.get('HF_TOKEN') or '').strip()
        acao = dados.get('acao') or 'push'
        repo = (dados.get('repo') or '').strip().strip('/')
        if not token:
            return self._json(400, {'error': 'Chave do Hugging Face não informada.'})
        if not repo or '/' not in repo:
            return self._json(400, {'error': 'Repositório inválido. Use o formato usuario/nome-repo.'})

        if acao == 'push':
            dados_json = dados.get('dados') or ''
            if not dados_json:
                return self._json(400, {'error': 'nada para enviar'})
            codigo, corpo = hf_request(
                f'{HF_API}/datasets/{repo}/upload/main/progresso.json',
                token, 'POST',
                dados={'file': 'progresso.json', 'content': dados_json, 'summary': 'Progresso de estudos (Arena Estudos ALEPA)'},
                cabecalhos={'Content-Type': 'application/json'})
            if codigo in (200, 201):
                return self._json(200, {'ok': True, 'repo': repo, 'tamanho': len(dados_json)})
            if codigo == 404:
                # repositório não existe: cria e tenta de novo
                c2, _ = hf_request(f'{HF_API}/repos/create', token, 'POST',
                                   dados={'type': 'dataset', 'name': repo.split('/')[-1], 'private': True},
                                   cabecalhos={'Content-Type': 'application/json'})
                codigo, corpo = hf_request(
                    f'{HF_API}/datasets/{repo}/upload/main/progresso.json',
                    token, 'POST',
                    dados={'file': 'progresso.json', 'content': dados_json, 'summary': 'Progresso de estudos'},
                    cabecalhos={'Content-Type': 'application/json'})
                if codigo in (200, 201):
                    return self._json(200, {'ok': True, 'repo': repo, 'repo_criado': True})
            return self._json(502, {'error': f'Hugging Face respondeu {codigo}: {corpo}'})

        if acao == 'pull':
            url = f'https://huggingface.co/datasets/{repo}/resolve/main/progresso.json?download=true'
            codigo, corpo = hf_request(url, token)
            if codigo == 200 and corpo.strip().startswith('{'):
                return self._json(200, json.loads(corpo))
            return self._json(404, {'error': f'Ainda não há progresso nesse repositório (HF {codigo}).'})

        return self._json(400, {'error': 'ação inválida'})

    def do_GET(self):
        if self.path.startswith('/api/sync'):
            from urllib.parse import urlparse, parse_qs
            q = parse_qs(urlparse(self.path).query)
            return self._sync({'acao': q.get('acao', ['pull'])[0], 'repo': q.get('repo', [''])[0], 'token': q.get('token', [''])[0]})
        if self.path.startswith('/api/health'):
            return self._json(200, {
                'ok': True, 'modelo': MODELO,
                'tem_token_no_servidor': bool(os.environ.get('HF_TOKEN')),
                'provedor': 'proxy local (suporta Hugging Face, Gemini, Groq, OpenAI, Claude, OpenRouter, Mistral, DeepSeek, Grok e IA local)',
            'ias': sorted(PROVEDORES.keys()),
            })
        return super().do_GET()

    def _ia(self, dados):
        """Proxy: o navegador manda o provedor e a chave; o servidor faz a chamada.
        Serve para esconder a chave e para IAs que bloqueiam o navegador."""
        id_prov = (dados.get('provedor') or 'hf').strip()
        if id_prov not in PROVEDORES:
            return self._json(400, {'error': 'Provedor desconhecido: ' + id_prov})
        modelo = (dados.get('modelo') or '').strip()
        token = (dados.get('token') or '').strip() or os.environ.get('HF_TOKEN' if id_prov == 'hf' else 'IA_TOKEN', '').strip()
        if id_prov != 'ollama' and not PROVEDORES[id_prov].get('urlLivre') and PROVEDORES[id_prov].get('tipo') != 'gemini' and not token:
            return self._json(400, {'error': 'Nenhuma chave informada para %s. Toque no botão 🔑 e cole a sua chave.' % PROVEDORES[id_prov]['nome']})
        mensagens = dados.get('mensagens') or [{'role': 'user', 'content': 'Oi'}]
        try:
            url, cabecalhos, corpo = montar_req(id_prov, modelo, mensagens, token,
                                                dados.get('baseUrl') or '',
                                                dados.get('max_tokens') or 1200,
                                                dados.get('temperature'))
        except ValueError as e:
            return self._json(400, {'error': str(e)})
        req = urllib.request.Request(url, data=json.dumps(corpo).encode('utf-8'), method='POST', headers=dict(cabecalhos, **{'User-Agent': 'ArenaEstudos-ALEPA/1.0'}))
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                j = json.loads(r.read().decode('utf-8', 'ignore'))
        except urllib.error.HTTPError as e:
            corpo_erro = e.read().decode('utf-8', 'ignore')[:400]
            return self._json(e.code, {'error': corpo_erro or ('HTTP ' + str(e.code))})
        except Exception as e:
            return self._json(502, {'error': 'Não consegui falar com a IA: ' + str(e)})
        conteudo = ler_resposta(id_prov, j)
        if not conteudo:
            return self._json(502, {'error': 'A IA respondeu sem texto: ' + json.dumps(j)[:200]})
        return self._json(200, {'content': conteudo, 'provedor': id_prov, 'modelo': modelo})

    def do_POST(self):
        if self.path.startswith('/api/ia'):
            return self._ia(self._corpo())
        if self.path.startswith('/api/sync'):
            return self._sync(self._corpo())
        if not self.path.startswith('/api/chat'):
            return self._json(404, {'error': 'rota desconhecida'})

        dados = self._corpo()
        token = (dados.get('token') or os.environ.get('HF_TOKEN') or '').strip()
        if not token:
            return self._json(400, {'error': 'Token do Hugging Face não informado. Cole o seu token hf_... na aba IA do app '
                                             '(grátis em huggingface.co/settings/tokens) ou defina HF_TOKEN no servidor.'})
        modelo = dados.get('model') or MODELO
        corpo = {
            'model': modelo,
            'messages': dados.get('messages') or [],
            'max_tokens': int(dados.get('max_tokens') or 1200),
            'temperature': float(dados.get('temperature') if dados.get('temperature') is not None else 0.6),
            'stream': False,
        }
        if not corpo['messages']:
            return self._json(400, {'error': 'envie "messages"'})

        payload = json.dumps(corpo).encode('utf-8')
        erros = []
        for url in HF_URLS:
            req = urllib.request.Request(url, data=payload, method='POST', headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                'User-Agent': 'ArenaEstudos-ALEPA/1.0',
            })
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    j = json.loads(resp.read().decode('utf-8'))
                conteudo = ''
                if isinstance(j, dict):
                    if j.get('choices'):
                        conteudo = (j['choices'][0].get('message') or {}).get('content') or ''
                    elif j.get('generated_text'):
                        conteudo = j['generated_text']
                if conteudo:
                    return self._json(200, {'content': conteudo, 'modelo': modelo, 'url': url})
                erros.append(f'{url}: resposta sem conteúdo')
            except urllib.error.HTTPError as e:
                det = e.read().decode('utf-8', 'ignore')[:400]
                erros.append(f'{url}: HTTP {e.code} {det}')
                if e.code in (401, 403):
                    break
            except Exception as e:
                erros.append(f'{url}: {e}')
        return self._json(502, {'error': 'Falha ao chamar o Hugging Face. ' + ' | '.join(erros[:2])})


def main():
    if not os.path.exists(os.path.join(DIST, 'index.html')):
        print('⚠️  dist/index.html não existe. Rode antes: python3 app/build.py')
        return 1
    srv = ThreadingHTTPServer(('0.0.0.0', PORTA), Handler)
    print(f'🎯 Arena Estudos ALEPA/CETAP rodando em http://0.0.0.0:{PORTA}  (modelo padrão: {MODELO})')
    print(f'   Token no ambiente: {"sim" if os.environ.get("HF_TOKEN") else "não (o app pedirá o seu na aba IA)"}')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\nAté logo! 👋')
    return 0


if __name__ == '__main__':
    sys.exit(main())
