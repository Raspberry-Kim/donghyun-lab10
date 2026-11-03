// 동현몬 연기 시험: node qa/smoke.cjs [playwright 경로]
// 예제 13개 해석 · 걷기·문·대화·선물 · 야생 전투 승리·포획 · 트레이너 승부 · 회복소 · 저장/불러오기 · 체육관 배지
const path=require('path');
const {chromium}=require(process.argv[2]||'playwright');
const file='file://'+path.resolve(__dirname,'..','dist','index.html');
const assert=(c,m)=>{ if(!c) throw new Error('실패: '+m); };
(async()=>{
  const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e))); page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
  await page.goto(file); await page.waitForFunction(()=>window.__donghyunmon);
  // 페이지 안 도우미
  await page.evaluate(()=>{
    const H=window.__donghyunmon;
    const S=()=>H.state;
    H.press=(k,n=2)=>{ H.keyDown(k); H.step(1); H.keyUp(k); H.step(n); };
    H.walk=(dir,n=1)=>{ for(let i=0;i<n;i++){ const h=S().hero, tx=h.tx, ty=h.ty; H.keyDown(dir); H.step(1); H.keyUp(dir); let g=0; while((S().hero.moving>0||S().fade>0||S().fadeIn>0)&&g++<60) H.step(1); if(S().dialog||S().battle) return false; } return true; };
    H.face=dir=>{ H.keyDown(dir); H.step(1); H.keyUp(dir); H.step(1); };
    H.talk=(pick)=>{ let g=0; while(S().dialog&&g++<400){ const d=S().dialog; if(d.wait){ H.step(1); continue; } if(d.choice){ if(pick===undefined) pick=0; while(d.choice.i!==pick){ H.press('down',1); } H.press('x',2); continue; } H.press('x',2); } return !S().dialog; };
    H.fight=(opt={})=>{ let g=0, threw=0; while(S().battle&&g++<3000){ const B=S().battle; if(B.phase==='menu'){ if(opt.ball&&S().bag.ball>0&&B.foes[B.fi].hp<=B.foes[B.fi].maxhp*0.6&&threw<6){ while(B.cursor!==1) H.press('right',1); H.press('x',2); let k=0; while(S().battle&&S().battle.phase==='bag'&&k++<10) H.press('x',2); threw++; } else { while(B.cursor!==0) H.press(B.cursor===1?'left':B.cursor===2?'up':'left',1); H.press('x',2); if(S().battle&&S().battle.phase==='moves'){ const me=S().party[S().battle.me]; let best=0; me.moves.forEach((m,i)=>{ if((window.DATA.MOVES[m].pow||0)>(window.DATA.MOVES[me.moves[best]].pow||0)) best=i; }); while(S().battle.mcur!==best) H.press('down',1); H.press('x',2); } } }
      else if(B.phase==='party'){ const alive=S().party.findIndex(m=>m.hp>0); while(S().battle&&S().battle.pcur!==alive) H.press('down',1); H.press('x',2); }
      else if(B.phase==='q'){ H.press('x',1); } else H.press('z',1); } return S().battle?null:true; };
    H.text=()=>JSON.parse(render_game_to_text());
  });
  // 1) 예제 해석
  const ex=await page.evaluate(()=>__donghyunmon.examples.map(e=>{ const r=Donghyun.run(e.code,{maxSteps:300000}); const p=__donghyunmon.parseSortie(r.output); return {id:e.id,err:p.err,go:p.go,c:p.c}; }));
  for(const e of ex) assert(!e.err.length,`예제 ${e.id}: ${e.err[0]}`);
  assert(ex.filter(e=>e.go).length===12&&!ex[12].go,'출전 예제 12개 + 빈 코드 1개');
  assert(ex[8].c.money===5000&&ex[11].c.money===3000&&ex[11].c.pers===2,'예제 값');
  // 2) 하얀마을: 연구소에서 동현볼 받기
  let r=await page.evaluate(()=>{ const H=__donghyunmon; H.start({startMap:1,pers:1,rate:1,money:1000,seed:3}); H.walk('down',6); H.walk('right',9); H.walk('up',1); const inLab=H.state.map==='lab'; H.walk('up',2); H.walk('left',2); H.walk('up',2); H.walk('right',1); H.face('right'); H.press('x'); const pages=H.state.dialog&&H.state.dialog.pages; H.talk(); return {inLab,map:H.state.map,hero:[H.state.hero.tx,H.state.hero.ty],pet:H.state.petHidden,balls:H.state.bag.ball,pages}; });
  assert(r.inLab&&r.map==='lab','연구소 진입 '+JSON.stringify(r)); assert(r.balls===5,'동현볼 5개 받기 '+JSON.stringify(r));
  // 3) 산책로 야생 전투: 포획
  r=await page.evaluate(()=>{ const H=__donghyunmon; H.start({startMap:2,pers:2,rate:5,money:1000,seed:5}); const S=H.state; H.walk('up',7); H.walk('left',3); let met=false; for(let i=0;i<40&&!met;i++){ H.walk(i%2?'down':'up',3); if(S.battle) met=true; } if(!met) return {met}; const foe=S.battle.foes[0].key; const seen=S.dex.seen[foe]; const ok=H.fight({ball:true}); return {met,foe,seen,ok,status:S.status,party:S.party.map(m=>m.key),dex:Object.keys(S.dex.caught),hp:S.party[0].hp,money:S.money,map:S.map}; });
  assert(r.met,'긴 풀에서 야생 조우'); assert(r.ok===true,'야생 전투 끝 '+JSON.stringify(r)); assert(r.seen===1,'도감 본 적 표시');
  console.log('야생:',JSON.stringify(r));
  // 4) 트레이너 승부(시선) → 상금, 체육관
  r=await page.evaluate(()=>{ const H=__donghyunmon; H.start({startMap:3,pers:1,rate:0,money:500,seed:1}); const S=H.state;
    for(const m of S.party){ m.lv=30; window.Engine.calcStats(m); m.hp=m.maxhp; m.moves=['bite','rush','tackle','howl']; }
    // 동현시 (10,15) → 체육관 문 (6,4)
    H.walk('up',10); H.walk('left',4); H.walk('up',1); const gym=S.map; const log=[];
    // 체육관 안 (5,13) → (5,6) → (6,6) → (6,3): 수련생 시선에 걸리면 승부
    const handle=()=>{ if(S.dialog) H.talk(); if(S.battle){ log.push(S.battle.npc.id); H.fight(); H.talk(); } };
    const route=[['up',7],['right',1],['up',4]]; let guard=0;
    for(const [d,n] of route){ for(let i=0;i<n&&guard++<80;){ const before=[S.hero.tx,S.hero.ty].join(); H.walk(d,1); handle(); if(S.status!=='play') break; if([S.hero.tx,S.hero.ty].join()!==before) i++; else if(!S.dialog&&!S.battle) break; } if(S.status!=='play') break; }
    if(S.status==='play'&&S.map==='gym'){ H.step(3); handle(); H.face('up'); H.press('x'); handle(); H.step(3); handle(); }
    H.step(30); return {gym,log,status:S.status,badge:S.badge,money:S.money,mode:H.mode,hero:[S.hero.tx,S.hero.ty],map:S.map}; });
  console.log('체육관:',JSON.stringify(r));
  assert(r.gym==='gym','체육관 진입'); assert(r.log.includes('leader')&&r.status==='win'&&r.badge===1,'관장 승리 → 배지·승리');
  // 5) 회복소 + 저장/불러오기
  r=await page.evaluate(()=>{ const H=__donghyunmon; H.start({startMap:1,pers:1,rate:0,money:1000,seed:1}); const S=H.state; S.party[0].hp=3;
    // (4,4) → 회복소 문 (18,3): 오른쪽 14칸, 위 1칸
    H.walk('right',14); H.walk('up',1); const center=S.map; H.walk('up',3); H.walk('left',1); H.face('up'); H.press('x'); H.talk(0); const healed=S.party[0].hp===S.party[0].maxhp, lastHeal=S.lastHeal;
    H.walk('right',1); H.walk('down',3); const back=S.map;
    const snap=H.snapshot(); H.saveToSlot(2); const slot=H.readSlot(2);
    H.start({startMap:3,pers:3,rate:1,money:7,seed:9}); H.restore(slot);
    const T=H.state; return {center,healed,lastHeal,back,slotOk:!!slot&&slot.format==='donghyunmon-save',map:T.map,hero:[T.hero.tx,T.hero.ty],money:T.money,pers:T.pers,hp:T.party[0].hp,npcs:T.npcs.length,canStep:(H.step(5),T.frame>0)}; });
  console.log('회복·저장:',JSON.stringify(r));
  assert(r.center==='center'&&r.healed,'회복소 회복'); assert(r.back==='town1','회복소에서 마을로 복귀(back 워프)'); assert(r.slotOk&&r.map==='town1'&&r.money===1000&&r.pers===1,'저장·불러오기 일치');
  // 6) 잘못된 저장 거부
  r=await page.evaluate(()=>{ const H=__donghyunmon; let a=null,b=null; try{ H.restore({format:'donghyuncr-save'}); }catch(e){ a=e.message; } try{ const s=H.snapshot(); s.state.map='nowhere'; H.restore(s); }catch(e){ b=e.message; } return {a,b}; });
  assert(r.a&&r.b,'잘못된 저장 거부 '+JSON.stringify(r));
  await page.screenshot({path:'/tmp/mon_qa_end.png'});
  assert(!errors.length,'페이지 오류: '+errors.join(' | '));
  console.log(JSON.stringify({examples:ex.length,ok:true}));
  await browser.close();
})().catch(e=>{ console.error(e); process.exit(1); });
