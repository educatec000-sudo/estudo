# 🎯 Arena Estudos ALEPA — Concurso 002/2026 (Fundação CETAP)

App de estudos feito a partir do **Anexo II (Conteúdo Programático)** do Edital nº 001/2026 da **Assembleia Legislativa do Estado do Pará**, focado no **Cargo 15 — Analista Legislativo — Assistência Legislativa** (o cargo com 44 vagas, cuja prova cobra o bloco *"Conhecimentos Específicos comuns aos cargos 01, 02, 03, 12, 13, 14 e 15"*).

**Prova: 13/12/2026** — o app calcula sozinho quantas questões por dia você precisa fazer.

---

## 1️⃣ ACESSAR DE QUALQUER LUGAR (escolha uma opção)

### Opção A — Publicar grátis na internet (recomendado: vira um app de verdade)

O app já está pronto para publicar: existe a pasta **`publicar/`** (e o arquivo **`publicar.zip`**) com tudo o que o site precisa.

**✅ Funciona na Vercel? Sim.** O pacote é 100% estático (um `index.html` + ícones + manifest), sem build e sem servidor — exatamente o tipo de coisa que a Vercel serve de graça, com HTTPS. E o mais importante: eu testei os endpoints do Hugging Face a partir de um domínio tipo Vercel e **todos liberam CORS**, então tanto a **IA** quanto a **sincronização** funcionam direto do navegador com a sua chave. (O único recurso que fica de fora é o proxy do `server.py`, que na Vercel não é necessário.)

**Na Vercel — opção 1 (linha de comando, ~2 min):**
1. Instale o Node.js (nodejs.org) se ainda não tiver.
2. Baixe/descompacte a pasta `publicar` e abra o terminal dentro dela.
3. Rode: `npx vercel --prod` → ele pede login (dá para entrar com Google/GitHub), depois Enter em todas as perguntas.
4. No fim ele imprime o link: `https://seu-app.vercel.app`. Pronto — abre em qualquer aparelho, de qualquer lugar.

**Na Vercel — opção 2 (pelo site, com GitHub):**
1. Crie um repositório no GitHub e envie os arquivos da pasta `publicar`.
2. Vá em **vercel.com/new** → *Import Git Repository* → escolha o repositório.
3. Framework Preset: **Other** · Build Command: *(deixe vazio)* · Root/Output Directory: **a pasta onde estão os arquivos**.
4. **Deploy**. Cada atualização que você enviar ao GitHub republica sozinho.

> O arquivo `vercel.json` que vem no pacote já ajusta o cache do service worker (garante que a atualização do app chegue ao seu celular). Não precisa mexer nele.

