// 동현몬 전체 플레이 무작위 시험: node qa/fuzz-world.cjs [playwright 경로] [판 수] [틀 수]
// 걷기·문·대화·가게·전투·포획·keep·상자·패배·저장/불러오기를 섞어 오래 돌리며 예외, 멈춤(입력을 줘도 500틀 동안 상태가 안 바뀜), 상태 불변식 위반(일행 수·체력 범위·상자 체력·mode 불일치·벽 위 서기 등)을 찾는다.
const path=require('path');
const {chromium}=require(process.argv[2]||'playwright'); const N=+(process.argv[3]||20), STEPS=+(process.argv[4]||15000);
const file='file://'+path.resolve(__dirname,'..','dist','index.html');
(async()=>{
  const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push('PE '+String(e).slice(0,200))); page.on('console',m=>{ if(m.type()==='error') errors.push('CE '+m.text().slice(0,200)); });
  await page.goto(file); await page.waitForFunction(()=>window.__donghyunmon); await page.click('#run'); await page.waitForTimeout(400);
  const r=await page.evaluate(async ({N,STEPS})=>{
    const H=window.__donghyunmon, E=window.Engine, D=window.DATA; const keys=D.SPECIES.map(s=>s.key), mapKeys=Object.keys(D.MAPS);
    let seed=7; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }; const ri=n=>Math.floor(rnd()*n);
    const S=()=>H.state; const menuOpen=()=>!document.getElementById('menu').hidden;
    const fails=[], stats={battles:0,catches:0,keeps:0,boxOpens:0,warps:0,dialogs:0,restores:0,shops:0,loses:0,wins:0,trainers:0,maps:{}};
    const sig=()=>{ const s=S(); const d=s.dialog, B=s.battle; return [s.mode,s.map,s.hero.tx,s.hero.ty,s.hero.moving,s.fade,s.fadeIn,
      d?[d.i,d.n,d.wait?'w':'',d.choice?d.choice.i+':'+d.choice.items.join('/'):'',d.pages.join('|')].join('~'):'',
      B?[B.phase,B.cur&&B.cur.t,B.text,B.n,B.wait,B.q.length,B.fi,B.me,B.pcur,B.cursor,B.mcur,B.bcur,s.party.map(m=>m.hp+'/'+m.exp).join(),B.foes.map(f=>f.hp).join()].join('~'):'',
      s.approach?'ap':'',menuOpen()?document.getElementById('menu').innerText:''].join('#'); };
    const invariants=()=>{ const s=S(), out=[];
      if(s.party.length<1||s.party.length>E.PARTY) out.push('party size '+s.party.length);
      for(const m of s.party.concat(s.box)){ if(!E.species(m.key)) out.push('bad species '+m.key); if(!(m.hp>=0&&m.hp<=m.maxhp)) out.push('hp range '+m.key+' '+m.hp+'/'+m.maxhp); if(!Array.isArray(m.moves)||!m.moves.length||m.moves.length>4) out.push('moves '+m.key+' '+JSON.stringify(m.moves)); if(!(m.lv>=1&&m.lv<=E.MAXLV)) out.push('lv '+m.lv); if(!m.st) out.push('no st '+m.key); }
      const all=s.party.concat(s.box); if(new Set(all).size!==all.length) out.push('same mon twice in party/box');
      for(const m of s.box) if(m.hp!==m.maxhp) out.push('box mon not full hp '+m.key);
      const expMode=s.battle?'battle':s.dialog?'dialog':'world'; if(s.mode!==expMode) out.push('mode '+s.mode+' expected '+expMode);
      if(!(s.money>=0)) out.push('money '+s.money); for(const k in s.bag) if(!(s.bag[k]>=0)) out.push('bag '+k+' '+s.bag[k]);
      if(s.battle){ const B=s.battle; if(!s.party[B.me]) out.push('battle me index '+B.me); if(!B.foes[B.fi]) out.push('battle fi '+B.fi); if(B.phase==='keep'&&!B.keep) out.push('keep phase without mon'); }
      if(!s.battle&&!s.dialog&&!s.fade&&s.hero.moving===0){ const t=E.tile(s,s.hero.tx,s.hero.ty); if(D.SOLID[t]) out.push('hero on solid tile '+t+' @'+s.map+' '+s.hero.tx+','+s.hero.ty); }
      return out; };
    const press=(k)=>{ H.keyDown(k); if(!menuOpen()) H.step(1); H.keyUp(k); };
    const KEYS=['x','x','x','z','up','down','left','right','enter','s','a'];
    for(let run=0;run<N;run++){
      const startMap=1+ri(3), cfg={startMap,pers:1+ri(3),rate:[0.5,1,2,3][ri(4)],money:ri(5000),seed:100+run};
      try{
        H.start(cfg); H.step(3); const s=S();
        // 일행·상자·가방을 무작위로: 여섯이 찬 경우를 자주 만들어 keep 화면을 유도
        const n=rnd()<0.5?6:1+ri(6), weak=rnd()<0.3; s.party.length=0; for(let j=0;j<n;j++){ const m=E.makeMon(keys[ri(keys.length)],weak?1+ri(5):2+ri(30)); if(rnd()<0.2) m.hp=Math.max(0,Math.floor(m.hp*rnd())); s.party.push(m); } if(!s.party.some(m=>m.hp>0)) s.party[0].hp=s.party[0].maxhp;
        s.box=Array.from({length:ri(12)},()=>E.makeMon(keys[ri(keys.length)],2+ri(40)));
        s.bag={ball:ri(40),potion:ri(5),superpotion:ri(3)}; if(rnd()<0.5) s.flags['gift:doc']=1;
        let last=sig(), same=0, hold=null, holdLeft=0, lastMode='world', lastBattle=null, lastMap=s.map;
        for(let st=0;st<STEPS;st++){
          const cur=S(); if(cur.status!=='play'){ if(cur.status==='win') stats.wins++; break; }
          stats.maps[cur.map]=1;
          if(cur.battle!==lastBattle){ if(!cur.battle&&cur.fade&&cur.after) stats.loses++; if(cur.battle){ stats.battles++; if(cur.battle.kind==='trainer') stats.trainers++; } lastBattle=cur.battle; }
          if(cur.battle&&cur.battle.phase==='keep'&&!cur.battle._k){ cur.battle._k=1; stats.keeps++; }
          if(cur.dialog&&cur.dialog.opt&&cur.dialog.opt.box&&!cur.dialog._b){ cur.dialog._b=1; stats.boxOpens++; }
          if(cur.dialog&&cur.dialog.opt&&cur.dialog.opt.shop&&!cur.dialog._s){ cur.dialog._s=1; stats.shops++; }
          if(cur.dialog&&!cur.dialog._d){ cur.dialog._d=1; stats.dialogs++; }
          if(cur.map!==lastMap){ stats.warps++; lastMap=cur.map; }
          // 입력: 세계에서는 방향을 20~80틀 누르고 있기(탐험), 가끔 x/z/enter/s; 대화·전투에서는 x 위주
          if(menuOpen()){ const sel=document.querySelector('#menu .sel'); if(sel&&/포기/.test(sel.innerText)){ press('z'); } else { const k=['up','down','x','z','z','z'][ri(6)]; press(k); } }
          else if(cur.mode==='world'&&!cur.fade){
            if(holdLeft<=0){ if(rnd()<0.75){ hold=['up','down','left','right'][ri(4)]; holdLeft=20+ri(60); } else { hold=null; holdLeft=1+ri(6); } }
            holdLeft--;
            if(hold){ H.keyDown(hold); H.step(1); if(holdLeft<=0) H.keyUp(hold); if(rnd()<0.03) press('x'); }
            else { const r=rnd(); press(r<0.6?'x':r<0.8?'z':r<0.9?'enter':r<0.97?'s':'a'); }
            // 가끔 다른 지도로 순간 이동 (모든 지도 덮기)
            if(rnd()<0.006){ const mk=mapKeys[ri(mapKeys.length)], g=D.MAPS[mk].grid; let tries=0; while(tries++<200){ const x=ri(g[0].length), y=ri(g.length); if(!D.SOLID[g[y][x]]&&!(D.MAPS[mk].warps||[]).some(w=>w.x===x&&w.y===y)){ const h=cur.hero; cur.map=mk; h.tx=x; h.ty=y; h.x=x*16; h.y=y*16; h.moving=0; cur.petHidden=true; break; } } }
            // 가끔 야생 전투를 직접 건다(포획·keep 흐름을 많이 보려고). 상대 체력을 낮춰 둔다
            if(rnd()<0.004&&S().mode==='world'&&!S().dialog&&!S().fade&&cur.hero.moving===0&&cur.party.some(m=>m.hp>0)){ const f=E.makeMon(keys[ri(keys.length)],2+ri(30)); if(rnd()<0.7) f.hp=Math.max(1,Math.floor(f.hp*rnd()*0.3)); E.startBattle(cur,{kind:'wild',foes:[f]}); }
            // 가끔 저장→불러오기 왕복
            if(rnd()<0.002&&S().mode==='world'&&!S().dialog&&!S().battle&&cur.hero.moving===0&&!cur.pendingSay&&!cur.fade){ try{ const snap=JSON.parse(JSON.stringify(H.snapshot())); H.restore(snap); stats.restores++; }catch(e){ fails.push({run,st,why:'restore',msg:String(e&&e.message||e)}); } }
          }
          else { const B=cur.battle; const r=rnd();
            if(B&&B.phase==='menu'&&rnd()<0.5){ if(B.cursor!==1){ press(B.cursor===0?'right':B.cursor===3?'left':'up'); } else press('x'); }
            else if(r<0.55) press('x'); else if(r<0.7) press('z'); else if(r<0.9) press(['up','down','left','right'][ri(4)]); else H.step(1); }
          if(cur!==S()) { last=sig(); same=0; lastBattle=S().battle; continue; } // 불러오기로 상태 객체가 바뀜
          const inv=invariants(); if(inv.length){ fails.push({run,st,why:'invariant',inv,mode:cur.mode,phase:cur.battle&&cur.battle.phase}); break; }
          const sg=sig(); if(sg===last){ same++; if(same>500){ fails.push({run,st,why:'stall',mode:cur.mode,map:cur.map,hero:[cur.hero.tx,cur.hero.ty,cur.hero.dir],sig:sg.slice(0,300),menu:menuOpen()}); break; } } else { same=0; last=sg; }
        }
        const fin=S(); if(fin.status==='play'){ stats.catches+=Object.keys(fin.dex.caught).length-1; }
      }catch(e){ fails.push({run,why:'exception',msg:String(e&&e.stack||e).slice(0,400),mode:S()&&S().mode,phase:S()&&S().battle&&S().battle.phase}); }
      await new Promise(r=>setTimeout(r,0));
    }
    return {fails,stats};
  },{N,STEPS});
  console.log(JSON.stringify(r.stats)); console.log('fails',r.fails.length); for(const f of r.fails.slice(0,12)) console.log(JSON.stringify(f));
  console.log('page/console errors',errors.length); for(const e of [...new Set(errors)].slice(0,8)) console.log(e);
  await browser.close();
})();
