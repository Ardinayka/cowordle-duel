const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'}});
const expected=(rating,opponent)=>1/(1+10**((opponent-rating)/400));
const outcome=(winner,seat)=>winner===null?.5:winner===seat?1:0;
const xpFor=(winner,seat)=>winner===null?15:winner===seat?20:10;

async function accountFor(storage,tag){
 if(!tag)return null;
 return storage.prepare('SELECT user_id FROM friend_profiles WHERE tag=?').bind(tag).first();
}
async function current(storage,userId){
 const row=await storage.prepare('SELECT rating,rated_games,wins,draws,losses,xp FROM player_ratings WHERE user_id=?').bind(userId).first();
 return row||{rating:1000,rated_games:0,wins:0,draws:0,losses:0,xp:0};
}
export async function settleMatch(storage,g,code){
 if(!g?.online||g.status!=='finished'||g.settings?.mode!=='duel'||!Number.isInteger(g.match))return;
 const id=code+':'+g.match,accounts=await Promise.all(g.players.map(p=>accountFor(storage,p?.tag)));
 const users=accounts.map(x=>x?.user_id||null),rated=users.every(Boolean)&&users[0]!==users[1]&&['timeout','solved','left'].includes(g.reason);
 const before=await Promise.all(users.map(x=>x?current(storage,x):null));
 let deltas=[0,0];if(rated){const raw=Math.round(32*(outcome(g.winner,0)-expected(before[0].rating,before[1].rating)));deltas=[raw,-raw];}
 const statements=[storage.prepare("INSERT OR IGNORE INTO match_results (id,room_code,match,mode,player_a,player_b,winner,reason,rated,settled,created) VALUES (?,?,?,?,?,?,?,?,?,0,?)").bind(id,code,g.match,'duel',users[0],users[1],g.winner===null?null:users[g.winner]||null,String(g.reason||'finished'),rated?1:0,Date.now())];
 for(let seat=0;seat<2;seat++)if(users[seat]){
  const b=before[seat],xp=xpFor(g.winner,seat),win=g.winner===seat?1:0,draw=g.winner===null?1:0,loss=g.winner!==null&&g.winner!==seat?1:0;
  statements.push(storage.prepare("INSERT INTO player_ratings (user_id,rating,rated_games,wins,draws,losses,xp,updated) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM match_results WHERE id=? AND settled=0) ON CONFLICT(user_id) DO UPDATE SET rating=player_ratings.rating+excluded.rating-1000,rated_games=player_ratings.rated_games+excluded.rated_games,wins=player_ratings.wins+excluded.wins,draws=player_ratings.draws+excluded.draws,losses=player_ratings.losses+excluded.losses,xp=player_ratings.xp+excluded.xp,updated=excluded.updated").bind(users[seat],1000+deltas[seat],rated?1:0,rated?win:0,rated?draw:0,rated?loss:0,xp,Date.now(),id));
  statements.push(storage.prepare("INSERT OR IGNORE INTO rating_events (id,match_id,user_id,rating_before,delta,rating_after,xp,created) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM match_results WHERE id=? AND settled=0)").bind(id+':'+seat,id,users[seat],b.rating,deltas[seat],b.rating+deltas[seat],xp,Date.now(),id));
 }
 statements.push(storage.prepare('UPDATE match_results SET settled=1 WHERE id=? AND settled=0').bind(id));
 await storage.batch(statements);
}
export async function matchProgress(storage,g,code,seat){
 const user=await accountFor(storage,g.players[seat]?.tag);if(!user)return {eligible:false,reason:'Sign in to earn XP and a Duel rating.'};
 const rating=await current(storage,user.user_id),event=await storage.prepare('SELECT rating_before,delta,rating_after,xp FROM rating_events WHERE id=?').bind(code+':'+g.match+':'+seat).first();
 const result=await storage.prepare('SELECT rated FROM match_results WHERE id=?').bind(code+':'+g.match).first();
 return {eligible:!!event,rated:!!result?.rated,rating:rating.rating,ratedGames:rating.rated_games,provisional:rating.rated_games<10,xp:rating.xp,event:event||null};
}
export async function leaderboardRoute(request,storage,account){
 if(request.method!=='GET')return json({error:'method'},405);
 const rows=await storage.prepare("SELECT f.username,f.avatar,f.colour,r.rating,r.rated_games,r.wins,r.draws,r.losses,r.xp FROM player_ratings r JOIN friend_profiles f ON f.user_id=r.user_id WHERE r.rated_games>=10 AND f.username IS NOT NULL ORDER BY r.rating DESC,r.wins DESC,r.updated ASC LIMIT 100").all();
 let mine=null;if(account){const p=await storage.prepare('SELECT f.username,f.avatar,f.colour,r.rating,r.rated_games,r.wins,r.draws,r.losses,r.xp,(SELECT COUNT(*)+1 FROM player_ratings x WHERE x.rated_games>=10 AND x.rating>r.rating) AS rank FROM friend_profiles f LEFT JOIN player_ratings r ON r.user_id=f.user_id WHERE f.user_id=?').bind(account.user_id).first();if(p)mine=p;}
 return json({season:'Preseason',placementGames:10,rows:(rows.results||rows||[]).map((r,i)=>({...r,rank:i+1})),mine});
}
