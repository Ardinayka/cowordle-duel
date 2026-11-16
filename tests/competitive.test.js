import {test} from 'node:test';import assert from 'node:assert/strict';import {testEnv} from './d1.js';
import {makeRoom,begin,guess,expire,leave,rematch,view,rankedSettings} from '../public/game.js';
import {settleMatch,matchProgress,kFactor,ratingDelta,tierFor,nextTier,stakesFor,competitiveStatus} from '../server/ranking.js';
import {matchmaking,windowFor} from '../server/matchmaking.js';
import pool from '../server/answers-en.js';
import en from '../public/words-en.json' with {type:'json'};

const allowed=new Set(en.allowed),T0=1_000_000;
function rankedRoom(){const g=makeRoom(rankedSettings('en'),'A','a','crane',T0);g.online=true;g.queue='ranked';g.answers=['crane','sloth','pudgy'];g.players[1]={name:'B',auth:'b',ready:true};begin(g,T0);return g;}
const profile=(db,id,tag)=>db.prepare('INSERT INTO friend_profiles (user_id,username,tag,avatar,colour,seen_at,available) VALUES (?,?,?,?,?,?,?)').run(id,id,tag,'robot','#51d4ff',Date.now(),1);
const normalGames=(db,id,n)=>{for(let i=0;i<n;i++)db.prepare("INSERT INTO match_results (id,room_code,match,mode,player_a,player_b,winner,reason,rated,settled,created,queue) VALUES (?,?,?,?,?,?,?,?,0,1,?,'normal')").run(id+'n'+i,'R'+i,1,'duel',id,null,null,'solved',Date.now());};

test('Competitive Duel is best of 3 with a 45 s clock, a 20 s reply clock and a short introduction',()=>{
 const g=rankedRoom();assert.equal(g.status,'playing');assert.equal(g.settings.seconds,45);assert.equal(g.word,1);
 assert.throws(()=>guess(g,0,'crane',allowed,T0+1000),/not_started/);
 const start=T0+3000;assert.equal(g.deadline,start+45000);
 guess(g,0,'slate',allowed,start+1000);assert.equal(g.deadline,start+21000,'reply clock shortens once one player locks');
 guess(g,1,'crane',allowed,start+5000);assert.equal(g.status,'playing');assert.deepEqual(g.score,[0,1]);assert.equal(g.word,2);assert.equal(g.rows.length,0);
 const v=view(g,0,start+5000);assert.equal(v.words[0].answer,'crane');assert.equal(v.answer,null);assert.equal(JSON.stringify(v).includes('pudgy'),false,'future answers stay on the server');
 const w2=g.startsAt;assert.equal(w2,start+5000+4000);
 guess(g,0,'sloth',allowed,w2+100);guess(g,1,'slate',allowed,w2+200);assert.deepEqual(g.score,[1,1]);assert.equal(g.word,3);
 // Word 3: only player 1 locks before the clock runs out, so player 1 wins the word and the match.
 const w3=g.startsAt;guess(g,1,'crane',allowed,w3+100);assert.equal(expire(g,w3+20100),true);
 assert.equal(g.status,'finished');assert.equal(g.reason,'score');assert.equal(g.winner,1);assert.deepEqual(g.score,[1,2]);
 assert.throws(()=>rematch(g,0,'crane'),/no_rematch/);
});

test('an idle Competitive match times out word by word and ends level when nobody guesses',()=>{
 const g=rankedRoom();assert.equal(expire(g,T0+10*60000),true);
 assert.equal(g.status,'finished');assert.equal(g.words.length,3);assert.deepEqual(g.score,[0,0]);assert.equal(g.winner,null);
});

test('leaving before any guess is no contest; leaving later forfeits',()=>{
 const a=rankedRoom();leave(a,0);assert.equal(a.reason,'no_contest');assert.equal(a.winner,null);assert.equal(a.leaver,0);
 const b=rankedRoom();guess(b,1,'slate',allowed,T0+4000);leave(b,0);assert.equal(b.reason,'left');assert.equal(b.winner,1);
});

test('K schedule, placement half-risk, rating floor and tiers with a 25-point buffer',()=>{
 assert.equal(kFactor(0,1000,10),48);assert.equal(kFactor(10,1000,10),32);assert.equal(kFactor(40,1000,40),24);assert.equal(kFactor(40,1450,40),16);
 assert.equal(kFactor(10,1000,2),16,'opponents of a placement player risk half');
 assert.equal(ratingDelta(1000,1000,1,0,0),24);assert.equal(ratingDelta(405,405,0,40,40),-5,'floor at 400');
 assert.equal(tierFor(899),'Bronze');assert.equal(tierFor(1000),'Gold');assert.equal(tierFor(1300),'Master');
 assert.equal(nextTier(1080,'Platinum'),'Platinum');assert.equal(nextTier(1074,'Platinum'),'Gold');assert.equal(nextTier(1210,'Gold'),'Diamond');
 const s=stakesFor({rating:1000,rated_games:20},{rating:1000,rated_games:20});assert.deepEqual([s.win,s.draw,s.lose],[16,0,-16]);
});

