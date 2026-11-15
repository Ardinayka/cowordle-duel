import {readFileSync} from 'node:fs';

// Development-only responsive fixture using the actual shipped header and CSS.
export function headerPreview(selectedWidth) {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const head = html.match(/<head>[\s\S]*?<\/head>/)[0].replace('<head>','<head><base href="/"><meta charset="utf-8">');
  const header = html.match(/<header[\s\S]*?<\/header>/)[0];
  const frames = [320,390,683,768,1366].filter(w=>!selectedWidth||w===selectedWidth).flatMap(width => ['guest','profile','back'].map(state => {
    let content = header;
    if(state === 'profile') content = content.replace('>Sign in<','>Profile<');
    if(state === 'back') content = content.replace('id="back-button" hidden','id="back-button"');
    const doc = '<!doctype html><html data-theme="dark">'+head+'<body>'+content+'</body></html>';
    return '<h2>'+width+'px · '+state+'</h2><iframe title="'+width+' '+state+'" style="display:block;width:'+width+'px;height:110px;border:0" srcdoc="'+doc.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"></iframe>';
  })).join('');
  return '<!doctype html><html><head><meta charset="utf-8"><title>Header regression matrix</title></head><body><details><summary>Measurements</summary><pre id="results">Loading</pre></details>'+frames+`<script>
  window.addEventListener('load',()=>{
    const results=[...document.querySelectorAll('iframe')].map(f=>{
      const d=f.contentDocument;
      const buttons=[...d.querySelectorAll('header button')].filter(b=>b.getBoundingClientRect().width>0);
      const rects=buttons.map(b=>({id:b.id,r:b.getBoundingClientRect()}));
      const failures=[];
      for(const {id,r} of rects){if(r.width<44||r.height<44)failures.push(id+': target below 44px');if(r.left<0||r.right>f.clientWidth)failures.push(id+': outside viewport');}
      for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i].r,b=rects[j].r;if(a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom)failures.push(rects[i].id+' overlaps '+rects[j].id);}
      return {state:f.title,failures};
    });document.querySelector('#results').textContent=JSON.stringify(results,null,2);
  });</script></body></html>`;
}
