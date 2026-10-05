const fs=require('fs');const {JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('/home/user/ALEPA_Estudos.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.vercel.app/'});
setTimeout(()=>{
 const w=dom.window;
 const amostra = `**Questão** – Lei Anticorrupção (Lei nº 12.846/2013) – "Qual é a natureza da responsabilidade das pessoas jurídicas?"

**Gabarito oficial:** **B) objetiva, na esfera administrativa e civil**

A seguir, explicamos passo a passo por que a alternativa B é a correta.

---

## 1. Por que a alternativa **B** está correta

| Dispositivo da Lei 12.846/2013 | Conteúdo relevante |
|-------------------------------|--------------------|
| **Art. 1º** | Estabelece a **responsabilidade objetiva** da pessoa jurídica. |
| Art. 2º | A responsabilidade é **civil** e **administrativa**. |

**Resumo:**
- **Objetiva** → basta a comprovação do ato lesivo;
- **Esfera administrativa e civil** → multas e reparação integral do dano.

> Dica de prova: a pessoa jurídica não responde criminalmente.

1. Leia o caput do art. 1º
2. Fixe: objetiva, não subjetiva
3. Revise as sanções do art. 12

\`\`\`
art. 1º — responsabilidade objetiva
\`\`\`

Veja também [a lei no Planalto](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm).

<script>window.__xss = 1</script>
<img src=x onerror="window.__xss=2">`;
 const html = w.fmtTxt(amostra);
 console.log(html.slice(0,1200));
 console.log('\n--- checagens ---');
 const chk = {
  'sem ** cru': !html.includes('**'),
  'sem ## cru': !html.includes('##'),
  'tem strong': html.includes('<strong>'),
  'tem tabela': html.includes('<table>') && html.includes('<th>'),
  'tem lista': html.includes('<ul>') && html.includes('<li>'),
  'tem lista numerada': html.includes('<ol>'),
  'tem hr': html.includes('<hr>'),
  'tem blockquote': html.includes('<blockquote>'),
  'tem pre': html.includes('<pre><code>'),
  'tem link': html.includes('rel="noopener noreferrer"'),
  'sem script injetado': !/<script/i.test(html),
  'sem img injetada': !/<img/i.test(html),
  'sem onerror cru': !/onerror=/.test(html) || html.includes('&lt;img'),
  'começa com .md': html.startsWith('<div class="md">'),
 };
 Object.entries(chk).forEach(([k,v])=>console.log((v?'OK  ':'FALHOU ')+k));
 // injeta e verifica execução
 const d=dom.window.document; const div=d.createElement('div'); div.innerHTML=html; d.body.appendChild(div);
 console.log('XSS executou?', w.__xss === undefined ? 'não ✅' : 'SIM ❌ ' + w.__xss);
 console.log('marcadores visíveis na tela:', /\*\*|##|\|\s*-{2,}/.test(d.body.textContent) ? 'AINDA' : 'nenhum ✅');
 // tabela larga no celular: wrapper com overflow
 console.log('wrapper da tabela:', /<div class="md-tab">/.test(html));
}, 1200);
