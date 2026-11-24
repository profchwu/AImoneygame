import {LENGTH,EXIT,ALTAR,stations,solved,doorReady,answerStation,enterDoor,roomObstacles} from './world.js?v=4';
import * as THREE from 'three';
import {stepBody,FLOOR} from './physics.js?v=4';
import {CinematicStage} from './cinematic.js?v=4';
import {centers,names,items,fresh,budget,finance,evaluate,submit,canOpen,hint,restore} from './core.js?v=4';

const $=id=>document.getElementById(id);
const STORAGE='wish-house-finance-v3';
let state=fresh(),saved=null,active=-1,started=false,paused=false,celebrating=false,ready=false;
let timer=90,time=0,danger=0,verticalSpeed=0,toastUntil=0,muted=false,last=performance.now();
let player,warden,room,renderer,camera,scene,coinMarkers=[],exitKey;
const held=new Set();
const motion={y:0},wardenMotion={y:0};let jumpRequested=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const music=new Audio('./ambience.wav');music.loop=true;music.volume=.17;
let audioContext;
let discovery=-1,discoveryTimer=45,doorTime=0,stamina=100,puzzleApproach=0;
try{saved=restore(localStorage.getItem(STORAGE));}catch{}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}}
function say(text){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+6500;}
function fail(error){console.error(error);$('error-message').textContent='請從網站網址開啟，並確認場景圖片已完整上傳。若載入中斷，請重新整理。詳細資訊：'+error.message;$('error').hidden=false;}
function cue(ok=true){if(muted)return;try{audioContext??=new AudioContext();audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=ok?660:220;gain.gain.setValueAtTime(.06,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.3);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.31);}catch{}}
function toggleSound(){muted=!muted;music.muted=muted;$('sound').textContent=muted?'音效 關':'音效 開';$('sound').setAttribute('aria-pressed',String(!muted));}

