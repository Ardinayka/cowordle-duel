import {score,normalize} from '../public/engine.js';
import pool from './answers-en.js';
import en from '../public/words-en.json' with {type:'json'};

// Daily word (Phase 4): one word per calendar day, the same for everyone, solo, six guesses.
// Each player gets the new word at their own midnight, so the client sends its local date;
// the server accepts only dates within a day of its own (time zones span UTC-12 to UTC+14).
// The answer is chosen and kept on the server and only returned once the player has finished.
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'}});
export const DAILY_EPOCH='2026-11-16',MAX_GUESSES=6,FREEZE_EVERY=7,FREEZE_MAX=2;
const allowed=new Set(en.allowed);
const dayIndex=day=>Math.round(Date.parse(day+'T00:00:00Z')/864e5);
export const puzzleNumber=day=>dayIndex(day)-dayIndex(DAILY_EPOCH)+1;
// League day: friends' standings count a result only if its first guess arrived, signed in, while that puzzle
// date was today in the league time zone. Casual play still follows each player's own midnight.
export const LEAGUE_TIME_ZONE='Europe/Brussels';
const leagueFormat=new Intl.DateTimeFormat('en-CA',{timeZone:LEAGUE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
export const leagueDay=(now=Date.now())=>leagueFormat.format(new Date(now));
export function validDay(day,now=Date.now()){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day+'T00:00:00Z')))return false;
 const d=dayIndex(day),t=Math.floor(now/864e5);return d>=t-1&&d<=t+1&&puzzleNumber(day)>=1;
}
// XP levels: level 2 at 100 XP, each further level needs 50 XP more than the last.
export function levelFor(xp=0){let level=1,start=0,need=100;while(xp>=start+need){start+=need;level++;need+=50;}return {level,into:xp-start,need};}
// Streak counts days played in a row. Every 7th day in a row earns a freeze (hold at most 2);
// freezes cover missed days automatically when the next daily is finished.
export function nextProgress(p,day,solved,tries){
 const prev=p||{streak:0,best:0,freezes:0,last_day:null,played:0,won:0,dist:'[0,0,0,0,0,0,0]'};
 const dist=JSON.parse(prev.dist||'[0,0,0,0,0,0,0]');dist[solved?tries-1:6]++;
 let {streak,freezes}=prev;
 if(prev.last_day&&dayIndex(day)<=dayIndex(prev.last_day)){/* an earlier or same day (time-zone travel) never changes the streak */}
 else{const missed=prev.last_day?dayIndex(day)-dayIndex(prev.last_day)-1:0;if(!prev.last_day||missed>freezes)streak=1;else{freezes-=missed;streak+=1;}if(streak%FREEZE_EVERY===0)freezes=Math.min(FREEZE_MAX,freezes+1);}
 return {streak,best:Math.max(prev.best,streak),freezes,last_day:prev.last_day&&dayIndex(day)<=dayIndex(prev.last_day)?prev.last_day:day,played:prev.played+1,won:prev.won+(solved?1:0),dist:JSON.stringify(dist)};
}
// The streak shown today: zero once the gap is longer than the freezes can cover.
export function currentStreak(p,today){if(!p?.last_day)return 0;const missed=dayIndex(today)-dayIndex(p.last_day)-1;return missed<=p.freezes?p.streak:0;}

