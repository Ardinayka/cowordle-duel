// Release check (AGENTS.md): lobby and Me at laptop, tablet and phone sizes. Run against a local or deployed build:
// BASE=https://lexivanto-preview.quinta-de-seves.workers.dev/ node scripts/desktop-fit-check.cjs
// Expect: the Me cards (stats, settings) aligned in one column, no page x-overflow, lobby overflow 0 at laptop sizes.
const {chromium}=require('playwright');const S=require('os').tmpdir()+'/';const BASE=process.env.BASE||'http://localhost:8788/';
(async()=>{const b=await chromium.launch();const out=[];
for(const [w,h,theme] of [[1280,720,'dark'],[1366,768,'light'],[1536,864,'dark'],[1024,640,'dark'],[768,1024,'dark'],[390,844,'dark'],[320,568,'light']]){const ctx=await b.newContext({viewport:{width:w,height:h}});await ctx.addInitScript(t=>localStorage.setItem('lexivanto-preferences',JSON.stringify({theme:t})),theme);const p=await ctx.newPage();await p.goto(BASE);await p.waitForTimeout(2200);
 await p.click('#profile-button');await p.waitForTimeout(500);
 const prof=await p.evaluate(()=>{const r=x=>{const b=document.querySelector(x)?.getBoundingClientRect();return b?[Math.round(b.left),Math.round(b.right)]:null;};return {btn:r('#stats-section'),panel:r('#profile-dialog .feedback-settings')};});
 await p.click('#tab-play');await p.waitForTimeout(400);await p.click('#way-friend');await p.click('#step-games [data-mode=duel]');await p.waitForTimeout(400);await p.click('#create');await p.waitForTimeout(2200);
 const l=await p.evaluate(()=>{const lob=document.getElementById('lobby');const players=document.querySelector('.players');return {overflow:lob.scrollHeight-lob.clientHeight,playersShown:getComputedStyle(players).display!=='none',pageOverflowX:document.documentElement.scrollWidth-innerWidth};});
 await p.screenshot({path:S+`fit-${w}.png`});
 out.push(`${w}x${h} ${theme} Me stats ${prof.btn} settings ${prof.panel} | lobby overflow ${l.overflow}px, top players row shown ${l.playersShown}, page x-overflow ${l.pageOverflowX}`);await ctx.close();}
console.log(out.join('\n'));await b.close();})();
