// Turn-based friend games (Phase 6). Both players are signed-in friends; seats belong to the account,
// so a game follows the player across devices and days. Each move refreshes a 3-day move clock and the
// room's 7-day expiry. room_members keeps a small per-player list (whose turn, result) for the Play screen.
import {makeRoom,startTurns,turnSeats,expire,view} from '../public/game.js';
import {notifyUser} from './push.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'}});
export const ROOM_LIFETIME=7*864e5,MAX_ACTIVE=20;
const MODES={duel:'Duel',coop:'Co-op game'};
const pair=(a,b)=>[a,b].sort().join(':');
export const isTurns=g=>g?.settings?.pace==='turns';

async function profile(storage,userId){
 return storage.prepare('SELECT p.id,COALESCE(f.username,p.display_name) AS name,f.tag,f.avatar,f.colour FROM auth_profiles p LEFT JOIN friend_profiles f ON f.user_id=p.id WHERE p.id=?').bind(userId).first();
}
function resultFor(g,seat){if(g.status!=='finished')return null;if(g.winner==='team')return 'won';if(g.winner===null||g.winner===undefined)return g.settings.mode==='coop'?'lost':'draw';return g.winner===seat?'won':'lost';}
export async function syncMembers(storage,g,code,now=Date.now()){
 const turn=turnSeats(g),statements=[];
 for(let seat=0;seat<2;seat++){const me=g.players[seat],other=g.players[1-seat];if(!me?.userId)continue;
  statements.push(storage.prepare('INSERT INTO room_members (code,user_id,seat,other_name,mode,status,my_turn,result,updated) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(code,user_id) DO UPDATE SET other_name=excluded.other_name,mode=excluded.mode,status=excluded.status,my_turn=excluded.my_turn,result=excluded.result,updated=excluded.updated')
   .bind(code,me.userId,seat,other?.name||'Friend',g.settings.mode,g.status,turn.includes(seat)?1:0,resultFor(g,seat),now));}
 if(statements.length)await storage.batch(statements);
}
// After a change: keep the room alive, update both lists, and tell the other player when it became their turn.
export async function afterTurnsChange(storage,g,code,before,actorSeat,{now=Date.now(),notify=notifyUser}={}){
 g.expires=now+ROOM_LIFETIME;await storage.prepare('UPDATE rooms SET expires=? WHERE code=?').bind(g.expires,code).run();
 await syncMembers(storage,g,code,now);
 const after=turnSeats(g),mode=MODES[g.settings.mode]||'game';
 for(let seat=0;seat<2;seat++){if(seat===actorSeat)continue;const player=g.players[seat];if(!player?.userId)continue;
  const actor=g.players[1-seat]?.name||'Your friend';let message=null;
  if(g.status==='finished'&&before.status!=='finished'){const r=resultFor(g,seat);message={kind:'turns',title:g.reason==='timeout'?'Time ran out vs '+actor:r==='won'?'You won vs '+actor:r==='lost'?(g.settings.mode==='coop'?'Not solved this time':actor+' won the '+mode):'Draw with '+actor,body:'The word was '+String(g.answer||'').toUpperCase()+'. Tap to see the board.',url:'/?game='+code,ttl:86400};}
  else if(g.status!=='playing'||before.status!=='playing'||actorSeat<0){}
  // Duel: the friend locked a guess and you have not yet; or both locked and the next round opened.
  else if(g.settings.mode==='duel'&&g.round===before.round&&g.pending[actorSeat]&&!g.pending[seat])message={kind:'turns',title:'Your turn vs '+actor,body:actor+' has locked a guess. Make your move within 3 days.',url:'/?game='+code,ttl:3*86400};
  else if(g.settings.mode==='duel'&&g.round>before.round)message={kind:'turns',title:'Round '+g.round+' vs '+actor,body:'Both guesses are revealed. Your next move, within 3 days.',url:'/?game='+code,ttl:3*86400};
  // Co-op: the turn passed to you.
  else if(g.settings.mode==='coop'&&after.includes(seat)&&!before.turn.includes(seat))message={kind:'turns',title:'Your turn with '+actor,body:actor+' has guessed. Your move in the Co-op game, within 3 days.',url:'/?game='+code,ttl:3*86400};
  if(message)await notify(storage,player.userId,'invite',message);
 }
}
export const snapshotTurns=g=>({status:g.status,round:g.round,turn:turnSeats(g)});