async function wordFor(storage,day){
 let row=await storage.prepare('SELECT word FROM daily_puzzles WHERE day=?').bind(day).first();if(row)return row.word;
 const used=new Set(((await storage.prepare('SELECT word FROM daily_puzzles').all()).results||[]).map(r=>r.word));
 const fresh=pool.filter(w=>!used.has(w)),choices=fresh.length?fresh:pool,n=crypto.getRandomValues(new Uint32Array(1))[0];
 await storage.prepare('INSERT OR IGNORE INTO daily_puzzles (day,word,created) VALUES (?,?,?)').bind(day,choices[n%choices.length],Date.now()).run();
 return (await storage.prepare('SELECT word FROM daily_puzzles WHERE day=?').bind(day).first()).word;
}
// A guest's results and streak move to their account the first time they play signed in.
async function adoptGuest(storage,guest,userId){
 await storage.prepare('UPDATE daily_results SET player=? WHERE player=? AND day NOT IN (SELECT day FROM daily_results WHERE player=?)').bind(userId,guest,userId).run();
 await storage.prepare('UPDATE player_progress SET player=? WHERE player=? AND NOT EXISTS (SELECT 1 FROM player_progress WHERE player=?)').bind(userId,guest,userId).run();
}
async function distribution(storage,day){
 const rows=(await storage.prepare('SELECT solved,tries,COUNT(*) AS n FROM daily_results WHERE day=? AND finished=1 GROUP BY solved,tries').bind(day).all()).results||[];
 const dist=[0,0,0,0,0,0,0];for(const r of rows)dist[r.solved?r.tries-1:6]+=r.n;return {dist,total:dist.reduce((a,b)=>a+b,0)};
}
async function friendResults(storage,userId,day){
 const rows=(await storage.prepare("SELECT COALESCE(f.username,p.display_name,'Friend') AS name,f.avatar,f.colour,r.solved,r.tries FROM friendships s JOIN daily_results r ON r.player=CASE WHEN s.a=? THEN s.b ELSE s.a END AND r.day=? AND r.finished=1 LEFT JOIN friend_profiles f ON f.user_id=r.player LEFT JOIN auth_profiles p ON p.id=r.player WHERE s.status='accepted' AND (s.a=? OR s.b=?) ORDER BY r.solved DESC,r.tries ASC LIMIT 50").bind(userId,day,userId,userId).all()).results||[];
 return rows;
}
async function snapshot(storage,player,userId,day){
 const row=await storage.prepare('SELECT guesses,solved,tries,finished FROM daily_results WHERE day=? AND player=?').bind(day,player).first();
 const progress=await storage.prepare('SELECT streak,best,freezes,last_day,played,won,dist FROM player_progress WHERE player=?').bind(player).first();
 const words=row?JSON.parse(row.guesses):[],finished=!!row?.finished,answer=await wordFor(storage,day);
 return {day,number:puzzleNumber(day),max:MAX_GUESSES,guesses:words.map(w=>({word:w,colors:score(w,answer)})),status:finished?'finished':'playing',solved:!!row?.solved,tries:row?.tries||words.length,
  ...(finished?{answer,today:await distribution(storage,day),friends:userId?await friendResults(storage,userId,day):null}:{}),
  progress:{streak:currentStreak(progress,day),best:progress?.best||0,freezes:progress?.freezes||0,played:progress?.played||0,won:progress?.won||0,dist:JSON.parse(progress?.dist||'[0,0,0,0,0,0,0]'),signedIn:!!userId}};
}

// Friends' Daily week. Points: solved in 1–6 guesses = 6–1, unsolved or missed = 0. A week is Monday–Sunday by
// puzzle date; the best 5 of 7 days count; a position needs at least 3 counted days. Only eligible results count
// (signed in, first guess on the Brussels day, finished before that day ended). Equal totals share a position.
// Completely separate from Duel rating.
export const WEEK_BEST=5,WEEK_MIN_DAYS=3,WEEK_MIN_PLAYERS=2;
export const dailyPoints=r=>r.solved?7-r.tries:0;
export const weekStart=day=>{const d=new Date(day+'T00:00:00Z');return new Date(d.getTime()-((d.getUTCDay()+6)%7)*864e5).toISOString().slice(0,10);};
const addDays=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
// Standard competition ranking: 1=, 1=, 3.
export function rankBy(items,score){const sorted=[...items].sort((a,b)=>score(b)-score(a));let last=null,pos=0;return sorted.map((x,i)=>{const s=score(x);if(s!==last){pos=i+1;last=s;}return {...x,position:pos};}).map((x,i,all)=>({...x,tied:all.filter(y=>y.position===x.position).length>1}));}
export function weekStandings(players,rows,{today,viewer}){
 const start=weekStart(today),end=addDays(start,6),viewerDone=rows.some(r=>r.player===viewer&&r.day===today&&r.finished);
 // Friends' results for today stay hidden until the viewer has finished; nothing after the viewer's today counts.
 const visible=rows.filter(r=>r.day>=start&&r.day<=end&&r.day<=today&&(r.day<today||viewerDone||r.player===viewer));
 const counted=r=>r.finished&&r.eligible&&leagueDay(r.updated)===r.day;
 const table=players.map(p=>{const mine=visible.filter(r=>r.player===p.id&&counted(r)),pts=mine.map(dailyPoints).sort((a,b)=>b-a);return {name:p.name,you:p.id===viewer,days:mine.length,points:pts.slice(0,WEEK_BEST).reduce((a,b)=>a+b,0)};});
 const played=table.filter(x=>x.days>0),ranked=rankBy(table.filter(x=>x.days>=WEEK_MIN_DAYS),x=>x.points);
 const standings=[...ranked,...played.filter(x=>x.days<WEEK_MIN_DAYS).sort((a,b)=>b.days-a.days||b.points-a.points).map(x=>({...x,position:null,tied:false}))];
 const todayRows=viewerDone?visible.filter(r=>r.day===today&&r.finished):[];
 const todayList=rankBy(todayRows.map(r=>({name:players.find(p=>p.id===r.player)?.name||'Friend',you:r.player===viewer,solved:!!r.solved,tries:r.tries})),x=>x.solved?7-x.tries:0);
 const mineToday=rows.find(r=>r.player===viewer&&r.day===today&&r.finished);
 return {start,end,numbers:[puzzleNumber(start),puzzleNumber(end)],shown:played.length>=WEEK_MIN_PLAYERS,standings,today:todayList,
  me:{...(table.find(x=>x.you)||{days:0,points:0}),position:ranked.find(x=>x.you)?.position||null,ranked:ranked.length,todayPoints:mineToday&&counted(mineToday)?dailyPoints(mineToday):0,todayCounted:!!(mineToday&&counted(mineToday)),needDays:WEEK_MIN_DAYS}};
}
async function friendsWeek(storage,userId,today){
 const start=weekStart(today),end=addDays(start,6);
 const people=(await storage.prepare("SELECT u.id,COALESCE(f.username,u.display_name,'Friend') AS name FROM auth_profiles u LEFT JOIN friend_profiles f ON f.user_id=u.id WHERE u.id=? OR u.id IN (SELECT CASE WHEN a=? THEN b ELSE a END FROM friendships WHERE status='accepted' AND (a=? OR b=?))").bind(userId,userId,userId,userId).all()).results||[];
 const rows=(await storage.prepare("SELECT player,day,solved,tries,finished,eligible,updated FROM daily_results WHERE day>=? AND day<=? AND (player=? OR player IN (SELECT CASE WHEN a=? THEN b ELSE a END FROM friendships WHERE status='accepted' AND (a=? OR b=?)))").bind(start,end,userId,userId,userId,userId).all()).results||[];
 return weekStandings(people,rows,{today,viewer:userId});
}

