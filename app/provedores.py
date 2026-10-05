"""Provedores de IA para o proxy (server.py e funções da Vercel).

Suporta OpenAI-compatíveis (Hugging Face, Groq, OpenAI, OpenRouter, Mistral,
DeepSeek, Grok/xAI, Ollama, LM Studio e serviços próprios), Anthropic (Claude)
e Google Gemini.
"""

PROVEDORES = {
    'hf': {'nome': 'Hugging Face', 'tipo': 'openai',
           'url': 'https://router.huggingface.co/v1/chat/completions'},
    'gemini': {'nome': 'Google Gemini', 'tipo': 'gemini',
               'urlBase': 'https://generativelanguage.googleapis.com/v1beta/models/'},
    'groq': {'nome': 'Groq', 'tipo': 'openai',
             'url': 'https://api.groq.com/openai/v1/chat/completions'},
    'openai': {'nome': 'ChatGPT (OpenAI)', 'tipo': 'openai',
               'url': 'https://api.openai.com/v1/chat/completions'},
    'anthropic': {'nome': 'Claude (Anthropic)', 'tipo': 'anthropic',
                  'url': 'https://api.anthropic.com/v1/messages'},
    'openrouter': {'nome': 'OpenRouter', 'tipo': 'openai',
                   'url': 'https://openrouter.ai/api/v1/chat/completions'},
    'mistral': {'nome': 'Mistral', 'tipo': 'openai',
                'url': 'https://api.mistral.ai/v1/chat/completions'},
    'deepseek': {'nome': 'DeepSeek', 'tipo': 'openai',
                 'url': 'https://api.deepseek.com/chat/completions'},
    'xai': {'nome': 'Grok (xAI)', 'tipo': 'openai',
            'url': 'https://api.x.ai/v1/chat/completions'},
    'ollama': {'nome': 'IA local (Ollama/LM Studio)', 'tipo': 'openai',
               'urlPadrao': 'http://localhost:11434/v1/chat/completions'},
    'custom': {'nome': 'Outra IA (compatível com OpenAI)', 'tipo': 'openai', 'urlLivre': True},
}


def montar(id_prov, modelo, mensagens, token, base_url='', max_tokens=1200, temperatura=0.6):
    """Devolve (url, cabecalhos, corpo) para a chamada da IA escolhida."""
    p = PROVEDORES.get(id_prov)
    if not p:
        raise ValueError('Provedor desconhecido: %s' % id_prov)
    tipo = p['tipo']
    max_tokens = int(max_tokens or 1200)
    temperatura = float(temperatura if temperatura is not None else 0.6)
    cabecalhos = {'Content-Type': 'application/json'}

    if p.get('urlLivre'):
        url = (base_url or '').strip()
        if not url:
            raise ValueError('Informe o endereço da API.')
    elif tipo == 'gemini':
        url = p['urlBase'] + modelo + ':generateContent?key=' + (token or '')
    else:
        url = p.get('url') or p.get('urlPadrao')

    if tipo == 'gemini':
        sistema = '\n'.join(m['content'] for m in mensagens if m.get('role') == 'system')
        conversa = [{'role': 'model' if m.get('role') == 'assistant' else 'user',
                     'parts': [{'text': m.get('content', '')}]}
                    for m in mensagens if m.get('role') != 'system']
        corpo = {'contents': conversa, 'generationConfig': {'maxOutputTokens': max_tokens, 'temperature': temperatura}}
        if sistema:
            corpo['systemInstruction'] = {'parts': [{'text': sistema}]}
        return url, cabecalhos, corpo

    if tipo == 'anthropic':
        sistema = '\n'.join(m['content'] for m in mensagens if m.get('role') == 'system')
        conversa = [{'role': 'assistant' if m.get('role') == 'assistant' else 'user', 'content': m.get('content', '')}
                    for m in mensagens if m.get('role') != 'system']
        cabecalhos['x-api-key'] = token or ''
        cabecalhos['anthropic-version'] = '2023-06-01'
        corpo = {'model': modelo, 'max_tokens': max_tokens, 'temperature': temperatura, 'messages': conversa}
        if sistema:
            corpo['system'] = sistema
        return url, cabecalhos, corpo

    # padrão OpenAI
    if id_prov != 'ollama' and token:
        cabecalhos['Authorization'] = 'Bearer ' + token
    if id_prov == 'openrouter':
        cabecalhos['X-Title'] = 'Arena Estudos ALEPA'
    corpo = {'model': modelo, 'messages': mensagens, 'max_tokens': max_tokens, 'temperature': temperatura}
    return url, cabecalhos, corpo


def ler_resposta(id_prov, j):
    p = PROVEDORES.get(id_prov, {})
    if p.get('tipo') == 'gemini':
        c = (j.get('candidates') or [{}])[0]
        partes = ((c.get('content') or {}).get('parts') or [])
        return ''.join(x.get('text', '') for x in partes).strip()
    if p.get('tipo') == 'anthropic':
        for bloco in (j.get('content') or []):
            if bloco.get('type') == 'text':
                return bloco.get('text', '')
        return ''
    escolhas = j.get('choices') or []
    if escolhas and escolhas[0].get('message'):
        return escolhas[0]['message'].get('content', '')
    return ''
