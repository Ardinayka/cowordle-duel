import {hash} from './auth.js';

// Atomic counters live in D1, shared by all Worker instances. No raw IPs stored.
export async function takeBudget(storage,key,limit,now=Date.now(),windowMs=60000) {
  const window=Math.floor(now/windowMs);
  const row=await storage.prepare('INSERT INTO request_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(key+':'+window,(window+2)*windowMs).first();
  return row.count<=limit;
}
// Reserve small batches atomically in D1; unused credits cannot be reclaimed by
// another isolate. Local caching reduces writes without bypassing global caps.
const readCredits=new Map();
export async function readBudget(storage,key,limit,now=Date.now(),batch=10){
 const window=Math.floor(now/60000),id=key+':'+window;
 let cached=readCredits.get(id);
 if(cached?.until>now&&cached.denied)return false;
 if(cached?.until>now&&cached.remaining>0){cached.remaining--;return true;}
 // Sharing a pending reservation prevents concurrent requests spending it twice.
 if(cached?.pending){await cached.pending;return readBudget(storage,key,limit,now,batch);}
 if(readCredits.size>10000)readCredits.clear();
 cached={remaining:0,until:(window+1)*60000,pending:null};readCredits.set(id,cached);
 cached.pending=(async()=>{
  const row=await storage.prepare('INSERT INTO request_limits (id,count,expires) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET count=count+? RETURNING count').bind(id,batch,(window+2)*60000,batch).first();
  cached.remaining=Math.max(0,Math.min(batch,limit-(row.count-batch)));cached.denied=cached.remaining===0;
 })();
 try{await cached.pending;}finally{cached.pending=null;}
 if(!cached.remaining)return false;cached.remaining--;return true;
}
export async function takeCooldown(storage,key,now=Date.now(),duration=600000){
 const row=await storage.prepare('INSERT INTO request_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires WHERE request_limits.expires<=? RETURNING count').bind('cooldown:'+key,now+duration,now).first();return !!row;
}
export async function protect(request,storage,now=Date.now()) {
  const path=new URL(request.url).pathname;
  const token=request.headers.get('authorization')||'';
  const ip=request.headers.get('cf-connecting-ip');
  const read=request.method==='GET'&&(/^\/api\/rooms\/[A-F0-9]{12}$/.test(path)||path==='/api/activity');
  const group=/\/(leave|cancel|logout|delete)$/.test(path)?'exit':path==='/api/support'?'support':read?'read':path==='/api/rooms'?'create':path.startsWith('/api/auth/')?'auth':path.startsWith('/api/matchmaking/')?'search':'play';
  const limits={create:10,auth:30,search:90,play:180,exit:60,read:240,support:5};
  // Cloudflare supplies this header in production. Local tests may omit it.
  if(ip&&!await (read?readBudget(storage,'read:ip:'+await hash(ip),12000,now,40):takeBudget(storage,group+':ip:'+await hash(ip),limits[group]*10,now)))return false;
  if(token&&!await (read?readBudget(storage,'read:seat:'+await hash(token),limits.read,now):takeBudget(storage,group+':seat:'+await hash(token),limits[group],now)))return false;
  if(!token&&!ip&&!await takeBudget(storage,group+':unidentified',120,now))return false;
  return true;
}

export async function cleanupExpired(storage,now=Date.now()) {
  const targets=[['friend_challenges','id','expires',now-7*864e5],['rooms','code','expires',now],['room_presence','id','expires',now],['support_reports','id','expires',now],['auth_sessions','hash','expires',now],['auth_challenges','hash','expires',now],['retired_searches','id','expires',now],['match_queue','auth','lease_until',now-300000],['request_limits','id','expires',now],['player_days','rowid','day',new Date(now-60*864e5).toISOString().slice(0,10)]];
  await storage.prepare("DELETE FROM friendships WHERE id IN (SELECT id FROM friendships WHERE status='pending' AND created<? LIMIT 500)").bind(now-7*86400000).run();
  // Turn-based game list rows outlive their rooms by at most 30 days.
  await storage.prepare('DELETE FROM room_members WHERE rowid IN (SELECT rowid FROM room_members WHERE updated<? LIMIT 500)').bind(now-30*864e5).run();
  // Push subscriptions nobody has refreshed for 180 days are dropped.
  await storage.prepare('DELETE FROM push_subscriptions WHERE endpoint IN (SELECT endpoint FROM push_subscriptions WHERE updated<? LIMIT 500)').bind(now-180*864e5).run();
  // Guest daily-word records (keyed by a one-way hash of the device code) are removed after a year without play.
  await storage.prepare("DELETE FROM daily_results WHERE rowid IN (SELECT rowid FROM daily_results WHERE player LIKE 'g:%' AND updated<? LIMIT 500)").bind(now-365*864e5).run();
  await storage.prepare("DELETE FROM player_progress WHERE player IN (SELECT player FROM player_progress WHERE player LIKE 'g:%' AND updated<? LIMIT 500)").bind(now-365*864e5).run();
  for(const [table,id,column,before] of targets)await storage.prepare(`DELETE FROM ${table} WHERE ${id} IN (SELECT ${id} FROM ${table} WHERE ${column} < ? LIMIT 500)`).bind(before).run();
}
let nextMaintenance=0,maintenancePending=null;
export async function maintain(storage,now=Date.now()) {
  if(now<nextMaintenance)return;
  if(maintenancePending)return maintenancePending;
  nextMaintenance=now+60000;
  // One claimant per minute across workers; retry next minute after a failure.
  maintenancePending=(async()=>{if(await takeBudget(storage,'maintenance',1,now))await cleanupExpired(storage,now);})();
  try{await maintenancePending;}finally{maintenancePending=null;}
}