**Sem instalar nada (Netlify Drop):**
1. Abra **[app.netlify.com/drop](https://app.netlify.com/drop)**.
2. **Arraste a pasta `publicar`** para dentro da página (ou o `publicar.zip`).
3. Pronto: endereço tipo `https://seu-app-alepa.netlify.app`.

> Outras opções igualmente gratuitas: **Cloudflare Pages** (pages.cloudflare.com → *Upload assets*) ou **GitHub Pages**. O pacote traz também `netlify.toml` e `_headers` já configurados.

**No celular Android:** dá para publicar tudo pelo navegador — baixe o zip, extraia com o app "Files"/"RAR" e envie pelo site do Netlify/Cloudflare.

### Opção B — Instalar na tela inicial do celular (funciona offline!)

Quando você abrir o app pelo link publicado:
- **Android (Chrome):** aparece um aviso "Instalar aplicativo" ou toque no botão **📲** no topo do app → **Instalar**.
- **iPhone (Safari):** toque em **Compartilhar** → **Adicionar à Tela de Início**.

O ícone fica igual a um app normal, abre em tela cheia e funciona **offline** depois da primeira visita (só a IA precisa de internet).

### Opção C — Só para você, sem publicar

Baixe o arquivo **`ALEPA_Estudos.html`** e abra (duplo clique no PC, ou "abrir com Chrome" no celular). Funciona 100% offline; o progresso fica salvo no aparelho. É a melhor opção se você não quer expor nada na internet.

### Sincronizar o progresso entre celular e computador ☁️

Se você estudar nos dois aparelhos, ative a nuvem:
1. Aba **📈 Progresso** → bloco **☁️ Sincronizar progresso**.
2. Escreva um nome de repositório, ex.: `seuusuario/alepa-progresso`.
3. Clique em **1️⃣ Criar repositório privado** → depois em **⬆️ Enviar progresso**.
4. No outro aparelho, coloque o **mesmo nome de repositório** e clique em **⬇️ Baixar progresso**.

Fica tudo num repositório **privado da sua própria conta** do Hugging Face — nada passa por servidores de terceiros. Para isso a chave precisa ter permissão de **escrita** (veja abaixo). Sem isso, use o backup por arquivo (⬇️ Exportar / ⬆️ Importar).

---

## 2️⃣ ONDE COLOCAR A CHAVE DA SUA IA 🔑 (e como usar OUTRAS IAs)

Agora existem **3 lugares** para fazer isso (o app te guia no primeiro):

| Onde | Quando aparece |
|---|---|
| **Assistente da primeira abertura** | Na primeira vez que você abre o app — o passo 2 de 3 é exatamente isso, com o passo a passo na tela |
| **Botão 🔑 no topo da tela** | Sempre visível, em todas as abas |
| **Aba 🤖 IA / Hugging Face** | Botão amarelo "Informar minha chave do Hugging Face" |

### Passo a passo (1 minuto, grátis, sem cartão)

1. Crie a conta (ou entre) em **huggingface.co/join**.
2. Abra **huggingface.co/settings/tokens → New token**.
3. Tipo: **Fine-grained**. Marque a permissão **“Make calls to Inference Providers”**.
   - *Quer também usar a sincronização entre aparelhos?* Marque **“Write access to contents of repos”**.
   - Alternativa mais simples: crie um token **Read** (serve para a IA) ou **Write** (serve para IA + nuvem).
4. Clique em **Create token** e **copie** o código que começa com `hf_`.
5. No app: toque em **🔑** → **cole no campo** → **💾 Salvar e testar**. Se aparecer "✅ Chave funcionando!", está tudo pronto.
6. Se aparecer qualquer erro, clique em **🔍 Testar tudo (diagnóstico)**: ele diz em português o que está errado e como resolver.

> 🔒 A chave fica salva **somente no seu aparelho**. Você pode revogá-la a qualquer momento na mesma página do Hugging Face. Use Fine-grained só com Inference Providers: mesmo que vaze, não dá acesso à sua conta.

### Se der erro

Se algo falhar, **clique no botão 🔍 "Testar tudo (diagnóstico)"** dentro da janela da chave: ele testa o endereço do app, verifica se a sua chave é válida e experimenta 3 modelos, dizendo em português exatamente o que está errado.

| Mensagem | O que fazer |
|---|---|
| "Failed to fetch" / "Não alcancei huggingface.co" | A chamada nem saiu do navegador. Acontece quando o app está aberto **como arquivo local (`file://`)** ou dentro de um **visualizador/preview restrito** (por exemplo, o preview aqui dentro da conversa): nesses lugares o navegador bloqueia a conversa com o Hugging Face. **Publique o app** (Opção A) ou rode o servidor local e abra por `http://localhost:8000`. |
| "O Hugging Face RECUSOU a chave (erro 401)" | A chave está incompleta, expirou ou foi revogada. Gere outra em huggingface.co/settings/tokens (New token → Fine-grained → "Make calls to Inference Providers"). |
| "A chave não tem permissão (erro 403)" | Falta marcar "Make calls to Inference Providers". Se o modelo for Llama ou Gemma, aceite a licença na página do modelo. |
| "O modelo ... não está com provedor disponível (404)" | Não precisa fazer nada: o app já troca de modelo sozinho. Se preferir escolher manualmente, use o seletor no botão 🔑 (o **openai/gpt-oss-120b** é o que tem mais provedores). |
| "Limite do plano gratuito atingido (429)" | Espere 1 minuto e tente de novo — a cota renova sozinha. |
| "Não consegui falar com huggingface.co" (mas o app está publicado) | Internet caiu, ou VPN/antivírus/DNS bloqueando o site. Teste abrir huggingface.co no mesmo aparelho. |
| A resposta demora e dá "tempo esgotado" | Escolha um modelo mais leve no seletor (Qwen/Qwen3-8B) ou tente de novo. |

> O app **troca de modelo automaticamente** quando o escolhido não tem provedor disponível no momento e avisa qual passou a usar. Você não precisa entender nada disso para estudar.

### 🔀 Quero usar OUTRA IA além do Hugging Face (ChatGPT, Gemini, Groq…)?

Dá — o app aceita **11 opções de IA**, cada uma com a sua própria chave:

| IA | Custo | Onde pegar a chave |
|---|---|---|
| **Hugging Face** (padrão) | grátis | huggingface.co/settings/tokens → permissão “Make calls to Inference Providers” |
| **Google Gemini** | grátis | aistudio.google.com/apikey → “Create API key” |
| **Groq** (a mais rápida) | grátis | console.groq.com/keys |
| **OpenRouter** (vários modelos) | grátis nos modelos com `:free` | openrouter.ai/settings/keys |
| **ChatGPT (OpenAI)** | pago | platform.openai.com/api-keys |
| **Claude (Anthropic)** | pago | console.anthropic.com/settings/keys |
| **Mistral** | plano de teste | console.mistral.ai/api-keys |
| **DeepSeek** | pago e barato | platform.deepseek.com/api_keys |
| **Grok (xAI)** | pago | console.x.ai |
| **IA no seu computador** (Ollama/LM Studio) | grátis e offline | instale o Ollama e rode `ollama pull llama3.2` |
| **Outra IA** (qualquer serviço compatível com OpenAI) | depende | você informa o endereço e a chave |

**Como trocar/ligar:** toque no botão **🔑 no topo do app** → escolha a IA na lista → cole a chave → **💾 Salvar e testar**.
- O botão **🔄 buscas modelos** mostra todos os modelos que a *sua* chave enxerga — assim você nunca erra o nome do modelo.
- Pode ligar **quantas quiser**: o app usa a principal e, se ela falhar (sem cota, caiu a internet, chave sem permissão), **passa sozinho para a próxima** e avisa qual usou.
- **Prefere IA grátis?** O trio Hugging Face + Gemini + Groq é 100% gratuito e, com as três ligadas, é quase impossível ficar sem IA.
- **Sobre a nuvem de progresso:** só o **Hugging Face** guarda o seu progresso entre aparelhos (as outras servem para conversar e gerar questões). Se quiser sincronizar, mantenha uma chave do Hugging Face ligada — nem que seja como reserva.
### ⚡ Dá para usar DUAS OU MAIS IAs AO MESMO TEMPO? Dá — de três jeitos

**1) Reserva automática (já vem ligada).** Se a IA principal falhar (cota cheia, internet, chave sem permissão), o app **passa sozinho** para a próxima ligada e avisa qual usou. Você nem percebe.

