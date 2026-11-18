import {createFeedback} from '../public/feedback.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import * as game from '../public/game.js';import {normalize,botDelay} from '../public/engine.js';
class Element{constructor(id=''){this.id=id;this.children=[];this.value='';this.textContent='';this.style={setProperty(){},removeProperty(){}};this.classList={add(){},toggle(){},remove(){}};this.dataset={};this.tagName='DIV';this.scrollHeight=0;}getBoundingClientRect(){return {top:0,bottom:0};}setAttribute(key,value){this[key]=value;}replaceChildren(...children){this.children=children;}append(c){this.children.push(c);}addEventListener(){}focus(){}select(){}showModal(){this.open=true;}close(){this.open=false;}}
async function harness(saved={}){const nodes=new Map;const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};get('difficulty').value='easy';get('nickname').value='Tester';get('sudden').value='yes';get('attempts').value='6';// Returning visitor by default; pass {'lexivanto-seen':null} to simulate a first visit.
const storage=new Map(Object.entries({'lexivanto-seen':'1',...saved}).filter(([,v])=>v!==null));const ctx={setupFriends:()=>({refresh(){},reset(){}}),badgeChip:()=>null,createFeedback,...game,normalize,botDelay,setupAccount:()=>()=>{},console,Set,Math,Date,crypto,AbortSignal,URLSearchParams,location:{pathname:'/',origin:'https://game.test',search:''},history:{replaceState(){}},navigator:{},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>new Element,body:{classList:{add(){},toggle(){},remove(){}}},documentElement:{dataset:{},style:{setProperty(){}}},addEventListener(){}},setInterval(){},setTimeout:cb=>queueMicrotask(cb),requestAnimationFrame:cb=>queueMicrotask(cb),fetch:async path=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../public/'+path,import.meta.url),'utf8'))})};vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,''),ctx);await new Promise(setImmediate);return {ctx,get,run:s=>vm.runInContext(s,ctx)};}
test('touch-only co-op starts with enabled keys and accepts on-screen guess',async()=>{const h=await harness();h.run("mode='coop';setup()");await h.run('create()');assert.equal(h.run('canType()'),true);const keys=h.get('keyboard').children.flatMap(row=>row.children);assert(keys.length>20);assert(keys.every(k=>!k.disabled));h.run("key('c');key('r');key('a');key('n');key('e')");assert.equal(h.run('draft'),'crane');await h.run('submit()');assert.equal(h.run('local.rows.length'),1);assert.equal(h.run('draft'),'');});
test('unchanged render preserves keyboard nodes, busy menu cannot abandon action',async()=>{const h=await harness();await h.run('create()');const first=h.get('keyboard').children[0];h.run('render()');assert.equal(h.get('keyboard').children[0],first);h.run("busy=true;menu()");assert(h.run('state'));h.run('busy=false;menu()');assert.equal(h.run('state'),null);});

test('custom clock, difficulty and nickname persist and switching modes restores each clock',async()=>{const h=await harness();h.get('clock').value='60';h.get('difficulty').value='normal';h.run('remember()');h.run("mode='race';setup()");h.get('clock').value='600';h.run('remember()');h.run("mode='duel';setup()");assert.equal(Number(h.get('clock').value),60);assert.equal(h.get('difficulty').value,'normal');h.run("mode='race';setup()");assert.equal(Number(h.get('clock').value),0);assert.equal(h.get('friend-settings').hidden,true);assert.equal(h.run('preferences.name'),'Tester');});

