/* 연구소 상자 점검: 일곱째 포획 때 교체·맡기기, 회복소·연구소에서 상자 열어 바꾸기, 쪽 넘기기, 빈 상자, 직렬화 */
const path=require('path'); const {chromium}=require('/home/user/node_modules/playwright');
const fails=[]; const assert=(c,m)=>{ if(!c) fails.push(m); console.log((c?'통과':'실패')+' · '+m); };
(async()=>{ const b=await chromium.launch(); const page=await b.newPage({viewport:{width:1000,height:700}}); const errs=[];
  page.on('pageerror',e=>errs.push('PE '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('CE '+m.text().slice(0,120)); });
  await page.goto('file://'+path.resolve(__dirname,'../dist/index.html')); await page.waitForTimeout(300); await page.click('#run'); await page.waitForTimeout(500);
  await page.evaluate(()=>{ const H=window.__donghyunmon, E=window.Engine; const S=()=>H.state;
    H.press=(k,n=2)=>{ H.keyDown(k); H.step(1); H.keyUp(k); H.step(n); };
    H.adv=()=>{ let last='', g=0; while(S().dialog&&!S().dialog.choice&&g++<200){ const d=S().dialog; if(d.wait){ H.step(1); continue; } last=d.pages[d.i]||last; H.press('x',2); } return last; };
    H.items=()=>S().dialog&&S().dialog.choice?S().dialog.choice.items.slice():null;
    H.pick=(i)=>{ const d=S().dialog; if(!d||!d.choice) return 'NO CHOICE'; let g=0; while(d.choice.i!==i&&g++<20) H.press('down',1); H.press('x',2); return H.adv(); };
    H.cancel=()=>{ H.press('z',2); return H.adv(); };
    H.reset=()=>{ H.start({startMap:1,pers:1,rate:1,money:1000,seed:3}); H.step(3); const s=S(); s.party=['podong','lion','shushu','worm','fly','inf'].map((k,i)=>E.makeMon(k,6+i)); s.box=[]; s.bag.ball=30; return s; };
    H.go=(map,x,y,dir)=>{ const s=S(); s.map=map; s.hero.tx=x; s.hero.ty=y; s.hero.x=x*16; s.hero.y=y*16; s.hero.dir=dir; s.hero.moving=0; s.petHidden=true; H.step(2); };
    H.catchWild=(key)=>{ const s=S(); E.startBattle(s,{kind:'wild',foes:[E.makeMon(key,3)]}); s.battle.foes[0].hp=1; let g=0; while(s.battle&&s.battle.phase!=='keep'&&g++<4000){ const B=s.battle; if(B.phase==='menu'){ while(B.cursor!==1) H.press('right',1); H.press('x',2); } else if(B.phase==='bag'){ H.press('x',2); } else if(B.phase==='q'){ H.press('x',1); } else H.press('z',1); } return s.battle?s.battle.phase:null; };
    H.finish=()=>{ let g=0; while(S().battle&&g++<500) H.press('x',1); return !S().battle; };
  });
  // 1. 일곱째 포획 → 세 번째(슈슈)와 교체
  let r=await page.evaluate(()=>{ const H=__donghyunmon; const S=H.reset(); const ph=H.catchWild('pike'); H.press('down',1); H.press('down',1); const cur=S.battle.pcur; const txt=(S.battle.text||''); H.press('x',2); const msg=S.battle&&S.battle.text; const ended=H.finish(); return {ph,cur,txt,msg,ended,party:S.party.map(m=>m.key),box:S.box.map(m=>[m.key,m.hp===m.maxhp]),n:S.party.length,mode:S.mode}; });
  assert(r.ph==='keep','여섯이 찼을 때 잡으면 고르기 화면(keep)이 나온다');
  assert(r.cur===2&&r.party[2]==='pike'&&r.n===6,'고른 자리(3번째)에 새 동현몬이 들어간다 '+JSON.stringify(r.party));
  assert(r.box.length===1&&r.box[0][0]==='shushu'&&r.box[0][1],'내보낸 슈슈가 체력 가득한 채 상자로 간다');
  assert(/슈슈.*맡기고/.test(r.msg||''),'교체 안내문이 나온다 '+JSON.stringify(r.msg));
  assert(r.ended&&r.mode==='world','전투가 정상 종료된다');
  // 2. 일곱째 포획 → Z로 새 동현몬을 상자로
  r=await page.evaluate(()=>{ const H=__donghyunmon; const S=H.reset(); const ph=H.catchWild('archer'); H.press('z',2); const msg=S.battle&&S.battle.text; const ended=H.finish(); return {ph,msg,ended,party:S.party.map(m=>m.key),box:S.box.map(m=>m.key)}; });
  assert(r.ph==='keep'&&r.ended&&r.box.join()==='archer'&&r.party.length===6&&!r.party.includes('archer'),'Z를 누르면 새 동현몬이 상자로 간다 '+JSON.stringify(r.msg));
  // 3. 상자 비어 있을 때 회복소
  r=await page.evaluate(()=>{ const H=__donghyunmon; const S=H.reset(); H.go('center',4,3,'up'); H.press('x',2); const d1=H.adv(); const items=H.items(); const txt=H.pick(1); return {d1,items,txt,mode:S.mode,dialog:!!S.dialog}; });
  assert(/회복소/.test(r.d1)&&r.items&&r.items.length===3&&/비어/.test(r.txt)&&!r.dialog,'회복소에서 빈 상자를 열면 "비어 있다"고 말한다 '+JSON.stringify([r.items,r.txt]));
  // 4. 회복소에서 상자 열어 바꾸기 (상자 7마리 → 쪽 넘김)
  r=await page.evaluate(()=>{ const H=__donghyunmon, E=Engine; const S=H.reset(); S.box=['pike','archer','copter','tank','knight','doom','lion'].map((k,i)=>E.makeMon(k,9+i)); S.party[0].hp=3;
    H.go('center',4,3,'up'); H.press('x',2); H.adv(); H.pick(1); const first=H.items();
    H.pick(first.indexOf('다음 쪽 ▶')); const second=H.items();
    const ask=H.pick(1); const partyItems=H.items(); // 라이언 Lv15 고름 → "누구를 바꿀까?" → 파티 목록
    const done=H.pick(0); const after=H.items(); // 포동이(체력 3)와 바꿈 → 안내 → 상자 목록으로
    H.cancel(); H.step(3);
    return {first,second,ask,partyItems,done,after,party:S.party.map(m=>[m.key,m.lv,m.hp]),box:S.box.map(m=>[m.key,m.hp===m.maxhp]),mode:S.mode,dialog:!!S.dialog}; });
  assert(r.first&&r.first.length===7&&r.first[5]==='다음 쪽 ▶','상자 1쪽에 5마리 + 다음 쪽 + 그만둔다 '+JSON.stringify(r.first));
  assert(r.second&&r.second.length===3&&/둠가이/.test(r.second[0])&&/라이언 Lv15/.test(r.second[1]),'2쪽에 남은 2마리 '+JSON.stringify(r.second));
  assert(/라이언과 누구를 바꿀까/.test(r.ask)&&r.partyItems&&r.partyItems.length===7,'바꿀 동현몬 고르기에 파티 6 + 그만둔다 '+JSON.stringify([r.ask,r.partyItems]));
  assert(/포동이를 상자에 맡기고/.test(r.done)&&r.party[0][0]==='lion'&&r.party[0][1]===15,'상자의 라이언 Lv15가 파티 1번째로 온다 '+JSON.stringify([r.done,r.party[0]]));
  assert(r.box.length===7&&r.box.some(x=>x[0]==='podong'&&x[1])&&!r.box.some(x=>x[0]==='lion'),'포동이가 체력 가득 찬 채 상자로 가고 라이언은 상자에서 빠진다');
  assert(r.after&&r.after.length===3&&/포동이/.test(r.after[1])&&!r.dialog&&r.mode==='world','바꾼 뒤 상자 목록(2쪽: 둠가이·포동이)으로 돌아오고 Z로 닫힌다 '+JSON.stringify(r.after));
  // 5. 연구소 박사: 선물 받은 뒤 상자 열기
  r=await page.evaluate(()=>{ const H=__donghyunmon, E=Engine; const S=H.reset(); S.box=[E.makeMon('tank',12)]; S.flags['gift:doc']=1; H.go('lab',5,4,'up'); H.press('x',2); const pages=S.dialog?S.dialog.pages.slice():[]; H.adv(); const opts=H.items(); H.pick(0); const boxItems=H.items(); H.pick(0); H.pick(1); const after=H.items(); H.cancel(); return {pages,opts,boxItems,after,party:S.party.map(m=>m.key),box:S.box.map(m=>m.key),dialog:!!S.dialog}; });
  assert(r.pages.length===2&&/회복소에서/.test(r.pages[1])&&r.opts&&r.opts[0]==='상자를 연다','박사 대사가 상자 사용법으로 바뀌고 상자 선택이 뜬다 '+JSON.stringify([r.pages,r.opts]));
  assert(r.boxItems&&r.boxItems[0].startsWith('전차')&&r.party[1]==='tank'&&r.box.join()==='lion'&&!r.dialog,'연구소에서 전차와 파티 2번째(라이언)를 바꾼다 '+JSON.stringify([r.party,r.box]));
  // 6. 박사 선물을 아직 안 받았으면 예전 흐름 그대로
  r=await page.evaluate(()=>{ const H=__donghyunmon; const S=H.reset(); const b0=S.bag.ball; H.go('lab',5,4,'up'); H.press('x',2); const t=H.adv(); H.adv(); return {got:S.bag.ball-b0,flag:!!S.flags['gift:doc'],t,dialog:!!S.dialog}; });
  assert(r.got===5&&r.flag&&!r.dialog,'첫 방문 선물(동현볼 5개) 흐름 그대로 '+JSON.stringify(r));
  // 7. 회복 선택(0번)은 그대로 회복, 아니요(2번)도 정상
  r=await page.evaluate(()=>{ const H=__donghyunmon; const S=H.reset(); S.party[0].hp=1; H.go('center',4,3,'up'); H.press('x',2); H.adv(); H.pick(0); const healed=S.party[0].hp===S.party[0].maxhp; H.press('x',2); H.adv(); const t=H.pick(2); return {healed,t,mode:S.mode,dialog:!!S.dialog}; });
  assert(r.healed&&/또 오세요/.test(r.t)&&r.mode==='world'&&!r.dialog,'회복소 회복과 "아니요"가 그대로 동작');
  // 8. 직렬화에 상자 포함
  const saved=await page.evaluate(()=>{ const H=__donghyunmon, E=Engine; const S=H.reset(); S.box=[E.makeMon('doom',20)]; const snap=JSON.parse(JSON.stringify(S,(k,v)=>k==='events'?[]:k==='rng'?undefined:v)); return {box:snap.box.map(m=>m.key),party:snap.party.length}; });
  assert(saved.box.join()==='doom'&&saved.party===6,'상태 직렬화에 상자가 포함된다');
  const frames=await page.evaluate(()=>{ const H=__donghyunmon; const f0=H.state.frame; H.step(30); return H.state.frame-f0; });
  assert(frames>0,'검사 뒤에도 게임 루프가 돈다');
  assert(errs.length===0,'페이지·콘솔 오류 없음 '+JSON.stringify(errs.slice(0,3)));
  console.log(JSON.stringify({fails:fails.length,errs:errs.length})); await b.close(); process.exit(fails.length?1:0); })();
