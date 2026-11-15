import {getSession,randomToken,hash} from './auth.js';
import {takeBudget,takeCooldown} from './protection.js';
import {isBlocked} from './social-safety.js';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
const pair=(a,b)=>[a,b].sort().join(':');
export async function profile(db,id){let row=await db.prepare('SELECT * FROM friend_profiles WHERE user_id=?').bind(id).first();if(row)return row;for(let n=0;n<4;n++){const tag='LEX-'+randomToken().slice(0,12).toUpperCase();try{await db.prepare('INSERT INTO friend_profiles (user_id,tag) SELECT ?,? WHERE EXISTS(SELECT 1 FROM auth_profiles WHERE id=?) ON CONFLICT(user_id) DO NOTHING').bind(id,tag,id).run();return await db.prepare('SELECT * FROM friend_profiles WHERE user_id=?').bind(id).first();}catch(e){if(!String(e).includes('UNIQUE'))throw e;}}throw Error('tag_unavailable');}
export async function friendsRoute(request,db){
 const session=await getSession(request,db);if(!session)return json({error:'Sign in with Google to use friends.'},401);
 const me=session.user_id,now=Date.now(),path=new URL(request.url).pathname.split('/').at(-1);
 if(!await takeBudget(db,'friends:'+me,60,now))return json({error:'Please wait a minute before trying again.'},429);
 const self=await profile(db,me);if(!self)return json({error:"Your session expired. Sign in again."},401);
 if(request.method==='GET'&&path==='friends'){
  const links=await db.prepare(`SELECT COALESCE(json_group_array(json_object('tag',tag,'name',display_name,'avatar',avatar,'colour',colour,'status',status,'incoming',incoming,'available',available,'online',online)),'[]') AS data FROM (SELECT p.tag,p.avatar,p.colour,COALESCE(p.username,u.display_name) AS display_name,f.status,f.sender!=? AS incoming,(f.status='accepted' AND p.seen_at>?) AS online,(f.status='accepted' AND p.seen_at>? AND p.available=1) AS available FROM friendships f JOIN friend_profiles p ON p.user_id=CASE WHEN f.a=? THEN f.b ELSE f.a END JOIN auth_profiles u ON u.id=p.user_id WHERE (f.a=? OR f.b=?) AND NOT EXISTS (SELECT 1 FROM player_blocks bl WHERE (bl.owner=f.a AND bl.blocked=f.b) OR (bl.owner=f.b AND bl.blocked=f.a)) ORDER BY f.status,u.display_name LIMIT 130)`).bind(me,now-60000,now-60000,me,me,me).first();
  const invites=await db.prepare(`SELECT COALESCE(json_group_array(json_object('id',id,'name',display_name,'mode',mode,'seconds',seconds,'remaining',remaining)),'[]') AS data FROM (SELECT c.id,COALESCE(fp.username,u.display_name) AS display_name,c.expires-? AS remaining,json_extract(r.data,'$.settings.mode') AS mode,json_extract(r.data,'$.settings.seconds') AS seconds FROM friend_challenges c JOIN auth_profiles u ON u.id=c.sender LEFT JOIN friend_profiles fp ON fp.user_id=u.id JOIN rooms r ON r.code=c.code JOIN friendships f ON f.id=CASE WHEN c.sender<c.recipient THEN c.sender||':'||c.recipient ELSE c.recipient||':'||c.sender END WHERE c.recipient=? AND c.expires>? AND r.expires>? AND json_extract(r.data,'$.status')='waiting' AND json_extract(r.data,'$.players[1]') IS NULL AND f.status='accepted' AND NOT EXISTS (SELECT 1 FROM player_blocks bl WHERE (bl.owner=c.sender AND bl.blocked=c.recipient) OR (bl.owner=c.recipient AND bl.blocked=c.sender)) ORDER BY c.expires LIMIT 20)`).bind(now,me,now,now).first();
  const blocked=await db.prepare("SELECT COALESCE(json_group_array(json_object('tag',tag,'name',name)),'[]') AS data FROM (SELECT p.tag,COALESCE(p.username,u.display_name) AS name FROM player_blocks b JOIN friend_profiles p ON p.user_id=b.blocked JOIN auth_profiles u ON u.id=p.user_id WHERE b.owner=? ORDER BY b.created DESC LIMIT 500)").bind(me).first();
  return json({tag:self.tag,username:self.username||null,avatar:self.avatar,colour:self.colour,csrf:session.csrf,friends:JSON.parse(links.data),challenges:JSON.parse(invites.data),blocked:JSON.parse(blocked.data)});
 }
 if(request.method!=='POST')return json({error:'Not found.'},404);
 if(request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Invalid request origin.'},403);
 const raw=await request.text();if(raw.length>2048)return json({error:'Request too large.'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}if(!body||body.csrf!==session.csrf)return json({error:'Your session expired. Refresh and try again.'},403);
 if(path==='avatar'){
  if(!['irish','astronaut','fox','knight','robot','explorer'].includes(body.avatar)||!['#51d4ff','#f5b84c','#bba2ff','#71e2b1','#ff9d91','#8ebaff'].includes(body.colour))return json({error:'Choose an available avatar and colour.'},400);
  await db.prepare('UPDATE friend_profiles SET avatar=?,colour=? WHERE user_id=?').bind(body.avatar,body.colour,me).run();return json({ok:true,avatar:body.avatar,colour:body.colour});
 }
 if(path==='username'){
  const username=String(body.username||'').trim().toLowerCase().replace(/^@/,'');
  if(!/^[a-z][a-z0-9_]{2,19}$/.test(username))return json({error:'Use 3–20 letters, numbers or underscores, starting with a letter.'},400);
  if(['admin','administrator','support','lexivanto','moderator'].includes(username))return json({error:'That username is unavailable. Try another.'},409);
  try{const saved=await db.prepare('UPDATE friend_profiles SET username=? WHERE user_id=?').bind(username,me).run();if(!saved.meta.changes)return json({error:'Your profile is unavailable. Sign in again.'},409);}catch(e){if(String(e).includes('UNIQUE'))return json({error:'That username is already taken. Try another.'},409);throw e;}
  return json({ok:true,username});
 }
 if(path==='search'){
  const query=String(body.query||'').trim().replace(/^@/,'');
  if(!/^[a-z][a-z0-9_]{2,19}$/i.test(query)&&!/^LEX-[A-F0-9]{12}$/i.test(query))return json({error:'Enter a full username or player tag.'},400);
  const found=await db.prepare('SELECT p.user_id,p.tag,p.username,COALESCE(p.username,u.display_name) AS name FROM friend_profiles p JOIN auth_profiles u ON u.id=p.user_id WHERE p.username=? OR p.tag=? LIMIT 1').bind(query.toLowerCase(),query.toUpperCase()).first();
  if(!found||found.user_id===me||await isBlocked(db,me,found.user_id))return json({players:[]});
  const link=await db.prepare('SELECT status,sender FROM friendships WHERE id=?').bind(pair(me,found.user_id)).first();
  return json({players:[{tag:found.tag,username:found.username,name:found.name,status:link?.status||null,incoming:link?link.sender!==me:false}]});
 }
 if(path==='presence'){await db.prepare('UPDATE friend_profiles SET seen_at=?,available=? WHERE user_id=?').bind(now,body.available===true?1:0,me).run();return json({ok:true});}
 if(path==='accept-challenge'||path==='dismiss-challenge'){
  const invite=await db.prepare('SELECT * FROM friend_challenges WHERE id=? AND recipient=? AND expires>?').bind(String(body.id||''),me,now).first();if(!invite)return json({error:'This challenge expired.'},404);
  const friendship=await db.prepare("SELECT id FROM friendships WHERE id=? AND status='accepted'").bind(pair(me,invite.sender)).first();if(!friendship||await isBlocked(db,me,invite.sender))return json({error:'This friendship is no longer available.'},403);
  if(path==='dismiss-challenge'){await db.prepare('DELETE FROM friend_challenges WHERE id=? AND recipient=?').bind(invite.id,me).run();return json({ok:true});}
  const room=await db.prepare('SELECT data,expires FROM rooms WHERE code=?').bind(invite.code).first();const game=room?JSON.parse(room.data):null;if(!game||room.expires<=now||game.status!=='waiting'||game.players[1])return json({error:'This room is no longer available.'},409);
  return json({code:invite.code});
 }
 const tag=String(body.tag||'').trim().toUpperCase();if(!/^LEX-[A-F0-9]{12}$/.test(tag))return json({error:'Enter the full player tag, starting with LEX-.'},400);
 const peer=await db.prepare('SELECT user_id FROM friend_profiles WHERE tag=?').bind(tag).first();if(!peer||peer.user_id===me)return json({error:'Player not found. Check their tag.'},404);
 const other=peer.user_id,id=pair(me,other),[a,b]=[me,other].sort();
 if(path==='block'){
  const blocked=await db.prepare('INSERT INTO player_blocks (id,owner,blocked,created) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_profiles WHERE id=?) AND EXISTS(SELECT 1 FROM auth_profiles WHERE id=?) AND (SELECT count(*) FROM player_blocks WHERE owner=?)<500 ON CONFLICT(id) DO NOTHING').bind(me+':'+other,me,other,now,me,other,me).run();
  if(!blocked.meta.changes&&!await db.prepare('SELECT id FROM player_blocks WHERE id=?').bind(me+':'+other).first())return json({error:'Your block list is full.'},409);
  await db.batch([db.prepare('DELETE FROM friendships WHERE id=?').bind(id),db.prepare('DELETE FROM friend_challenges WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)').bind(me,other,other,me)]);return json({ok:true});
 }
 if(path==='unblock'){await db.prepare('DELETE FROM player_blocks WHERE owner=? AND blocked=?').bind(me,other).run();return json({ok:true});}
 if(await isBlocked(db,me,other))return json({error:'This player is unavailable.'},403);
 const relation=await db.prepare('SELECT * FROM friendships WHERE id=?').bind(id).first();
 if(path==='request'){
  if(relation)return json({ok:true});
  if(!await takeBudget(db,'friend-requests:'+me,5,now)||!await takeBudget(db,'friend-recipient:'+other,5,now)||!await takeCooldown(db,'friend-pair:'+id,now,600000))return json({error:'Please wait before sending another friend request.'},429);
  const result=await db.prepare(`INSERT INTO friendships (id,a,b,sender,status,created) SELECT ?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM auth_profiles WHERE id=?) AND EXISTS(SELECT 1 FROM auth_profiles WHERE id=?) AND (SELECT COUNT(*) FROM friendships WHERE (a=? OR b=?) AND status='accepted')<100 AND (SELECT COUNT(*) FROM friendships WHERE (a=? OR b=?) AND status='accepted')<100 AND (SELECT COUNT(*) FROM friendships WHERE sender=? AND status='pending')<10 AND (SELECT COUNT(*) FROM friendships WHERE (a=? OR b=?) AND sender!=? AND status='pending')<20 AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE id=? OR id=?) ON CONFLICT(id) DO NOTHING`).bind(id,a,b,me,now,me,other,me,me,other,other,me,other,other,other,me+':'+other,other+':'+me).run();if(!result.meta.changes)return json({error:'Request unavailable or friends list full. Refresh and try again.'},409);return json({ok:true});
 }
 if(path==='accept'){const result=await db.prepare("UPDATE friendships SET status='accepted' WHERE id=? AND sender!=? AND (a=? OR b=?) AND status='pending' AND (SELECT COUNT(*) FROM friendships WHERE (a=? OR b=?) AND status='accepted')<100 AND (SELECT COUNT(*) FROM friendships WHERE (a=? OR b=?) AND status='accepted')<100 AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE id=? OR id=?)").bind(id,me,me,me,me,me,other,other,me+':'+other,other+':'+me).run();return result.meta.changes?json({ok:true}):json({error:'This request is no longer available.'},409);}
 if(path==='remove'){await db.batch([db.prepare('DELETE FROM friendships WHERE id=? AND (a=? OR b=?)').bind(id,me,me),db.prepare('DELETE FROM friend_challenges WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)').bind(me,other,other,me)]);return json({ok:true});}
 if(path==='challenge'){
  if(relation?.status!=='accepted')return json({error:'Accept the friend request first.'},403);
  const code=String(body.code||'');const row=await db.prepare('SELECT data,expires FROM rooms WHERE code=?').bind(code).first();const g=row?JSON.parse(row.data):null;const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
  if(!/^[a-f0-9]{64}$/.test(token)||!g||g.online||row.expires<=now||g.status!=='waiting'||g.players[1]||g.players[0]?.auth!==await hash(token))return json({error:'Create an empty friend room first.'},403);
  if(!await takeBudget(db,'friend-challenges:'+me,5,now)||!await takeBudget(db,'friend-challenge-pair:'+id,1,now))return json({error:'Please wait before sending another invitation.'},429);
  const result=await db.prepare("INSERT INTO friend_challenges (id,sender,recipient,code,expires) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM friendships WHERE id=? AND status='accepted') AND EXISTS(SELECT 1 FROM auth_profiles WHERE id=?) AND EXISTS(SELECT 1 FROM auth_profiles WHERE id=?) AND NOT EXISTS(SELECT 1 FROM player_blocks WHERE id=? OR id=?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,expires=excluded.expires").bind(me+':'+other,me,other,code,now+300000,id,me,other,me+':'+other,other+':'+me).run();return result.meta.changes?json({ok:true}):json({error:'This friendship is no longer available.'},409);
 }
 return json({error:'Not found.'},404);
}