test('menu starts with mode choice, preserves name on Back and bots ignore friend clocks',async()=>{const h=await harness();assert.equal(h.run('step'),'modes');h.run("chooseMode('race')");assert.equal(h.run('step'),'opponent');h.run("chooseOpponent('bot')");assert.equal(h.run('step'),'bot');h.run('back()');assert.equal(h.run('step'),'opponent');assert.equal(h.get('nickname').value,'Tester');h.run("chooseOpponent('bot')");h.get('clock').value='600';await h.run('create()');assert.equal(h.run('local.settings.seconds'),0);assert.equal(h.run('local.deadline'),0);});
test('an empty guest name is filled automatically and signed profile supplies the next match name',async()=>{const h=await harness();h.get('nickname').value=' ';h.run("chooseMode('duel')");assert.equal(h.run('validName()'),true);assert.match(h.get('nickname').value,/^Player \d{4}$/);h.run("signedAccount={name:'Google Player'}");await h.run('create()');assert.equal(h.run('local.players[0].name'),'Google Player');});
test('cancelled search ignores a late matched response',async()=>{const h=await harness();let finish;h.ctx.fetch=async(path)=>path.endsWith('/cancel')?{ok:true,json:async()=>({status:'cancelled'})}:new Promise(resolve=>finish=resolve);h.run("chooseMode('duel');chooseOpponent('online')");assert.equal(h.run('step'),'search');await h.run('cancelSearch()');assert.equal(h.run('step'),'opponent');finish({ok:true,json:async()=>({status:'matched',room:{}})});await new Promise(setImmediate);assert.equal(h.run('state'),null);assert.equal(h.run('search'),null);});
test('invite screen keeps nickname and join visible, Back restores normal choices',async()=>{const h=await harness();h.run("showStep('invite')");assert.equal(h.get('step-opponent').hidden,false);assert.equal(h.get('step-friend').hidden,false);assert.equal(h.get('opponent-options').hidden,true);h.run('back()');assert.equal(h.run('step'),'modes');h.run("chooseMode('coop')");assert.equal(h.get('opponent-options').hidden,false);assert.equal(h.get('friend-create').hidden,false);});
test('locked opponent is explicit and draft row stays separate from revealed history',async()=>{const h=await harness();await h.run('create()');h.run("key('c');key('r')");assert.equal(h.get('draft-row').children.length,1);assert.equal(h.get('draft-row').children[0].children[0].textContent,'C');assert.equal(h.get('board').children.length,2);h.run("guess(local,1,'audio',dictionaries.en.set,Date.now());state=view(local,0);render()");assert.match(h.get('other-status').textContent,/locked/i);assert.match(h.get('turn-label').textContent,/locked/i);});
test('theme preference survives menu changes and online timing stays fixed despite an old saved preference',async()=>{const h=await harness();h.run("applyTheme('dark');chooseMode('duel')");assert.equal(h.ctx.document.documentElement.dataset.theme,'dark');let payload;h.ctx.fetch=async(path,opts)=>{payload=JSON.parse(opts.body);return {ok:true,json:async()=>({status:'searching'})};};h.run("onlinePreferences.duel=60;chooseOpponent('online')");await new Promise(setImmediate);assert.equal(payload.seconds,30);assert.equal(h.run('onlineRules().clockMode'),'response');});
test('navigation labels name the destination and practice has a clear exit',async()=>{const h=await harness();h.run("chooseMode('duel')");assert.equal(h.get('back-button').children.map(c=>c.textContent).join(''),'← Back');assert.equal(h.get('back-button')['aria-label'],'Back to game modes');assert.equal(h.get('menu-button').hidden,true);h.run("chooseOpponent('bot')");assert.equal(h.get('back-button').children.map(c=>c.textContent).join(''),'← Back');assert.equal(h.get('back-button')['aria-label'],'Back to opponent choice');await h.run('create()');assert.equal(h.get('back-button').hidden,false);assert.equal(h.get('menu-button').textContent,'End practice');h.run('requestMenu()');assert.equal(h.get('leave-title').textContent,'End practice?');assert(h.get('leave-detail').textContent.includes('return to the game modes'));});
test('expired rooms do not trap a player when returning to game modes',async()=>{const h=await harness();await h.run('create()');h.run("remote=true;code='ABCDEF123456';state.status='finished'");h.ctx.fetch=async()=>({ok:false,json:async()=>({error:'room_expired'})});assert.equal(await h.run('returnToModes()'),true);assert.equal(h.run('state'),null);assert.equal(h.run('step'),'modes');});

