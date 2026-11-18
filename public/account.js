export function setupAccount({language,onName,onChange=()=>{},embedded=false}){
  // Inside another site (the itch.io page) the session cookie is not sent and Google sign-in cannot run, so the
  // panel points to lexivanto.com in a new tab instead. Play there stays as a guest.
  const $=id=>document.getElementById(id),tr=(en,pt)=>language()==='pt'?pt:en;
  let account={googleEnabled:false,user:null},loaded=false,working=false,loadPromise,googleFailed=false,challengeAt=0,accountLoading=false;
  const error=(en,pt)=>{$('account-error').textContent=tr(en,pt);$('signin-error').textContent=tr(en,pt);};
  // In-app browsers (Instagram, Facebook, Messenger, TikTok, Android web views…) block Google sign-in.
  const inAppBrowser=/Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|LinkedInApp|Snapchat|TikTok|musical_ly|Line\/|MicroMessenger|; wv\)/i.test(navigator.userAgent||'');
  const emailErrors={email_invalid:'Enter your full email address.',email_wait:'Please wait a minute before asking for another code.',email_busy:'Too many codes were sent today. Try again tomorrow, or use Google.',email_send_failed:'The email could not be sent. Try again in a moment.',email_not_configured:'Email sign-in isn’t available yet.',code_invalid:'Enter the 6-digit code from the email.',code_wrong:'That code isn’t right. Check the email and try again.',code_expired:'This code has expired. Send a new code.'};
  let emailAddress='';
  function render(){
    onChange(account.user);
    $('account-label').textContent=account.user?tr('Signed in as ','Sessão iniciada como ')+account.user.name:tr('Playing as a guest','A jogar como convidado');
    $('account-detail').textContent=account.user?tr('Google account connected. Your friends, rating and streak follow you to any device.','Conta Google ligada. Os teus amigos, classificação e sequência acompanham-te em qualquer dispositivo.'):!loaded?tr('No account needed to play.','Não precisas de conta para jogar.'):account.googleEnabled?tr('No account needed. Google sign-in is optional.','Não precisas de conta. Iniciar sessão com Google é opcional.'):tr('No account needed. Google sign-in is awaiting setup.','Não precisas de conta. O início de sessão com Google aguarda configuração.');
    // The name and "Guest" sit under the avatar, so the panel only explains what is not obvious.
    $('account-label').hidden=true;if(!account.user&&loaded&&account.googleEnabled)$('account-detail').textContent='';
    if(embedded&&!account.user)$('account-detail').textContent=tr('Inside itch.io you play as a guest. Your account, friends and rating live on lexivanto.com.','No itch.io jogas como convidado. A tua conta, amigos e classificação estão em lexivanto.com.');
    $('open-site').hidden=!embedded||!!account.user;
    const googleShown=!embedded&&!inAppBrowser&&(!loaded||account.googleEnabled),emailShown=!embedded&&!!account.emailEnabled;
    $('signin-open').hidden=embedded||!!account.user;$('signin-open').disabled=working;
    $('signin-google').hidden=!googleShown;$('signin-webview').hidden=!(inAppBrowser&&!embedded&&account.googleEnabled);
    $('email-form').hidden=!emailShown||!!emailAddress;$('code-form').hidden=!emailShown||!emailAddress;$('signin-or').hidden=!(googleShown&&emailShown);
    $('email-send').disabled=working;$('code-verify').disabled=working;$('code-resend').disabled=working;
    $('google-start').hidden=embedded||!!account.user||!googleFailed||(loaded&&!account.googleEnabled);$('google-start').disabled=working;
    $('google-start').textContent=working?tr('Loading Google…','A carregar Google…'):tr('Retry Google sign-in','Tentar Google novamente');
    $('sign-out').hidden=!account.user;$('delete-account').hidden=!account.user;
    $('sign-out').disabled=working;$('delete-account').disabled=working;
    $('google-loading').hidden=!working||!!account.user;$('profile-caption').textContent=account.user?'Me':'Sign in';$('profile-button').classList?.toggle('signed-in',!!account.user);
    $('sign-out').textContent=tr('Sign out','Terminar sessão');$('delete-account').textContent=tr('Delete account','Apagar conta');
  }
  async function api(action,body){const r=await fetch('/api/auth/'+action,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},credentials:'same-origin',...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
  function googleScript(){if(window.google?.accounts?.id)return Promise.resolve();if(loadPromise)return loadPromise;loadPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;const timeout=setTimeout(()=>{script.remove();loadPromise=null;reject(Error('google_load_failed'));},15000);script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);script.remove();loadPromise=null;reject(Error('google_load_failed'));};document.head.append(script);});return loadPromise;}
  async function prepareGoogle(){if(embedded||inAppBrowser)return;if(!loaded)await loadAccount();if(working||!loaded||!account.googleEnabled||account.user)return;if($('google-button').children.length&&Date.now()-challengeAt<240000)return;working=true;googleFailed=false;error('','');$('google-button').replaceChildren();render();try{const challenge=await api('challenge',{});challengeAt=Date.now();await googleScript();window.google.accounts.id.initialize({client_id:challenge.clientId,nonce:challenge.nonce,auto_select:false,callback:async response=>{working=true;render();try{account=await api('google',{credential:response.credential,csrf:challenge.csrf});onName(account.user.name);$('google-button').replaceChildren();error('','');closeSheet();}catch{googleFailed=true;error('Sign-in could not be verified or expired. Select Sign in with Google to try again.','Não foi possível verificar a sessão ou o prazo terminou. Seleciona Iniciar sessão com Google para tentar novamente.');$('google-button').replaceChildren();}finally{working=false;render();}}});window.google.accounts.id.renderButton($('google-button'),{type:'standard',theme:'outline',size:'large',text:'continue_with',locale:language()==='pt'?'pt-PT':'en',width:Math.max(200,Math.min(400,$('google-button').clientWidth||260))});}catch{googleFailed=true;error('Google could not load. Try again, or keep playing as a guest.','Não foi possível carregar Google. Tenta novamente ou continua como convidado.');}finally{working=false;render();}}
  $('google-start').onclick=prepareGoogle;
  async function end(action){if(working)return;working=true;render();try{await api(action,{csrf:account.csrf});window.google?.accounts?.id?.disableAutoSelect();account={...account,user:null,csrf:null};error('','');$('delete-dialog').close();$('google-button').replaceChildren();}catch{error('Account action failed. Refresh and try again. Your game is unaffected.','A ação falhou. Atualiza a página e tenta novamente. O jogo não foi afetado.');}finally{working=false;render();}}
  $('sign-out').onclick=()=>end('logout');$('delete-account').onclick=()=>$('delete-dialog').showModal();$('cancel-delete').onclick=()=>$('delete-dialog').close();$('confirm-delete').onclick=()=>end('delete');
  $('delete-dialog').addEventListener('close',()=>$('account-label').focus());
  async function loadAccount(){if(accountLoading)return;accountLoading=true;try{account=await api('me');loaded=true;googleFailed=false;if(account.user)onName(account.user.name);render();}catch{googleFailed=true;error('Account service is unavailable. Retry sign-in or keep playing as a guest.','');render();}finally{accountLoading=false;}}
  // Sign-in sheet: Google (outside in-app browsers) or a 6-digit code sent by email.
  function closeSheet(){if($('signin-dialog').open)$('signin-dialog').close();}
  async function openSheet(){if(embedded||account.user)return;emailAddress='';$('email-code').value='';$('signin-error').textContent='';render();if(!$('signin-dialog').open)$('signin-dialog').showModal();if(!loaded)await loadAccount();render();prepareGoogle();}
  async function sendCode(){const email=$('email-address').value.trim();if(!email){$('signin-error').textContent=emailErrors.email_invalid;return;}working=true;$('signin-error').textContent='';render();try{await api('email/start',{email});emailAddress=email;$('code-sent').textContent='We sent a code to '+email+'. It works for 10 minutes.';$('email-code').value='';render();setTimeout(()=>$('email-code').focus(),50);}catch(e){$('signin-error').textContent=emailErrors[e.message]||'Email sign-in is unavailable. Try again, or use Google.';}finally{working=false;render();}}
  $('signin-open').onclick=openSheet;$('signin-close').onclick=closeSheet;
  $('email-form').onsubmit=e=>{e.preventDefault();sendCode();};
  $('code-resend').onclick=()=>{$('email-address').value=emailAddress;sendCode();};
  $('code-change').onclick=()=>{emailAddress='';$('signin-error').textContent='';render();setTimeout(()=>$('email-address').focus(),50);};
  $('code-form').onsubmit=async e=>{e.preventDefault();const code=$('email-code').value.replace(/\D/g,'');if(code.length!==6){$('signin-error').textContent=emailErrors.code_invalid;return;}working=true;$('signin-error').textContent='';render();try{account=await api('email/verify',{email:emailAddress,code});loaded=true;onName(account.user.name);emailAddress='';closeSheet();}catch(err){$('signin-error').textContent=emailErrors[err.message]||'Sign-in failed. Try again.';}finally{working=false;render();}};
  loadAccount();
  render.refresh=loadAccount;render.prepare=()=>{};render.open=openSheet;render();return render;
}
