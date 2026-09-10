import {makeRoom,ready,expire,guess,leave,rematch,view} from '../public/game.js';
import en from '../public/words-en.json' with {type:'json'};
import pt from '../public/words-pt.json' with {type:'json'};
import assets from './assets.js';
import {authRoute} from './auth.js';
import {protect,maintain} from './protection.js';
import {matchmaking} from './matchmaking.js';
const dictionaries={en,pt};const allowed={en:new Set(en.allowed),pt:new Set(pt.allowed)};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'}});
function answer(lang,previous){const words=dictionaries[lang].answers.filter(w=>w!==previous);const n=crypto.getRandomValues(new Uint32Array(1))[0];return words[n%words.length];}
async function hash(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
function db(env){if(!env.DB)throw Error('storage_unavailable');return env.DB.withSession?env.DB.withSession('first-primary'):env.DB;}
export default {async fetch(request,env){try{const url=new URL(request.url);if(!url.pathname.startsWith('/api/')){const path=url.pathname==='/'?'/index.html':url.pathname;const asset=assets[path];if(!asset)return new Response('Not found',{status:404});return new Response(asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-robots-tag':url.searchParams.has('room')?'noindex, nofollow':asset.type.startsWith('text/html')?'index, follow':'noindex','content-security-policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; script-src 'self' https://accounts.google.com/gsi/client; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com;  font-src 'self' data:; img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com"}});}
if(!['GET','POST'].includes(request.method))return json({error:'method'},405);
if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'origin'},403);
const storageForProtection=db(env);try{await maintain(storageForProtection);}catch(e){console.error('Cleanup failed',String(e));}
if(!await protect(request,storageForProtection))return new Response(JSON.stringify({error:'rate_limited'}),{status:429,headers:{'content-type':'application/json','cache-control':'no-store','retry-after':'60','x-robots-tag':'noindex, nofollow'}});
if(url.pathname.startsWith('/api/auth/'))return await authRoute(request,env,db(env));
const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(token))return json({error:'session'},401);const auth=await hash(token);const storage=db(env);
let body={};if(request.method==='POST'){const raw=await request.text();if(raw.length>2048)return json({error:'too_large'},413);try{body=JSON.parse(raw);}catch{return json({error:'invalid_request'},400);}}
if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'invalid_request'},400);
if(url.pathname.startsWith('/api/matchmaking/')){if(request.method!=='POST')return json({error:'method'},405);return await matchmaking(storage,auth,body,url.pathname.split('/').at(-1),answer);}
const now=Date.now();const name=String(body.name||'Player').trim().slice(0,24)||'Player';
if(url.pathname==='/api/rooms'&&request.method==='POST'){await storage.prepare('DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires < ? LIMIT 100)').bind(now).run();const config=body.settings||{};const g=makeRoom(config,name,auth,answer(config.lang==='pt'?'pt':'en'),now);for(let n=0;n<4;n++){const code=Array.from(crypto.getRandomValues(new Uint8Array(6))).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();try{await storage.prepare('INSERT INTO rooms (code,data,revision,expires) VALUES (?,?,0,?)').bind(code,JSON.stringify(g),g.expires).run();return json({code,revision:0,...view(g,0,now)});}catch(e){if(!String(e).includes('UNIQUE'))throw e;}}return json({error:'busy'},503);}
const match=url.pathname.match(/^\/api\/rooms\/([A-F0-9]{12})(?:\/(join|ready|guess|leave|rematch|info))?$/);if(!match)return json({error:'not_found'},404);const [,code,action]=match;if((action&&action!=='info'&&request.method!=='POST')||((!action||action==='info')&&request.method!=='GET'))return json({error:'method'},405);
for(let attempt=0;attempt<6;attempt++){const row=await storage.prepare('SELECT data,revision,expires FROM rooms WHERE code=?').bind(code).first();const now=Date.now();if(!row||row.expires<=now)return json({error:'room_expired'},404);const g=JSON.parse(row.data);if(action==='info'){if(g.online)return json({error:'not_found'},404);return json({settings:g.settings,available:g.status==='waiting'&&(!g.players[1]||g.players.some(x=>x?.auth===auth))});}let p=g.players.findIndex(x=>x?.auth===auth);let changed=false;
if(action==='join'&&p<0){if(g.online||g.status!=='waiting'||g.players[1])return json({error:'room_full'},409);g.players[1]={name,auth,ready:false};p=1;changed=true;}if(p<0)return json({error:'room_access'},403);
if(['ready','guess','leave','rematch'].includes(action)&&body.match!==g.match)return json({error:'stale_match',room:{code,revision:row.revision,...view(g,p,now)}},409);
changed=expire(g,now)||changed;
try{if(action==='ready'){ready(g,p,now);changed=true;}else if(action==='guess'){if(g.status==='playing'){guess(g,p,body.word,allowed[g.settings.lang],now);changed=true;}else if(!changed)return json({error:'not_playing'},409);}else if(action==='leave'){leave(g,p);changed=true;}else if(action==='rematch'){rematch(g,p,answer(g.settings.lang,g.answer));if(g.players.every(x=>x?.ready))ready(g,p,now);changed=true;}}catch(e){return json({error:e.message},400);}
if(!changed)return json({code,revision:row.revision,...view(g,p,now)});const result=await storage.prepare('UPDATE rooms SET data=?, revision=revision+1 WHERE code=? AND revision=?').bind(JSON.stringify(g),code,row.revision).run();if(result.meta.changes===1)return json({code,revision:row.revision+1,...view(g,p,now)});
}return json({error:'busy'},409);
}catch(e){console.error('Room request failed:',String(e));return json({error:'storage_unavailable'},503);}}};
