import {test} from 'node:test';import assert from 'node:assert/strict';import {testEnv} from './d1.js';import {friendsRoute} from '../server/friends.js';import {authRoute,hash} from '../server/auth.js';
async function setup(){const env=testEnv();for(const [id,digit] of [['a','a'],['b','b'],['c','c']]){env.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run(id,id,'Player '+id,Date.now());env.sql.prepare('INSERT INTO auth_sessions VALUES (?,?,?,?)').run(await hash(digit.repeat(64)),id,'csrf-'+id,Date.now()+60000);}const call=async(id,path='',body,origin='https://game.test')=>{const r=await friendsRoute(new Request('https://game.test/api/friends'+(path?'/'+path:''),{method:body?'POST':'GET',headers:{cookie:'__Host-lexivanto_session='+id.repeat(64),authorization:'Bearer '+'d'.repeat(64),origin,'content-type':'application/json'},...(body?{body:JSON.stringify({csrf:'csrf-'+id,...body})}:{})}),env.DB);return {status:r.status,...await r.json()};};return {...env,call};}
test('friend request requires recipient consent; only parties can accept or remove it',async()=>{const e=await setup();const a=await e.call('a'),b=await e.call('b');await e.call('c');assert.equal((await e.call('a','request',{tag:b.tag})).ok,true);assert.equal((await e.call('a','accept',{tag:b.tag})).status,409);assert.equal((await e.call('c','accept',{tag:a.tag})).status,409);assert.equal((await e.call('b')).friends[0].incoming,1);assert.equal((await e.call('b','accept',{tag:a.tag})).ok,true);assert.equal((await e.call('a')).friends[0].status,'accepted');await e.call('a','remove',{tag:b.tag});assert.equal((await e.call('b')).friends.length,0);e.sql.close();});
test('friends mutation rejects foreign origins, wrong CSRF, self and invalid tags',async()=>{const e=await setup(),a=await e.call('a'),b=await e.call('b');assert.equal((await e.call('a','request',{tag:b.tag},'https://evil.test')).status,403);assert.equal((await e.call('a','request',{tag:b.tag,csrf:'wrong'})).status,403);assert.equal((await e.call('a','request',{tag:a.tag})).status,404);assert.equal((await e.call('a','request',{tag:'guess'})).status,400);e.sql.close();});
test('challenges require friendship and room ownership and are private to the recipient',async()=>{const e=await setup(),a=await e.call('a'),b=await e.call('b');await e.call('c');const code='ABCDEF123456';e.sql.prepare('INSERT INTO rooms VALUES (?,?,0,?)').run(code,JSON.stringify({status:'waiting',players:[{auth:await hash('d'.repeat(64))},null],settings:{mode:'duel',seconds:30}}),Date.now()+60000);assert.equal((await e.call('a','challenge',{tag:b.tag,code})).status,403);await e.call('a','request',{tag:b.tag});await e.call('b','accept',{tag:a.tag});assert.equal((await e.call('a','challenge',{tag:b.tag,code:'wrong'})).status,403);assert.equal((await e.call('a','challenge',{tag:b.tag,code})).ok,true);const invites=(await e.call('b')).challenges;assert.equal(invites.length,1);assert.equal((await e.call('c')).challenges.length,0);assert.equal((await e.call('c','accept-challenge',{id:invites[0].id})).status,404);assert.equal((await e.call('b','accept-challenge',{id:invites[0].id})).code,code);await e.call('a','remove',{tag:b.tag});assert.equal((await e.call('b')).challenges.length,0);e.sql.close();});

// Yield after a completed read so another request can invalidate its result.
function afterRead(db,query,interleave){
 let fired=false;
 return {...db,prepare(sql){
  const statement=db.prepare(sql);
  if(sql===query){const first=statement.first;statement.first=async()=>{
   const result=await first.call(statement);
   if(!fired){fired=true;await interleave();}
   return result;
  };}
  return statement;
 }};
}
function mutation(id,path,body){return new Request('https://game.test/api/'+path,{method:'POST',headers:{cookie:'__Host-lexivanto_session='+id.repeat(64),authorization:'Bearer '+'d'.repeat(64),origin:'https://game.test','content-type':'application/json'},body:JSON.stringify({csrf:'csrf-'+id,...body})});}

