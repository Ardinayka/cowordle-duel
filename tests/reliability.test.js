import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testEnv} from './d1.js';
import {readBudget,takeCooldown,maintain,cleanupExpired} from '../server/protection.js';
import {roomPresence} from '../server/presence.js';
import {supportRoute} from '../server/support.js';
import {matchmaking} from '../server/matchmaking.js';
import {makeRoom,ready} from '../public/game.js';
import worker from '../dist/server/index.js';

test('buffered read budgets remain atomic under contention and avoid per-poll counter writes',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());let writes=0;
 const DB={prepare(q){writes++;return e.DB.prepare(q);}};
 const results=await Promise.all(Array.from({length:250},()=>readBudget(DB,'buffered-test',240,60000,10)));
 assert.equal(results.filter(Boolean).length,240);assert(writes<=25);
 for(let n=0;n<20;n++)assert.equal(await readBudget(DB,'buffered-test',240,60000),false);
 assert.equal(writes,25);assert.equal(await readBudget(DB,'buffered-test',240,120000),true);
});

test('shared-network read capacity accommodates 100 players polling 40 times per minute',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());let writes=0;
 const DB={prepare(q){writes++;return e.DB.prepare(q);}};
 for(let user=0;user<100;user++)for(let poll=0;poll<40;poll++)assert.equal(await readBudget(DB,'school-network',12000,180000,40),true);
 assert.equal(writes,100);
});

test('friend cooldown measures elapsed time across window boundaries',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 assert.equal(await takeCooldown(e.DB,'elapsed-test',599999,600000),true);
 assert.equal(await takeCooldown(e.DB,'elapsed-test',600001,600000),false);
 assert.equal(await takeCooldown(e.DB,'elapsed-test',1199998,600000),false);
 assert.equal(await takeCooldown(e.DB,'elapsed-test',1199999,600000),true);
});

test('maintenance coalesces concurrent polls without deleting live data',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 await Promise.all(Array.from({length:40},()=>maintain(e.DB,900000)));
 assert.equal(e.sql.prepare("SELECT count FROM request_limits WHERE id='maintenance:15'").get().count,1);
});

test('connection states use sparse heartbeats and leave game rules untouched',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());const start=100000;
 const g=makeRoom({mode:'duel',seconds:0},'One','seat-a','crane',start);g.players[1]={name:'Two',auth:'seat-b',ready:false};
 const original=JSON.stringify(g);
 assert.deepEqual(await roomPresence(e.DB,g,'ABCDEF123456','seat-a',start),['connected','connected']);
 await roomPresence(e.DB,g,'ABCDEF123456','seat-b',start);
 await roomPresence(e.DB,g,'ABCDEF123456','seat-a',start+1000);
 assert.equal(e.sql.prepare("SELECT seen_at FROM room_presence WHERE seat='seat-a'").get().seen_at,start);
 assert.deepEqual(await roomPresence(e.DB,g,'ABCDEF123456','seat-a',start+36000),['connected','reconnecting']);
 assert.deepEqual(await roomPresence(e.DB,g,'ABCDEF123456','seat-a',start+91000),['connected','offline']);
 assert.deepEqual(await roomPresence(e.DB,g,'ABCDEF123456','seat-b',start+92000),['connected','connected']);
 assert.equal(JSON.stringify(g),original);
});

const supportRequest=(seat='a',body={kind:'bug',message:'My keyboard did not respond.'},origin='https://game.test',ip)=>new Request('https://game.test/api/support',{method:'POST',headers:{origin,'content-type':'application/json',authorization:'Bearer '+seat.repeat(64),...(ip?{'cf-connecting-ip':ip}:{})},body:JSON.stringify(body)});
test('reports validate input, reject cross-origin submissions, limit spam, and remain private',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 assert.equal((await supportRoute(supportRequest('a',undefined,'https://other.test'),e.DB)).status,403);
 for(const body of [{kind:'unknown',message:'A useful message'}, {kind:'bug',message:'short'}, {kind:'bug',message:'A useful message',email:'invalid'}, {kind:'bug',message:'A useful message',website:'spam'}, {kind:'abuse',message:'A useful message',playerTag:'invalid'}])assert.equal((await supportRoute(supportRequest('a',body),e.DB)).status,400);
 for(let n=0;n<3;n++){const response=await supportRoute(supportRequest(),e.DB);assert.equal(response.status,200);assert.match((await response.json()).reference,/^[A-F0-9]{12}$/);}
 const blocked=await supportRoute(supportRequest(),e.DB);assert.equal(blocked.status,429);assert.equal(blocked.headers.get('retry-after'),'3600');
 assert.equal(e.sql.prepare('SELECT count(*) AS n FROM support_reports').get().n,3);
 assert.equal((await worker.fetch(new Request('https://game.test/api/support',{headers:{authorization:'Bearer '+'a'.repeat(64)}}),e)).status,404);
});