test('finished match opens a modal once and closes it on rematch or menu',async()=>{const h=await harness();await h.run('create()');let opens=0;h.get('result').showModal=function(){this.open=true;opens++;};h.run("state.status='finished';state.answer='crane';state.winner=0;render()");assert.equal(h.get('result').open,true);assert.match(h.get('result-detail').textContent,/CRANE/);h.run('render()');assert.equal(opens,1);h.get('review-board').onclick();h.run('render();render()');assert.equal(h.get('result').open,false);assert.equal(opens,1);h.get('view-result').onclick();assert.equal(h.get('result').open,true);assert.equal(opens,2);h.run("state.status='playing';render()");assert.equal(h.get('result').open,false);h.run("state.status='finished';render()");assert.equal(opens,3);await h.run('returnToModes()');assert.equal(h.get('result').open,false);assert.equal(h.run('state'),null);});

test('English launch ignores a saved Portuguese preference and loads only English words',async()=>{const h=await harness({'lexivanto-preferences':JSON.stringify({lang:'pt'})});assert.equal(h.run('lang'),'en');assert.equal(h.run('loaded'),true);assert.equal(h.run('dictionaries.pt'),undefined);});
test('Portuguese friend invite is refused before taking a player seat',async()=>{const h=await harness();const calls=[];h.ctx.fetch=async(path,options)=>{calls.push(options.method);return {ok:true,json:async()=>({settings:{lang:'pt'}})};};await h.run("joinRoom('ABCDEF123456')");assert.deepEqual(calls,['GET']);assert.equal(h.run('state'),null);assert.match(h.get('menu-error').textContent,/English/);});
test('profile uses safe initials and falls back from an unknown saved colour',async()=>{const h=await harness({'lexivanto-preferences':JSON.stringify({avatarColour:'invalid'})});const values={};h.ctx.document.documentElement.style.setProperty=(key,value)=>values[key]=value;h.get('nickname').value='<name>';h.run('renderPersonality()');assert.equal(h.get('profile-avatar').textContent,'<');assert.equal(values['--avatar-colour'],'#51d4ff');h.run("preferences.avatarColour='#71e2b1';renderPersonality()");assert.equal(values['--avatar-colour'],'#71e2b1');});

test('friendly modes default untimed; explicit clock remains optional',async()=>{const h=await harness();for(const m of ['duel','race','coop']){h.run(`mode='${m}';setup();opponent='friend'`);assert.equal(h.run('config().seconds'),0);}h.get('clock').value='30';assert.equal(h.run('config().seconds'),30);});

test('Back is visible after choosing a mode and returns one setup step without losing name',async()=>{const h=await harness();assert.equal(h.get('back-button').hidden,true);h.run("chooseMode('duel')");assert.equal(h.get('back-button').hidden,false);h.run("chooseOpponent('friend')");h.get('back-button').onclick();assert.equal(h.run('step'),'opponent');assert.equal(h.get('nickname').value,'Tester');h.get('back-button').onclick();assert.equal(h.run('step'),'modes');h.run("opponent='bot'");await h.run('create()');h.get('back-button').onclick();assert.equal(h.get('leave-dialog').open,true);assert(h.run('state'));});
test('settings editor closes if polling starts game or a player leaves',async()=>{const h=await harness();await h.run('create()');h.get('room-settings-dialog').open=true;h.run('render()');assert.equal(h.get('room-settings-dialog').open,false);h.run("state.status='waiting';state.players[1].departed=true");h.get('room-settings-dialog').open=true;h.run('render()');assert.equal(h.get('room-settings-dialog').open,false);});

test('match introduction finishes before practice starts its clock and input',async()=>{const h=await harness();let finishIntro;h.ctx.setTimeout=cb=>{finishIntro=cb;};const starting=h.run('create()');assert.equal(h.run('state.status'),'waiting');assert.equal(h.run('canType()'),false);assert.equal(typeof finishIntro,'function');finishIntro();await starting;assert.equal(h.run('state.status'),'playing');assert.equal(h.run('canType()'),true);});