**2) Comparar respostas (⚖️).** Na aba **🤖 IA**, acima do campo de pergunta, marque **“perguntar para as N IAs ao mesmo tempo”**. O app manda a *mesma* pergunta para todas em paralelo e mostra uma resposta por IA, com **nome e tempo de cada uma**. É ótimo quando uma explicação não convence: você compara com a outra e escolhe a melhor — e, para conteúdo jurídico, é a melhor forma de perceber quando uma IA errou.
- Cada IA enxerga **só as próprias respostas anteriores** (as conversas não se misturam).
- Achou a melhor? Clique em **“seguir só com esta”** e a conversa continua apenas com ela.
- Se uma falhar, as outras respondem normalmente e o app mostra o motivo da falha.

**3) Gerar questões em paralelo (⚡).** Na mesma aba, no gerador de questões, marque **“usar todas as N IAs ligadas ao mesmo tempo”**: cada uma gera o lote pedido, o app **junta tudo e descarta as questões repetidas**. Pedindo 5 com 3 IAs ligadas dá até 15 questões de uma vez — e cada questão fica marcada com a IA que a criou. É o jeito mais rápido de engordar o banco rumo às 3.000 questões.

> No botão **🔑** existe a seção **“Uso simultâneo”**, onde você marca **quais** IAs participam (máximo 4, para não estourar as cotas grátis). Deixando tudo desmarcado, valem todas as ligadas. Dica: HF + Gemini + Groq (as três grátis) dão um bom equilíbrio de velocidade e qualidade.

