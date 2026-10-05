const fs=require('fs');const {JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('/home/user/ALEPA_Estudos.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.vercel.app/'});
setTimeout(()=>{const w=dom.window;const d=w.document;
const t=fs.readFileSync('/home/user/tests/md-amostra.txt','utf8');
const html=w.fmtTxt(t);const div=d.createElement('div');div.innerHTML=html;d.body.appendChild(div);
const txt=d.body.textContent;
const m=txt.match(/.{0,60}(\*\*|##|\|\s*-{2,}).{0,60}/g);
console.log('ocorrências:', m ? m.slice(0,5) : 'nenhuma');
}, 1200);
