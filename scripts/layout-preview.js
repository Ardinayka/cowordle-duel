import {readFileSync} from 'node:fs';

// Development-only layout stress cases; never shipped as application routes.
export function layoutPreview(width=390,state='menu') {
  width=[320,390,683,768,1366].includes(width)?width:390;
  const states=['menu','profile-dialog','friends-dialog','leaderboard-dialog','help-dialog','privacy-dialog','delete-dialog','leave-dialog','result'];
  if(!states.includes(state))state='menu';
  let source=readFileSync(new URL('../public/index.html',import.meta.url),'utf8').replace('<head>','<head><base href="/">').replace(/<script[\s\S]*?<\/script>/g,'');
  source=source.replace('</body>',`<script>
  const state=${JSON.stringify(state)};
  if(state!=='menu')document.getElementById(state).showModal();
  if(state==='result'){document.getElementById('result-title').textContent='You solved it!';document.getElementById('result-detail').textContent='Congratulations. You solved the word in 6 guesses.';}
  if(state==='leaderboard-dialog'){document.getElementById('leaderboard-mine').textContent='1000 rating · 9/10 placement games · 1250 XP';document.getElementById('leaderboard-list').innerHTML='<li><strong><span>#100</span> LongPlayerUsername123456</strong><span>1234 · 100W</span></li>'.repeat(12);}
  </script></body>`);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Layout audit</title></head><body style="margin:0"><iframe title="${state} ${width}" style="display:block;width:${width}px;height:740px;border:0" srcdoc="${source.replaceAll('&','&amp;').replaceAll('"','&quot;')}"></iframe><pre id="measurements"></pre><script>window.addEventListener('load',()=>{const d=document.querySelector('iframe').contentDocument,w=d.documentElement.clientWidth;const root=d.querySelector('dialog[open]')||d.body;const es=[...root.querySelectorAll('button,input,select,h1,h2,h3,p,strong,.mode-badge,.mode-glyph,li>span')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden');const out=[];for(const e of es){const r=e.getBoundingClientRect();if(r.left<-.5||r.right>w+.5)out.push('outside '+(e.id||e.textContent.slice(0,35)));}for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++){const a=es[i],b=es[j];if(a.contains(b)||b.contains(a))continue;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2)out.push('overlap '+(a.id||a.textContent.slice(0,25))+' / '+(b.id||b.textContent.slice(0,25)));}document.querySelector('#measurements').textContent=JSON.stringify(out);});</script></body></html>`;
}
