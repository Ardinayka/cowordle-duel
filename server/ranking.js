const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'}});

// Competitive rules (REDESIGN-PLAN.md section 3B). Existing ratings are never recalculated;
// these rules apply to games settled from Phase 3 onwards.
export const PLACEMENTS=5,UNLOCK_NORMAL_GAMES=5,FLOOR=400,START=1000,PAIR_CAP=3,DAY=864e5;
export const TIERS=[['Bronze',0],['Silver',900],['Gold',1000],['Platinum',1100],['Diamond',1200],['Master',1300]];
export const COOLDOWNS=[5*6e4,30*6e4,120*6e4];
const expected=(rating,opponent)=>1/(1+10**((opponent-rating)/400));
const outcome=(winner,seat)=>winner===null?.5:winner===seat?1:0;
const xpFor=(winner,seat)=>winner===null?15:winner===seat?20:10;
const tierIndex=name=>TIERS.findIndex(t=>t[0]===name);
export function tierFor(rating){let tier=TIERS[0][0];for(const [name,floor] of TIERS)if(rating>=floor)tier=name;return tier;}
// A player keeps a reached tier until they fall 25 points below its floor.
export function nextTier(rating,previous){const tier=tierFor(rating),held=tierIndex(previous);if(held>tierIndex(tier)&&rating>=TIERS[held][1]-25)return previous;return tier;}
export function kFactor(games,rating,opponentGames){let k=games<PLACEMENTS?48:rating>=1400?16:games<30?32:24;if(games>=PLACEMENTS&&opponentGames<PLACEMENTS)k/=2;return k;}
export function ratingDelta(rating,opponent,score,games,opponentGames){return Math.max(Math.round(kFactor(games,rating,opponentGames)*(score-expected(rating,opponent))),FLOOR-rating);}
export function stakesFor(me,them){return {win:ratingDelta(me.rating,them.rating,1,me.rated_games,them.rated_games),draw:ratingDelta(me.rating,them.rating,.5,me.rated_games,them.rated_games),lose:ratingDelta(me.rating,them.rating,0,me.rated_games,them.rated_games),placement:me.rated_games<PLACEMENTS};}
export function cooldownFor(strikes){return COOLDOWNS[Math.min(strikes,COOLDOWNS.length)-1]||0;}

export async function accountFor(storage,tag){
 if(!tag)return null;
 return storage.prepare('SELECT user_id FROM friend_profiles WHERE tag=?').bind(tag).first();
}
export async function current(storage,userId){
 const row=await storage.prepare('SELECT rating,rated_games,wins,draws,losses,xp,peak_rating,tier,season_games FROM player_ratings WHERE user_id=?').bind(userId).first();
 return row||{rating:START,rated_games:0,wins:0,draws:0,losses:0,xp:0,peak_rating:null,tier:null,season_games:0};
}
export async function currentSeason(storage,now=Date.now()){
 return await storage.prepare('SELECT id,name,starts,ends FROM seasons WHERE starts<=? ORDER BY starts DESC LIMIT 1').bind(now).first()||null;
}
export async function ratedPairGames(storage,a,b,now=Date.now()){
 const row=await storage.prepare('SELECT COUNT(*) AS n FROM match_results WHERE rated=1 AND created>? AND ((player_a=? AND player_b=?) OR (player_a=? AND player_b=?))').bind(now-DAY,a,b,b,a).first();
 return row?.n||0;
}
// Competitive opens after a few Normal games, so new accounts learn the game before risking a rating.
export async function competitiveStatus(storage,userId,now=Date.now()){
 const rating=await current(storage,userId);
 const normal=rating.rated_games>0?null:await storage.prepare("SELECT COUNT(*) AS n FROM match_results WHERE rated=0 AND mode='duel' AND reason NOT IN ('cancelled','no_contest') AND COALESCE(queue,'normal')='normal' AND (player_a=? OR player_b=?)").bind(userId,userId).first();
 const penalty=await storage.prepare('SELECT strikes,last_strike,until FROM queue_penalties WHERE user_id=?').bind(userId).first();
 const normalGames=normal?.n||0;
 return {rating,unlocked:rating.rated_games>0||normalGames>=UNLOCK_NORMAL_GAMES,normalGames,normalNeeded:UNLOCK_NORMAL_GAMES,cooldownUntil:penalty?.until>now?penalty.until:0};
}