// Sign-out replay guard: once a signed-in player has today's word on a device, a guest on that device
// (after signing out) sees a "sign in to see it" screen instead of a fresh attempt.
async function markDevice(storage,userId,deviceKey,day){if(!userId||!deviceKey)return;await storage.prepare('INSERT OR IGNORE INTO daily_devices (day,device,player) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM daily_results WHERE day=? AND player=?)').bind(day,deviceKey,userId,day,userId).run();}
async function lockedForGuest(storage,userId,deviceKey,day){if(userId||!deviceKey)return false;return !!await storage.prepare('SELECT 1 FROM daily_devices WHERE day=? AND device=?').bind(day,deviceKey).first();}
const lockedSnapshot=day=>({day,number:puzzleNumber(day),max:MAX_GUESSES,guesses:[],status:'signed_in',solved:false,tries:0,progress:{streak:0,best:0,freezes:0,played:0,won:0,dist:[0,0,0,0,0,0,0],signedIn:false}});

// Guests are identified by a device key (kept in the browser's permanent storage), not by the per-tab
// seat token, so a new tab or a relaunched app cannot start today's word again. Results saved under
// the older per-tab key move to the device key, and to the account on sign-in.
export async function dailyRoute(request,storage,auth,account,url,deviceKey=null){
 const userId=account?.user_id||null,tabGuest='g:'+auth,guest=deviceKey||tabGuest,player=userId||guest,now=Date.now();
 if(deviceKey&&deviceKey!==tabGuest)await adoptGuest(storage,tabGuest,deviceKey);
 if(userId)await adoptGuest(storage,guest,userId);
 if(url.pathname==='/api/daily/stats'){
  if(request.method!=='GET')return json({error:'method'},405);
  const day=url.searchParams.get('day');if(!validDay(day,now))return json({error:'invalid_day'},400);
  const progress=await storage.prepare('SELECT streak,best,freezes,last_day,played,won,dist FROM player_progress WHERE player=?').bind(player).first();
  const rating=userId?await storage.prepare('SELECT rating,rated_games,wins,draws,losses,xp,tier,peak_rating FROM player_ratings WHERE user_id=?').bind(userId).first():null;
  const history=userId?((await storage.prepare('SELECT rating_after,created FROM rating_events WHERE user_id=? AND delta!=0 ORDER BY created DESC LIMIT 30').bind(userId).all()).results||[]).reverse():[];
  return json({daily:{streak:currentStreak(progress,day),best:progress?.best||0,freezes:progress?.freezes||0,played:progress?.played||0,won:progress?.won||0,dist:JSON.parse(progress?.dist||'[0,0,0,0,0,0,0]')},level:userId?levelFor(rating?.xp||0):null,xp:rating?.xp||0,rating:rating||null,history,signedIn:!!userId});
 }
 if(url.pathname==='/api/daily/week'){
  if(request.method!=='GET')return json({error:'method'},405);
  const day=url.searchParams.get('day');if(!validDay(day,now))return json({error:'invalid_day'},400);
  if(!userId)return json({signedIn:false});
  return json({signedIn:true,...await friendsWeek(storage,userId,day)});
 }
 if(url.pathname==='/api/daily'){
  if(request.method!=='GET')return json({error:'method'},405);
  const day=url.searchParams.get('day');if(!validDay(day,now))return json({error:'invalid_day'},400);
  if(await lockedForGuest(storage,userId,deviceKey,day))return json(lockedSnapshot(day));
  await markDevice(storage,userId,deviceKey,day);
  return json(await snapshot(storage,player,userId,day));
 }
 if(url.pathname==='/api/daily/guess'){
  if(request.method!=='POST')return json({error:'method'},405);
  let body;try{body=JSON.parse(await request.text());}catch{return json({error:'invalid_request'},400);}
  const day=body?.day;if(!validDay(day,now))return json({error:'invalid_day'},400);
  if(await lockedForGuest(storage,userId,deviceKey,day))return json({error:'daily_signed_in',...lockedSnapshot(day)},409);
  const word=normalize(String(body.word||''));if(!/^[a-z]{5}$/.test(word))return json({error:'five_letters'},400);if(!allowed.has(word))return json({error:'unknown_word'},400);
  const answer=await wordFor(storage,day);
  for(let attempt=0;attempt<4;attempt++){
   const row=await storage.prepare('SELECT guesses,finished,updated FROM daily_results WHERE day=? AND player=?').bind(day,player).first();
   if(row?.finished)return json({error:'daily_finished',...await snapshot(storage,player,userId,day)},409);
   const words=row?JSON.parse(row.guesses):[];if(words.includes(word))return json({error:'repeated'},400);
   words.push(word);const solved=word===answer,finished=solved||words.length>=MAX_GUESSES;
   const statements=[row
    ?storage.prepare('UPDATE daily_results SET guesses=?,solved=?,tries=?,finished=?,updated=? WHERE day=? AND player=? AND updated=? AND finished=0').bind(JSON.stringify(words),solved?1:0,words.length,finished?1:0,now,day,player,row.updated)
    :storage.prepare('INSERT OR IGNORE INTO daily_results (day,player,guesses,solved,tries,finished,updated,first_guess_at,eligible) VALUES (?,?,?,?,?,?,?,?,?)').bind(day,player,JSON.stringify(words),solved?1:0,words.length,finished?1:0,now,now,userId&&leagueDay(now)===day?1:0)];
   const saved=await storage.batch(statements);if(saved[0].meta.changes!==1)continue;
   await markDevice(storage,userId,deviceKey,day);
   if(!row)await storage.prepare('DELETE FROM daily_devices WHERE rowid IN (SELECT rowid FROM daily_devices WHERE day<? LIMIT 50)').bind(new Date(now-3*864e5).toISOString().slice(0,10)).run();
   if(finished){
    const prev=await storage.prepare('SELECT streak,best,freezes,last_day,played,won,dist FROM player_progress WHERE player=?').bind(player).first(),next=nextProgress(prev,day,solved,words.length);
    const writes=[storage.prepare('INSERT INTO player_progress (player,streak,best,freezes,last_day,played,won,dist,updated) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(player) DO UPDATE SET streak=excluded.streak,best=excluded.best,freezes=excluded.freezes,last_day=excluded.last_day,played=excluded.played,won=excluded.won,dist=excluded.dist,updated=excluded.updated').bind(player,next.streak,next.best,next.freezes,next.last_day,next.played,next.won,next.dist,now)];
    if(userId)writes.push(storage.prepare('INSERT INTO player_ratings (user_id,rating,rated_games,wins,draws,losses,xp,updated) VALUES (?,1000,0,0,0,0,?,?) ON CONFLICT(user_id) DO UPDATE SET xp=player_ratings.xp+excluded.xp').bind(userId,solved?10:5,now));
    await storage.batch(writes);
   }
   return json(await snapshot(storage,player,userId,day));
  }
  return json({error:'busy'},409);
 }
 return json({error:'not_found'},404);
}
