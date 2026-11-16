import {test} from 'node:test';import assert from 'node:assert/strict';import {testEnv} from './d1.js';
import {validEndpoint,vapidKeys,vapidAuthorization,sendPush,sendReminders,pushRoute} from '../server/push.js';
import {friendsRoute} from '../server/friends.js';import {hash} from '../server/auth.js';

const FCM='https://fcm.googleapis.com/fcm/send/abc123';
const call=async(e,path,body,{auth='dev',account=null}={})=>{const url=new URL('https://game.test'+path);const r=await pushRoute(new Request(url,body?{method:'POST',body:JSON.stringify(body)}:{}),e.DB,auth,account,url);return {...await r.json(),http:r.status};};
const b64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));

test('only real browser push services are accepted as endpoints',()=>{
 for(const ok of [FCM,'https://updates.push.services.mozilla.com/wpush/v2/x','https://web.push.apple.com/QG9','https://wns2-par02p.notify.windows.com/w/?token=1'])assert.equal(validEndpoint(ok),true,ok);
 for(const bad of ['http://fcm.googleapis.com/x','https://evil.example/x','https://fcm.googleapis.com.evil.example/x','https://fcm.googleapis.com:8443/x','https://127.0.0.1/x','not a url'])assert.equal(validEndpoint(bad),false,bad);
});

test('VAPID keys are generated once per database and the token verifies with the public key',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 const k1=await vapidKeys(e.DB),k2=await vapidKeys(e.DB);assert.equal(k1.publicKey,k2.publicKey);assert.equal(b64(k1.publicKey).length,65);
 const auth=await vapidAuthorization(FCM,k1,Date.parse('2026-11-16T10:00:00Z'));const [,token,k]=auth.match(/^vapid t=([^,]+), k=(.+)$/);assert.equal(k,k1.publicKey);
 const [h,c,s]=token.split('.');const claims=JSON.parse(new TextDecoder().decode(b64(c)));assert.equal(claims.aud,'https://fcm.googleapis.com');assert.equal(claims.sub,'https://lexivanto.com');
 const pub=await crypto.subtle.importKey('raw',b64(k1.publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pub,b64(s),new TextEncoder().encode(h+'.'+c)),true);
 assert.equal((await call(e,'/api/push/key')).publicKey,k1.publicKey);
});

test('subscribe, wake and fetch: the message is stored on the server and handed out once; gone subscriptions are removed',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 assert.equal((await call(e,'/api/push/subscribe',{endpoint:'https://evil.example/x',reminders:true})).error,'invalid_endpoint');
 const guest=await call(e,'/api/push/subscribe',{endpoint:FCM,invites:true,reminders:true,timeZone:'Europe/Lisbon'});assert.equal(guest.invites,false,'guests have no friends to be invited by');assert.equal(guest.reminders,true);
 const calls=[];const fetcher=async(url,init)=>{calls.push({url,init});return new Response(null,{status:201});};
 assert.equal(await sendPush(e.DB,{endpoint:FCM},{kind:'reminder',title:'Keep your 3-day streak',body:'x',url:'/?daily=1'},{fetcher}),'sent');
 assert.equal(calls[0].init.headers['Content-Length'],'0','no content goes through the push service');assert.match(calls[0].init.headers.Authorization,/^vapid t=/);
 const pending=await call(e,'/api/push/pending',{endpoint:FCM});assert.equal(pending.message.title,'Keep your 3-day streak');
 assert.equal((await call(e,'/api/push/pending',{endpoint:FCM})).message,null,'handed out once');
 assert.equal(await sendPush(e.DB,{endpoint:FCM},{title:'x'},{fetcher:async()=>new Response(null,{status:410})}),'gone');
 assert.equal(e.sql.prepare('SELECT COUNT(*) n FROM push_subscriptions').get().n,0);
 await call(e,'/api/push/subscribe',{endpoint:FCM,reminders:true,timeZone:'UTC'});await call(e,'/api/push/subscribe',{endpoint:FCM,reminders:false,invites:false,timeZone:'UTC'});
 assert.equal(e.sql.prepare('SELECT COUNT(*) n FROM push_subscriptions').get().n,0,'turning everything off removes the subscription');
});

