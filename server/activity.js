import {onlineSettings} from '../public/game.js';
// Aggregate player seats only: no names, tokens, room codes or private games.
export async function activity(storage,now=Date.now()){
  const modes={};
  for(const mode of ['duel','race','coop','swap']){
    const s=onlineSettings(mode,'en');const bucket=mode+':en:2:'+s.clockMode+':'+s.seconds;
    const row=await storage.prepare(`SELECT
      COALESCE(SUM(CASE WHEN q.status='waiting' AND q.lease_until>? AND NOT EXISTS (SELECT 1 FROM retired_searches t WHERE t.id=q.auth||':'||q.search_id) THEN 1 ELSE 0 END),0) AS waiting,
      COALESCE(SUM(CASE WHEN q.status='matched' AND q.seen_at>? AND q.lease_until>? AND r.expires>? AND json_extract(r.data,'$.online')=1 AND json_extract(r.data,'$.status')='playing' AND (COALESCE(json_extract(r.data,'$.deadline'),0)=0 OR json_extract(r.data,'$.deadline')>?) THEN 1 ELSE 0 END),0) AS playing
      FROM match_queue q LEFT JOIN rooms r ON r.code=q.room_code WHERE q.bucket=?`).bind(now,now-45000,now,now,now,bucket).first();
    modes[mode]={waiting:Number(row.waiting),playing:Number(row.playing)};
  }
  return {modes,updatedAt:now};
}
