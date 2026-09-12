const encoder=new TextEncoder();
const SESSION='__Host-lexivanto_session', CHALLENGE='__Host-lexivanto_challenge';
export const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
export const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const cookie=(name,value,seconds)=>`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
function readCookie(request,name){const value=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);return /^[a-f0-9]{64}$/.test(value||'')?value:null;}
const json=(body,status=200,cookies=[])=>{const headers=new Headers({'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'});cookies.forEach(x=>headers.append('set-cookie',x));return new Response(JSON.stringify(body),{status,headers});};
let keyCache={keys:[],expires:0},lastKeyRefresh=0;
async function googleKey(kid){
  const now=Date.now();let key=keyCache.keys.find(k=>k.kid===kid);
  if(keyCache.expires<=now||(!key&&now-lastKeyRefresh>60000)){
    lastKeyRefresh=now;
    const response=await fetch('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('keys_unavailable');const data=await response.json();
    if(!Array.isArray(data.keys))throw Error('keys_unavailable');
    keyCache={keys:data.keys,expires:now+Math.min(86400,Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300))*1000};key=keyCache.keys.find(k=>k.kid===kid);
  }
  if(!key||key.kty!=='RSA'||key.alg&&key.alg!=='RS256'||key.use&&key.use!=='sig')throw Error('invalid_token');return key;
}
function decode(segment){if(!/^[A-Za-z0-9_-]+$/.test(segment))throw Error('invalid_token');return Uint8Array.from(atob(segment.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function verifyGoogleToken(token,clientId,nonce,{now=Date.now(),resolveKey=googleKey}={}){
  if(typeof token!=='string'||token.length>12000)throw Error('invalid_token');const parts=token.split('.');if(parts.length!==3)throw Error('invalid_token');
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid||header.kid.length>200||header.crit)throw Error('invalid_token');
  const jwk=await resolveKey(header.kid);const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),encoder.encode(parts[0]+'.'+parts[1])))throw Error('invalid_token');
  const seconds=Math.floor(now/1000);
  if(!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||claims.aud!==clientId||claims.azp&&claims.azp!==clientId||!Number.isFinite(claims.exp)||claims.exp<=seconds||!Number.isFinite(claims.iat)||claims.iat>seconds+60||claims.exp<=claims.iat||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||claims.nonce!==nonce)throw Error('invalid_token');
  return {sub:claims.sub,name:typeof claims.name==='string'?claims.name.trim().slice(0,24)||'Player':'Player'};
}
export async function sessionForRequest(request,storage){
  const sessionToken=readCookie(request,SESSION);if(!sessionToken)return null;
  return storage.prepare('SELECT s.hash,s.csrf,s.user_id,p.display_name FROM auth_sessions s JOIN auth_profiles p ON p.id=s.user_id WHERE s.hash=? AND s.expires>?').bind(await hash(sessionToken),Date.now()).first();
}
export async function authRoute(request,env,storage){
  const path=new URL(request.url).pathname.slice('/api/auth/'.length),clientId=env.GOOGLE_CLIENT_ID||'';
  const sessionToken=readCookie(request,SESSION),session=await sessionForRequest(request,storage);
  const identity=()=>({googleEnabled:!!clientId,clientId,user:session?{name:session.display_name}:null,csrf:session?.csrf||null});
  if(path==='me'&&request.method==='GET')return json(identity());
  if(request.method!=='POST')return json({error:'method'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'origin'},403);
  const raw=await request.text();if(raw.length>14000)return json({error:'too_large'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid_request'},400);}if(!body||typeof body!=='object')return json({error:'invalid_request'},400);
  if(path==='logout'||path==='delete'){
    if(!session||body.csrf!==session.csrf)return json({error:'session_expired'},401);
    if(path==='delete'){await storage.prepare('DELETE FROM game_challenges WHERE sender_id=? OR recipient_id=?').bind(session.user_id,session.user_id).run();await storage.prepare('DELETE FROM friend_requests WHERE sender_id=? OR recipient_id=?').bind(session.user_id,session.user_id).run();await storage.prepare('DELETE FROM friendships WHERE user_a=? OR user_b=?').bind(session.user_id,session.user_id).run();await storage.prepare('DELETE FROM player_profiles WHERE user_id=?').bind(session.user_id).run();await storage.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(session.user_id).run();await storage.prepare('DELETE FROM auth_profiles WHERE id=?').bind(session.user_id).run();}
    else await storage.prepare('DELETE FROM auth_sessions WHERE hash=?').bind(session.hash).run();
    return json({ok:true},200,[cookie(SESSION,'',0)]);
  }
  if(!clientId)return json({error:'google_not_configured'},503);
  if(path==='challenge'){
    const now=Date.now();
    await storage.prepare('DELETE FROM auth_challenges WHERE expires<?').bind(now).run();
    await storage.prepare('DELETE FROM auth_sessions WHERE expires<?').bind(now).run();
    const previous=readCookie(request,CHALLENGE);if(previous)await storage.prepare('DELETE FROM auth_challenges WHERE hash=?').bind(await hash(previous)).run();
    const secret=randomToken(),nonce=randomToken(),csrf=randomToken();await storage.prepare('INSERT INTO auth_challenges (hash,nonce,csrf,expires) VALUES (?,?,?,?)').bind(await hash(secret),nonce,csrf,now+300000).run();
    return json({nonce,csrf,clientId},200,[cookie(CHALLENGE,secret,300)]);
  }
  if(path==='google'){
    const secret=readCookie(request,CHALLENGE);if(!secret)return json({error:'sign_in_expired'},401);
    const challengeHash=await hash(secret),challenge=await storage.prepare('SELECT nonce,csrf,expires FROM auth_challenges WHERE hash=?').bind(challengeHash).first();
    if(!challenge||challenge.expires<=Date.now()||body.csrf!==challenge.csrf)return json({error:'sign_in_expired'},401);
    let claims;try{claims=await verifyGoogleToken(body.credential,clientId,challenge.nonce);}catch{return json({error:'google_verification_failed'},401);}
    const used=await storage.prepare('DELETE FROM auth_challenges WHERE hash=? AND expires>?').bind(challengeHash,Date.now()).run();if(used.meta.changes!==1)return json({error:'sign_in_expired'},401);
    await storage.prepare('INSERT INTO auth_profiles (id,google_sub,display_name,created) VALUES (?,?,?,?) ON CONFLICT(google_sub) DO UPDATE SET display_name=excluded.display_name').bind(randomToken(),claims.sub,claims.name,Date.now()).run();
    const profile=await storage.prepare('SELECT id FROM auth_profiles WHERE google_sub=?').bind(claims.sub).first();
    if(sessionToken)await storage.prepare('DELETE FROM auth_sessions WHERE hash=?').bind(await hash(sessionToken)).run();
    const fresh=randomToken(),csrf=randomToken();await storage.prepare('INSERT INTO auth_sessions (hash,user_id,csrf,expires) VALUES (?,?,?,?)').bind(await hash(fresh),profile.id,csrf,Date.now()+604800000).run();
    return json({googleEnabled:true,clientId,user:{name:claims.name},csrf},200,[cookie(SESSION,fresh,604800),cookie(CHALLENGE,'',0)]);
  }
  return json({error:'not_found'},404);
}
