# 🎯 Arena Estudos ALEPA — Concurso 002/2026 (Fundação CETAP)

App de estudos **offline** para o concurso da **Assembleia Legislativa do Estado do Pará (ALEPA)**, conforme o **Anexo II** do Edital **002/2026** — **Cargo 15: Analista Legislativo – Assistência Legislativa**. Prova em **13/12/2026** · meta: **3.000 questões**.

Este repositório contém o **site pronto** (arquivo único) — não precisa compilar nada.

## ✨ O que tem dentro

- **1.704 questões comentadas** no banco (curadas no estilo CETAP + provas anteriores importáveis), 185 tópicos do edital
- **Treino** por matéria, **revisão espaçada** (Leitner), **simulados** com tempo e nota
- **Tutor de IA** com **11 provedores** configuráveis (Hugging Face, Groq, Gemini, OpenAI, etc.) — inclusive **2 IAs ao mesmo tempo** (comparar respostas) e **geração em paralelo**
- **Respostas formatadas** (títulos, listas, negrito, tabelas) — nada de markdown cru
- **Progresso na nuvem** com código próprio (Cloudflare Worker + KV): mesmo código no celular e no PC = mesmo progresso; sem token, sem login
- **Importador de provas antigas** da CETAP (cole o texto do PDF e o app monta as questões)
- Funciona **offline** e **instalável** na tela inicial (PWA)

## 🚀 Como usar

1. Abra o link publicado (Vercel / GitHub Pages / Netlify) **ou** baixe o `index.html` e abra no navegador.
2. No celular: **Compartilhar → Adicionar à Tela de Início** para virar app.
3. Botão **🔑** no topo → cole a chave da sua IA (fica salva **só no seu aparelho**).

Guias completos: **`PARA-GIT.md`** (como publicar) · **`LEIA-PUBLICAR.md`** (outros serviços) · **`cloudflare/LEIA-CLOUDFLARE.md`** (progresso na nuvem).

## 📁 Estrutura

| Arquivo | O que é |
|---|---|
| `index.html` | O app inteiro em um arquivo (questões, teoria, IA, simulados) |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | PWA: instalação e modo offline |
| `vercel.json`, `netlify.toml`, `_headers` | Configuração de publicação |
| `api/` | Funções opcionais (modo servidor para IA) |
| `cloudflare/` | Worker do progresso na nuvem (código próprio) |

## 🔐 Privacidade

Nenhuma chave de IA, progresso ou dado pessoal fica neste repositório: **as chaves são digitadas dentro do app e salvas apenas no aparelho**; o pacote enviado para a nuvem vai **sem segredos** e para a sua própria gaveta (código de progresso).

## 📅 Versão

**2026-10-06** — o selo com a data aparece no topo do app, embaixo do nome. Se estiver com data antiga, atualize (puxe para atualizar / reinstale o ícone).

---

Base: ALEPA nº 002/2026, Anexo II (Fundação CETAP). Projeto pessoal de estudos.