test('account deletion during a friend request cannot leave an invisible friendship',async t=>{
 const e=await setup();t.after(()=>e.sql.close());
 await e.call('a');const b=await e.call('b');let deleted=false;
 const db=afterRead(e.DB,'SELECT * FROM friendships WHERE id=?',async()=>{
  const response=await authRoute(mutation('a','auth/delete',{}),{},e.DB);
  assert.equal(response.status,200);deleted=true;
 });
 const response=await friendsRoute(mutation('a','friends/request',{tag:b.tag}),db);
 assert.equal(deleted,true);
 assert.equal(response.status,409);
 assert.equal(e.sql.prepare('SELECT COUNT(*) AS count FROM auth_profiles WHERE id=?').get('a').count,0);
 assert.equal(e.sql.prepare('SELECT COUNT(*) AS count FROM friendships').get().count,0);
 assert.deepEqual((await e.call('b')).friends,[]);
});

test('removal during challenge creation cannot resurrect an invitation',async t=>{
 const e=await setup();t.after(()=>e.sql.close());
 const a=await e.call('a'),b=await e.call('b'),code='ABCDEF123456';
 await e.call('a','request',{tag:b.tag});await e.call('b','accept',{tag:a.tag});
 e.sql.prepare('INSERT INTO rooms VALUES (?,?,0,?)').run(code,JSON.stringify({status:'waiting',players:[{auth:await hash('d'.repeat(64))},null],settings:{mode:'duel',seconds:30}}),Date.now()+60000);
 let removed=false;
 const db=afterRead(e.DB,'SELECT data,expires FROM rooms WHERE code=?',async()=>{
  assert.equal((await e.call('b','remove',{tag:a.tag})).status,200);removed=true;
 });
 const response=await friendsRoute(mutation('a','friends/challenge',{tag:b.tag,code}),db);
 assert.equal(removed,true);
 assert.equal(response.status,409);
 assert.equal(e.sql.prepare('SELECT COUNT(*) AS count FROM friendships').get().count,0);
 assert.equal(e.sql.prepare('SELECT COUNT(*) AS count FROM friend_challenges').get().count,0);
 await e.call('a','request',{tag:b.tag});await e.call('b','accept',{tag:a.tag});
 assert.deepEqual((await e.call('b')).challenges,[]);
});

test('usernames are normalized, unique under competing claims, and searchable without private IDs',async t=>{
 const e=await setup();t.after(()=>e.sql.close());await e.call('a');await e.call('b');
 const claims=await Promise.all([e.call('a','username',{username:'WordFox'}),e.call('b','username',{username:'wordfox'})]);
 assert.deepEqual(claims.map(x=>x.status).sort(),[200,409]);const owner=claims[0].ok?'a':'b',other=owner==='a'?'b':'a';
 assert.equal((await e.call(owner,'username',{username:'@WORDFOX'})).ok,true);
 const found=await e.call(other,'search',{query:'@WordFox'});assert.equal(found.players[0].name,'wordfox');assert.equal(found.players[0].user_id,undefined);assert.equal(found.players[0].online,undefined);
 assert.equal((await e.call(other,'search',{query:found.players[0].tag})).players[0].username,'wordfox');
 for(const name of ['ab','a'.repeat(21),'two words','123player','éclair','admin'])assert.notEqual((await e.call(other,'username',{username:name})).status,200);
 const me=await authRoute(new Request('https://game.test/api/auth/me',{headers:{cookie:'__Host-lexivanto_session='+owner.repeat(64)}}),{},e.DB);assert.equal((await me.json()).user.name,'wordfox');
 assert.equal((await e.call(other,'username',{username:'validname',csrf:'bad'})).status,403);
 assert.equal((await e.call(other,'username',{username:'validname'},'https://evil.test')).status,403);
});
test('renaming preserves friends, and an opponent request still requires acceptance',async t=>{
 const e=await setup();t.after(()=>e.sql.close());const a=await e.call('a'),b=await e.call('b');
 await e.call('a','username',{username:'first_name'});await e.call('b','request',{tag:a.tag});
 assert.equal((await e.call('a','search',{query:b.tag})).players[0].incoming,true);
 await e.call('a','accept',{tag:b.tag});await e.call('a','username',{username:'new_name'});
 const friend=(await e.call('b')).friends[0];assert.equal(friend.name,'new_name');assert.equal(friend.tag,a.tag);assert.equal(friend.status,'accepted');
 assert.deepEqual((await e.call('b','search',{query:'first_name'})).players,[]);
});
test('online identities use server-verified player tags and guests cannot use a claimed username',async t=>{
 const e=await setup();t.after(()=>e.sql.close());const worker=(await import('../dist/server/index.js')).default;
 const a=await e.call('a'),b=await e.call('b');await e.call('a','username',{username:'wordfox'});
 const send=async(id,path,body,signed=true)=>{const r=await worker.fetch(new Request('https://game.test'+path,{method:'POST',headers:{origin:'https://game.test','content-type':'application/json',authorization:'Bearer '+id.repeat(64),...(signed?{cookie:'__Host-lexivanto_session='+id.repeat(64)}:{})},body:JSON.stringify(body)}),e);return {status:r.status,...await r.json()};};
 assert.equal((await send('c','/api/rooms',{name:'WordFox',settings:{mode:'duel'}},false)).error,'username_reserved');e.sql.prepare('UPDATE auth_profiles SET display_name=? WHERE id=?').run('WordFox','c');assert.equal((await send('c','/api/rooms',{name:'anything',settings:{mode:'duel'}})).error,'username_reserved');
 await send('a','/api/matchmaking/search',{name:'spoof',tag:b.tag,mode:'duel',lang:'en',searchId:'a'.repeat(32)});
 const match=await send('b','/api/matchmaking/search',{name:'spoof',tag:a.tag,mode:'duel',lang:'en',searchId:'b'.repeat(32)});
 assert.equal(match.status,'matched');assert.equal(match.room.players.find(p=>p.name==='wordfox').tag,a.tag);
 assert.deepEqual(match.room.players.map(p=>p.tag).sort(),[a.tag,b.tag].sort());assert.equal(match.room.players[0].auth,undefined);
});