async function init(){
 try{
  renderer=new CinematicStage($('scene'));
  await renderer.load(n=>{$('load-progress').value=n;$('load-status').textContent=`準備電影場景 ${n} / 6`;});
  player=new THREE.Object3D();warden=new THREE.Object3D();player.position.set(-1.8,.06,1.8);warden.position.set(15,.05,2.1);
  coinMarkers=centers.map(()=>new THREE.Object3D());exitKey=new THREE.Object3D();
  ready=true;$('load-status').textContent='微光已就緒';$('load-progress').hidden=true;$('start').disabled=false;$('continue').hidden=!saved;
  wireUI();resize();requestAnimationFrame(frame);
 }catch(e){fail(e);}
}
function wireUI(){
 for(const item of items){const b=document.createElement('button');b.className='shop-item';b.dataset.item=item.id;b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="item-icon">${item.icon}</span><span>${item.name}<small>${item.kind}</small></span><b>${item.cost} 枚</b>`;b.onclick=()=>{if(active!==0||paused)return;const at=state.selected.indexOf(item.id);if(at<0)state.selected.push(item.id);else state.selected.splice(at,1);updateUnit();save();};$('shop').append(b);}
 $('start').onclick=()=>start(false);$('continue').onclick=()=>start(true);
 $('sound').onclick=toggleSound;$('pause').onclick=()=>setPause(!paused);$('resume').onclick=()=>setPause(false);$('retry').onclick=()=>{setPause(false);retry(false);};$('restart').onclick=()=>{if(confirm('重新開始會清除這次的 KEY 與分數。確定嗎？'))start(false);};$('again').onclick=()=>start(false);
 $('close').onclick=closeUnit;$('check').onclick=checkAnswer;$('hint').onclick=()=>{if(active<0||paused)return;$('feedback').textContent=hint(state,active);save();};
 $('key-next').onclick=()=>{celebrating=false;$('key-earned').hidden=true;warden.position.x=player.position.x-6;motion.y=0;say('KEY 已收好。繼續向右探索，走近出口按 E 開門。');};
 for(const [id,index] of [['a',0],['b',1]])$(id).oninput=()=>{if(active!==1||paused)return;state.allocation[index]=Number($(id).value);state.seen=[];$('scenario-result').textContent='配置改變了，請重新比較兩種情境。';updateUnit();save();};
 for(const weather of ['sun','rain'])$(weather).onclick=()=>{if(active!==1||paused)return;if(!state.seen.includes(weather))state.seen.push(weather);const f=finance(state),result=f[weather];$('scenario-result').textContent=`${weather==='sun'?'晴天':'雨天'}後共有 ${result.toFixed(1)} 枚（${result>=100?'增加':'減少'} ${Math.abs(result-100).toFixed(1)} 枚）。${weather==='rain'?'分散配置也可能虧損；備用金不投入計畫。':'這只是模擬，下一次不一定有相同結果。'}`;updateUnit();save();};
 $('touch-interact').onclick=interact;$('discovery-close').onclick=closeDiscovery;
 document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(b.dataset.key);if(b.dataset.key==='Space')jumpRequested=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>held.delete(b.dataset.key));});
 addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&e.target.tagName!=='INPUT')e.preventDefault();if(e.target.tagName==='INPUT'&&e.code!=='Escape')return;if(e.repeat)return;held.add(e.code);if(e.code==='KeyE'){e.preventDefault();interact();}if(e.code==='KeyM')toggleSound();if(e.code==='Escape'&&started&&!state.finished&&!celebrating)setPause(!paused);if(e.code==='KeyR'&&started&&!paused&&!celebrating)retry(false);if(e.code==='Space'&&started&&!paused&&active<0)jumpRequested=true;});
 addEventListener('keyup',e=>held.delete(e.code));addEventListener('blur',()=>{held.clear();if(started&&!state.finished&&!celebrating)setPause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){held.clear();music.pause();if(started&&!state.finished&&!celebrating)setPause(true);}else if(started&&!muted)music.play().catch(()=>{});});addEventListener('resize',resize);
}
function start(resume){state=resume&&saved?restore(JSON.stringify(saved)):fresh();active=-1;discovery=-1;doorTime=0;stamina=100;started=true;paused=false;celebrating=false;danger=0;timer=90;held.clear();for(const id of ['welcome','pause-menu','victory','key-earned','puzzle','discovery'])$(id).hidden=true;for(const id of ['hud','controls','touch','objectives'])$(id).hidden=false;document.body.classList.add('playing');motion.y=0;jumpRequested=false;player.position.set(Math.max(1,state.checkpoint),.06,2.2);warden.position.set(-4,.06,2.8);coinMarkers.forEach((key,i)=>key.visible=!state.keys[i]);music.play().catch(()=>{});save();say('探索三座發光機關，再解開 KEY 寶箱。Shift 衝刺、空白跳箱，Ctrl 在櫃子旁躲藏。');}
function setPause(value){if(!started||state.finished||celebrating)return;paused=value;held.clear();$('pause-menu').hidden=!value;if(value)music.pause();else music.play().catch(()=>{});}
function closeDiscovery(){if(discovery>=0)warden.position.x=player.position.x-6;discovery=-1;$('discovery').hidden=true;held.clear();save();}
function openDiscovery(index){discovery=index;discoveryTimer=45;puzzleApproach=player.position.x+5;held.clear();$('discovery-close').textContent='離開機關';const q=stations[state.stage][index];$('discovery-title').textContent=q.title;$('discovery-question').textContent=q.question;$('discovery-feedback').textContent=state.clues[state.stage][index]?q.lesson:'答對可點亮機關。答錯會讓巡夜者更接近！';$('discovery-choices').replaceChildren(...q.choices.map((label,choice)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(paused||discovery!==index)return;const ok=answerStation(state,index,choice);cue(ok);save();if(ok){$('discovery-feedback').textContent='✓ '+q.lesson;for(const button of $('discovery-choices').children)button.disabled=true;$('discovery-close').textContent='收好線索，繼續探索';}else{discoveryTimer=Math.max(0,discoveryTimer-8);$('discovery-feedback').textContent='再想一想！腳步靠近了，倒數減少 8 秒。';}};b.disabled=state.clues[state.stage][index];return b;}));$('discovery').hidden=false;}
function interact(){if(!ready||!started||paused||celebrating||state.finished||doorTime)return;if(discovery>=0)return;if(active>=0){checkAnswer();return;}const x=player.position.x;if(Math.abs(x-EXIT)<1.6){if(!doorReady(state)){say('門還鎖著：完成三座機關與主題挑戰，取得本關 KEY。');return;}doorTime=.001;held.clear();cue(true);say(state.stage===0?'門鎖轉動了……穿過走廊，前往月光溫室。':'最後一道門開了，你帶著理財知識回家。');return;}if(Math.abs(x-ALTAR)<1.5){if(!solved(state)){say('寶箱需要三道線索，請先完成沿途發光機關。');return;}openUnit(state.stage);return;}const index=stations[state.stage].findIndex(q=>Math.abs(x-q.x)<1.35);if(index>=0){openDiscovery(index);return;}say('走近發光機關、KEY 寶箱或出口，再按 E。');}
function openUnit(i){if(state.keys[i]){say(`這關已完成！得分 ${state.scores[i]}，KEY 已收好。`);return;}if(!canOpen(state,i)){say('先解開第一關，取得第一把 KEY。');return;}active=i;puzzleApproach=player.position.x+5;timer=90;danger=0;held.clear();$('puzzle-number').textContent=`第 ${i+1} 關 · 互動單元 ${i+1}`;$('puzzle-title').textContent=names[i];$('instructions').textContent=i===0?'你有 100 枚金幣。今天需要午餐和回家車票，並至少留下 20 枚儲蓄。選擇要買的物品。':'分配 100 枚金幣：備用金至少 40 枚，兩個計畫各分 10～40 枚。用同一配置比較晴天和雨天，再提交。';$('unit-budget').hidden=i!==0;$('unit-invest').hidden=i!==1;$('feedback').textContent='解題通過才能取得 KEY。錯誤後再試每次扣 4 分，最多扣 20 分。';$('puzzle').hidden=false;$('touch').hidden=true;warden.position.set(centers[i]+2.1,.06,2.2);updateUnit();}
function closeUnit(){if(active<0)return;active=-1;$('puzzle').hidden=true;$('touch').hidden=false;held.clear();save();}
function updateUnit(){const b=budget(state);$('spent').textContent=b.spent;$('saved').textContent=b.saved;$('saved').classList.toggle('bad',b.saved<20);document.querySelectorAll('[data-item]').forEach(el=>{const selected=state.selected.includes(el.dataset.item);el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});const f=finance(state);$('reserve').textContent=f.cash;$('reserve').classList.toggle('bad',f.cash<40);['a','b'].forEach((id,i)=>{$(id).value=state.allocation[i];$(id+'-value').textContent=state.allocation[i]+' 枚';});for(const weather of ['sun','rain'])$(weather).classList.toggle('selected',state.seen.includes(weather));if(active>=0)$('score-live').textContent=state.attempts[active]?`本關得分 ${state.scores[active]} / 100 · 作答 ${state.attempts[active]} 次 · 提示 ${state.hints[active]} 次`:'本關得分：尚未作答';}
function checkAnswer(){if(active<0||paused||celebrating)return;const i=active,r=submit(state,i);updateUnit();save();cue(r.pass);if(!r.pass){$('feedback').replaceChildren(...r.rules.map(rule=>{const p=document.createElement('span');p.className='rule';p.textContent=(rule.ok?'✓ ':'○ ')+rule.text;return p;}));return;}coinMarkers[i].visible=false;closeUnit();celebrating=true;held.clear();$('key-title').textContent=`取得第 ${i+1} 把 KEY！`;$('key-score').textContent=`本關得分 ${state.scores[i]} / 100 · 提示 ${state.hints[i]} 次 · 作答 ${state.attempts[i]} 次`;$('key-lesson').textContent=i===0?'先照顧需要，再安排想要，也為未來留下儲蓄。':'備用金讓生活有準備；分散投資可以分散風險，但不能保證不虧損。';$('key-earned').hidden=false;$('key-next').focus();}
function retry(caught=true){if(caught)state.caught++;closeUnit();closeDiscovery();player.position.set(Math.max(1,state.checkpoint),.06,2.8);verticalSpeed=0;motion.y=0;jumpRequested=false;danger=0;timer=90;warden.position.set(player.position.x-7,.06,2.8);save();say(caught?'巡夜者找到你了！回到燈下再試一次。KEY 和已選內容保留，不扣速度分。':'回到安全點。KEY 和你的選擇都保留。');if(caught)cue(false);}
function win(){if(state.finished||!state.keys.every(Boolean))return;state.finished=true;closeUnit();held.clear();save();music.volume=.10;cue(true);$('victory').hidden=false;$('touch').hidden=true;$('summary').textContent=`集齊 2 / 2 把 KEY · 總得分 ${state.scores[0]+state.scores[1]} / 200 · 安全重試 ${state.caught} 次 · 探索機關 ${state.clues.flat().filter(Boolean).length} / 6`;$('results').replaceChildren(...names.map((name,i)=>{const div=document.createElement('div');div.className='result-card';const initial=state.first[i]??0;const gain=state.mastery[i]-initial;div.innerHTML=`<strong>第 ${i+1} 關 · ${name}</strong><b>${state.scores[i]} 分</b><p>首次作答達成度 ${initial} → 最後 ${state.mastery[i]}<br>${gain>0?`修正進步 +${gain} 點`:'第一次就掌握重點，繼續保持！'}</p><div class="growth"><span style="width:${initial}%"></span><i style="width:${state.mastery[i]}%"></i></div><small>主題作答 ${state.attempts[i]} 次 · 探索答對 ${state.clues[i].filter(Boolean).length} / 3 · 探索嘗試 ${state.exploreAttempts[i]} 次</small>`;return div;}));$('again').focus();}
function resize(){renderer?.resize();}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!ready)return;
 const running=started&&!paused&&!celebrating&&!state.finished;
 if(running){time+=dt;
  if(doorTime){doorTime+=dt;player.userData.walking=false;if(doorTime>1.8){const result=enterDoor(state);doorTime=0;if(result==='next'){closeDiscovery();player.position.set(1,FLOOR,2.8);warden.position.set(-5,FLOOR,2.8);motion.y=0;danger=0;stamina=100;save();say('第二關：月光溫室。查驗廣告、預留備用金，最後比較風險。');}else if(result==='finish')win();}}
  else if(active>=0||discovery>=0){
   if(active>=0){timer=Math.max(0,timer-dt);$('timer').textContent=Math.ceil(timer)+' 秒';$('timebar').value=timer;$('puzzle').classList.toggle('urgent',timer<20);if(timer===0)retry(true);}
   else if(!state.clues[state.stage][discovery]){discoveryTimer=Math.max(0,discoveryTimer-dt);$('discovery-clock').textContent=`腳步接近中 · ${Math.ceil(discoveryTimer)} 秒`;if(discoveryTimer===0)retry(true);}else $('discovery-clock').textContent='機關已點亮 · 線索已保存';
   const remaining=active>=0?timer/90:discoveryTimer/45;
   if(active>=0||(discovery>=0&&!state.clues[state.stage][discovery])){const old=warden.position.x;warden.position.x=player.position.x+.5+remaining*(puzzleApproach-player.position.x-.5);warden.position.z=2.8;warden.userData.walkDistance=(warden.userData.walkDistance||0)+Math.abs(warden.position.x-old);}
   player.userData.walking=false;
  }else{
   const dx=Number(held.has('KeyD')||held.has('ArrowRight'))-Number(held.has('KeyA')||held.has('ArrowLeft'));
   const dz=Number(held.has('KeyS')||held.has('ArrowDown'))-Number(held.has('KeyW')||held.has('ArrowUp'));
   const crouching=held.has('ControlLeft')||held.has('ControlRight');
   const sprint=!crouching&&(dx||dz)&&(held.has('ShiftLeft')||held.has('ShiftRight'))&&stamina>2;
   stamina=Math.max(0,Math.min(100,stamina+dt*(sprint?-28:18)));
   const solids=roomObstacles(state.stage);
   const movement=stepBody(player.position,motion,dx,dz,dt,{jump:jumpRequested,speed:crouching?1.7:sprint?5.9:3.4,solids,bounds:[.5,LENGTH]});jumpRequested=false;
   player.userData.walkDistance=(player.userData.walkDistance||0)+movement.distance;player.userData.walking=movement.distance>.0001;player.userData.grounded=movement.grounded;
   player.scale.y=THREE.MathUtils.lerp(player.scale.y,crouching?.72:1,Math.min(1,dt*10));
   const hiding=crouching&&solids.some(o=>o.kind==='cabinet'&&Math.abs(player.position.x-(o.x0+o.x1)/2)<2);
   const near=Math.hypot(player.position.x-warden.position.x,player.position.z-warden.position.z);
   // The warden uses the clear foreground aisle; low crates trigger a jump.
   const chasing=!hiding&&near<9;
   const target=chasing?player.position.x:17+Math.sin(time*.16)*15;
   const wx=Math.sign(target-warden.position.x);
   const barrier=solids.find(o=>o.kind==='cabinet'&&Math.abs(warden.position.x-(o.x0+o.x1)/2)<2.3);const lane=barrier&&barrier.z1>3?1.2:2.85;
   const pursuit=stepBody(warden.position,wardenMotion,wx,Math.abs(lane-warden.position.z)>.12?Math.sign(lane-warden.position.z):0,dt,{speed:chasing?2.5:1.4,jump:warden.userData.blocked,solids,bounds:[-7,LENGTH]});
   warden.userData.blocked=pursuit.blocked;warden.userData.walkDistance=(warden.userData.walkDistance||0)+pursuit.distance;
   danger=near<.85&&!hiding?danger+dt:Math.max(0,danger-dt*2);if(danger>.7)retry(true);
   let context=hiding?'已藏在櫃子陰影裡。等巡夜者走遠再出發。':near<5?'巡夜者追來了！Shift 衝刺，或在高櫃旁按 Ctrl 躲藏。':'向右探索；W／S 繞過高櫃，空白鍵跳過矮箱。';
   if(movement.blocked)context='被實體障礙擋住！W／S 換路線，空白鍵跳越矮箱。';
   const q=stations[state.stage].find(q=>Math.abs(player.position.x-q.x)<1.35);if(q)context='E 互動 · '+q.title;
   if(Math.abs(player.position.x-ALTAR)<1.5)context='E 開啟 KEY 寶箱 · '+(solved(state)?names[state.stage]:'還需要完成三座機關');
   if(Math.abs(player.position.x-EXIT)<1.6)context=doorReady(state)?'E 使用 KEY 開門 · '+(state.stage?'回家':'進入月光溫室'):'出口鎖住了：需要本關 KEY 與三道線索';
   $('context').textContent=context;
  }
 }
 $('progress').textContent=state.keys.map(k=>k?'⚿ ✓':'⚿ ○').join('　');$('count').textContent=`KEY ${state.keys.filter(Boolean).length} / 2 · 得分 ${state.scores[0]+state.scores[1]}`;
 $('objectives').textContent=`第 ${state.stage+1} 關 · ${state.stage?'月光溫室':'午夜玩具商廊'} ｜ 線索 ${state.clues[state.stage].filter(Boolean).length}/3 ｜ KEY ${state.keys[state.stage]?'✓':'○'} ｜ 體力 ${Math.round(stamina)}%`;
 if(now>toastUntil)$('toast').classList.remove('show');for(const axis of ['x','y','z'])$('scene').dataset['player'+axis.toUpperCase()]=player.position[axis].toFixed(3);$('scene').dataset.stage=state.stage;$('scene').dataset.walkDistance=(player.userData.walkDistance||0).toFixed(3);
 renderer.draw({player,warden,state,time,active:discovery>=0?2:active,started,paused:paused||celebrating,reduced,doorTime});
}
init();