// POST /api/turns/start {friend:tag, mode, settings} — creates the game and starts it at once.
export async function startTurnsGame(storage,account,body,chooseAnswer,now=Date.now(),notify=notifyUser){
 if(!account)return json({error:'sign_in_required'},401);
 const mode=['duel','coop'].includes(body.mode)?body.mode:'duel',tag=String(body.friend||'');
 if(!/^LEX-[A-F0-9]{12}$/.test(tag))return json({error:'friend_required'},400);
 const friend=await storage.prepare('SELECT user_id FROM friend_profiles WHERE tag=?').bind(tag).first();if(!friend||friend.user_id===account.user_id)return json({error:'friend_required'},400);
 const me=account.user_id,other=friend.user_id;
 const ok=await storage.prepare("SELECT 1 FROM friendships WHERE id=? AND status='accepted' AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE id=? OR id=?)").bind(pair(me,other),me+':'+other,other+':'+me).first();
 if(!ok)return json({error:'friend_required'},403);
 const active=await storage.prepare("SELECT COUNT(*) AS n FROM room_members WHERE user_id=? AND status='playing'").bind(me).first();
 if((active?.n||0)>=MAX_ACTIVE)return json({error:'too_many_games'},429);
 const [a,b]=await Promise.all([profile(storage,me),profile(storage,other)]);
 const settings={mode,pace:'turns',lang:'en',attempts:mode==='coop'?[6,10,0].includes(Number(body.attempts))?Number(body.attempts):6:6};
 const g=makeRoom(settings,a?.name||'Player','',chooseAnswer('en'),now);
 g.players[0]={name:a?.name||'Player',auth:null,tag:a?.tag||null,userId:me,avatar:a?.avatar||null,colour:a?.colour||null,ready:true};
 g.players[1]={name:b?.name||'Friend',auth:null,tag:b?.tag||null,userId:other,avatar:b?.avatar||null,colour:b?.colour||null,ready:true};
 startTurns(g,now);g.expires=now+ROOM_LIFETIME;
 for(let n=0;n<4;n++){const code=Array.from(crypto.getRandomValues(new Uint8Array(6))).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
  try{await storage.prepare('INSERT INTO rooms (code,data,revision,expires) VALUES (?,?,0,?)').bind(code,JSON.stringify(g),g.expires).run();}catch(e){if(String(e).includes('UNIQUE'))continue;throw e;}
  await syncMembers(storage,g,code,now);
  await notify(storage,other,'invite',{kind:'turns',title:(a?.name||'A friend')+' started a '+(mode==='duel'?'Duel':'Co-op game')+' with you',body:'Play your turn whenever you like, within 3 days.',url:'/?game='+code,ttl:3*86400});
  return json({code,revision:0,...view(g,0,now)});
 }
 return json({error:'busy'},503);
}

// GET /api/turns — the player's turn-based games: active first (your turn first), then finished in the last 7 days.
export async function listTurns(storage,account,now=Date.now()){
 if(!account)return json({error:'sign_in_required'},401);
 const rows=(await storage.prepare("SELECT m.code,m.other_name,m.mode,m.status,m.my_turn,m.result,m.updated FROM room_members m JOIN rooms r ON r.code=m.code WHERE m.user_id=? AND r.expires>? AND (m.status='playing' OR m.updated>?) ORDER BY m.status='playing' DESC,m.my_turn DESC,m.updated DESC LIMIT 30").bind(account.user_id,now,now-ROOM_LIFETIME).all()).results||[];
 // Overdue games are settled when anyone looks, so the list never shows a turn that has run out.
 for(const row of rows.filter(r=>r.status==='playing')){
  const room=await storage.prepare('SELECT data,revision FROM rooms WHERE code=?').bind(row.code).first();if(!room)continue;
  const g=JSON.parse(room.data);const before=snapshotTurns(g);if(!expire(g,now))continue;
  const saved=await storage.prepare('UPDATE rooms SET data=?,revision=revision+1 WHERE code=? AND revision=?').bind(JSON.stringify(g),row.code,room.revision).run();
  if(saved.meta.changes===1){const seat=g.players.findIndex(x=>x?.userId===account.user_id);await afterTurnsChange(storage,g,row.code,before,seat,{now});Object.assign(row,{status:g.status,my_turn:0,result:resultFor(g,seat)});}
 }
 return json({games:rows.map(r=>({code:r.code,opponent:r.other_name,mode:r.mode,status:r.status,myTurn:!!r.my_turn,result:r.result,updated:r.updated}))});
}
