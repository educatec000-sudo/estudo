# 🎯 Arena Estudos ALEPA — Concurso 002/2026 (Fundação CETAP)

App de estudos (PWA, funciona offline) para o concurso da **Assembleia Legislativa do Estado do Pará — ALEPA 002/2026**, banca **Fundação CETAP**, **Cargo 15 — Analista Legislativo / Assistência Legislativa**. Prova em **13/12/2026**.

> Feito a partir do **Anexo II (Conteúdo Programático)** do edital.

## ✨ O que tem

- **Banco com 1.704 questões comentadas** cobrindo as 14 matérias do cargo 15 (com base legal, comentário e alternativas plausíveis)
- **📥 Importador de provas antigas da CETAP**: cola o texto do PDF (Ctrl+C/Ctrl+V), o app separa enunciado, alternativas e gabarito e salva no seu banco
- **⚡ 13 geradores infinitos** de questões de RLM/Matemática, criadas na hora com resolução comentada
- **⏱️ Simulados** com cronômetro, correção comentada e diagnóstico por matéria
- **🤖 Tutor de IA com 11 provedores** (Hugging Face, Google Gemini, Groq, ChatGPT, Claude, OpenRouter, Mistral, DeepSeek, Grok, IA local e API própria)
  - reserva automática entre IAs
  - **⚖️ comparar**: a mesma pergunta para várias IAs ao mesmo tempo
  - **⚡ gerar questões em paralelo** com várias IAs, sem repetir
  - diagnóstico que explica em português qualquer erro de chave/cota/rede
- **📚 Resumos de bolso** das 14 matérias + marcação de tópicos estudados
- **📈 Progresso**: streak, heatmap, desempenho por matéria, revisão espaçada (Leitner), conquistas, backup
- **☁️ Sincronização** do progresso entre celular e computador (repositório privado no Hugging Face do próprio usuário)
- **📲 Instalável**: funciona offline depois da primeira visita; `manifest` + service worker + ícones

## 🚀 Publicar (escolha um)

**Vercel** — importe este repositório em [vercel.com/new](https://vercel.com/new). Framework: **Other**, sem build. O `vercel.json` já cuida do cache do service worker e a pasta `api/` deixa a chave da IA fora do navegador.

**GitHub Pages** — *Settings → Pages → Source: Deploy from a branch → main / (root)*. O arquivo `.nojekyll` já está incluído.

**Netlify / Cloudflare Pages** — arraste os arquivos em [app.netlify.com/drop](https://app.netlify.com/drop) ou use *Upload assets* no Cloudflare.

Depois de publicar, abra o link no celular e toque em **📲 Instalar aplicativo** (Android/Chrome) ou **Compartilhar → Adicionar à Tela de Início** (iPhone/Safari).

## 🔑 A chave da IA

A chave **não fica no repositório** (e nem deve): ela é digitada **dentro do app**, no botão **🔑** no topo, e fica salva apenas no aparelho.

- **Grátis**: Hugging Face (padrão), Google Gemini, Groq, OpenRouter (modelos `:free`)
- **Pagos**: ChatGPT, Claude, Mistral, DeepSeek, Grok
- **Offline**: Ollama / LM Studio no seu computador

## ☁️ Sincronização entre aparelhos

Usa um repositório **privado de dataset** na conta do próprio usuário no Hugging Face (a chave precisa de permissão de escrita). Nada passa por servidores de terceiros.

## ⚠️ Avisos

- O banco foi escrito a partir do conteúdo programático e da legislação vigente — **confira sempre o edital oficial** e os canais da Fundação CETAP.
- A IA pode errar: use as respostas como apoio, não como gabarito.
- Seu progresso fica no navegador do aparelho. Limpou os dados, perdeu o histórico — use **Exportar backup** ou a sincronização em nuvem.

## 📄 Licença

Uso pessoal e educacional. O conteúdo programático pertence à ALEPA/Fundação CETAP; este app não tem vínculo oficial com a banca.