test('the streak reminder goes at 19:00 local time, once a day, only to players with a streak who have not played',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 const sub=(endpoint,player,tz)=>e.sql.prepare('INSERT INTO push_subscriptions (endpoint,player,reminders,time_zone,created,updated) VALUES (?,?,1,?,1,1)').run(endpoint,player,tz);
 const progress=(player,streak,last)=>e.sql.prepare('INSERT INTO player_progress (player,streak,best,freezes,last_day,updated) VALUES (?,?,?,0,?,1)').run(player,streak,streak,last);
 sub(FCM+'1','g:lisbon','Europe/Lisbon');progress('g:lisbon',3,'2026-11-15');
 sub(FCM+'2','g:tokyo','Asia/Tokyo');progress('g:tokyo',5,'2026-11-15');
 sub(FCM+'3','g:played','Europe/Lisbon');progress('g:played',4,'2026-11-16');
 sub(FCM+'4','g:nostreak','Europe/Lisbon');progress('g:nostreak',2,'2026-11-10');
 const sent=[];const fetcher=async url=>{sent.push(url);return new Response(null,{status:201});};
 const at=Date.parse('2026-11-16T19:07:00Z');// 19:07 in Lisbon (UTC+0 in November), 04:07 in Tokyo
 assert.equal(await sendReminders(e.DB,{now:at,fetcher}),1);assert.deepEqual(sent,[FCM+'1']);
 assert.equal(await sendReminders(e.DB,{now:at+600000,fetcher}),0,'only once a day');
 assert.equal(await sendReminders(e.DB,{now:Date.parse('2026-11-16T10:07:00Z'),fetcher}),1,'19:07 in Tokyo');assert.equal(sent.at(-1),FCM+'2');
 assert.match(e.sql.prepare('SELECT pending FROM push_subscriptions WHERE endpoint=?').get(FCM+'1').pending,/3-day streak/);
});

test('a friend invitation wakes the friend\'s devices that turned invitations on',async t=>{
 const e=testEnv();t.after(()=>e.sql.close());
 for(const [id,ch] of [['a','a'],['b','b']]){e.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run(id,id,'Player '+id,Date.now());e.sql.prepare('INSERT INTO auth_sessions VALUES (?,?,?,?)').run(await hash(ch.repeat(64)),id,'csrf-'+id,Date.now()+60000);e.sql.prepare('INSERT INTO friend_profiles (user_id,username,tag) VALUES (?,?,?)').run(id,id==='a'?'maya':'rui','LEX-00000000000'+id.toUpperCase());}
 e.sql.prepare("INSERT INTO friendships VALUES ('a:b','a','b','a','accepted',?)").run(Date.now());
 const code='ABCDEF123456';e.sql.prepare('INSERT INTO rooms VALUES (?,?,0,?)').run(code,JSON.stringify({status:'waiting',players:[{auth:await hash('d'.repeat(64))},null],settings:{mode:'race'}}),Date.now()+60000);
 const notified=[];const r=await friendsRoute(new Request('https://game.test/api/friends/challenge',{method:'POST',headers:{cookie:'__Host-lexivanto_session='+'a'.repeat(64),authorization:'Bearer '+'d'.repeat(64),origin:'https://game.test','content-type':'application/json'},body:JSON.stringify({csrf:'csrf-a',tag:'LEX-00000000000B',code})}),e.DB,(user,message)=>{notified.push([user,message]);});
 assert.equal(r.status,200);assert.equal(notified.length,1);assert.equal(notified[0][0],'b');assert.equal(notified[0][1].title,'maya invites you to play');assert.match(notified[0][1].body,/a Race/);
});