test('placements end with a tier, leaving earns a cooldown, and existing ratings are not recalculated',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());profile(e.sql,'u1','LEX-000000000001');profile(e.sql,'u2','LEX-000000000002');
 e.sql.prepare('INSERT INTO player_ratings (user_id,rating,rated_games,wins,draws,losses,xp,updated) VALUES (?,?,?,?,?,?,?,?)').run('u2',1180,40,25,0,15,800,1);
 for(let m=1;m<=5;m++)await settleMatch(e.DB,{online:true,queue:'ranked',status:'finished',settings:{mode:'duel',bestOf:3},match:m,score:[2,0],players:[{tag:'LEX-000000000001'},{tag:'LEX-000000000002'}],winner:0,reason:'score'},'ROOM00000001');
 const p=await matchProgress(e.DB,{players:[{tag:'LEX-000000000001'}],match:5},'ROOM00000001',0);
 assert.equal(p.placement.done,true);assert.equal(p.placedNow,true);assert.ok(p.tier);
 const u2=e.sql.prepare('SELECT rating,rated_games,tier FROM player_ratings WHERE user_id=?').get('u2');assert.equal(u2.rated_games,45);
 assert.ok(u2.rating<1180&&u2.rating>1180-5*24,'established player risked half against placements');
 await settleMatch(e.DB,{online:true,queue:'ranked',status:'finished',settings:{mode:'duel',bestOf:3},match:6,players:[{tag:'LEX-000000000001'},{tag:'LEX-000000000002'}],winner:null,reason:'no_contest',leaver:1},'ROOM00000001');
 const status=await competitiveStatus(e.DB,'u2');assert.ok(status.cooldownUntil>Date.now()+4*60000);
 assert.equal(e.sql.prepare('SELECT rated FROM match_results WHERE match=6').get().rated,0);
});

test('Competitive needs sign-in, five Normal games and no cooldown; matching uses a widening rating window',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());profile(e.sql,'u1','LEX-000000000001');profile(e.sql,'u2','LEX-000000000002');
 const search=(seat,tag)=>matchmaking(e.DB,seat,{searchId:seat.repeat(32),name:seat,mode:'duel',lang:'en',queue:'ranked'},'search',(lang,skip=[])=>pool.find(w=>![].concat(skip).includes(w)),tag);
 assert.equal((await search('f',null)).status,403);
 const locked=await search('a','LEX-000000000001');assert.equal(locked.status,403);assert.equal((await locked.json()).error,'competitive_locked');
 normalGames(e.sql,'u1',5);normalGames(e.sql,'u2',5);
 e.sql.prepare('INSERT INTO player_ratings (user_id,rating,rated_games,wins,draws,losses,xp,updated) VALUES (?,?,?,?,?,?,?,?)').run('u2',1250,20,10,0,10,0,1);
 assert.equal((await (await search('a','LEX-000000000001')).json()).window,100);
 assert.equal((await (await search('b','LEX-000000000002')).json()).status,'searching','250 apart: no match at first');
 e.sql.prepare('UPDATE match_queue SET created=created-31000 WHERE auth=?').run('a');
 const matched=await (await search('b','LEX-000000000002')).json();assert.equal(matched.status,'matched','window has widened to 300');
 const room=matched.room;assert.equal(room.status,'playing','no ready check');assert.equal(room.queue,'ranked');assert.equal(room.word,1);assert.ok(room.stakes.win>0&&room.stakes.lose<0);
 const g=JSON.parse(e.sql.prepare('SELECT data FROM rooms').get().data);assert.equal(new Set(g.answers).size,3);
 assert.equal(windowFor(0),100);assert.equal(windowFor(59000),400);assert.equal(windowFor(60000),null);
});

test('a fourth rated game between the same pair in a day is played but not rated',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());profile(e.sql,'u1','LEX-000000000001');profile(e.sql,'u2','LEX-000000000002');normalGames(e.sql,'u1',5);normalGames(e.sql,'u2',5);
 for(let i=0;i<3;i++)e.sql.prepare("INSERT INTO match_results (id,room_code,match,mode,player_a,player_b,winner,reason,rated,settled,created,queue) VALUES (?,?,1,'duel','u2','u1','u1','score',1,1,?,'ranked')").run('p'+i,'P'+i,Date.now());
 const search=seat=>matchmaking(e.DB,seat,{searchId:seat.repeat(32),name:seat,mode:'duel',lang:'en',queue:'ranked'},'search',()=>'crane','LEX-00000000000'+(seat==='a'?1:2));
 await search('a');const room=(await (await search('b')).json()).room;assert.equal(room.unrated,'pair_cap');assert.equal(room.stakes,undefined);
});

test('the online answer pool is large, valid and never shipped to the browser',async()=>{
 assert.ok(pool.length>=2000);assert.equal(new Set(pool).size,pool.length);assert.ok(pool.every(w=>allowed.has(w)));
 const assets=JSON.stringify((await import('../server/assets.js')).default);
 const serverOnly=pool.filter(w=>!en.answers.includes(w));assert.ok(serverOnly.length>1000);
 assert.equal(assets.includes(JSON.stringify(serverOnly.slice(0,5)).slice(1,-1)),false);
});
