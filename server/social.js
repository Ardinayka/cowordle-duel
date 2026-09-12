import {randomToken,sessionForRequest} from './auth.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'}});
const cleanUsername=value=>String(value||'').trim();
const validUsername=value=>/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(value);
const rows=async statement=>(await statement.all()).results||[];

async function ensureProfile(storage,session){
  let profile=await storage.prepare('SELECT user_id,username,player_tag FROM player_profiles WHERE user_id=?').bind(session.user_id).first();
  if(profile)return profile;
  for(let attempt=0;attempt<5;attempt++){
    const tag='LV-'+randomToken().slice(0,8).toUpperCase();
    try{await storage.prepare('INSERT INTO player_profiles (user_id,username,username_key,player_tag,created) VALUES (?,NULL,NULL,?,?)').bind(session.user_id,tag,Date.now()).run();break;}catch(e){if(!String(e).includes('UNIQUE'))throw e;}
  }
  profile=await storage.prepare('SELECT user_id,username,player_tag FROM player_profiles WHERE user_id=?').bind(session.user_id).first();
  if(!profile)throw Error('profile_unavailable');return profile;
}

async function snapshot(storage,session){
  const now=Date.now(),profile=await ensureProfile(storage,session);
  await storage.prepare('DELETE FROM friend_requests WHERE expires<?').bind(now).run();
  await storage.prepare('DELETE FROM game_challenges WHERE expires<?').bind(now).run();
  const friends=await rows(storage.prepare("SELECT p.id,p.display_name,s.username,s.player_tag FROM friendships f JOIN auth_profiles p ON p.id=CASE WHEN f.user_a=? THEN f.user_b ELSE f.user_a END LEFT JOIN player_profiles s ON s.user_id=p.id WHERE f.user_a=? OR f.user_b=? ORDER BY COALESCE(s.username,p.display_name) COLLATE NOCASE").bind(session.user_id,session.user_id,session.user_id));
  const incoming=await rows(storage.prepare('SELECT r.id,p.display_name,s.username,s.player_tag FROM friend_requests r JOIN auth_profiles p ON p.id=r.sender_id LEFT JOIN player_profiles s ON s.user_id=p.id WHERE r.recipient_id=? AND r.expires>? ORDER BY r.created').bind(session.user_id,now));
  const outgoing=await rows(storage.prepare('SELECT r.id,p.id AS user_id,p.display_name,s.username,s.player_tag FROM friend_requests r JOIN auth_profiles p ON p.id=r.recipient_id LEFT JOIN player_profiles s ON s.user_id=p.id WHERE r.sender_id=? AND r.expires>? ORDER BY r.created').bind(session.user_id,now));
  const challenges=await rows(storage.prepare('SELECT c.id,c.room_code,c.mode,p.display_name,s.username,s.player_tag FROM game_challenges c JOIN auth_profiles p ON p.id=c.sender_id LEFT JOIN player_profiles s ON s.user_id=p.id WHERE c.recipient_id=? AND c.expires>? ORDER BY c.created DESC').bind(session.user_id,now));
  return {profile:{id:session.user_id,name:session.display_name,username:profile.username,tag:profile.player_tag},friends,incoming,outgoing,challenges};
}

