# ☁️ Progresso na nuvem com Cloudflare (sem token, sem repositório)

Este é o jeito mais simples de deixar o progresso do app **Arena Estudos ALEPA** igual no celular e no PC — e de dar um **código próprio** para outra pessoa usar sem mexer nos seus estudos.

**Você não precisa saber programar:** é copiar e colar em 3 lugares do painel do Cloudflare. Leva ~5 minutos, uma vez só.

**Custo:** grátis. O plano gratuito do Cloudflare Workers dá 100.000 requisições por dia e 1 GB de armazenamento — seu progresso ocupa poucos KB e o app faz 1 ou 2 requisições por dia.

---

## Antes de começar

- Tenha em mãos o arquivo **`worker.js`** (está nesta pasta).
- Crie a conta em **[dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)** (e-mail e senha; **não pede cartão** para Workers).

---

## Passo 1 — Criar o Worker

1. No painel, no menu da esquerda, clique em **Compute (Workers)** → **Workers & Pages**.
2. Clique em **Create** → **Workers** → **Start with Hello World** (ou "Create Worker").
3. Nome: **`alepa-progresso`** → **Deploy**.
4. Vai aparecer uma tela com o código de exemplo. Clique em **Edit code** (ou "Edit").
5. **Apague tudo** que estiver lá e **cole o conteúdo do `worker.js`**.
6. Clique em **Deploy** (canto superior direito). Confirme.
7. Copie o endereço do Worker, que aparece em cima: algo como
   `https://alepa-progresso.SEU-USUARIO.workers.dev`
   **Guarde esse endereço** — ele vai para o app.

> Se o menu tiver outro nome por causa de atualização do painel, procure por **Workers & Pages** ou **Compute**.

## Passo 2 — Criar a "gaveta" (KV) onde o progresso é guardado

1. No menu da esquerda: **Storage & Databases** → **KV**.
2. Clique em **Create instance** (ou "Create a namespace").
3. Nome: **`alepa_progresso`** → **Create/Add**.

## Passo 3 — Ligar a gaveta ao Worker

1. Volte em **Workers & Pages** → clique no Worker **`alepa-progresso`**.
2. Abra **Settings** → **Bindings** (em algumas contas aparece como **Variables and Secrets**).
3. Clique em **Add** → escolha **KV namespace**.
4. **Variable name:** `PROGRESSO` (exatamente assim, em maiúsculas).
5. **KV namespace:** escolha **`alepa_progresso`**.
6. Clique em **Deploy** / **Save and Deploy** para aplicar.

## Passo 4 — Testar (bem rápido)

Abra no navegador:

```
https://alepa-progresso.SEU-USUARIO.workers.dev/health
```

Deve aparecer algo assim:

```json
{"ok":true,"servico":"alepa-progresso","versao":1,"hora":"..."}
```

✅ Se apareceu isso, está pronto.

⚠️ Se apareceu um aviso dizendo que falta a KV: volte ao **Passo 3** (o nome da variável tem que ser `PROGRESSO`).

## Passo 5 — Usar no app

1. Abra o app → aba **📈 Progresso** → bloco **☁️ Progresso na nuvem (Cloudflare)**.
2. **Endereço do Worker:** cole o endereço do Passo 1.
3. **Código de progresso:** clique em **🎲 gerar** (ou invente um, ex. `ALEPA-7K3F-92QX`).
4. Clique em **⬆️ Enviar progresso** — aparece "enviado" com data e hora.
5. No outro aparelho: mesmo endereço, **mesmo código** → **⬇️ Baixar progresso**. Pronto: os dois ficam iguais.
6. Ligue **sincronizar automaticamente**: o app procura novidades da nuvem ao abrir e envia quando você estuda.

### Para outra pessoa usar sem interferir nos seus estudos

Ela **não usa o seu código**. Ela gera o dela (ex.: `ALEPA-9Q1M-55ZT`) e passa a ter a própria gaveta. Os dois usam o mesmo app, no mesmo aparelho ou em aparelhos diferentes, e **nada se mistura**.

> 🔒 Trate o código como uma senha: quem souber o código consegue ler e gravar aquele progresso. Use códigos com 12 caracteres ou mais (o botão 🎲 gera assim). E não anote o seu código junto do da outra pessoa.

---

## Perguntas rápidas

**Preciso pagar alguma coisa?** Não. Está dentro do plano grátis (100.000 requisições/dia; o app usa umas 2 a 5).

**Preciso deixar o computador ligado?** Não. O Worker roda na rede da Cloudflare, 24 horas por dia.

**E se eu não usar por semanas?** Nada acontece: não dorme, não apaga. O progresso fica guardado.

**Perdi o código, e agora?** Sem o código não há como recuperar aquele progresso (é a única chave). O app continua funcionando no aparelho que já tinha os dados — use **⬇️ Exportar progresso (JSON)** para guardar um backup.

**Quero trocar de código.** É só gerar outro no app e clicar em Enviar: o progresso passa a ser guardado no código novo (o antigo fica como está, na nuvem).

**Isso substitui o Hugging Face?** Não precisa substituir nada: os dois caminhos convivem na aba Progresso. O Cloudflare é só mais simples (não tem token nem repositório).

**Dá para exigir senha/e-mail para abrir o app?** Dá, com o **Cloudflare Access** (grátis até 50 pessoas), mas ele pode pedir cartão de crédito para ativar. O caminho sem cartão é o código de progresso: sem o código, ninguém acessa os dados.

---

## Arquivos desta pasta

| Arquivo | Para que serve |
|---|---|
| `worker.js` | o código que você cola no Cloudflare (Passo 1) |
| `wrangler.toml` | só para quem for publicar pelo computador (opcional) |
| `LEIA-CLOUDFLARE.md` | este guia |
