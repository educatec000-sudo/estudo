# 📦 Pacote para publicar — Arena Estudos ALEPA

Esta pasta é o **site pronto**. Não precisa de build, nem de programar nada.

## Conteúdo
| Arquivo | O que é |
|---|---|
| `index.html` | O app inteiro (questões, teoria, IA, simulados) — 1 arquivo |
| `manifest.webmanifest` | Faz virar "aplicativo instalável" no celular |
| `sw.js` | Service worker: funciona offline após a 1ª visita |
| `icon-192.png` / `icon-512.png` | Ícone do app |
| `vercel.json` | Configuração opcional para Vercel (pode apagar se usar outro serviço) |
| `netlify.toml` / `_headers` | Idem, para Netlify (opcional) |

## Publicar em 1 minuto (escolha um)

**Vercel** (precisa do Node instalado no PC):
```bash
cd publicar
npx vercel --prod      # entra/cria conta, Enter em tudo
```
Ou: suba esta pasta no GitHub e importe em **vercel.com/new** → Framework Preset: **Other** → Build Command vazio → Output/Root Directory: a pasta.

**Netlify** (sem instalar nada): abra **app.netlify.com/drop** e **arraste esta pasta**.

**Cloudflare Pages**: **pages.cloudflare.com** → *Upload assets* → arraste a pasta.

**GitHub Pages**: crie um repositório, envie estes arquivos e ative Pages em *Settings → Pages*.

Depois de publicar, abra o link no celular e toque em **📲 Instalar aplicativo** (Android/Chrome) ou **Compartilhar → Adicionar à Tela de Início** (iPhone/Safari).

> 🔑 A chave do Hugging Face é digitada **dentro do app** (botão 🔑 no topo, ou no assistente da primeira abertura). Ela fica salva só no aparelho.
