// First-party, aggregate play statistics. No IP addresses, names or account ids are stored.
// daily_stats holds one counter per metric per UTC day; player_days holds a one-way hash per active device per day (kept 60 days).
const day=now=>new Date(now).toISOString().slice(0,10);
export const EVENT_METRICS=['practice_started','practice_finished','friend_room_finished','online_finished'];
export async function count(db,metric,n=1,now=Date.now()){try{await db.prepare('INSERT INTO daily_stats (day,metric,value) VALUES (?,?,?) ON CONFLICT(day,metric) DO UPDATE SET value=value+excluded.value').bind(day(now),metric,n).run();}catch{}}
export async function visit(db,playerHash,now=Date.now()){try{const r=await db.prepare('INSERT OR IGNORE INTO player_days (day,player) VALUES (?,?)').bind(day(now),playerHash).run();if(r.meta.changes)await count(db,'active_devices',1,now);}catch{}}
