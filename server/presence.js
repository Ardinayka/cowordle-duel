// Connection state is independent of turn timers and never changes a result.
export async function roomPresence(db,g,code,seat,now){
 const id=code+':'+seat;
 const existing=await db.prepare('SELECT seen_at FROM room_presence WHERE id=?').bind(id).first();
 if(!existing||existing.seen_at<now-15000)await db.prepare('INSERT INTO room_presence (id,code,seat,seen_at,expires) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET seen_at=excluded.seen_at,expires=excluded.expires WHERE room_presence.seen_at<?').bind(id,code,seat,now,g.expires,now-15000).run();
 const rows=await db.prepare("SELECT COALESCE(json_group_array(json_object('seat',seat,'seen',seen_at)),'[]') AS data FROM room_presence WHERE code=?").bind(code).first();
 const seen=new Map(JSON.parse(rows.data).map(x=>[x.seat,x.seen]));
 return g.players.map(p=>{if(!p)return null;if(p.departed)return 'offline';if(p.auth===seat)return 'connected';const last=seen.get(p.auth)??p.joinedAt??(g.started||g.created);const age=now-last;return age>90000?'offline':age>35000?'reconnecting':'connected';});
}
