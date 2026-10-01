# 🎯 Arena Estudos ALEPA — Concurso 002/2026 (Fundação CETAP)

App de estudos **offline** para o concurso da **Assembleia Legislativa do Estado do Pará (ALEPA)** — banca **Fundação CETAP**, cargo 15 (Analista Legislativo – Assistência Legislativa). Prova em **13/12/2026**.

## O que tem dentro

- **Banco com 1.704 questões comentadas** cobrindo as 14 matérias do cargo 15, com base legal, comentário e alternativas plausíveis
- **📥 Importador de provas antigas da CETAP**: cole o texto do PDF (Ctrl+C/Ctrl+V), o app separa enunciado, alternativas e gabarito e salva no seu banco
- **⚡ 13 geradores infinitos** de questões de RLM/Matemática, criadas na hora com resolução comentada
- **Tutor de IA** com 11 provedores configuráveis (chave própria), entre eles o trio gratuito **Hugging Face · Google Gemini · Groq**:
  - **⚖️ comparar** — a mesma pergunta para várias IAs ao mesmo tempo, resposta de cada uma lado a lado
  - **⚡ gerar questões em paralelo** com várias IAs, sem repetir
  - respostas **formatadas** (títulos, listas, tabelas e citações), sem markdown cru
- **Simulados** no estilo da banca, com cronômetro e correção comentada
- **Revisão espaçada (Leitner)**, caderno de erros, favoritas, estatísticas por matéria e por tópico do edital
- **Teoria de bolso** das 14 matérias + plano até a prova
- **PWA**: instale na tela inicial do celular e use offline; sincronização opcional do progresso na nuvem (Hugging Face)

## Como usar

1. Abra `index.html` no navegador (ou instale como app — veja `LEIA-PUBLICAR.md`).
2. No primeiro acesso o assistente pede seu nome, metas e ensina a criar a chave da IA (grátis).
3. Treine pelo banco, pelos geradores infinitos ou importe provas antigas.

Guia completo: **GUIA-COMPLETO.md** (o mesmo texto do LEIA-ME).

## Publicar na internet (grátis)

O pacote já está pronto para **Vercel**, **Netlify**, **Cloudflare Pages** ou **GitHub Pages** — instruções em `LEIA-PUBLICAR.md`.

## Testes

`smoke.js` (171 verificações), `geradores.js` e `telas.js` ficam na pasta `tests/` do projeto original — não são necessários para usar o app.