export async function settleMatch(storage,g,code){
 if(!g?.online||g.status!=='finished'||g.reason==='cancelled'||g.settings?.mode!=='duel'||!Number.isInteger(g.match))return;
 const id=code+':'+g.match,now=Date.now(),accounts=await Promise.all(g.players.map(p=>accountFor(storage,p?.tag)));
 const users=accounts.map(x=>x?.user_id||null),rated=g.queue!=='normal'&&!g.unrated&&users.every(Boolean)&&users[0]!==users[1]&&['timeout','solved','left','score'].includes(g.reason);
 const before=await Promise.all(users.map(x=>x?current(storage,x):null)),season=await currentSeason(storage,now);
 const deltas=[0,1].map(seat=>rated?ratingDelta(before[seat].rating,before[1-seat].rating,outcome(g.winner,seat),before[seat].rated_games,before[1-seat].rated_games):0);
 const score=g.score||[null,null],queue=g.queue||'ranked';
 const statements=[storage.prepare("INSERT OR IGNORE INTO match_results (id,room_code,match,mode,player_a,player_b,winner,reason,rated,settled,created,queue,season,score_a,score_b,end_type) VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)").bind(id,code,g.match,'duel',users[0],users[1],g.winner===null?null:users[g.winner]||null,String(g.reason||'finished'),rated?1:0,now,queue,season?.id??null,score[0],score[1],String(g.reason||'finished'))];
 const unsettled=' WHERE EXISTS (SELECT 1 FROM match_results WHERE id=? AND settled=0)';
 for(let seat=0;seat<2;seat++)if(users[seat]){
  const b=before[seat],xp=xpFor(g.winner,seat),win=g.winner===seat?1:0,draw=g.winner===null?1:0,loss=g.winner!==null&&g.winner!==seat?1:0;
  const after=b.rating+deltas[seat],games=b.rated_games+(rated?1:0);
  const tierBefore=b.rated_games>=PLACEMENTS?(b.tier||tierFor(b.rating)):null,tierAfter=rated?(games>=PLACEMENTS?nextTier(after,tierBefore):null):tierBefore;
  statements.push(storage.prepare("INSERT INTO player_ratings (user_id,rating,rated_games,wins,draws,losses,xp,updated,peak_rating,tier,season,season_games) SELECT ?,?,?,?,?,?,?,?,?,?,?,?"+unsettled+" ON CONFLICT(user_id) DO UPDATE SET rating=player_ratings.rating+excluded.rating-1000,rated_games=player_ratings.rated_games+excluded.rated_games,wins=player_ratings.wins+excluded.wins,draws=player_ratings.draws+excluded.draws,losses=player_ratings.losses+excluded.losses,xp=player_ratings.xp+excluded.xp,updated=excluded.updated,peak_rating=CASE WHEN excluded.rated_games>0 THEN MAX(COALESCE(player_ratings.peak_rating,player_ratings.rating),excluded.peak_rating) ELSE player_ratings.peak_rating END,tier=CASE WHEN excluded.rated_games>0 THEN excluded.tier ELSE player_ratings.tier END,season=COALESCE(excluded.season,player_ratings.season),season_games=CASE WHEN excluded.season IS NOT NULL AND player_ratings.season IS NOT excluded.season THEN excluded.season_games ELSE player_ratings.season_games+excluded.season_games END")
   .bind(users[seat],1000+deltas[seat],rated?1:0,rated?win:0,rated?draw:0,rated?loss:0,xp,now,after,tierAfter,season?.id??null,rated?1:0,id));
  statements.push(storage.prepare("INSERT OR IGNORE INTO rating_events (id,match_id,user_id,rating_before,delta,rating_after,xp,created,tier_before,tier_after) SELECT ?,?,?,?,?,?,?,?,?,?"+unsettled).bind(id+':'+seat,id,users[seat],b.rating,deltas[seat],after,xp,now,tierBefore,tierAfter,id));
 }
 // Leaving a Competitive match earns a strike: cooldowns of 5 min, 30 min, then 2 h; strikes clear after 24 h.
 const leaver=Number.isInteger(g.leaver)?users[g.leaver]:null;
 if(queue==='ranked'&&leaver&&['left','no_contest'].includes(g.reason)){
  const p=await storage.prepare('SELECT strikes,last_strike FROM queue_penalties WHERE user_id=?').bind(leaver).first();
  const strikes=p&&p.last_strike>now-DAY?p.strikes+1:1;
  statements.push(storage.prepare("INSERT INTO queue_penalties (user_id,strikes,last_strike,until) SELECT ?,?,?,?"+unsettled+" ON CONFLICT(user_id) DO UPDATE SET strikes=excluded.strikes,last_strike=excluded.last_strike,until=excluded.until").bind(leaver,strikes,now,now+cooldownFor(strikes),id));
 }
 statements.push(storage.prepare('UPDATE match_results SET settled=1 WHERE id=? AND settled=0').bind(id));
 await storage.batch(statements);
}
export async function matchProgress(storage,g,code,seat){
 const user=await accountFor(storage,g.players[seat]?.tag);if(!user)return {eligible:false,reason:'Sign in to earn XP and a Duel rating.'};
 const rating=await current(storage,user.user_id),event=await storage.prepare('SELECT rating_before,delta,rating_after,xp,tier_before,tier_after FROM rating_events WHERE id=?').bind(code+':'+g.match+':'+seat).first();
 const result=await storage.prepare('SELECT rated FROM match_results WHERE id=?').bind(code+':'+g.match).first();
 const placement=rating.rated_games<PLACEMENTS;
 return {eligible:!!event,rated:!!result?.rated,rating:rating.rating,ratedGames:rating.rated_games,provisional:placement,placement:{played:Math.min(rating.rated_games,PLACEMENTS),of:PLACEMENTS,done:!placement},tier:placement?null:(rating.tier||tierFor(rating.rating)),promoted:!!(event?.tier_after&&event.tier_before!==event.tier_after&&tierIndex(event.tier_after)>tierIndex(event.tier_before)),placedNow:!!(event&&!event.tier_before&&event.tier_after),xp:rating.xp,event:event||null,...(g.unrated?{unrated:g.unrated}:{})};
}
export async function leaderboardRoute(request,storage,account){
 if(request.method!=='GET')return json({error:'method'},405);
 const rows=await storage.prepare("SELECT f.username,f.avatar,f.colour,r.rating,r.rated_games,r.wins,r.draws,r.losses,r.xp,r.tier FROM player_ratings r JOIN friend_profiles f ON f.user_id=r.user_id WHERE r.rated_games>=? AND f.username IS NOT NULL ORDER BY r.rating DESC,r.wins DESC,r.updated ASC LIMIT 100").bind(PLACEMENTS).all();
 let mine=null;
 if(account){const p=await storage.prepare('SELECT f.username,f.avatar,f.colour,r.rating,r.rated_games,r.wins,r.draws,r.losses,r.xp,r.tier,r.peak_rating,(SELECT COUNT(*)+1 FROM player_ratings x WHERE x.rated_games>=? AND x.rating>r.rating) AS rank FROM friend_profiles f LEFT JOIN player_ratings r ON r.user_id=f.user_id WHERE f.user_id=?').bind(PLACEMENTS,account.user_id).first();
  if(p){const status=await competitiveStatus(storage,account.user_id),games=p.rated_games||0;mine={...p,rated_games:games,rank:games>=PLACEMENTS?p.rank:null,tier:games>=PLACEMENTS?(p.tier||tierFor(p.rating)):null,placement:{played:Math.min(games,PLACEMENTS),of:PLACEMENTS},unlocked:status.unlocked,normalGames:status.normalGames,normalNeeded:status.normalNeeded,cooldownUntil:status.cooldownUntil};}}
 const season=await currentSeason(storage);
 return json({season:season?.name||'Preseason',seasonEnds:season?.ends||null,placementGames:PLACEMENTS,tiers:TIERS.map(([name,floor])=>({name,floor})),rows:(rows.results||rows||[]).map((r,i)=>({...r,tier:r.tier||tierFor(r.rating),rank:i+1})),mine});
}
