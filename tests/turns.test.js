import {test} from 'node:test';import assert from 'node:assert/strict';import {testEnv} from './d1.js';import {hash} from '../server/auth.js';

// Three accounts: a and b are friends, c is a stranger. Each "device" has its own seat token.
async function setup(){
 const e=testEnv(),worker=(await import('../dist/server/index.js')).default;
 for(const [id,ch,name,tag] of [['ua','a','maya','LEX-00000000000A'],['ub','b','rui','LEX-00000000000B'],['uc','c','zoe','LEX-00000000000C']]){
  e.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run(id,id,name,Date.now());
  e.sql.prepare('INSERT INTO auth_sessions VALUES (?,?,?,?)').run(await hash(ch.repeat(64)),id,'csrf-'+id,Date.now()+864e5);
  e.sql.prepare('INSERT INTO friend_profiles (user_id,username,tag) VALUES (?,?,?)').run(id,name,tag);
 }
 e.sql.prepare("INSERT INTO friendships VALUES ('ua:ub','ua','ub','ua','accepted',?)").run(Date.now());
 const pushes=[],now=Date.now();e.sql.prepare("INSERT INTO push_subscriptions (endpoint,player,user_id,invites,reminders,time_zone,created,updated) VALUES ('https://fcm.googleapis.com/fcm/send/rui','ub','ub',1,0,'UTC',?,?),('https://fcm.googleapis.com/fcm/send/maya','ua','ua',1,0,'UTC',?,?)").run(now,now,now,now);
 globalThis.fetch=async url=>{pushes.push(String(url).split('/').pop());return new Response(null,{status:201});};
 const call=async(who,device,path,body)=>{const r=await worker.fetch(new Request('https://game.test'+path,{method:body?'POST':'GET',headers:{origin:'https://game.test','content-type':'application/json',authorization:'Bearer '+device.repeat(64),...(who?{cookie:'__Host-lexivanto_session='+who.repeat(64)}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB:e.DB});return {...await r.json(),http:r.status};};
 const pending=who=>{const row=e.sql.prepare("SELECT pending FROM push_subscriptions WHERE user_id=?").get(who);return row?.pending?JSON.parse(row.pending):null;};
 return {e,call,pushes,pending};
}
const answerOf=(e,code)=>JSON.parse(e.sql.prepare('SELECT data FROM rooms WHERE code=?').get(code).data).answer;

test('a turn-based Duel starts at once with a friend, follows each player to any device and notifies whose turn it is',async t=>{
 const {e,call,pushes,pending}=await setup();t.after(()=>e.sql.close());
 assert.equal((await call(null,'1','/api/turns/start',{friend:'LEX-00000000000B',mode:'duel'})).http,401,'guests cannot start one');
 assert.equal((await call('a','1','/api/turns/start',{friend:'LEX-00000000000C',mode:'duel'})).http,403,'only accepted friends');
 const game=await call('a','1','/api/turns/start',{friend:'LEX-00000000000B',mode:'duel'});
 assert.equal(game.http,200);assert.equal(game.status,'playing','no lobby, no ready check');assert.equal(game.settings.pace,'turns');assert.ok(game.moveBy>Date.now()+2*864e5);
 assert.equal(pending('ub').title,'maya started a Duel with you');assert.deepEqual(pushes,['rui']);
 const list=await call('b','2','/api/turns');assert.equal(list.games.length,1);assert.equal(list.games[0].opponent,'maya');assert.equal(list.games[0].myTurn,true);
 // Rui opens it from a different device (new seat token): the seat comes from the account.
 const opened=await call('b','9','/api/rooms/'+game.code);assert.equal(opened.me,1);
 assert.equal((await call('c','3','/api/rooms/'+game.code)).http,403,'a stranger cannot open it');
 const answer=answerOf(e,game.code),wrong=['slate','crane','pious'].filter(w=>w!==answer);
 await call('b','9','/api/rooms/'+game.code+'/guess',{match:1,word:wrong[0]});
 assert.equal(pending('ua').title,'Your turn vs rui','the friend locked a guess');
 assert.equal((await call('b','2','/api/turns')).games[0].myTurn,false);
 await call('a','1','/api/rooms/'+game.code+'/guess',{match:1,word:wrong[1]});
 assert.equal(pending('ub').title,'Round 2 vs maya','both revealed: the first player hears the next round is open');
 await call('a','5','/api/rooms/'+game.code+'/guess',{match:1,word:answer});await call('b','9','/api/rooms/'+game.code+'/guess',{match:1,word:wrong[2]});
 const done=await call('a','5','/api/rooms/'+game.code);assert.equal(done.status,'finished');assert.equal(done.winner,0);
 assert.equal(pending('ua').title,'You won vs rui','the player who was not there hears the result');
 const lists=[(await call('a','1','/api/turns')).games[0],(await call('b','2','/api/turns')).games[0]];assert.deepEqual(lists.map(g=>g.result),['won','lost']);
 // Play again starts the next game straight away.
 const again=await call('b','9','/api/rooms/'+game.code+'/rematch',{match:1});assert.equal(again.status,'playing');assert.equal(again.match,2);
 assert.equal((await call('a','1','/api/rooms/'+game.code+'/settings',{match:2,settings:{mode:'race'}})).error,'turns_settings');
});

test('an overdue move ends the game: in a Duel the player who locked wins; the list settles it',async t=>{
 const {e,call}=await setup();t.after(()=>e.sql.close());
 const game=await call('a','1','/api/turns/start',{friend:'LEX-00000000000B',mode:'duel'});
 const answer=answerOf(e,game.code);await call('a','1','/api/rooms/'+game.code+'/guess',{match:1,word:answer==='crane'?'slate':'crane'});
 const row=e.sql.prepare('SELECT data FROM rooms WHERE code=?').get(game.code),g=JSON.parse(row.data);g.moveBy=Date.now()-1000;e.sql.prepare('UPDATE rooms SET data=? WHERE code=?').run(JSON.stringify(g),game.code);
 const list=(await call('b','2','/api/turns')).games[0];assert.equal(list.status,'finished');assert.equal(list.result,'lost');
 const room=await call('a','1','/api/rooms/'+game.code);assert.equal(room.reason,'timeout');assert.equal(room.winner,0);
});

test('turn-based Co-op alternates turns and tells the partner when it is theirs',async t=>{
 const {e,call,pending}=await setup();t.after(()=>e.sql.close());
 const game=await call('b','2','/api/turns/start',{friend:'LEX-00000000000A',mode:'coop'});assert.equal(game.turn,0,'the first turn alternates by match, starting with the first seat');
 const answer=answerOf(e,game.code);const first=JSON.parse(e.sql.prepare('SELECT data FROM rooms WHERE code=?').get(game.code).data).players[0].userId;assert.equal(first,'ub');
 await call('b','2','/api/rooms/'+game.code+'/guess',{match:1,word:answer==='crane'?'slate':'crane'});
 assert.equal(pending('ua').title,'Your turn with rui');
 assert.equal((await call('a','7','/api/turns')).games[0].myTurn,true);
});

test('after a resignation either friend can start the next game',async t=>{
 const {e,call}=await setup();t.after(()=>e.sql.close());
 const game=await call('a','1','/api/turns/start',{friend:'LEX-00000000000B',mode:'duel'});
 const resigned=await call('b','2','/api/rooms/'+game.code+'/leave',{match:1});assert.equal(resigned.status,'finished');assert.equal(resigned.winner,0);
 const again=await call('a','1','/api/rooms/'+game.code+'/rematch',{match:1});assert.equal(again.status,'playing');assert.equal(again.match,2);
});
