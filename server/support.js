import {getSession,randomToken,hash} from './auth.js';
import {takeBudget} from './protection.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow',...(status===429?{'retry-after':'3600'}:{})}});
export async function supportRoute(request,db){
 if(request.method!=='POST')return json({error:'Not found.'},404);
 if(request.headers.get('origin')!==new URL(request.url).origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Please send the form from Lexivanto.'},403);
 let body;try{body=await request.json();}catch{return json({error:'Please check the form and try again.'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid form.'},400);
 const kind=body.kind,message=String(body.message||'').trim(),email=String(body.email||'').trim();
 if(body.website)return json({error:'Please leave the website field empty.'},400);
 if(!['bug','feedback','abuse','privacy'].includes(kind)||message.length<10||message.length>800||email.length>254||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return json({error:'Write 10–800 characters and check your email address, if provided.'},400);
 const tag=String(body.playerTag||'').trim().toUpperCase(),room=String(body.room||'').trim().toUpperCase();
 if((tag&&!/^LEX-[A-F0-9]{12}$/.test(tag))||(room&&!/^[A-F0-9]{12}$/.test(room)))return json({error:'The player or match reference is invalid.'},400);
 const session=await getSession(request,db),identity=session?.user_id||await hash(request.headers.get('authorization')||'guest');
 if(!await takeBudget(db,'support:'+identity,3,Date.now(),3600000))return json({error:'You have sent several messages. Please try again in an hour.'},429);
 const ip=request.headers.get('cf-connecting-ip');
 if(ip&&!await takeBudget(db,'support:ip:'+await hash(ip),10,Date.now(),3600000))return json({error:'Several messages have been sent from this network. Please try again in an hour.'},429);
 const id=randomToken(),now=Date.now();
 await db.prepare('INSERT INTO support_reports (id,kind,message,email,reporter,player_tag,room,created,expires) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,kind,message,email||null,session?.user_id||null,tag||null,room||null,now,now+90*86400000).run();
 return json({ok:true,reference:id.slice(0,12).toUpperCase()});
}
