// 동현몬 전투 무작위 시험: node qa/fuzz-battle.cjs [playwright 경로] [판 수]
// 야생·트레이너 전투를 무작위 입력으로 많이 돌려 예외(먹통)와 멈춤(상태가 오래 안 바뀜)을 찾는다. 매 걸음 그리기(Render.draw)도 같이 돌려 그리기 예외를 센다.
const path=require('path');
const {chromium}=require(process.argv[2]||'playwright'); const N=+(process.argv[3]||300);
const file='file://'+path.resolve(__dirname,'..','dist','index.html');
(async()=>{
  const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(file); await page.waitForFunction(()=>window.__donghyunmon);
  const r=await page.evaluate((N)=>{
    const H=window.__donghyunmon, E=window.Engine, D=window.DATA; const keys=D.SPECIES.map(s=>s.key);
    let seed=1; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    const press=(k)=>{ H.keyDown(k); H.step(1); H.keyUp(k); };
    const cv=document.createElement('canvas'); cv.width=window.Render.W; cv.height=window.Render.H; const g=cv.getContext('2d'); let renderErr=0, renderMsg='';
    const sig=S=>{ const B=S.battle; if(!B) return 'none'; return [B.phase,B.cur&&B.cur.t,B.text,B.n,B.wait,B.q.length,B.fi,B.me,S.party.map(m=>m.hp+'/'+m.exp).join(),B.foes.map(f=>f.hp).join()].join('|'); };
    const fails=[]; let battles=0, results={};
    for(let i=0;i<N;i++){
      const kind=rnd()<0.35?'trainer':'wild';
      try{
        H.start({startMap:2,pers:1+Math.floor(rnd()*3),rate:0,money:1000,seed:1+i});
        const S=H.state;
        // 내 일행: 1~3마리, 레벨 2~40, 가방 무작위
        const n=1+Math.floor(rnd()*3); S.party.length=0;
        if(rnd()<0.3){ S.party.push(E.makeMon(keys[Math.floor(rnd()*keys.length)],40), E.makeMon(keys[Math.floor(rnd()*keys.length)],2)); } // 기술 4개 → 1개짜리로 교체하는 경우를 많이 만든다 for(let j=0;j<n;j++){ const m=E.makeMon(keys[Math.floor(rnd()*keys.length)],2+Math.floor(rnd()*39)); if(rnd()<0.3) m.hp=Math.max(1,Math.floor(m.hp*rnd())); S.party.push(m); }
        if(rnd()<0.2) S.party.push(...Array.from({length:3},()=>E.makeMon(keys[Math.floor(rnd()*keys.length)],5)));
        S.bag={ball:Math.floor(rnd()*6),potion:Math.floor(rnd()*3),superpotion:Math.floor(rnd()*2)};
        let o;
        if(kind==='wild') o={kind:'wild',foes:[E.makeMon(keys[Math.floor(rnd()*keys.length)],2+Math.floor(rnd()*39))]};
        else { const tr=S.npcs.find(x=>x.trainer)||{trainer:{name:'시험',reward:100,party:[]},after:['끝']}; const fo=Array.from({length:1+Math.floor(rnd()*3)},()=>E.makeMon(keys[Math.floor(rnd()*keys.length)],2+Math.floor(rnd()*39))); o={kind:'trainer',npc:Object.assign({},tr,{trainer:Object.assign({},tr.trainer,{boss:false})}),foes:fo}; }
        E.startBattle(S,o); battles++;
        let last=sig(S), same=0, steps=0, lastPhase='';
        while(S.battle&&steps<20000){
          const B=S.battle;
          if(B.phase==='q'){ if(rnd()<0.5) press(rnd()<0.5?'x':'z'); else H.step(1); }
          else { const r=rnd(); if(r<0.5) press('x'); else if(r<0.65) press('z'); else press(['up','down','left','right'][Math.floor(rnd()*4)]); }
          steps++;
          try{ window.Render.draw(g,S); }catch(e){ renderErr++; if(!renderMsg) renderMsg=String(e&&e.stack||e).slice(0,300); }
          const s=sig(S); if(s===last){ same++; if(same>600){ fails.push({i,kind,why:'stall',steps,sig:s,q:JSON.stringify(B.q.map(x=>x.t)),cur:JSON.stringify(B.cur),forced:B.forced,party:S.party.map(m=>[m.key,m.hp,m.lv])}); break; } } else { same=0; last=s; }
        }
        if(S.battle&&steps>=20000) fails.push({i,kind,why:'long',sig:sig(S)});
        if(!S.battle){ const k=S.status+':'+(S.mode); results[k]=(results[k]||0)+1; }
      }catch(e){ fails.push({i,kind,why:'throw',msg:String(e&&e.stack||e).slice(0,400),sig:H.state&&sig(H.state)}); }
    }
    return {battles,results,fails,renderErr,renderMsg};
  },N);
  console.log(JSON.stringify({battles:r.battles,results:r.results,fails:r.fails.length,renderErr:r.renderErr,renderMsg:r.renderMsg,errors:errors.slice(0,3)}));
  for(const f of r.fails.slice(0,8)) console.log(JSON.stringify(f));
  await browser.close();
})();
