import {hash} from './auth.js';

// Atomic counters live in D1, shared by all Worker instances. No raw IPs stored.
export async function takeBudget(storage,key,limit,now=Date.now()) {
  const window=Math.floor(now/60000);
  const row=await storage.prepare('INSERT INTO request_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(key+':'+window,(window+2)*60000).first();
  return row.count<=limit;
}
export async function protect(request,storage,now=Date.now()) {
  const path=new URL(request.url).pathname;
  const token=request.headers.get('authorization')||'';
  const ip=request.headers.get('cf-connecting-ip');
  const group=/\/(leave|cancel|logout|delete)$/.test(path)?'exit':path==='/api/rooms'?'create':path.startsWith('/api/auth/')?'auth':path.startsWith('/api/matchmaking/')?'search':'play';
  const limits={create:10,auth:30,search:90,play:180,exit:60};
  // Cloudflare supplies this header in production. Local tests may omit it.
  if(ip&&!await takeBudget(storage,group+':ip:'+await hash(ip),limits[group]*10,now))return false;
  if(token&&!await takeBudget(storage,group+':seat:'+await hash(token),limits[group],now))return false;
  if(!token&&!ip&&!await takeBudget(storage,group+':unidentified',120,now))return false;
  return true;
}

export async function cleanupExpired(storage,now=Date.now()) {
  const targets=[['rooms','code','expires',now],['auth_sessions','hash','expires',now],['auth_challenges','hash','expires',now],['friend_requests','id','expires',now],['game_challenges','id','expires',now],['retired_searches','id','expires',now],['match_queue','auth','lease_until',now-300000],['request_limits','id','expires',now]];
  for(const [table,id,column,before] of targets)await storage.prepare(`DELETE FROM ${table} WHERE ${id} IN (SELECT ${id} FROM ${table} WHERE ${column} < ? LIMIT 500)`).bind(before).run();
}
export async function maintain(storage,now=Date.now()) {
  // One claimant per minute across workers; retry next minute after a failure.
  if(await takeBudget(storage,'maintenance',1,now))await cleanupExpired(storage,now);
}