test('rate-limited polling preserves the draft, waits before retrying and permits leaving',async()=>{
 const h=await harness();await h.run('create()');h.run("remote=true;code='ABCDEF123456';draft='crane'");let calls=0;
 h.ctx.fetch=async()=>{calls++;return {ok:false,status:429,headers:{get:()=> '60'},json:async()=>({error:'rate_limited'})};};
 await h.run('poll()');assert.equal(h.run('draft'),'crane');assert.equal(h.run('connectionOk'),true);assert.match(h.get('turn-label').textContent,/Sync paused/);
 await h.run('poll()');assert.equal(calls,1);await h.run('submit()');assert.equal(calls,1);assert.equal(h.run('draft'),'crane');assert.equal(h.get('leave').disabled,false);
});

test('reconnection keeps typing available and distinguishes an offline opponent',async()=>{
 const h=await harness();await h.run('create()');h.run("remote=true;code='ABCDEF123456';connectionOk=false;draft='cra';render()");
 assert.equal(h.run('canType()'),true);h.run("key('n');key('e')");assert.equal(h.run('draft'),'crane');assert.match(h.get('turn-label').textContent,/Reconnecting/);
 h.run("connectionOk=true;state.connections=['connected','offline'];render()");assert.match(h.get('other-status').textContent,/Offline/i);assert.match(h.get('turn-label').textContent,/offline/);
});


