// Web push (Phase 5). Notifications are opt-in and carry no content through the push service:
// the push only wakes the service worker, which then asks this server for the message
// (POST /api/push/pending with its own subscription endpoint). That avoids payload encryption
// and keeps names out of third-party push services.
// The VAPID key pair is generated on first use and stored in D1, so each environment has its own.
import {currentStreak} from './daily.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'}});
const b64u=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const text=s=>new TextEncoder().encode(s);
export const REMINDER_HOUR=19;
// Only real browser push services may be contacted, so a stored endpoint can never point the Worker elsewhere.
const PUSH_HOSTS=[/^fcm\.googleapis\.com$/,/^updates\.push\.services\.mozilla\.com$/,/^web\.push\.apple\.com$/,/^[a-z0-9-]+\.notify\.windows\.com$/,/^push\.services\.mozilla\.com$/];
export function validEndpoint(endpoint){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.port&&PUSH_HOSTS.some(h=>h.test(u.hostname))&&endpoint.length<=1024;}catch{return false;}}

export async function vapidKeys(storage){
 let row=await storage.prepare("SELECT value FROM push_config WHERE key='vapid'").first();
 if(!row){
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const value=JSON.stringify({privateJwk:await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey:b64u(await crypto.subtle.exportKey('raw',pair.publicKey))});
  await storage.prepare("INSERT OR IGNORE INTO push_config (key,value) VALUES ('vapid',?)").bind(value).run();
  row=await storage.prepare("SELECT value FROM push_config WHERE key='vapid'").first();
 }
 return JSON.parse(row.value);
}
export async function vapidAuthorization(endpoint,keys,now=Date.now()){
 const aud=new URL(endpoint).origin;
 const header=b64u(text(JSON.stringify({typ:'JWT',alg:'ES256'}))),claims=b64u(text(JSON.stringify({aud,exp:Math.floor(now/1000)+12*3600,sub:'https://lexivanto.com'})));
 const key=await crypto.subtle.importKey('jwk',keys.privateJwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,text(header+'.'+claims));
 return `vapid t=${header}.${claims}.${b64u(signature)}, k=${keys.publicKey}`;
}
// Store the message for the subscriber, then wake their device. Gone subscriptions are deleted.
export async function sendPush(storage,sub,message,{fetcher=fetch,now=Date.now()}={}){
 if(!validEndpoint(sub.endpoint))return 'invalid';
 await storage.prepare('UPDATE push_subscriptions SET pending=?,updated=? WHERE endpoint=?').bind(JSON.stringify({...message,at:now}),now,sub.endpoint).run();
 try{
  const keys=await vapidKeys(storage);
  const r=await fetcher(sub.endpoint,{method:'POST',headers:{TTL:String(message.ttl||3600),Urgency:message.urgent?'high':'normal','Content-Length':'0',Authorization:await vapidAuthorization(sub.endpoint,keys,now)}});
  if(r.status===404||r.status===410){await storage.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').bind(sub.endpoint).run();return 'gone';}
  return r.ok?'sent':'failed';
 }catch(e){console.error('Push failed',String(e));return 'failed';}
}
export async function notifyUser(storage,userId,kind,message,options){
 if(!userId)return 0;
 const subs=(await storage.prepare(`SELECT endpoint FROM push_subscriptions WHERE user_id=? AND ${kind==='invite'?'invites':'reminders'}=1 LIMIT 10`).bind(userId).all()).results||[];
 let sent=0;for(const sub of subs)if(await sendPush(storage,sub,message,options)==='sent')sent++;return sent;
}

const localParts=(timeZone,now)=>{try{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));return {day:`${p.year}-${p.month}-${p.day}`,hour:Number(p.hour)};}catch{return null;}};
// Hourly job: at 19:00 in the player's time zone, remind players who have a streak to keep and have not played today.
export async function sendReminders(storage,{now=Date.now(),fetcher=fetch,limit=200}={}){
 const subs=(await storage.prepare('SELECT endpoint,player,time_zone,reminded_day FROM push_subscriptions WHERE reminders=1 ORDER BY updated LIMIT 2000').all()).results||[];
 let sent=0;
 for(const sub of subs){
  if(sent>=limit)break;
  const local=localParts(sub.time_zone||'UTC',now);if(!local||local.hour!==REMINDER_HOUR||sub.reminded_day===local.day)continue;
  const progress=await storage.prepare('SELECT streak,freezes,last_day FROM player_progress WHERE player=?').bind(sub.player).first();
  const streak=currentStreak(progress,local.day);
  await storage.prepare('UPDATE push_subscriptions SET reminded_day=? WHERE endpoint=?').bind(local.day,sub.endpoint).run();
  if(!streak||progress.last_day===local.day)continue;
  const played=await storage.prepare('SELECT 1 FROM daily_results WHERE day=? AND player=? AND finished=1').bind(local.day,sub.player).first();if(played)continue;
  if(await sendPush(storage,sub,{kind:'reminder',title:'Keep your '+streak+'-day streak',body:'Today’s word is waiting. It takes a minute.',url:'/?daily=1',ttl:4*3600},{fetcher,now})==='sent')sent++;
 }
 return sent;
}

export async function pushRoute(request,storage,auth,account,url){
 const userId=account?.user_id||null,player=userId||'g:'+auth,now=Date.now();
 if(url.pathname==='/api/push/key'){if(request.method!=='GET')return json({error:'method'},405);return json({publicKey:(await vapidKeys(storage)).publicKey});}
 if(request.method!=='POST')return json({error:'method'},405);
 let body;try{body=JSON.parse(await request.text());}catch{return json({error:'invalid_request'},400);}
 const endpoint=String(body?.endpoint||body?.subscription?.endpoint||'');if(!validEndpoint(endpoint))return json({error:'invalid_endpoint'},400);
 if(url.pathname==='/api/push/subscribe'){
  const invites=body.invites&&userId?1:0,reminders=body.reminders?1:0,timeZone=String(body.timeZone||'UTC').slice(0,64);
  if(!localParts(timeZone,now))return json({error:'invalid_time_zone'},400);
  if(!invites&&!reminders){await storage.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').bind(endpoint).run();return json({ok:true,invites:false,reminders:false});}
  await storage.prepare('INSERT INTO push_subscriptions (endpoint,player,user_id,invites,reminders,time_zone,created,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET player=excluded.player,user_id=excluded.user_id,invites=excluded.invites,reminders=excluded.reminders,time_zone=excluded.time_zone,updated=excluded.updated').bind(endpoint,player,userId,invites,reminders,timeZone,now,now).run();
  return json({ok:true,invites:!!invites,reminders:!!reminders});
 }
 if(url.pathname==='/api/push/unsubscribe'){await storage.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').bind(endpoint).run();return json({ok:true});}
 // Called by the service worker with no cookie or token: knowing the endpoint is the credential.
 if(url.pathname==='/api/push/pending'){
  const row=await storage.prepare('SELECT pending FROM push_subscriptions WHERE endpoint=?').bind(endpoint).first();
  if(!row?.pending)return json({message:null});
  await storage.prepare('UPDATE push_subscriptions SET pending=NULL WHERE endpoint=?').bind(endpoint).run();
  const m=JSON.parse(row.pending);return json({message:now-m.at<24*3600e3?{title:m.title,body:m.body,url:m.url,kind:m.kind}:null});
 }
 return json({error:'not_found'},404);
}
