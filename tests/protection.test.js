import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testEnv} from './d1.js';
import {takeBudget,cleanupExpired,protect} from '../server/protection.js';
import worker from '../dist/server/index.js';
test('atomic shared budgets cap concurrent requests and reset next minute',async()=>{const {DB}=testEnv();const results=await Promise.all(Array.from({length:20},()=>takeBudget(DB,'test',10,60000)));assert.equal(results.filter(Boolean).length,10);assert.equal(await takeBudget(DB,'test',10,120000),true);});
test('create throttling does not block leaving or ordinary polling',async()=>{const {DB}=testEnv();const request=path=>new Request('https://game.test'+path,{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(64)}});for(let i=0;i<10;i++)assert.equal(await protect(request('/api/rooms'),DB,60000),true);assert.equal(await protect(request('/api/rooms'),DB,60000),false);assert.equal(await protect(request('/api/rooms/ABCDEF123456/leave'),DB,60000),true);assert.equal(await protect(request('/api/rooms/ABCDEF123456'),DB,60000),true);});
test('cleanup deletes expired records but retains rematch rooms and cancellation fences',async()=>{const {DB,sql}=testEnv();sql.exec("INSERT INTO rooms VALUES ('expired','{}',0,1),('finished','{}',0,999999); INSERT INTO retired_searches VALUES ('live',999999),('old',1); INSERT INTO auth_sessions VALUES ('live','user','csrf',999999),('old','user','csrf',1)");await cleanupExpired(DB,60000);assert.equal(sql.prepare('SELECT count(*) AS n FROM rooms').get().n,1);assert.equal(sql.prepare('SELECT code FROM rooms').get().code,'finished');assert.equal(sql.prepare('SELECT id FROM retired_searches').get().id,'live');assert.equal(sql.prepare('SELECT hash FROM auth_sessions').get().hash,'live');});
test('worker returns 429 with retry guidance after room creation quota',async()=>{const env=testEnv();let response;for(let i=0;i<11;i++)response=await worker.fetch(new Request('https://game.test/api/rooms',{method:'POST',headers:{authorization:'Bearer '+'b'.repeat(64)},body:'{}'}),env);assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');assert.equal(env.sql.prepare('SELECT count(*) AS n FROM rooms').get().n,10);});
test('public guides and sitemap are served but room invitations are noindex',async()=>{const env=testEnv();for(const path of ['/how-to-play.html','/game-modes.html','/play-with-friends.html','/about.html','/robots.txt','/sitemap.xml']){const r=await worker.fetch(new Request('https://game.test'+path),env);assert.equal(r.status,200,path);}for(const path of ['/?room=','/index.html?room=ABC']){const r=await worker.fetch(new Request('https://game.test'+path),env);assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');}});

test('oversized and malformed seat requests are rejected before database access',async()=>{
 const DB={prepare(){throw Error('Database must not be reached');}};
 const headers={authorization:'Bearer '+'a'.repeat(64)};
 for(const request of [
  new Request('https://game.test/api/rooms',{method:'POST',headers:{...headers,'content-length':'3000'},body:'{}'}),
  new Request('https://game.test/api/rooms',{method:'POST',headers,body:'x'.repeat(2049)}),
  new Request('https://game.test/api/rooms',{method:'POST',headers,body:'é'.repeat(1025)})
 ])assert.equal((await worker.fetch(request,{DB})).status,413);
 assert.equal((await worker.fetch(new Request('https://game.test/api/rooms',{headers:{authorization:'x'.repeat(200)}}),{DB})).status,401);
});
test('chunked body is cancelled when byte budget is exceeded',async()=>{
 const {boundedBody}=await import('../server/request-body.js');let cancelled=false;
 const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(1024));},cancel(){cancelled=true;}});
 const request=new Request('https://game.test/api/rooms',{method:'POST',body,duplex:'half'});
 await assert.rejects(()=>boundedBody(request,2048),error=>error.status===413);
 assert.equal(cancelled,true);
});
test('longer cooldown budgets survive a minute boundary and expire',async()=>{
 const {DB}=testEnv();
 assert.equal(await takeBudget(DB,'pair',1,60000,600000),true);
 assert.equal(await takeBudget(DB,'pair',1,120000,600000),false);
 assert.equal(await takeBudget(DB,'pair',1,600000,600000),true);
});
test('maintenance expires stale friend requests without deleting friendships',async()=>{
 const {DB,sql}=testEnv(),now=10*86400000;
 sql.prepare('INSERT INTO friendships VALUES (?,?,?,?,?,?)').run('stale','a','b','a','pending',1);
 sql.prepare('INSERT INTO friendships VALUES (?,?,?,?,?,?)').run('accepted','a','c','a','accepted',1);
 sql.prepare('INSERT INTO friendships VALUES (?,?,?,?,?,?)').run('fresh','a','d','a','pending',now);
 await cleanupExpired(DB,now);
 assert.deepEqual(sql.prepare('SELECT id FROM friendships ORDER BY id').all().map(x=>x.id),['accepted','fresh']);
});