test('declined requests cannot be immediately sent again and retries remain idempotent',async t=>{
 const e=await setup();t.after(()=>e.sql.close());const a=await e.call('a'),b=await e.call('b');
 assert.equal((await e.call('a','request',{tag:b.tag})).status,200);
 assert.equal((await e.call('a','request',{tag:b.tag})).status,200);
 assert.equal((await e.call('b','remove',{tag:a.tag})).status,200);
 assert.equal((await e.call('a','request',{tag:b.tag})).status,429);
 assert.deepEqual((await e.call('b')).friends,[]);
});
test('pending requests have a separate incoming cap',async t=>{
 const e=await setup();t.after(()=>e.sql.close());await e.call('a');const b=await e.call('b');
 for(let i=0;i<20;i++)e.sql.prepare('INSERT INTO friendships VALUES (?,?,?,?,?,?)').run('pending'+i,'b','peer'+i,'peer'+i,'pending',Date.now());
 assert.equal((await e.call('a','request',{tag:b.tag})).status,409);
 assert.equal(e.sql.prepare("SELECT count(*) AS n FROM friendships WHERE status='pending'").get().n,20);
});

test('accepted friend limit is enforced when pending requests are accepted',async t=>{
 const e=await setup();t.after(()=>e.sql.close());const a=await e.call('a'),b=await e.call('b');
 await e.call('a','request',{tag:b.tag});
 for(let i=0;i<100;i++){
 e.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run('peer'+i,'google'+i,'Peer '+i,Date.now());
 e.sql.prepare('INSERT INTO friend_profiles (user_id,tag) VALUES (?,?)').run('peer'+i,'LEX-'+i.toString(16).padStart(12,'0'));
 e.sql.prepare('INSERT INTO friendships VALUES (?,?,?,?,?,?)').run('accepted'+i,'b','peer'+i,'peer'+i,'accepted',Date.now());
}
 assert.equal((await e.call('b','accept',{tag:a.tag})).status,409);
 assert.equal(e.sql.prepare("SELECT count(*) AS n FROM friendships WHERE status='accepted'").get().n,100);
 assert.equal((await e.call('b')).friends.length,101);
});

