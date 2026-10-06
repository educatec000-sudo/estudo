# 📤 Mandar o app para o Git (GitHub) e publicar na Vercel

Guia para quem **não programa**. Tempo: ~5 minutos. **Não precisa instalar nada.**
Vale para o repositório do **Arena Estudos ALEPA** (o app inteiro em 1 arquivo).

---

## 🧠 O que é "mandar para o Git" (em 3 linhas)

- **GitHub** é um site onde você guarda os arquivos do projeto. É de graça e serve como "backup público".
- Depois de guardar lá, você liga o GitHub na **Vercel**: ela pega os arquivos e publica o app num **link** (`https://seu-app.vercel.app`) que abre no celular e no PC.
- Sempre que você trocar um arquivo no GitHub, a Vercel **atualiza o link sozinho** (em ~30 segundos).

> 💡 Você **não precisa** do Git instalado no computador. Dá para fazer tudo pelo site, arrastando os arquivos.

---

## 📦 Antes de começar: o que vai ser enviado

Use o arquivo **`repositorio-git.zip`** (eu gero ele junto com este guia).
Descompacte em qualquer pasta do seu computador (botão direito → *Extrair aqui*).
Dentro dele estão **exatamente** os arquivos do site:

| Arquivo / pasta | Para que serve |
|---|---|
| `index.html` | **O app inteiro** (questões, teoria, IA, simulados, nuvem) |
| `manifest.webmanifest` | Faz o app poder ser "instalado" na tela do celular |
| `sw.js` | Faz funcionar **offline** depois da 1ª visita |
| `icon-192.png` / `icon-512.png` | Ícone do app |
| `vercel.json` | Configuração pronta para a Vercel |
| `netlify.toml`, `_headers` | O mesmo, para a Netlify (pode ignorar) |
| `api/` | Funções opcionais do modo servidor (pode ignorar) |
| `README.md` | A "capa" do repositório (texto que aparece no GitHub) |
| `LEIA-PUBLICAR.md`, `PARA-GIT.md` | Guias de publicação (este arquivo) |
| `cloudflare/` | O Worker do progresso na nuvem (opcional, já configurado por você) |

⚠️ **Sua chave de IA não vai aqui.** Ela é digitada dentro do app e fica salva **só no aparelho** — nunca vai para o repositório.

---

## ✅ Opção A — Pelo site do GitHub (recomendada, sem instalar nada)

### 1. Criar a conta (se ainda não tem)
1. Abra **https://github.com/signup**
2. Informe e-mail, senha e escolha um apelido (ex.: `rafael-alepa`).
3. Confirme o e-mail que eles mandam.

### 2. Criar o repositório
1. Já logado, clique no **`+`** (canto superior direito) → **New repository**.
2. Em **Repository name**, escreva: **`alepa-estudos`**
3. Deixe **Public** marcado (pode ser privado, mas público é mais simples e não expõe nada seu — não tem chave nenhuma aí).
4. **Não marque** nada de "Add a README file" (o README já vem no pacote).
5. Clique em **Create repository**.

### 3. Subir os arquivos
1. Na página que abriu, clique no link **"uploading an existing file"** (ou em **Add file → Upload files**).
2. Abra a pasta onde você extraiu o `repositorio-git.zip`.
3. **Selecione TODOS os arquivos de dentro dela** (Ctrl+A) e **arraste** para a área do GitHub. *Arraste os arquivos, não a pasta.*
4. Espere o envio (a barra verde) e clique no botão verde **Commit changes**.
5. Pronto: seus arquivos estão no Git. 🎉

> Se o arrastar não funcionar: clique em **choose your files** e selecione tudo de uma vez.

### 4. Publicar na Vercel (o link para usar no celular)
1. Abra **https://vercel.com/signup** e escolha **Continue with GitHub** (entra com a conta que você acabou de criar — não precisa de cartão).
2. Clique em **Add New… → Project** (ou **Import Project**).
3. Na lista, clique em **Import** ao lado de **`alepa-estudos`**.
4. Em **Framework Preset**, escolha **Other**. Não mude mais nada (Build Command vazio).
5. Clique em **Deploy** e espere ~30 segundos.
6. Copie o link que aparece (ex.: `https://alepa-estudos-xxxx.vercel.app`). **Esse é o seu app** — abra no celular e adicione à tela inicial.

