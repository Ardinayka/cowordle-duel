import {makeRoom,view,expire,leave,onlineSettings} from '../public/game.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
export async function matchmaking(storage,auth,body,action,chooseAnswer){
  if(!/^[a-f0-9]{32}$/.test(body.searchId||''))return json({error:'invalid_request'},400);
  const id=body.searchId,now=Date.now();
  const get=()=>storage.prepare('SELECT * FROM match_queue WHERE auth=?').bind(auth).first();
  const retirement=auth+':'+id;
  const retire=searchId=>storage.prepare('INSERT INTO retired_searches (id,expires) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires').bind(auth+':'+searchId,Date.now()+86400000).run();
  async function result(ticket){
    if(ticket?.room_code){for(let i=0;i<4;i++){const row=await storage.prepare('SELECT data,revision,expires FROM rooms WHERE code=?').bind(ticket.room_code).first();if(!row||row.expires<=Date.now())break;const g=JSON.parse(row.data),p=g.players.findIndex(x=>x?.auth===auth);if(p<0)break;let revision=row.revision;let changed=expire(g,Date.now());if(action==='search'&&ticket.search_id!==id&&g.status==='waiting'&&g.match>1&&!g.players[p].ready){leave(g,p);changed=true;}if(changed){const saved=await storage.prepare('UPDATE rooms SET data=?,revision=revision+1 WHERE code=? AND revision=?').bind(JSON.stringify(g),ticket.room_code,revision).run();if(saved.meta.changes!==1)continue;revision++;}return {status:'matched',room:{code:ticket.room_code,revision,...view(g,p)}};}}
    return {status:'searching',searchId:id};
  }
  if(action==='cancel'){
    // Retire each search separately so newer searches cannot erase cancellation.
    await retire(id);
    await storage.prepare("UPDATE match_queue SET status='cancelled',lease_until=? WHERE auth=? AND search_id=? AND status='waiting'").bind(now,auth,id).run();
    const ticket=await get();if(ticket?.search_id===id&&ticket.status==='matched')return json(await result(ticket));return json({status:'cancelled'});
  }
  if(action!=='search')return json({error:'not_found'},404);
  let ticket=await get();
  if(ticket?.status==='matched'){
    const existing=await result(ticket);
    if(existing.room&&existing.room.status!=='finished')return json(existing);
    await retire(ticket.search_id);
    await storage.prepare('DELETE FROM match_queue WHERE auth=? AND search_id=? AND room_code=?').bind(auth,ticket.search_id,ticket.room_code).run();ticket=await get();
  }
  if(await storage.prepare('SELECT id FROM retired_searches WHERE id=?').bind(retirement).first())return json({status:'cancelled'});
  if(ticket?.search_id===id&&ticket.status==='cancelled')return json({status:'cancelled'});
  if(ticket?.search_id!==id&&ticket?.status==='waiting'&&ticket.lease_until>now)return json({error:'already_searching'},409);
  const config=onlineSettings(body.mode,body.lang,body.seconds),bucket=config.mode+':'+config.lang+':2:'+config.clockMode+':'+config.seconds,name=String(body.name||'Player').trim().slice(0,24)||'Player';
  await storage.prepare("INSERT INTO match_queue (auth,search_id,bucket,name,status,created,lease_until) SELECT ?,?,?,?,'waiting',?,? WHERE NOT EXISTS (SELECT 1 FROM retired_searches WHERE id=?) ON CONFLICT(auth) DO UPDATE SET search_id=excluded.search_id,bucket=excluded.bucket,name=excluded.name,status='waiting',created=CASE WHEN match_queue.search_id=excluded.search_id THEN match_queue.created ELSE excluded.created END,lease_until=excluded.lease_until,room_code=NULL WHERE match_queue.status!='matched' AND ((match_queue.search_id!=excluded.search_id AND (match_queue.status='cancelled' OR match_queue.lease_until<=?)) OR (match_queue.search_id=excluded.search_id AND match_queue.status='waiting'))").bind(auth,id,bucket,name,now,now+20000,retirement,now).run();
  await storage.prepare('DELETE FROM retired_searches WHERE id IN (SELECT id FROM retired_searches WHERE expires<? LIMIT 50)').bind(now).run();
  // Keep cleanup bounded, never remove an active assignment.
  await storage.prepare("DELETE FROM match_queue WHERE auth IN (SELECT auth FROM match_queue WHERE lease_until<? LIMIT 50)").bind(now-300000).run();
  for(let attempt=0;attempt<4;attempt++){
    ticket=await get();if(ticket?.status==='matched')return json(await result(ticket));
    if(!ticket||ticket.search_id!==id||ticket.status!=='waiting')return json({status:'cancelled'});
    const peer=await storage.prepare("SELECT * FROM match_queue WHERE bucket=? AND status='waiting' AND lease_until>? AND auth!=? ORDER BY created LIMIT 1").bind(ticket.bucket,Date.now(),auth).first();if(!peer)return json({status:'searching',searchId:id});
    const roomCode=Array.from(crypto.getRandomValues(new Uint8Array(6))).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
    const g=makeRoom(config,ticket.name,auth,chooseAnswer(config.lang),Date.now());g.online=true;g.players[0].ready=false;g.players[1]={name:peer.name,auth:peer.auth,ready:false};g.readyUntil=Date.now()+45000;
    const stamp=Date.now();
    const batch=await storage.batch([
      storage.prepare("INSERT INTO rooms (code,data,revision,expires) SELECT ?,?,0,? WHERE EXISTS (SELECT 1 FROM match_queue WHERE auth=? AND search_id=? AND bucket=? AND status='waiting' AND lease_until>? AND NOT EXISTS (SELECT 1 FROM retired_searches WHERE id=match_queue.auth||':'||match_queue.search_id)) AND EXISTS (SELECT 1 FROM match_queue WHERE auth=? AND search_id=? AND bucket=? AND status='waiting' AND lease_until>? AND NOT EXISTS (SELECT 1 FROM retired_searches WHERE id=match_queue.auth||':'||match_queue.search_id))").bind(roomCode,JSON.stringify(g),g.expires,auth,id,bucket,stamp,peer.auth,peer.search_id,bucket,stamp),
      storage.prepare("UPDATE match_queue SET status='matched',room_code=?,lease_until=? WHERE ((auth=? AND search_id=?) OR (auth=? AND search_id=?)) AND EXISTS (SELECT 1 FROM rooms WHERE code=?)").bind(roomCode,g.expires,auth,id,peer.auth,peer.search_id,roomCode)
    ]);
    if(batch[0].meta.changes===1)return json(await result(await get()));
  }
  return json(await result(await get()));
}