test('blocking removes friendship and challenges, persists after refresh, and cannot be undone by the blocked account',async t=>{
 const e=await setup();t.after(()=>e.sql.close());const a=await e.call('a'),b=await e.call('b');
 await e.call('a','request',{tag:b.tag});await e.call('b','accept',{tag:a.tag});
 e.sql.prepare('INSERT INTO friend_challenges VALUES (?,?,?,?,?)').run('a:b','a','b','ABCDEF123456',Date.now()+60000);
 assert.equal((await e.call('b','block',{tag:a.tag})).status,200);
 assert.equal((await e.call('b')).blocked[0].tag,a.tag);assert.deepEqual((await e.call('a')).friends,[]);
 assert.equal(e.sql.prepare('SELECT count(*) AS n FROM friend_challenges').get().n,0);
 assert.deepEqual((await e.call('a','search',{query:b.tag})).players,[]);
 assert.equal((await e.call('a','request',{tag:b.tag})).status,403);
 await e.call('a','unblock',{tag:b.tag});assert.equal((await e.call('a','request',{tag:b.tag})).status,403);
 await e.call('b','unblock',{tag:a.tag});assert.equal((await e.call('a','search',{query:b.tag})).players.length,1);
});

test('a block racing with a friend request prevents its insertion',async t=>{
 const e=await setup();t.after(()=>e.sql.close());const a=await e.call('a'),b=await e.call('b');
 const db=afterRead(e.DB,'SELECT * FROM friendships WHERE id=?',async()=>{assert.equal((await e.call('b','block',{tag:a.tag})).status,200);});
 const response=await friendsRoute(mutation('a','friends/request',{tag:b.tag}),db);
 assert.equal(response.status,409);assert.equal(e.sql.prepare('SELECT count(*) AS n FROM friendships').get().n,0);
});

test('avatars are validated, saved to the account and visible to friends without exposing private IDs',async t=>{
 const e=await setup();t.after(()=>e.sql.close());const a=await e.call('a'),b=await e.call('b');
 assert.equal((await e.call('a','avatar',{avatar:'fox',colour:'invalid'})).status,400);
 assert.equal((await e.call('a','avatar',{avatar:'https://evil.test/avatar',colour:'#51d4ff'})).status,400);
 assert.equal((await e.call('a','avatar',{avatar:'irish',colour:'#71e2b1'})).status,200);
 assert.equal((await e.call('a')).avatar,'irish');await e.call('a','request',{tag:b.tag});await e.call('b','accept',{tag:a.tag});
 const friend=(await e.call('b')).friends[0];assert.equal(friend.avatar,'irish');assert.equal(friend.colour,'#71e2b1');assert.equal(friend.user_id,undefined);
 await e.call('a','block',{tag:b.tag});e.sql.prepare('INSERT INTO support_reports (id,kind,message,reporter,created,expires) VALUES (?,?,?,?,?,?)').run('report','privacy','Please remove my account','a',Date.now(),Date.now()+60000);
 assert.equal((await authRoute(mutation('a','auth/delete',{}),{},e.DB)).status,200);
 assert.equal(e.sql.prepare('SELECT count(*) AS n FROM player_blocks').get().n,0);assert.equal(e.sql.prepare('SELECT reporter FROM support_reports').get().reporter,null);
});

test('a private join cannot commit if the host blocks the account after its first check',async t=>{
 const e=await setup();t.after(()=>e.sql.close());const worker=(await import('../dist/server/index.js')).default;
 const a=await e.call('a'),b=await e.call('b');
 const send=(id,path,body)=>worker.fetch(new Request('https://game.test'+path,{method:'POST',headers:{origin:'https://game.test','content-type':'application/json',authorization:'Bearer '+id.repeat(64),cookie:'__Host-lexivanto_session='+id.repeat(64)},body:JSON.stringify(body)}),e);
 const created=await (await send('a','/api/rooms',{name:'One',settings:{mode:'duel'}})).json();
 const prepare=e.DB.prepare;let blocked=false;
 e.DB.prepare=function(q){const statement=prepare.call(this,q);if(q.startsWith('UPDATE rooms SET')&&q.includes('player_blocks')){const run=statement.run;statement.run=async()=>{if(!blocked){blocked=true;e.sql.prepare('INSERT INTO player_blocks VALUES (?,?,?,?)').run('a:b','a','b',Date.now());}return run.call(statement);};}return statement;};
 assert.equal((await send('b','/api/rooms/'+created.code+'/join',{name:'Two'})).status,403);assert.equal(blocked,true);
 const game=JSON.parse(e.sql.prepare('SELECT data FROM rooms WHERE code=?').get(created.code).data);assert.equal(game.players[1],null);assert.equal(game.players[0].tag,a.tag);
});
