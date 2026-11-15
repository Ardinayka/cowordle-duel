// Optional, device-local feedback. No audio downloads or microphone permission.
export function createFeedback(env=globalThis){
  let saved={};try{saved=JSON.parse(env.localStorage.getItem('lexivanto-feedback'))||{};}catch{}
  const prefs={sound:saved.sound===true,vibration:saved.vibration===true};
  let context=null,previous=null;const playing=new Set();
  const supported={sound:!!(env.AudioContext||env.webkitAudioContext),vibration:typeof env.navigator?.vibrate==='function'};
  const visible=()=>!env.document?.hidden;
  function stop(){for(const tone of playing){try{tone.stop();}catch{}}playing.clear();try{env.navigator?.vibrate?.(0);}catch{}}
  function unlock(){if(!prefs.sound||!supported.sound||!visible())return;try{context??=new (env.AudioContext||env.webkitAudioContext)();if(context.state==='suspended')context.resume().catch(()=>{});}catch{}}
  const notes={tap:[440],lock:[440,660],reveal:[523,659],win:[523,659,784,1047],finish:[392,330],error:[196]};
  function play(kind){if(!visible())return;if(prefs.vibration&&supported.vibration){try{env.navigator.vibrate(kind==='win'?[35,65,50]:kind==='tap'?8:20);}catch{}}
    if(!prefs.sound||!context||context.state!=='running')return;
    try{const list=notes[kind]||notes.tap;list.forEach((frequency,i)=>{const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+i*.085,duration=kind==='tap'?.045:.14;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(kind==='tap'?.018:.055,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(gain);gain.connect(context.destination);playing.add(oscillator);oscillator.onended=()=>{playing.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+duration+.01);});}catch{}
  }
  function set(name,value){if(!(name in prefs))return;prefs[name]=value===true;try{env.localStorage.setItem('lexivanto-feedback',JSON.stringify(prefs));}catch{}if(!prefs.sound||!prefs.vibration)stop();if(name==='sound'&&prefs.sound)unlock();}
  function observe(snapshot){const old=previous;previous=snapshot;if(!old||!snapshot||old.id!==snapshot.id)return;
    if(old.status!=='finished'&&snapshot.status==='finished'){if(snapshot.reason!=='cancelled')play(snapshot.won?'win':'finish');}
    else if(snapshot.rows>old.rows)play('reveal');
    else if(snapshot.locked&&!old.locked)play('lock');
  }
  env.document?.addEventListener('pointerdown',unlock,{passive:true});env.document?.addEventListener('keydown',unlock);
  env.document?.addEventListener('visibilitychange',()=>{if(!visible()){stop();try{context?.suspend().catch(()=>{});}catch{}}});
  return {prefs,supported,set,play,observe,unlock};
}