### 5. (Alternativa grátis) GitHub Pages
Se não quiser a Vercel: no repositório, vá em **Settings → Pages** → em *Branch* escolha **`main`** e **`/ (root)`** → **Save**.
Depois de 1 minuto o link fica em `https://SEU-APELIDO.github.io/alepa-estudos/`.

---

## 🖥️ Opção B — Com o Git instalado (para quem já usa o terminal)

```bash
# 1) baixe e descompacte o repositorio-git.zip, entre na pasta
cd repositorio-git

# 2) ligue a pasta a um repositório novo do GitHub (crie antes na conta, sem README)
git init
git add -A
git commit -m "Arena Estudos ALEPA — versao 2026-10-06"
git branch -M main
git remote add origin https://github.com/SEU-APELIDO/alepa-estudos.git
git push -u origin main
```

Se pedir senha, use um **token** (GitHub → *Settings → Developer settings → Personal access tokens → Fine-grained*, permissão de *Contents: Read and write*) no lugar da senha.
Depois, o passo 4 acima (Vercel) é o mesmo.

---

## 🔄 Como atualizar quando eu te mandar uma versão nova do app

**Pelo site (mesma Opção A):**
1. Abra o repositório → **Add file → Upload files**.
2. Arraste o **`index.html` novo** (e o `sw.js`, se mudou) — pode sobrescrever, o GitHub avisa.
3. **Commit changes**. Em ~30 segundos a Vercel já publica a versão nova no mesmo link.
4. No app instalado do celular: abra, **puxe para atualizar**; se o selo de versão não mudar, remova o ícone da tela inicial e instale de novo.

**Com Git:**
```bash
git add -A && git commit -m "versao nova" && git push
```

> 🔎 **Como conferir a versão que está no ar:** no topo do app, embaixo do nome, aparece **"versão AAAA-MM-DD"** (esta versão é **2026-10-06**). Se aparecer "—" ou uma data antiga, o aparelho está com cópia velha ou com cache: puxe para atualizar.

---

## 🛟 Erros comuns

| O que aparece | O que fazer |
|---|---|
| **404 / página em branco** na Vercel | O `index.html` não está na **raiz** do repositório. Confira: abra o repositório e veja se `index.html` aparece logo na lista (não dentro de outra pasta). |
| "A pasta não pode ser enviada" no GitHub | Você arrastou a **pasta**. Entre nela e arraste os **arquivos de dentro**. |
| Vercel mostrou "Build failed" | Em *Settings → Framework Preset* deixe **Other** e **Build Command vazio** / **Output Directory** vazio. É site estático, não precisa compilar. |
| App abriu, mas sem ícone / não instala | Falta o `manifest.webmanifest` ou os `icon-*.png` no repositório. Suba os dois. |
| Progresso não sincroniza | Isso é **dentro do app**: aba **📈 Progresso → ☁️ Progresso na nuvem** e confira endereço do Worker + código (guia: `cloudflare/LEIA-CLOUDFLARE.md`). |
| Apareceu "versão" antiga no app instalado | Cache do PWA: puxe para atualizar; persistindo, remova o ícone e instale de novo. |

---

## 🔐 Privacidade (o que vai e o que não vai para o Git)

- **Vai para o Git:** só o app, os textos de estudo e as imagens do ícone. Nada pessoal.
- **Não vai:** chaves de IA, seu progresso de estudo, seu código de progresso na nuvem. Tudo isso fica **no aparelho** (e, no caso do progresso, na sua gaveta privada do Cloudflare).
- Quer o repositório **privado**? Em *Settings → General → Danger Zone → Change visibility* → Private. A Vercel continua funcionando.

---

Quer que eu gere o pacote de novo com os arquivos já prontos? Ele está em **`repositorio-git.zip`** (na mesma pasta deste guia).