export async function socialRoute(request,storage,seatAuth){
  const url=new URL(request.url),parts=url.pathname.slice('/api/social/'.length).split('/').filter(Boolean),action=parts[0]||'snapshot';
  const session=await sessionForRequest(request,storage);if(!session)return json({error:'sign_in_required'},401);
  if(request.method==='GET')return action==='snapshot'?json(await snapshot(storage,session)):json({error:'method'},405);
  if(request.method!=='POST'||request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'origin'},403);
  const raw=await request.text();if(raw.length>2048)return json({error:'too_large'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid_request'},400);}
  if(body.csrf!==session.csrf)return json({error:'session_expired'},401);
  await ensureProfile(storage,session);
  if(action==='username'){
    const username=cleanUsername(body.username);if(!validUsername(username))return json({error:'invalid_username'},400);
    try{await storage.prepare('UPDATE player_profiles SET username=?,username_key=? WHERE user_id=?').bind(username,username.toLowerCase(),session.user_id).run();}catch(e){if(String(e).includes('UNIQUE'))return json({error:'username_taken'},409);throw e;}
    return json(await snapshot(storage,session));
  }
  if(action==='find'){
    const query=cleanUsername(body.query);if(query.length<3||query.length>21)return json({error:'invalid_search'},400);
    const found=await storage.prepare('SELECT p.id,p.display_name,s.username,s.player_tag FROM player_profiles s JOIN auth_profiles p ON p.id=s.user_id WHERE s.user_id!=? AND (s.username_key=? OR s.player_tag=?)').bind(session.user_id,query.toLowerCase(),query.toUpperCase()).first();
    return json({player:found||null});
  }
  if(action==='request'){
    const target=String(body.targetId||'');if(!target||target===session.user_id)return json({error:'invalid_player'},400);
    const exists=await storage.prepare('SELECT id FROM friendships WHERE (user_a=? AND user_b=?) OR (user_a=? AND user_b=?)').bind(session.user_id,target,target,session.user_id).first();if(exists)return json({error:'already_friends'},409);
    const reciprocal=await storage.prepare('SELECT id FROM friend_requests WHERE sender_id=? AND recipient_id=? AND expires>?').bind(target,session.user_id,Date.now()).first();
    if(reciprocal){const [a,b]=[session.user_id,target].sort();await storage.prepare('INSERT INTO friendships (id,user_a,user_b,created) VALUES (?,?,?,?) ON CONFLICT(user_a,user_b) DO NOTHING').bind(randomToken(),a,b,Date.now()).run();await storage.prepare('DELETE FROM friend_requests WHERE id=?').bind(reciprocal.id).run();return json(await snapshot(storage,session));}
    const validTarget=await storage.prepare('SELECT id FROM auth_profiles WHERE id=?').bind(target).first();if(!validTarget)return json({error:'player_not_found'},404);
    try{await storage.prepare('INSERT INTO friend_requests (id,sender_id,recipient_id,created,expires) VALUES (?,?,?,?,?)').bind(randomToken(),session.user_id,target,Date.now(),Date.now()+604800000).run();}catch(e){if(!String(e).includes('UNIQUE'))throw e;}
    return json(await snapshot(storage,session));
  }
  if(action==='friend-request'&&parts[1]&&['accept','decline'].includes(parts[2])){
    const requestRow=await storage.prepare('SELECT id,sender_id FROM friend_requests WHERE id=? AND recipient_id=? AND expires>?').bind(parts[1],session.user_id,Date.now()).first();if(!requestRow)return json({error:'request_expired'},404);
    if(parts[2]==='accept'){const [a,b]=[session.user_id,requestRow.sender_id].sort();await storage.prepare('INSERT INTO friendships (id,user_a,user_b,created) VALUES (?,?,?,?) ON CONFLICT(user_a,user_b) DO NOTHING').bind(randomToken(),a,b,Date.now()).run();}
    await storage.prepare('DELETE FROM friend_requests WHERE id=?').bind(parts[1]).run();return json(await snapshot(storage,session));
  }
  if(action==='challenge'){
    const target=String(body.targetId||''),roomCode=String(body.roomCode||'').toUpperCase(),mode=['duel','race','coop','swap'].includes(body.mode)?body.mode:'duel';
    const validTarget=await storage.prepare('SELECT id FROM auth_profiles WHERE id=?').bind(target).first();if(!validTarget||target===session.user_id)return json({error:'player_not_found'},404);
    const room=await storage.prepare('SELECT data,expires FROM rooms WHERE code=?').bind(roomCode).first();if(!room||room.expires<=Date.now())return json({error:'room_expired'},404);const game=JSON.parse(room.data);
    if(game.status!=='waiting'||game.players[0]?.auth!==seatAuth||game.players[1]||game.settings.mode!==mode)return json({error:'room_access'},403);
    const friendship=await storage.prepare('SELECT id FROM friendships WHERE (user_a=? AND user_b=?) OR (user_a=? AND user_b=?)').bind(session.user_id,target,target,session.user_id).first();
    if(!friendship){try{await storage.prepare('INSERT INTO friend_requests (id,sender_id,recipient_id,created,expires) VALUES (?,?,?,?,?)').bind(randomToken(),session.user_id,target,Date.now(),Date.now()+604800000).run();}catch(e){if(!String(e).includes('UNIQUE'))throw e;}}
    await storage.prepare('DELETE FROM game_challenges WHERE sender_id=? OR recipient_id=?').bind(session.user_id,target).run();
    await storage.prepare('INSERT INTO game_challenges (id,sender_id,recipient_id,room_code,mode,created,expires) VALUES (?,?,?,?,?,?,?)').bind(randomToken(),session.user_id,target,roomCode,mode,Date.now(),Date.now()+300000).run();
    return json({ok:true});
  }
  if(action==='game-challenge'&&parts[1]&&['accept','decline'].includes(parts[2])){
    const challenge=await storage.prepare('SELECT id,room_code,sender_id FROM game_challenges WHERE id=? AND recipient_id=? AND expires>?').bind(parts[1],session.user_id,Date.now()).first();if(!challenge)return json({error:'invitation_expired'},404);
    await storage.prepare('DELETE FROM game_challenges WHERE id=?').bind(parts[1]).run();
    if(parts[2]==='decline')return json({ok:true});
    const room=await storage.prepare('SELECT data,expires FROM rooms WHERE code=?').bind(challenge.room_code).first();if(!room||room.expires<=Date.now()||JSON.parse(room.data).status!=='waiting')return json({error:'room_expired'},404);
    const [a,b]=[session.user_id,challenge.sender_id].sort();await storage.prepare('INSERT INTO friendships (id,user_a,user_b,created) VALUES (?,?,?,?) ON CONFLICT(user_a,user_b) DO NOTHING').bind(randomToken(),a,b,Date.now()).run();await storage.prepare('DELETE FROM friend_requests WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)').bind(challenge.sender_id,session.user_id,session.user_id,challenge.sender_id).run();
    return json({ok:true,roomCode:challenge.room_code});
  }
  return json({error:'not_found'},404);
}
