import {test} from 'node:test';import assert from 'node:assert/strict';import {testEnv} from './d1.js';
import {dailyRoute,nextProgress,currentStreak,validDay,levelFor,puzzleNumber,leagueDay,weekStandings,weekStart,rankBy} from '../server/daily.js';
import {makeRoom,emote,view} from '../public/game.js';

const day=(offset=0)=>new Date(Date.now()+offset*864e5).toISOString().slice(0,10);
const call=async(e,{auth='dev1',account=null,path='/api/daily',query='',body,device=null}={})=>{const url=new URL('https://game.test'+path+query);const r=await dailyRoute(new Request(url,body?{method:'POST',body:JSON.stringify(body)}:{}),e.DB,auth,account,url,device);return {...await r.json(),http:r.status};};
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

test('a guest cannot start today\'s word again in a new tab or after relaunching: the device key decides',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 await call(e,{auth:'tab1',device:'g:dev',query:'?day='+day()});const answer=answerOf(e);
 const done=await call(e,{auth:'tab1',device:'g:dev',path:'/api/daily/guess',body:{day:day(),word:answer}});assert.equal(done.status,'finished');
 const newTab=await call(e,{auth:'tab2',device:'g:dev',query:'?day='+day()});assert.equal(newTab.status,'finished','same device, new tab: already played');assert.equal(newTab.progress.streak,1);
 assert.equal((await call(e,{auth:'tab2',device:'g:dev',path:'/api/daily/guess',body:{day:day(),word:'crane'}})).error,'daily_finished');
 // Results saved before device keys existed (per-tab key) move to the device on its next request.
 await call(e,{auth:'oldtab',path:'/api/daily/guess',body:{day:day(),word:answer}});
 const moved=await call(e,{auth:'oldtab',device:'g:dev2',query:'?day='+day()});assert.equal(moved.status,'finished');
 assert.equal(e.sql.prepare("SELECT COUNT(*) n FROM daily_results WHERE player='g:dev2'").get().n,1);
});

test('league day follows Brussels time, including summer time',()=>{
 assert.equal(leagueDay(Date.parse('2026-11-22T22:59:00Z')),'2026-11-22');
 assert.equal(leagueDay(Date.parse('2026-11-22T23:01:00Z')),'2026-11-23','winter: midnight Brussels is 23:00 UTC');
 assert.equal(leagueDay(Date.parse('2026-07-01T21:59:00Z')),'2026-07-01');
 assert.equal(leagueDay(Date.parse('2026-07-01T22:01:00Z')),'2026-07-02','summer: midnight Brussels is 22:00 UTC');
});

test('a Daily result is eligible for standings only if played signed in on the Brussels day; the first guess time is kept',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 e.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run('u1','u1','maya',Date.now());
 const today=leagueDay(),other=[day(-1),day(0),day(1)].find(d=>d!==today&&validDay(d));
 const before=Date.now();
 await call(e,{auth:'a1',account:{user_id:'u1'},path:'/api/daily/guess',body:{day:today,word:'crane'}});
 const row=e.sql.prepare('SELECT eligible,first_guess_at FROM daily_results WHERE player=? AND day=?').get('u1',today);
 assert.equal(row.eligible,1);assert.ok(row.first_guess_at>=before);
 await call(e,{auth:'a1',account:{user_id:'u1'},path:'/api/daily/guess',body:{day:today,word:'slate'}});
 assert.ok(e.sql.prepare('SELECT first_guess_at FROM daily_results WHERE player=? AND day=?').get('u1',today).first_guess_at===row.first_guess_at,'later guesses keep the first time');
 await call(e,{auth:'a1',account:{user_id:'u1'},path:'/api/daily/guess',body:{day:other,word:'crane'}});
 assert.equal(e.sql.prepare('SELECT eligible FROM daily_results WHERE player=? AND day=?').get('u1',other).eligible,0,'another day (e.g. tomorrow\'s word early) is casual only');
 await call(e,{auth:'g9',device:'g:dev9',path:'/api/daily/guess',body:{day:today,word:'crane'}});
 assert.equal(e.sql.prepare('SELECT eligible FROM daily_results WHERE player=? AND day=?').get('g:dev9',today).eligible,0,'guest results never count');
});

test('signing out does not give a device a second attempt at a word it played signed in',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 e.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run('u1','u1','maya',Date.now());
 const d=day();
 await call(e,{auth:'tab1',device:'g:dev1',path:'/api/daily/guess',body:{day:d,word:'crane'}});
 const signed=await call(e,{auth:'tab1',device:'g:dev1',account:{user_id:'u1'},query:'?day='+d});
 assert.equal(signed.guesses.length,1,'guest attempt moved to the account');
 const out=await call(e,{auth:'tab1',device:'g:dev1',query:'?day='+d});
 assert.equal(out.status,'signed_in');assert.equal(out.guesses.length,0);assert.equal(out.answer,undefined);
 const guess=await call(e,{auth:'tab1',device:'g:dev1',path:'/api/daily/guess',body:{day:d,word:'slate'}});
 assert.equal(guess.http,409);assert.equal(guess.error,'daily_signed_in');
 const fresh=await call(e,{auth:'tab2',device:'g:dev2',query:'?day='+d});assert.equal(fresh.status,'playing','another device is unaffected');
 // A signed-in player who starts on a device marks it too.
 await call(e,{auth:'tab3',device:'g:dev3',account:{user_id:'u1'},query:'?day='+d});
 assert.equal((await call(e,{auth:'tab3',device:'g:dev3',query:'?day='+d})).status,'signed_in');
});