test('rotating guest tokens cannot bypass the hourly report network cap',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 for(let n=0;n<10;n++)assert.equal((await supportRoute(supportRequest(String(n),undefined,undefined,'192.0.2.100'),e.DB)).status,200);
 assert.equal((await supportRoute(supportRequest('f',undefined,undefined,'192.0.2.100'),e.DB)).status,429);
 assert.equal(e.sql.prepare('SELECT count(*) AS n FROM support_reports').get().n,10);
 assert(!JSON.stringify(e.sql.prepare('SELECT id FROM request_limits').all()).includes('192.0.2.100'));
 await cleanupExpired(e.DB,Date.now()+91*86400000);assert.equal(e.sql.prepare('SELECT count(*) AS n FROM support_reports').get().n,0);
});

function queue(e,seat,tag,search=seat){return matchmaking(e.DB,seat,{searchId:search.repeat(32),name:'Player',mode:'duel',lang:'en'},'search',()=> 'crane',tag);}
test('concurrent sessions of one verified account cannot queue or match against each other',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 const responses=await Promise.all([queue(e,'a','LEX-000000000001'),queue(e,'b','LEX-000000000001')]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 assert.equal(e.sql.prepare('SELECT count(*) AS n FROM match_queue').get().n,1);assert.equal(e.sql.prepare('SELECT count(*) AS n FROM rooms').get().n,0);
 const paired=await (await queue(e,'c','LEX-000000000002')).json();assert.equal(paired.status,'matched');
 assert.equal(new Set(paired.room.players.map(p=>p.tag)).size,2);
});

test('an abandoned same-account match does not lock a new device out',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 await queue(e,'a','LEX-000000000001');const match=await (await queue(e,'b','LEX-000000000002')).json();
 const row=e.sql.prepare('SELECT data FROM rooms WHERE code=?').get(match.room.code),g=JSON.parse(row.data);g.readyUntil=Date.now()-1;
 e.sql.prepare('UPDATE rooms SET data=? WHERE code=?').run(JSON.stringify(g),match.room.code);
 const response=await queue(e,'c','LEX-000000000001');assert.equal(response.status,200);assert.equal((await response.json()).status,'searching');
 // Starting a new search does not modify another game's rules or result.
 assert.equal(e.sql.prepare('SELECT data FROM rooms WHERE code=?').get(match.room.code).data,JSON.stringify(g));
});

test('blocked accounts cannot be paired, including a block between candidate selection and commit',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 for(const [id,tag] of [['one','LEX-000000000001'],['two','LEX-000000000002']]){e.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run(id,id,id,Date.now());e.sql.prepare('INSERT INTO friend_profiles (user_id,tag) VALUES (?,?)').run(id,tag);}
 await queue(e,'a','LEX-000000000001');const originalBatch=e.DB.batch;let blocked=false;
 e.DB.batch=async statements=>{if(!blocked){blocked=true;e.sql.prepare('INSERT INTO player_blocks VALUES (?,?,?,?)').run('one:two','one','two',Date.now());}return originalBatch.call(e.DB,statements);};
 const response=await (await queue(e,'b','LEX-000000000002')).json();assert.equal(blocked,true);assert.equal(response.status,'searching');assert.equal(e.sql.prepare('SELECT count(*) AS n FROM rooms').get().n,0);
});

test('public binary assets preserve bytes, support conditional caching, and keep legal/help pages accessible',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 const response=await worker.fetch(new Request('https://game.test/lexivanto-logo.webp'),e);
 assert.equal(response.headers.get('content-type'),'image/webp');const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert(bytes.length<25000);
 const etag=response.headers.get('etag');assert(etag);
 const cached=await worker.fetch(new Request('https://game.test/lexivanto-logo.webp',{headers:{'if-none-match':etag}}),e);assert.equal(cached.status,304);assert.equal((await cached.text()).length,0);
 const head=await worker.fetch(new Request('https://game.test/lexivanto-logo.webp',{method:'HEAD'}),e);assert.equal((await head.text()).length,0);
 const html=await (await worker.fetch(new Request('https://game.test/'),e)).text();const versioned=html.match(/(?:\.\/|\/)?lexivanto-logo\.webp\?v=[a-f0-9]+/)[0];
 assert.match((await worker.fetch(new Request(new URL(versioned,'https://game.test/')),e)).headers.get('cache-control'),/immutable/);
 for(const path of ['/privacy.html','/contact.html'])assert.equal((await worker.fetch(new Request('https://game.test'+path),e)).status,200);
 const sitemap=await (await worker.fetch(new Request('https://game.test/sitemap.xml'),e)).text();assert.equal((sitemap.match(/<loc>/g)||[]).length,8);
 for(const loc of sitemap.match(/<loc>[^<]+/g)){const r=await worker.fetch(new Request(loc.slice(5).replace('https://lexivanto.com','https://game.test')),e);assert.equal(r.status,200,loc);assert.equal(r.headers.get('x-robots-tag'),'index, follow',loc);}
 const og=await worker.fetch(new Request('https://game.test/og-image.png'),e);assert.equal(og.headers.get('content-type'),'image/png');assert.deepEqual([...new Uint8Array(await og.arrayBuffer()).slice(1,4)],[80,78,71]);
});

test('the advertised 800-character report limit accepts Unicode within its byte budget',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());const response=await worker.fetch(supportRequest('c',{kind:'feedback',message:'漢'.repeat(800)}),e);assert.equal(response.status,200);assert.equal(e.sql.prepare('SELECT message FROM support_reports').get().message.length,800);
});
