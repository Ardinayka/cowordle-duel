const form=document.getElementById('support-form'),status=document.getElementById('support-status'),submit=document.getElementById('support-submit');
const query=new URLSearchParams(location.search),kinds=['bug','feedback','abuse','privacy'];
let token;try{token=sessionStorage.getItem('cw-player-token');}catch{}
if(!/^[a-f0-9]{64}$/.test(token||'')){token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');try{sessionStorage.setItem('cw-player-token',token);}catch{}}
const chosen=query.get('kind');if(kinds.includes(chosen))form.querySelector('[name="kind"][value="'+chosen+'"]').checked=true;
form.addEventListener('submit',async event=>{
 event.preventDefault();if(submit.disabled)return;submit.disabled=true;status.textContent='Sending…';
 const values=new FormData(form),body={kind:values.get('kind'),message:values.get('message'),email:values.get('email'),website:values.get('website')};
 if(/^LEX-[A-F0-9]{12}$/i.test(query.get('player')||''))body.playerTag=query.get('player');
 if(/^[A-F0-9]{12}$/i.test(query.get('room')||''))body.room=query.get('room');
 try{
  const response=await fetch('/api/support',{method:'POST',credentials:'same-origin',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  const result=await response.json();if(!response.ok)throw Error(response.status===413?'Your message is too large. Please shorten it and try again.':response.status===429?'Several messages have been sent. Please wait before trying again.':result.error||'Could not send. Please try again.');
  status.textContent='Message received. Your reference is '+result.reference+'. If you included an email address, it can be used to follow up.';form.reset();
 }catch(error){status.textContent=error.name==='TimeoutError'?'The connection timed out. Your message is kept; please try again.':error.message;}
 finally{submit.disabled=false;}
});
