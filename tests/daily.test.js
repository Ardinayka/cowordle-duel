import {test} from 'node:test';import assert from 'node:assert/strict';import {testEnv} from './d1.js';
import {dailyRoute,nextProgress,currentStreak,validDay,levelFor,puzzleNumber} from '../server/daily.js';
import {makeRoom,emote,view} from '../public/game.js';

const day=(offset=0)=>new Date(Date.now()+offset*864e5).toISOString().slice(0,10);
const call=async(e,{auth='dev1',account=null,path='/api/daily',query='',body}={})=>{const url=new URL('https://game.test'+path+query);const r=await dailyRoute(new Request(url,body?{method:'POST',body:JSON.stringify(body)}:{}),e.DB,auth,account,url);return {...await r.json(),http:r.status};};
const answerOf=e=>e.sql.prepare('SELECT word FROM daily_puzzles WHERE day=?').get(day()).word;

test('daily dates follow the player\'s local day within one day of the server, numbered from the launch',()=>{
 assert.equal(validDay(day()),true);assert.equal(validDay('2026-11-15',Date.parse('2026-11-16T12:00:00Z')),false,'before puzzle #1');assert.equal(validDay('2026-11-20',Date.parse('2026-11-21T03:00:00Z')),true,'a player still on yesterday');assert.equal(validDay(day(1)),true);assert.equal(validDay(day(-3)),false);assert.equal(validDay('2026-02-30x'),false);
 assert.equal(puzzleNumber('2026-11-16'),1);assert.equal(puzzleNumber('2026-11-26'),11);
});

test('streak counts days played; every 7th day earns a freeze (max 2) that covers a missed day',()=>{
 let p=null;for(let d=1;d<=7;d++)p=nextProgress(p,`2027-01-0${d}`,true,3);assert.equal(p.streak,7);assert.equal(p.freezes,1);
 const skip=nextProgress(p,'2027-01-09',false,6);assert.equal(skip.streak,8,'freeze covered 8 Jan');assert.equal(skip.freezes,0);
 const broken=nextProgress(skip,'2027-01-12',true,2);assert.equal(broken.streak,1);assert.equal(broken.best,8);
 assert.equal(currentStreak(skip,'2027-01-10'),8);assert.equal(currentStreak(skip,'2027-01-11'),0,'shown as 0 once the gap is too long');
 assert.deepEqual(JSON.parse(broken.dist),[0,1,7,0,0,0,1]);
 assert.equal(nextProgress(p,'2027-01-05',true,1).streak,7,'an earlier day never changes the streak');
 assert.deepEqual([levelFor(0).level,levelFor(99).level,levelFor(100).level,levelFor(250).level],[1,1,2,3]);
});

test('the daily answer stays on the server until the player finishes; results, streak and distribution follow',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 const start=await call(e,{query:'?day='+day()});assert.equal(start.http,200);assert.equal(start.answer,undefined);assert.equal(start.guesses.length,0);
 const answer=answerOf(e),wrong=['crane','slate','pious','dough','lymph','fjord'].filter(w=>w!==answer);
 const g1=await call(e,{path:'/api/daily/guess',body:{day:day(),word:wrong[0]}});assert.equal(g1.guesses.length,1);assert.equal(g1.answer,undefined);assert.equal(JSON.stringify(g1).includes('"'+answer+'"'),false);
 assert.equal((await call(e,{path:'/api/daily/guess',body:{day:day(),word:wrong[0]}})).error,'repeated');
 assert.equal((await call(e,{path:'/api/daily/guess',body:{day:day(),word:'qwert'}})).error,'unknown_word');
 assert.equal((await call(e,{path:'/api/daily/guess',body:{day:day(-5),word:wrong[1]}})).error,'invalid_day');
 const done=await call(e,{path:'/api/daily/guess',body:{day:day(),word:answer}});
 assert.equal(done.http,200);assert.equal(done.solved,true);assert.equal(done.tries,2);assert.equal(done.answer,answer);assert.equal(done.today.total,1);assert.equal(done.today.dist[1],1);assert.equal(done.progress.streak,1);
 assert.equal((await call(e,{path:'/api/daily/guess',body:{day:day(),word:wrong[2]}})).error,'daily_finished');
 // Another device sees the same word and its own empty board.
 const other=await call(e,{auth:'dev2',query:'?day='+day()});assert.equal(other.guesses.length,0);assert.equal(answerOf(e),answer);
});

test('signing in keeps the guest streak, pays XP and shows friends\' results after finishing',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 for(const [id,name] of [['u1','maya'],['u2','rui']]){e.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run(id,id,name,Date.now());e.sql.prepare('INSERT INTO friend_profiles (user_id,username,tag) VALUES (?,?,?)').run(id,name,'LEX-'+id);}
 e.sql.prepare("INSERT INTO friendships VALUES ('f','u1','u2','u1','accepted',?)").run(Date.now());
 await call(e,{query:'?day='+day()});const answer=answerOf(e);
 await call(e,{auth:'g1',path:'/api/daily/guess',body:{day:day(),word:answer}});
 const mine=await call(e,{auth:'g1',account:{user_id:'u1'},query:'?day='+day()});
 assert.equal(mine.status,'finished','guest result moved to the account');assert.equal(mine.progress.streak,1);assert.equal(mine.progress.signedIn,true);
 const rui=await call(e,{auth:'g2',account:{user_id:'u2'},path:'/api/daily/guess',body:{day:day(),word:answer}});
 assert.deepEqual(rui.friends.map(f=>[f.name,f.tries]),[['maya',1]]);
 assert.equal(e.sql.prepare('SELECT xp FROM player_ratings WHERE user_id=?').get('u2').xp,10);
 const stats=await call(e,{auth:'g2',account:{user_id:'u2'},path:'/api/daily/stats',query:'?day='+day()});assert.equal(stats.daily.played,1);assert.equal(stats.level.level,1);assert.equal(stats.xp,10);
});

test('emotes are preset, rate-limited and per match',()=>{
 const g=makeRoom({mode:'duel'},'A','a','crane',0);g.players[1]={name:'B',auth:'b',ready:true};
 emote(g,0,'nice',1000);assert.deepEqual(view(g,1).emotes[0],{id:'nice',at:1000});
 assert.throws(()=>emote(g,0,'wow',2000),/too_fast/);assert.throws(()=>emote(g,0,'rude words',9000),/invalid_emote/);
 for(let i=1;i<=30;i++)emote(g,1,'gg',i*4000);assert.throws(()=>emote(g,1,'gg',200000),/too_many_emotes/);
 g.match++;assert.equal(view(g,0).emotes[0],null,'a new match starts clean');
});
