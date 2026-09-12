import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import {hash} from '../server/auth.js';
import {testEnv} from './d1.js';

const origin='https://game.test',sessionCookie=token=>'__Host-lexivanto_session='+token;
async function call(env,path,{method='GET',seat,cookie,body}={}){const response=await worker.fetch(new Request(origin+path,{method,headers:{authorization:'Bearer '+seat,cookie:sessionCookie(cookie),...(body?{origin,'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:response.status,data:await response.json()};}
async function user(env,id,name,session,csrf){env.sql.prepare('INSERT INTO auth_profiles VALUES (?,?,?,?)').run(id,'google-'+id,name,Date.now());env.sql.prepare('INSERT INTO auth_sessions VALUES (?,?,?,?)').run(await hash(session),id,csrf,Date.now()+600000);}

test('one challenge acceptance connects new players and enters their game room',async()=>{const env=testEnv(),seatA='a'.repeat(64),seatB='b'.repeat(64),sessionA='c'.repeat(64),sessionB='d'.repeat(64);await user(env,'u1','Goncalo',sessionA,'csrf-a');await user(env,'u2','Laura',sessionB,'csrf-b');
  let result=await call(env,'/api/social/username',{method:'POST',seat:seatA,cookie:sessionA,body:{csrf:'csrf-a',username:'goncalo'}});assert.equal(result.status,200);result=await call(env,'/api/social/username',{method:'POST',seat:seatB,cookie:sessionB,body:{csrf:'csrf-b',username:'laura'}});assert.equal(result.status,200);
  const found=await call(env,'/api/social/find',{method:'POST',seat:seatA,cookie:sessionA,body:{csrf:'csrf-a',query:'laura'}});assert.equal(found.data.player.display_name,'Laura');
  const room=await call(env,'/api/rooms',{method:'POST',seat:seatA,cookie:sessionA,body:{name:'Goncalo',settings:{mode:'swap',seconds:0,lang:'en'}}});assert.equal(room.status,200);
  const sent=await call(env,'/api/social/challenge',{method:'POST',seat:seatA,cookie:sessionA,body:{csrf:'csrf-a',targetId:'u2',roomCode:room.data.code,mode:'swap'}});assert.equal(sent.status,200);
  const notifications=await call(env,'/api/social/snapshot',{seat:seatB,cookie:sessionB});assert.equal(notifications.data.challenges.length,1);assert.equal(notifications.data.incoming.length,1);assert.equal(notifications.data.challenges[0].mode,'swap');
  const accepted=await call(env,`/api/social/game-challenge/${notifications.data.challenges[0].id}/accept`,{method:'POST',seat:seatB,cookie:sessionB,body:{csrf:'csrf-b'}});assert.equal(accepted.data.roomCode,room.data.code);
  const afterAccept=await call(env,'/api/social/snapshot',{seat:seatB,cookie:sessionB});assert.equal(afterAccept.data.incoming.length,0);assert.equal(afterAccept.data.friends.length,1);
  const joined=await call(env,`/api/rooms/${accepted.data.roomCode}/join`,{method:'POST',seat:seatB,cookie:sessionB,body:{name:'Laura'}});assert.equal(joined.status,200);const ready=await call(env,`/api/rooms/${accepted.data.roomCode}/ready`,{method:'POST',seat:seatB,cookie:sessionB,body:{match:joined.data.match}});assert.equal(ready.data.status,'playing');assert.equal(ready.data.settings.mode,'swap');env.sql.close();});