// Week of Mon 23 – Sun 29 Nov 2026 (puzzles #8–#14).
const W=['2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27','2026-11-28','2026-11-29'];
const res=(player,day,tries,{solved=tries<=6,eligible=1,late=false,finished=1}={})=>({player,day,solved:solved?1:0,tries:solved?tries:6,finished,eligible,updated:Date.parse(day+(late?'T23:30:00Z':'T10:00:00Z'))});
const people=[{id:'me',name:'maya'},{id:'r',name:'rui'},{id:'n',name:'noor'},{id:'t',name:'tom'}];

test('week rules: best five of seven, plan example 5,4,6,0,3,2,5 = 23',()=>{
 assert.equal(weekStart('2026-11-29'),'2026-11-23');assert.equal(weekStart('2026-11-23'),'2026-11-23');assert.equal(weekStart('2026-11-30'),'2026-11-30');
 const pts=[5,4,6,0,3,2,5],rows=pts.map((p,i)=>p?res('me',W[i],7-p):res('me',W[i],6,{solved:false}));
 rows.push(...W.slice(0,3).map(d=>res('r',d,3)));
 const w=weekStandings(people,rows,{today:W[6],viewer:'me'});
 assert.equal(w.me.points,23);assert.equal(w.me.days,7);assert.deepEqual(w.numbers,[8,14]);assert.equal(w.shown,true);
 assert.deepEqual(w.standings.map(x=>[x.name,x.points,x.position]),[['maya',23,1],['rui',12,2]]);
});

test('ties share a position (1=, 1=, 3); fewer than 3 days takes part without a position; shown from 2 players',()=>{
 const rows=[...W.slice(0,3).map(d=>res('me',d,3)),...W.slice(0,3).map(d=>res('r',d,3)),...W.slice(0,3).map(d=>res('n',d,4)),...W.slice(0,2).map(d=>res('t',d,1))];
 const w=weekStandings(people,rows,{today:W[3],viewer:'me'});
 assert.deepEqual(w.standings.map(x=>[x.name,x.points,x.position,x.tied]),[['maya',12,1,true],['rui',12,1,true],['noor',9,3,false],['tom',12,null,false]]);
 assert.equal(w.me.position,1);assert.equal(w.me.ranked,3);
 assert.equal(weekStandings(people,[res('me',W[0],3)],{today:W[0],viewer:'me'}).shown,false,'one player alone sees no standings');
 assert.equal(weekStandings(people,[res('me',W[0],3),res('r',W[0],2)],{today:W[0],viewer:'me'}).shown,true,'two players including you');
});

test('only eligible results finished on their own day count; friends\' today stays hidden until you finish',()=>{
 const rows=[res('me',W[0],3,{eligible:0}),res('me',W[1],3,{late:true}),res('me',W[2],2),res('r',W[3],1)];
 const before=weekStandings(people,rows,{today:W[3],viewer:'me'});
 assert.equal(before.me.points,5,'only the 2/6 on Wednesday counts');assert.equal(before.me.days,1);
 assert.equal(before.standings.find(x=>x.name==='rui'),undefined,'rui\'s Thursday result is hidden until maya finishes Thursday');assert.deepEqual(before.today,[]);
 const after=weekStandings(people,[...rows,res('me',W[3],4)],{today:W[3],viewer:'me'});
 assert.deepEqual(after.today.map(x=>[x.name,x.position]),[['rui',1],['maya',2]]);assert.equal(after.me.todayPoints,3);assert.equal(after.me.todayCounted,true);
 assert.deepEqual(rankBy([{s:5},{s:5},{s:3}],x=>x.s).map(x=>x.position),[1,1,3]);
});

test('friends week endpoint uses accepted friends only and needs sign-in',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 for(const [id,name] of [['u1','maya'],['u2','rui'],['u3','stranger']]){e.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run(id,id,name,Date.now());e.sql.prepare('INSERT INTO friend_profiles (user_id,username,tag) VALUES (?,?,?)').run(id,name,'LEX-'+id);}
 e.sql.prepare("INSERT INTO friendships VALUES ('f','u1','u2','u1','accepted',?)").run(Date.now());
 const today=leagueDay();
 const answer=(await call(e,{auth:'a',account:{user_id:'u2'},query:'?day='+today}),e.sql.prepare('SELECT word FROM daily_puzzles WHERE day=?').get(today).word);
 for(const u of ['u1','u2','u3'])await call(e,{auth:'a'+u,account:{user_id:u},path:'/api/daily/guess',body:{day:today,word:answer}});
 const w=await call(e,{auth:'a',account:{user_id:'u1'},path:'/api/daily/week',query:'?day='+today});
 assert.equal(w.signedIn,true);assert.equal(w.shown,true);assert.deepEqual(w.standings.map(x=>x.name).sort(),['maya','rui']);assert.equal(w.me.todayPoints,6);
 assert.equal((await call(e,{auth:'g',path:'/api/daily/week',query:'?day='+today})).signedIn,false);
});