- **Privacidade:** todas as chaves ficam **só no seu aparelho**; quando você publica com o `publicar/api/`, elas passam pelo seu próprio deploy em vez de irem direto do navegador. O backup e a nuvem **não levam nenhuma chave**.

### Modo servidor (opcional, para quem usa computador)

```bash
python3 app/server.py              # abre em http://localhost:8000
# ou já com a chave embutida (não precisa digitar no app):
HF_TOKEN=hf_suachave python3 app/server.py
```

O servidor serve o app (com manifest, service worker e ícones) e faz o proxy das chamadas de IA e de sincronização — o token deixa de trafegar no navegador.

---

## 3️⃣ O que tem dentro do app

| Recurso | O que faz |
|---|---|
| 🎯 **Painel** | Dias até a prova, meta diária recalculada, sequência (streak), heatmap de 35 dias, desempenho por matéria |
| ✍️ **Treinar** | Filtros por matéria, tópico do edital, dificuldade e modo (não vistas / caderno de erros / revisão de hoje / favoritas) |
| ⚡ **Geradores infinitos** | 13 tipos de questões de RLM/Matemática criadas na hora, com resolução comentada — não acabam nunca |
| ⏱️ **Simulado** | Monte provas com a distribuição que quiser, cronômetro, correção comentada e diagnóstico por matéria |
| 🤖 **IA** | Tutor do edital em **11 IAs diferentes** (com reserva automática, modo **⚖️ comparar** e **⚡ gerar questões em paralelo**) + "explicar minha questão errada" |
| 📚 **Teoria** | Resumos de bolso das 14 matérias + tópicos oficiais para marcar como estudados |
| 📈 **Progresso** | Prioridades, tópicos mais errados, evolução dos simulados, conquistas, nuvem e backup |
| 🗓️ **Plano até a prova** | Cronograma dos próximos 7 dias + estratégia por peso das matérias |

**Banco inicial:** 291 questões comentadas + 14 matérias com resumo + 13 geradores infinitos.

Língua Portuguesa 30 · Legislação e Ética 30 · Informática 28 · Raciocínio Lógico 25 · Secretaria/Adm. Geral 24 · Direito Administrativo 28 · Direito Constitucional 24 · Processual Constitucional 10 · **Processo Legislativo/RIALEPA/LC 95: 30** · Financeiro 12 · Previdenciário 12 · Civil 16 · Processual Civil 12 · Direitos Humanos 10.

---

## 4️⃣ Estratégia para passar de 3.000 questões até 13/12

| Fonte | Volume estimado |
|---|---|
| Banco curado | 291 |
| Geradores infinitos — 15 min/dia ≈ 25 questões | ~1.850 em 74 dias |
| Questões geradas pela IA (5 por clique, 1 tópico/dia) | ~370 |
| Simulados (2 por semana × 60 questões) | ~1.200 |
| **Total possível** | **~3.700** |

Rotina sugerida: **manhã** 20 questões do banco (matéria fraca) → **tarde** 20 nos geradores → **noite** 1 tópico gerado por IA + um resumo de bolso. **Domingo:** simulado de 60 questões e correção no mesmo dia.