test('the board follows the game: a revealed round scrolls up while its first row stays in view; a locked word scrolls to the bottom',async()=>{
 const h=await harness();
 const run=(count,pending,scrollTop=0)=>h.run(`(()=>{const s={scrollTop:${scrollTop},scrollHeight:700,clientHeight:200,getBoundingClientRect:()=>({top:100,bottom:300})};const row=t=>({getBoundingClientRect:()=>({top:t-${scrollTop},bottom:t+70-${scrollTop}})});const b={children:[row(108),row(186),row(400),row(478),row(556),row(634)]};keepLatestResultVisible(s,b,${count},'duel',${pending});return s.scrollTop;})()`);
 assert.equal(run(2,false),0,'the first round already fits');
 assert.equal(run(4,false),292,'round 2 (rows at 400 and 478) moves to the top of the view, not past it');
 assert.equal(run(4,false,250),292,'also when the player had scrolled elsewhere');
 assert.equal(run(4,true),500,'a newly locked word scrolls to the bottom');
 assert.equal(run(6,false),448,'round 3 moves to the top of the view');assert.equal(h.run("(()=>{const s={scrollTop:0,scrollHeight:300,clientHeight:200,getBoundingClientRect:()=>({top:100,bottom:300})};const b={children:[{},{},{getBoundingClientRect:()=>({top:330,bottom:400})},{}]};keepLatestResultVisible(s,b,4,'duel');return s.scrollTop;})()"),100,'never past the end');
});
test('home offers four ways to play: friend and bot pick a game first, Back retraces, guests see Competitive locked',async()=>{const h=await harness();assert.equal(h.run('step'),'modes');h.run("openGames('friend')");assert.equal(h.run('step'),'games');h.run("chooseMode('race')");assert.equal(h.run('step'),'friend');assert.equal(h.run('mode'),'race');h.run('back()');assert.equal(h.run('step'),'games');h.run('back()');assert.equal(h.run('step'),'modes');assert.equal(h.run('intent'),null);h.run("openGames('bot')");h.run("chooseMode('duel')");assert.equal(h.run('step'),'bot');h.run('back()');h.run('back()');h.run("signedAccount=null");await h.run('renderCompetitive()');assert.equal(h.get('competitive-find').textContent,'Sign in');});
test('result shows the rating change as before → after with a signed delta, or Not rated',async()=>{const h=await harness();h.run("renderRating(true,{rating_before:1240,rating_after:1258,delta:18,xp:20})");const box=h.get('result-rating');assert.equal(box.hidden,false);const text=JSON.stringify(box.children.map(c=>c.textContent));assert(text.includes('+18'),text);assert(text.includes('+20 XP'),text);h.run("renderRating(false,null)");assert(JSON.stringify(h.get('result-rating').children.map(c=>c.textContent)).includes('Not rated'));});
test('a first visit shows Play with a welcome note and no forced game; tips appear in the first game',async()=>{
 const first=await harness({'lexivanto-seen':null});await new Promise(r=>setTimeout(r,300));
 assert.equal(first.run('state'),null);assert.equal(first.run('step'),'modes');assert.equal(first.get('welcome').hidden,false);
 first.run("opponent='bot';mode='duel';$('difficulty').value='easy';create()");await new Promise(r=>setTimeout(r,1700));
 assert.equal(first.get('welcome').hidden,true);assert.equal(first.get('coach').hidden,false);assert.match(first.get('coach-text').textContent,/five-letter word/);
 const back=await harness();assert.equal(back.run('state'),null);assert.notEqual(back.get('welcome').hidden,false,'no welcome for a returning visitor');
});
test('a bot game in progress survives a reload',async()=>{
 const h=await harness();h.run("opponent='bot';mode='duel';$('difficulty').value='easy';create()");await new Promise(r=>setTimeout(r,1700));
 const saved=h.run("stored('lexivanto-practice')");assert.ok(saved,'practice is saved while playing');
 const again=await harness({'lexivanto-practice':saved});assert.equal(again.run('state?.status'),'playing');assert.equal(again.run('local.answer'),JSON.parse(saved).local.answer);
});
test('App & notifications: invitations need an account; Support in Me points to the Ko-fi page',async()=>{
 const h=await harness();h.run("signedAccount=null;renderAppSection()");
 assert.equal(h.get('notify-invites').disabled,true,'guests cannot turn on friend invitations (the row is hidden for them)');
 assert.equal(h.get('me-support').hidden,false);assert.equal(h.get('me-support').href,'https://ko-fi.com/elbully');assert.equal(h.get('support-link').hidden,true,'one Support link in Me, not two');
 assert.equal(h.get('install-app').hidden,true,'no install button unless the browser offers one');assert.equal(h.get('install-note').textContent,'','no install explanation outside iPhone');
});
test('home heading says what the game is for guests and greets a signed-in player; the streak chip follows the daily streak',async()=>{
 const h=await harness();
 h.run('signedAccount=null;renderHomeHeading()');assert.equal(h.get('modes-heading').textContent,'Word games for two');
 h.run("signedAccount={name:'maya'};renderHomeHeading()");assert.equal(h.get('modes-heading').textContent,'Hi, maya');
 h.run('renderStreakChip(4,false)');assert.equal(h.get('streak-chip').hidden,false);assert.equal(h.get('streak-count').textContent,'4');assert.match(h.get('streak-chip')['aria-label'],/^4-day streak\. Play today’s word\.$/);
 h.run('renderStreakChip(4,true)');assert.match(h.get('streak-chip')['aria-label'],/Today’s word is done/);
 h.run('renderStreakChip(0,false)');assert.equal(h.get('streak-chip').hidden,true,'no streak, no chip');
});
// Normal search with nobody around: Milo (a labelled bot) fills the wait, the search keeps running, a real player wins.
async function fillerHarness(){
 const h=await harness();const calls=[];const state={matched:false};
 h.run("var roomFixture=(()=>{const g=makeRoom(onlineSettings('duel','en',30),'Rui','other',chooseAnswer({lang:'en'}),Date.now());g.online=true;g.queue='normal';g.readyUntil=Date.now()+45000;g.players[1]={name:'Tester',auth:'me',ready:false};return {code:'ROOM1',revision:0,...view(g,1)};})()");
 h.ctx.fetch=async path=>{path=String(path);calls.push(path);const reply=data=>({ok:true,status:200,json:async()=>data});
  if(path.startsWith('/api/matchmaking/search'))return reply(state.matched?{status:'matched',room:h.run('roomFixture')}:{status:'searching'});
  if(path.startsWith('/api/matchmaking/cancel'))return reply({status:'cancelled'});
  if(path.startsWith('/api/rooms/ROOM1'))return reply(h.run('roomFixture'));
  return reply({ok:true});};
 const settle=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};
 return {h,calls,state,settle};
}
test('a quiet Normal search plays Milo after 10 s, keeps looking, and switches when a real player is found',async()=>{
 const {h,calls,state,settle}=await fillerHarness();
 h.run("startQueue('normal')");await settle();assert.equal(h.run('step'),'search');assert.equal(h.run('state'),null,'no bot before 10 s');
 h.run('search.started=Date.now()-11000;tick()');await settle();
 assert.equal(h.run('search'),null);assert.ok(h.run('filler'),'the search continues in the background');
 assert.equal(h.run('remote'),false);assert.equal(h.run('state.players[1].name'),'Milo');
 h.run('renderFiller()');assert.equal(h.get('filler-note').hidden,false);assert.match(h.get('filler-note').textContent,/^Milo is a bot\. Still looking for a real player/);
 await h.run('fillerPoll()');assert.ok(h.run('filler'),'still looking while nobody is found');
 state.matched=true;await h.run('fillerPoll()');await settle();
 assert.equal(h.run('filler'),null);assert.equal(h.run('remote'),true);assert.equal(h.run('code'),'ROOM1');assert.equal(h.run('local'),null,'the bot game ends');
 assert.ok(calls.includes('/api/rooms/ROOM1/ready'),'the player is made ready for the real match');
 assert.match(h.get('filler-note').textContent,/A real player joined/);
});
test('leaving the Milo game stops the background search; the Practice button starts Milo at once',async()=>{
 const {h,calls,settle}=await fillerHarness();
 h.run("startQueue('normal')");await settle();assert.equal(h.get('search-bot').textContent,'Play Milo (a bot) while we look');
 await h.run('startFiller()');await settle();assert.ok(h.run('filler'));assert.equal(h.run('state.players[1].name'),'Milo');
 h.run('menu()');await settle();assert.equal(h.run('filler'),null);assert.ok(calls.some(c=>c.startsWith('/api/matchmaking/cancel')),'the queue entry is cancelled');
});
test('Competitive never fills the wait with a bot',async()=>{
 const {h,settle}=await fillerHarness();
 h.run("startQueue('ranked')");await settle();h.run('search.started=Date.now()-61000;tick()');await settle();
 assert.equal(h.run('filler'),null);assert.ok(h.run('search'),'the rated search keeps going');assert.equal(h.run('state'),null);
 assert.equal(h.get('search-bot').textContent,'Practice with a bot instead');
});
test('games with a fixed number of tries show every row and are typed into in place; open-ended games keep a typing row',async()=>{
 const h=await harness();h.get('attempts').value='6';h.run("mode='coop';setup()");await h.run('create()');
 assert.equal(h.run('gridRows()'),6);assert.equal(h.get('board').children.length,6,'all six rows from the start');assert.equal(h.get('draft-row').hidden,true,'no separate typing row');
 h.run("key('c');key('r')");const first=h.get('board').children[0];
 assert.match(first.className,/current/);const letters=first.children.filter(t=>/\btile\b/.test(t.className)).map(t=>t.textContent).join('');assert.equal(letters,'CR');
 h.run("key('a');key('n');key('e')");await h.run('submit()');
 assert.equal(h.get('board').children.length,6,'still six rows after a guess');assert.ok(h.get('board').children[0].children.some(t=>/\b(exact|present|absent)\b/.test(t.className)),'the first row is revealed in place');
 const h2=await harness();await h2.run('create()');assert.equal(h2.run('gridRows()'),0,'Duel has no fixed number of rounds');assert.equal(h2.get('draft-row').hidden,false);
});
test('Practice vs bot offers Duel and Race only; Play a friend offers every mode',async()=>{const h=await harness();h.run("openGames('bot')");assert.equal(h.get('games-coop').hidden,true,'no Co-op with the bot');assert.equal(h.get('games-swap').hidden,true,'no Word Swap with the bot');h.run("openGames('friend')");assert.equal(h.get('games-coop').hidden,false);assert.equal(h.get('games-swap').hidden,false);});
test('one-line match header: short game chip, "You", status badges and no "No clock"',async()=>{const h=await harness();await h.run('create()');assert.equal(h.get('match-chip-short').textContent,'PRACTICE');assert.equal(h.get('match-chip-full').textContent,'Practice · not rated');assert.equal(h.get('you-name').textContent,'You');assert.equal(h.get('you-player').dataset.state,'busy','choosing shows the busy badge');assert.notEqual(h.get('timer').textContent,'No clock');h.run("key('c');key('r');key('a');key('n');key('e')");await h.run('submit()');assert.equal(h.get('you-status').textContent,'Locked');assert.equal(h.get('you-player').dataset.state,'done');});
test('friend link: a guest is asked to sign in and the request waits for them; a signed-in player confirms before sending',async()=>{const h=await harness();
 await h.run("openFriendLink('LEX-00000000000A')");assert.equal(h.get('friend-link-go').textContent,'Sign in');assert.equal(h.run('friendLinkPending()'),'LEX-00000000000A','kept for after sign-in');
 h.run("friends.myTag=()=>'LEX-00000000000B';friends.lookupTag=async()=>({name:'rui',status:null,incoming:false});let sent='';friends.requestTag=async t=>{sent=t;};globalThis.__sent=()=>sent;signedAccount={name:'maya'}");
 await h.run("openFriendLink('LEX-00000000000A')");assert.equal(h.get('friend-link-text').textContent,'Add rui as a friend?');assert.equal(h.get('friend-link-go').hidden,false);
 await h.run("$('friend-link-go').onclick()");assert.equal(h.run('__sent()'),'LEX-00000000000A');assert.match(h.get('friend-link-text').textContent,/Request sent/);assert.equal(h.run('friendLinkPending()'),'');
 await h.run("openFriendLink('LEX-00000000000B')");assert.match(h.get('friend-link-text').textContent,/your own friend link/);
 h.run("friends.lookupTag=async()=>({name:'rui',status:'accepted'})");await h.run("openFriendLink('LEX-00000000000A')");assert.match(h.get('friend-link-text').textContent,/already friends/);assert.equal(h.get('friend-link-go').hidden,true);
});
test('Daily result week line: points today, place among friends, two-player score line, days still needed',async()=>{const h=await harness();
 const me=(o)=>JSON.stringify({signedIn:true,shown:true,standings:[{name:'maya',you:true,points:17,position:2,tied:false},{name:'rui',points:20,position:1},{name:'noor',points:9,position:3}],today:[],me:{days:4,points:17,position:2,ranked:3,todayPoints:4,todayCounted:true,needDays:3,...o}});
 assert.equal(h.run('dailyWeekLine('+me({})+')'),'+4 points · 2nd of 3 friends this week');
 assert.equal(h.run('dailyWeekLine('+me({days:2})+')'),'+4 points · Play 1 more day this week for a place');
 assert.equal(h.run("dailyWeekLine({signedIn:true,shown:true,standings:[{name:'maya',you:true,points:17,position:1},{name:'rui',points:14,position:2}],today:[],me:{days:3,points:17,position:1,ranked:2,todayPoints:1,todayCounted:true,needDays:3}})"),'+1 point · You 17 · rui 14');
 assert.equal(h.run('dailyWeekLine('+me({todayCounted:false})+')'),'Not counted this week · 2nd of 3 friends this week');
 assert.equal(h.run("dailyWeekLine({signedIn:true,shown:false,standings:[],today:[],me:{days:1,points:5,todayPoints:5,todayCounted:true,needDays:3}})"),'+5 points · Standings start when a friend plays this week');
 assert.equal(h.run('ordinal(1)+ordinal(2)+ordinal(3)+ordinal(4)+ordinal(11)+ordinal(22)'),'1st2nd3rd4th11th22nd');
});