Prioridades (o app já ordena assim na aba Plano): **Processo Legislativo/RIALEPA** e **Técnica Legislativa (LC 95/1998)** no topo, depois **Direito Administrativo**, **Língua Portuguesa** e **Legislação e Ética**.

---

## 5️⃣ Arquivos do projeto

```
ALEPA_Estudos.html      ← o app completo em arquivo único (offline)  📌
LEIA-ME.md              ← este guia
publicar/               ← pacote pronto para publicar (index, manifest, sw, ícones)  📌
  └─ api/               ← (Vercel) intermediário que guarda a sua chave fora do navegador
publicar.zip            ← o mesmo pacote zipado, para subir na Vercel/Netlify/Cloudflare
  ├─ vercel.json        ← ajustes de cache p/ Vercel (opcional)
  ├─ netlify.toml, _headers ← ajustes equivalentes p/ Netlify e Cloudflare
  └─ LEIA-PUBLICAR.md   ← instruções curtas (as mesmas de cima, resumidas)
app/
  server.py             ← servidor local (app + proxy de IA + sincronização em nuvem)
  build.py              ← regenera o app a partir das fontes
  src/app.ias.js        ← as 11 IAs: chaves, modelos, reserva, uso simultâneo e diagnóstico
  provedores.py         ← os mesmos provedores, para o servidor intermediar a chamada
  data/edital.json      ← árvore de tópicos do Anexo II (14 matérias)
  data/teoria.json      ← resumos de bolso
  questoes/*.json       ← banco de questões comentadas (14 arquivos)
  pwa/                  ← manifest.webmanifest e sw.js (modo aplicativo/offline)
  assets/               ← ícones do app (192 e 512 px)
  src/                  ← template, CSS e JavaScript
tests/
  smoke.js              ← 46 verificações do app (assistente, chave, IA, abas, sync, PWA)
  geradores.js          ← confere os 13 geradores, o banco e os filtros
uploads/alepa.pdf       ← o edital que você enviou
```

Para rodar os testes: `cd tests && npm install jsdom && node smoke.js && node geradores.js`.

### Como adicionar mais questões

1. Crie/edite um arquivo em `app/questoes/` (ex.: `15_novas.json`):

```json
[{
  "id": "DA-029", "materia": "DA", "topico": "Licitações: Lei nº 14.133/2021",
  "dif": "media", "banca": "Fundação CETAP", "ano": 2026,
  "enunciado": "Sua pergunta aqui.",
  "alternativas": ["A", "B", "C", "D", "E"],
  "correta": 2,
  "comentario": "Explicação com base legal.",
  "analise": "(opcional) análise de cada alternativa",
  "ref": "(opcional) dispositivo/assunto"
}]
```
2. Rode `python3 app/build.py` → o app é regerado (`ALEPA_Estudos.html`, `publicar/` e `publicar.zip`). Basta republicar a pasta para atualizar o site.

Códigos de matéria: `LP, LE, INFO, RL, SEC, DA, DC, DPC, PL, DF, DPREV, DCIV, DPCIV, DH`.

---

## 6️⃣ Avisos importantes

- O banco foi escrito a partir **do conteúdo programático que você enviou** e da legislação vigente; confira sempre o **Anexo II oficial** e o site da Fundação CETAP. A IA pode errar — trate as respostas dela como apoio, não como gabarito.
- Para o **Regimento Interno da ALEPA** e os **Decretos Legislativos/Resoluções** citados no edital, combine as questões (concentradas na matéria de Processo Legislativo) com a leitura do texto atualizado — e use a IA para resumir cada diploma.
- O app estima o peso das matérias porque o edital não divulga o número de questões por matéria; ajuste conforme seu desempenho.
- Seu progresso fica no navegador/aparelho. Limpar os dados do navegador apaga o histórico — **exporte o backup** (aba Progresso) ou use a **sincronização em nuvem**.
