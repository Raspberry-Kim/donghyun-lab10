/* 동현몬 세계 검사(v0.18): 지도 자료 정합성 + 엔진만으로 하는 완주 봇.
   node qa/world-tests.cjs            → 자료 검사 + 시드 1·2·3 완주
   node qa/world-tests.cjs --seeds 8  → 시드 1~8 완주
   화면·브라우저 없이 src/*.js를 그대로 읽어 Engine.step을 돌린다. */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const SRC=path.join(__dirname,'..','src');
const ctx={ window:null, console }; ctx.window=ctx; vm.createContext(ctx);
for(const f of ['sprites.js','world.js','data.js','engine.js']) vm.runInContext(fs.readFileSync(path.join(SRC,f),'utf8'),ctx,{filename:f});
const D=ctx.DATA, E=ctx.Engine, SP=ctx.Sprites;
const {MAPS,NPCS,SOLID,SPECIES,MOVES,ITEMS,START}=D;
const errs=[], warns=[];
const err=m=>errs.push(m);
const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};

/* ---------- 1. 자료 검사 ---------- */
let tiles=0, outdoor=0, indoor=0;
for(const [k,m] of Object.entries(MAPS)){
  const g=m.grid, W=g[0].length, H=g.length; tiles+=W*H; if(m.kind==='out') outdoor+=W*H; else indoor+=W*H;
  if(g.some(r=>r.length!==W)) err(`${k}: 줄 길이가 다르다`);
  for(const r of g) for(const ch of r) if(!SP.has('t_'+ch)&&ch!=='.') err(`${k}: 모르는 지도 글자 '${ch}'`);
  const walk=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&!SOLID[g[y][x]];
  const npcs=NPCS.filter(n=>n.map===k);
  /* 모든 출입구에서 모든 출입구로 닿는가 (사람은 비켜 준다고 본다) */
  const bfs=(sx,sy)=>{ const seen=new Set([sx+','+sy]), q=[[sx,sy]]; while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of Object.values(DIRS)){ const X=x+dx,Y=y+dy,key=X+','+Y; if(seen.has(key)||!walk(X,Y)) continue; seen.add(key); q.push([X,Y]); } } return seen; };
  const ws=m.warps||[]; if(!ws.length) err(`${k}: 출입구가 없다`);
  const seen=ws.length?bfs(ws[0].x,ws[0].y):new Set();
  for(const w of ws){
    if(!walk(w.x,w.y)) err(`${k}: 출입구 (${w.x},${w.y}) 가 막혀 있다`);
    if(!seen.has(w.x+','+w.y)) err(`${k}: 출입구 (${w.x},${w.y}) 가 첫 출입구와 이어지지 않는다`);
    if(w.to!=='back'){ const t=MAPS[w.to.map]; if(!t) err(`${k}: 출입구 (${w.x},${w.y}) 의 목적지 지도 ${w.to.map} 가 없다`); else { const tg=t.grid; if(!(w.to.y>=0&&w.to.y<tg.length&&w.to.x>=0&&w.to.x<tg[0].length)||SOLID[tg[w.to.y][w.to.x]]) err(`${k}: 출입구 (${w.x},${w.y}) → ${w.to.map} (${w.to.x},${w.to.y}) 가 막힌 칸이다`); if(!DIRS[w.to.dir]) err(`${k}: 출입구 방향 ${w.to.dir}`);
      if(NPCS.some(n=>n.map===w.to.map&&n.x===w.to.x&&n.y===w.to.y&&!n.gate)) err(`${k}: 출입구 목적지 ${w.to.map} (${w.to.x},${w.to.y}) 에 사람이 서 있다`);
      /* 도착 칸이 그 지도의 출입구 위면 바로 되돌아간다 */
      if(t.kind==='out'&&(t.warps||[]).some(v=>v.x===w.to.x&&v.y===w.to.y)) err(`${k}: 출입구 (${w.x},${w.y}) 의 도착 칸이 ${w.to.map} 의 출입구 위다`); } }
  }
  for(const s of m.signs||[]){ if(g[s.y][s.x]!=='s') err(`${k}: 표지판 (${s.x},${s.y}) 칸이 's'가 아니다`); if(!Object.values(DIRS).some(([dx,dy])=>seen.has((s.x+dx)+','+(s.y+dy)))) err(`${k}: 표지판 (${s.x},${s.y}) 앞에 설 수 없다`); if(!s.text||!s.text.length) err(`${k}: 표지판 글이 없다`); }
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(g[y][x]==='s'&&!(m.signs||[]).some(s=>s.x===x&&s.y===y)) err(`${k}: (${x},${y}) 's' 칸에 표지판 글이 없다`);
  for(const it of m.items||[]){ if(!walk(it.x,it.y)) err(`${k}: 물건 (${it.x},${it.y}) 이 막힌 칸`); if(!seen.has(it.x+','+it.y)) err(`${k}: 물건 (${it.x},${it.y}) 에 닿을 수 없다`); if(!ITEMS[it.item]) err(`${k}: 모르는 물건 ${it.item}`); if(ws.some(w=>w.x===it.x&&w.y===it.y)) err(`${k}: 물건이 출입구 위`); }
  for(const n of npcs){ if(!walk(n.x,n.y)) err(`${k}: ${n.id} 가 막힌 칸 (${n.x},${n.y})`); if(!Object.values(DIRS).some(([dx,dy])=>seen.has((n.x+dx)+','+(n.y+dy)))) err(`${k}: ${n.id} 옆에 설 수 없다`); if(ws.some(w=>w.x===n.x&&w.y===n.y)) err(`${k}: ${n.id} 가 출입구 위`); if(!SP.has(n.spr+'_down')) err(`${k}: ${n.id} 그림 ${n.spr} 없음`);
    if(n.trainer){ for(const [sp,lv] of n.trainer.party){ if(!D.species(sp)) err(`${n.id}: 모르는 동현몬 ${sp}`); if(!(lv>=1&&lv<=E.MAXLV)) err(`${n.id}: 레벨 ${lv}`); } if(!n.after||!n.after.length) err(`${n.id}: 이긴 뒤 대사가 없다`); if(!n.trainer.reward) err(`${n.id}: 상금 없음`);
      /* 시야: 보는 방향으로 sight칸 안에 걷는 칸이 하나라도 있어야 */
      if(n.sight){ const [dx,dy]=DIRS[n.dir]; if(!walk(n.x+dx,n.y+dy)) warns.push(`${k}: ${n.id} 바로 앞이 막혀 있어 시야가 없다`); } }
    if(n.gate){ const a=n.gate.aside; if(!walk(a.x,a.y)) err(`${n.id}: 비켜설 자리 (${a.x},${a.y}) 가 막힘`); if(NPCS.some(o=>o!==n&&o.map===k&&o.x===a.x&&o.y===a.y)) err(`${n.id}: 비켜설 자리에 다른 사람`); }
    if(n.ask){ if(n.ask.items.length!==n.ask.ans.length) err(`${n.id}: 물음 답 수가 다르다`); }
    const dup=npcs.filter(o=>o.x===n.x&&o.y===n.y); if(dup.length>1) err(`${k}: (${n.x},${n.y}) 에 사람이 겹친다`);
  }
  for(const z of m.wild||[]) for(const [sp] of z.table) if(!D.species(sp)) err(`${k}: 야생표에 모르는 동현몬 ${sp}`);
  if(m.wild&&!g.some(r=>r.includes('t'))) err(`${k}: 야생표는 있는데 긴 풀이 없다`);
  if(!m.wild&&m.kind==='out'&&g.some(r=>r.includes('t'))) err(`${k}: 긴 풀은 있는데 야생표가 없다`);
}
const ids=NPCS.map(n=>n.id); if(new Set(ids).size!==ids.length) err('사람 id 중복: '+ids.filter((v,i)=>ids.indexOf(v)!==i).join(','));
for(const sp of SPECIES){ for(const [,mv] of sp.learn) if(!MOVES[mv]) err(`${sp.key}: 모르는 기술 ${mv}`); if(!SP.has('m_'+sp.key)) err(`${sp.key}: 그림 없음`); if(!sp.desc||!sp.from) err(`${sp.key}: 설명 없음`); }
for(let i=1;i<START.length;i++){ const s=START[i]; if(!MAPS[s.map]) err(`START ${i}: 지도 없음`); else if(SOLID[MAPS[s.map].grid[s.y][s.x]]) err(`START ${i}: 막힌 칸`); }
/* 세계 전체 이어짐: 지도 그래프 */
{ const adj={}; for(const [k,m] of Object.entries(MAPS)) adj[k]=(m.warps||[]).map(w=>w.to==='back'?null:w.to.map).filter(Boolean); const seen=new Set(['town1']), q=['town1']; while(q.length){ const k=q.shift(); for(const t of adj[k]) if(!seen.has(t)){ seen.add(t); q.push(t); } } for(const k of Object.keys(MAPS)) if(!seen.has(k)&&k!=='center') err(`지도 ${k} 는 하얀마을에서 닿을 수 없다`); }
console.log(`자료 검사: 지도 ${Object.keys(MAPS).length}장 · ${tiles}칸(바깥 ${outdoor} · 안 ${indoor}) · 사람 ${NPCS.length}명 · 동현몬 ${SPECIES.length}종 · 오류 ${errs.length}`);
for(const e of errs) console.log('  ✗ '+e); for(const w of warns) console.log('  ! '+w);

/* ---------- 2. 완주 봇 ---------- */
/* 상성 점수: 내 최고 기술의 기대 위력 × 공격력 ÷ 상대가 나에게 주는 배율 */
function matchScore(m,f){ const ft=D.species(f.key).types, mt=D.species(m.key).types;
  const best=Math.max(0,...m.moves.map(k=>{ const mv=MOVES[k]; if(!mv.pow) return 0; return mv.pow*E.effect(mv.type,ft)*(mt.includes(mv.type)?1.5:1)*(mv.acc||100)/100; }));
  const taken=ft.reduce((a,t)=>a*E.effect(t,mt),1); return best*m.atk/Math.max(0.25,taken); }
function bot(seed,opt={}){
  const S=E.newGame({startMap:1,pers:1,rate:1,money:1000,seed});
  const keys={up:false,down:false,left:false,right:false,b:true,upPressed:false,downPressed:false,leftPressed:false,rightPressed:false,aPressed:false,bPressed:false};
  const clear=()=>{ keys.up=keys.down=keys.left=keys.right=false; keys.upPressed=keys.downPressed=keys.leftPressed=keys.rightPressed=keys.aPressed=keys.bPressed=false; };
  const stat={battles:0,wild:0,trainers:0,losses:0,caught:0,frames:0,heals:0};
  const npc=id=>S.npcs.find(n=>n.id===id);
  const lead=()=>S.party.find(m=>m.hp>0)||S.party[0];
  const maxLv=()=>Math.max(...S.party.map(m=>m.lv));
  /* 길찾기: 현재 지도에서 목표 칸까지. 사람 칸은 피하되 목표는 허용 */
  function pathTo(tx,ty){ const m=MAPS[S.map], g=m.grid, W=g[0].length, H=g.length, h=S.hero; const key=(x,y)=>y*W+x; const prev=new Map([[key(h.tx,h.ty),-1]]), q=[[h.tx,h.ty]];
    const blocked=(x,y)=>x<0||y<0||x>=W||y>=H||SOLID[g[y][x]]||S.npcs.some(n=>n.map===S.map&&n.tx===x&&n.ty===y)||(m.items||[]).some(it=>it.x===x&&it.y===y&&!S.picked[S.map+':'+it.x+':'+it.y]);
    const isWarp=(x,y)=>(m.warps||[]).some(w=>w.x===x&&w.y===y);
    while(q.length){ const [x,y]=q.shift(); if(x===tx&&y===ty){ const p=[]; let k=key(x,y); while(prev.get(k)!==-1){ p.push([k%W,Math.floor(k/W)]); k=prev.get(k); } return p.reverse(); }
      for(const d of ['up','down','left','right']){ const [dx,dy]=DIRS[d], X=x+dx, Y=y+dy, k=key(X,Y); if(prev.has(k)||blocked(X,Y)) continue; if(isWarp(X,Y)&&!(X===tx&&Y===ty)) continue; /* 목표가 아닌 출입구는 밟지 않는다 */ prev.set(k,key(x,y)); q.push([X,Y]); } }
    return null; }
  /* 지도 사이 길: 출입구 그래프에서 목표 지도로 가는 첫 출입구 칸 */
  function routeToMap(target){ const edges=k=>(MAPS[k].warps||[]).map(w=>({x:w.x,y:w.y,to:w.to==='back'?(k===S.map&&S.backDoor?S.backDoor.map:null):w.to.map})).filter(e=>e.to);
    const prev=new Map([[S.map,null]]), q=[S.map]; while(q.length){ const k=q.shift(); if(k===target) break; for(const e of edges(k)) if(!prev.has(e.to)){ prev.set(e.to,{from:k,e}); q.push(e.to); } }
    if(!prev.has(target)) return null; let k=target; while(prev.get(k).from!==S.map) k=prev.get(k).from; return prev.get(k).e; }
  function toMap(target){ const e=routeToMap(target); if(!e){ fail(`${S.map} 에서 ${target} 로 가는 길이 없다`); return; } const h=S.hero; if(h.tx===e.x&&h.ty===e.y){ /* 출입구 위에 서 있다: 한 칸 비켰다가 다시 밟는다 */ const g=MAPS[S.map].grid; for(const d of ['up','down','left','right']){ const [dx,dy]=DIRS[d], X=h.tx+dx, Y=h.ty+dy; if(g[Y]&&g[Y][X]&&!SOLID[g[Y][X]]&&!(MAPS[S.map].warps||[]).some(w=>w.x===X&&w.y===Y)&&!S.npcs.some(n=>n.map===S.map&&n.tx===X&&n.ty===Y)){ keys[d]=true; return; } } } step(e.x,e.y); }
  function adjacentOf(n){ const m=MAPS[S.map]; const c=[]; for(const d of ['up','down','left','right']){ const [dx,dy]=DIRS[d]; const x=n.tx+dx, y=n.ty+dy; if(x<0||y<0||y>=m.grid.length||x>=m.grid[0].length) continue; if(m.grid[y][x]==='k'){ const x2=x+dx,y2=y+dy; if(!SOLID[m.grid[y2]?.[x2]||'T']) c.push([x2,y2,{up:'down',down:'up',left:'right',right:'left'}[d]]); continue; } if(!SOLID[m.grid[y][x]]) c.push([x,y,{up:'down',down:'up',left:'right',right:'left'}[d]]); } return c; }
  /* 전투 정책 */
  function battle(){ const B=S.battle, me=S.party[B.me], f=B.foes[B.fi];
    if(B.phase==='q'){ keys.aPressed=true; return; }
    if(B.phase==='menu'){ const low=me.hp<me.maxhp*0.3, potion=D.ITEM_ORDER.find(k=>ITEMS[k].heal&&S.bag[k]>0);
      const wantCatch=B.kind==='wild'&&S.bag.ball>0&&!S.dex.caught[f.key]&&f.hp<=f.maxhp*0.5;
      if(wantCatch){ B.cursor=1; B.bcur=E.bagListIndex?0:D.ITEM_ORDER.filter(k=>S.bag[k]>0).indexOf('ball'); B.phase='bag'; keys.aPressed=true; return; }
      if(low&&potion){ B.phase='bag'; B.bcur=D.ITEM_ORDER.filter(k=>S.bag[k]>0).indexOf(potion); keys.aPressed=true; return; }
      /* 트레이너전: 상성이 더 좋은 동료가 있으면 바꾼다 */
      if(B.kind==='trainer'){ let bi=B.me, bs=matchScore(me,f)*1.4; S.party.forEach((m,j)=>{ if(j===B.me||m.hp<=0||m.hp<m.maxhp*0.4) return; const sc=matchScore(m,f); if(sc>bs){ bs=sc; bi=j; } }); if(bi!==B.me){ B.phase='party'; B.forced=false; B.pcur=bi; B.swaps=(B.swaps||0)+1; keys.aPressed=true; return; } }
      B.cursor=0; keys.aPressed=true; return; }
    if(B.phase==='moves'){ const mv=me.moves; let best=0, bs=-1; mv.forEach((k,i)=>{ const m=MOVES[k]; if(!m.pow) return; const sc=m.pow*E.effect(m.type,D.species(f.key).types)*(D.species(me.key).types.includes(m.type)?1.5:1)*(m.acc||100)/100; if(sc>bs){ bs=sc; best=i; } }); if(bs<0){ const i=mv.findIndex(k=>MOVES[k].stat&&MOVES[k].target==='self'); best=i>=0?i:0; } B.mcur=best; keys.aPressed=true; return; }
    if(B.phase==='bag'){ keys.aPressed=true; return; }
    if(B.phase==='party'){ if(B.forced){ let bi=S.party.findIndex(m=>m.hp>0), bs=-1; S.party.forEach((m,j)=>{ if(m.hp<=0) return; const sc=matchScore(m,f)*m.hp; if(sc>bs){ bs=sc; bi=j; } }); B.pcur=bi; } keys.aPressed=true; return; }
    if(B.phase==='keep'){ keys.bPressed=true; return; }
    keys.aPressed=true; }
  /* 한 틀 */
  let lastResult=null, curKind=null, curName="", trace=[];
  function tick(){ clear(); keys.b=true;
    if(S.battle){ battle(); }
    else if(S.dialog){ const d=S.dialog; if(d.choice){ const want=choiceWant(d.choice.items); if(want<0){ keys.bPressed=true; } else if(d.choice.i!==want){ d.choice.i=want; keys.aPressed=true; } else keys.aPressed=true; } else if(!d.wait) keys.aPressed=true; }
    else if(S.status==='play') world();
    E.step(S,keys); stat.frames++;
    for(const ev of S.events.splice(0)){ if(ev.t==='encounter'){ stat.battles++; if(S.battle.kind==='wild') stat.wild++; else stat.trainers++; } if(ev.t==='battleEnd'){ lastResult=ev.result; if(ev.result==='lose') stat.losses++; if(curKind==='trainer') trace.push(`${curName}:${ev.result==='win'?'승':'패'}@${S.party.map(m=>m.lv).join('/')}${ev.result==='lose'?'['+S.party.map(m=>m.key).join(',')+' 가방 '+JSON.stringify(S.bag)+' 교체 '+(S.battle&&S.battle.swaps||0)+']':''}`); } if(ev.t==='encounter'){ curKind=S.battle.kind; curName=S.battle.npc?S.battle.npc.trainer.name:''; } if(ev.t==='caught') stat.caught++; if(ev.t==='buy') stat.buys=(stat.buys||0)+1; if(ev.t==='heal'&&!S.battle) stat.heals++; } }
  let choiceCtx=null; /* 'heal' | 'shop' | 'box' */
  function choiceWant(items){ if(items[0]==='네, 부탁해요') return 0; if(items.some(s=>/원$/.test(s))){ /* 가게: 상처약을 넉넉히 */ stat.shopMenus=(stat.shopMenus||0)+1; const want=shopWant(items); return want; } if(items.includes('그만둔다')&&items.length<=3&&items[0].includes('상자')) return -1; return items.length-1; }
  function shopWant(items){ const need=k=>({potion:6,superpotion:4,hyperpotion:3,ball:5})[k]-(S.bag[k]||0); for(const k of ['hyperpotion','superpotion','potion','ball']){ const i=items.findIndex(s=>s.startsWith(ITEMS[k].name+' ')); if(i>=0&&need(k)>0&&S.money>=ITEMS[k].price+300) return i; } return items.length-1; }
  /* 세계 과업 */
  const plan=[]; let cur=null, path=null, stuck=0;
  const goto=(map,x,y)=>({t:'goto',map,x,y});
  const talk=(id)=>({t:'talk',id});
  const grind=(map,lv,tiles)=>({t:'grind',map,lv,tiles});
  const heal=(centerDoor)=>({t:'heal',door:centerDoor});
  const face=(dir)=>({t:'face',dir});
  function world(){ const h=S.hero; if(h.moving>0) return; if(!cur){ cur=plan.shift(); path=null; stuck=0; if(!cur){ return; } }
    if(cur.t==='goto'){ if(S.map!==cur.map){ toMap(cur.map); return; } if(h.tx===cur.x&&h.ty===cur.y){ cur=null; return; } step(cur.x,cur.y); return; }
    if(cur.t==='face'){ h.dir=cur.dir; keys.aPressed=true; cur=null; return; }
    if(cur.t==='talk'){ const n=npc(cur.id); if(!n||!n.map||(n.trainer&&n.beaten)||(n.gate&&n.gateOpen)){ cur=null; return; } if(n.map!==S.map){ toMap(n.map); return; } const adj=adjacentOf(n); let best=null; for(const [x,y,dir] of adj){ if(h.tx===x&&h.ty===y){ h.dir=dir; keys.aPressed=true; lastResult=null; cur={t:'wait',n:8,then:cur,tries:(cur.tries||0)+1}; return; } } for(const [x,y] of adj){ const p=pathTo(x,y); if(p&&(!best||p.length<best.length)) best=p; } if(!best){ stuck++; if(stuck>50){ fail(`${cur.id} 에게 갈 수 없다 (${S.map} ${h.tx},${h.ty})`); } return; } if(!best.length) return; move(best[0]); return; }
    if(cur.t==='wait'){ cur.n--; if(cur.n<=0){ const t=cur.then; cur=null; if(t&&t.t==='talk'){ const n=npc(t.id);
          if(n&&n.trainer&&!n.beaten&&n.map){ /* 졌다: 근처에서 두 레벨 올리고 다시 간다 */ if(t.tries>12){ fail(`${t.id} 를 ${t.tries}번 시도해도 못 이긴다`); return; } plan.unshift(t); const gr=REGION[n.map]; if(gr){ plan.unshift(...gr.heal()); plan.unshift(grindAt(gr.map,Math.min(50,maxLv()+2),gr.tiles,gr.heal)); } }
          else if(n&&n.gate&&!n.gateOpen){ if(t.tries>3){ fail(`${t.id} 문지기가 열리지 않는다 (배지 ${S.badge})`); return; } plan.unshift(t); } } } return; }
    if(cur.t==='grind'){ if(maxLv()>=cur.lv){ cur=null; return; } if(S.map!==cur.map){ toMap(cur.map); return; } const lo=lead(); if(S.party.every(m=>m.hp<=0||m.hp<m.maxhp*0.35)){ /* 회복하러 간다 */ const c=cur; plan.unshift(c); plan.unshift(...c.heal()); cur=null; return; } const tgt=cur.tiles[Math.floor(S.rng()*cur.tiles.length)]; if(h.tx===tgt[0]&&h.ty===tgt[1]){ const t2=cur.tiles.find(t=>t[0]!==tgt[0]||t[1]!==tgt[1]); step(t2[0],t2[1]); } else step(tgt[0],tgt[1]); return; }
  }
  function step(x,y){ const h=S.hero; const p=pathTo(x,y); if(!p){ stuck++; if(stuck>50) fail(`(${x},${y}) 로 갈 수 없다 (${S.map} ${h.tx},${h.ty})`); return; } if(!p.length) return; move(p[0]); }
  function move([x,y]){ const h=S.hero; const d=x>h.tx?'right':x<h.tx?'left':y>h.ty?'down':'up'; keys[d]=true; }
  let failed=null; function fail(m){ failed=m; }

  /* ---- 여정 ---- */
  const T1C=[goto('town1',18,4),goto('town1',18,3),talk('nurse1'),goto('center',5,6)]; /* 하얀마을 회복소 */
  const centerVisit=(town,doorX,doorY)=>[goto(town,doorX,doorY+1),goto(town,doorX,doorY),talk('nurse1'),goto('center',9,3),talk('clerk1'),goto('center',5,6)];
  const R1T=[[4,22],[6,24],[14,26],[16,20]];
  const grindAt=(map,lv,tiles,healSteps)=>Object.assign(grind(map,lv,tiles),{heal:()=>healSteps()});
  /* 지역별 수련 터: 트레이너에게 진 뒤 레벨을 올리러 가는 곳 */
  const REGION={};
  const reg=(maps,map,tiles,heal)=>{ for(const k of maps) REGION[k]={map,tiles,heal}; };
  reg(['town1','route1','lab','home'],'route1',[[7,12],[9,14],[13,12]],()=>[goto('route1',9,1),...centerVisit('town2',17,3),goto('town2',10,17)]);
  reg(['town2','gym','houseA','houseB'],'route1',[[7,12],[9,14],[13,12]],()=>[goto('route1',9,1),...centerVisit('town2',17,3),goto('town2',10,17)]);
  reg(['route2','town3','gym2','house3a','house3b'],'route2',[[53,16],[54,15],[55,17],[52,16]],()=>[goto('route2',63,8),...centerVisit('town3',20,3),goto('town3',0,8)]);
  reg(['route3','town4','gym3','house4a','house4b'],'route3',[[18,24],[19,23],[17,25],[19,25]],()=>[goto('route3',11,0),...centerVisit('town4',24,6),goto('town4',11,21)]);
  reg(['route4','station1','station2','route5'],'route4',[[28,10],[29,11],[27,9],[30,10]],()=>[goto('route4',0,10),...centerVisit('town4',24,6),goto('town4',29,10)]);
  plan.push(goto('town1',13,10),goto('town1',13,9),talk('doc'),goto('lab',5,6));
  plan.push(goto('town1',10,1),goto('town1',10,0));
  plan.push(grindAt('route1',8,R1T,()=>[goto('route1',9,31),...centerVisit('town1',18,3),goto('town1',10,0)]));
  plan.push(talk('t1'),talk('t2'),grindAt('route1',14,[[7,12],[9,14],[13,12]],()=>[goto('route1',9,1),...centerVisit('town2',17,3),goto('town2',10,17)]));
  plan.push(goto('route1',9,1),...centerVisit('town2',17,3));
  plan.push(goto('town2',6,5),goto('town2',6,4),talk('guide'),talk('g1'),talk('g2'),talk('leader'),goto('gym',5,14));
  plan.push(...centerVisit('town2',17,3),goto('town2',23,7));
  plan.push(talk('h1'),talk('h2'),talk('h3'),grindAt('route2',17,[[30,8],[31,9],[29,10],[33,7]],()=>[goto('route2',0,9),...centerVisit('town2',17,3),goto('town2',23,7)]),talk('h4'),goto('route2',63,8));
  plan.push(...centerVisit('town3',20,3),goto('town3',6,6),goto('town3',6,5),talk('guide2'),talk('g3'),talk('g4'),talk('leader2'),goto('gym2',6,16));
  plan.push(...centerVisit('town3',20,3),goto('town3',14,0));
  plan.push(talk('f1'),talk('f2'),grindAt('route3',21,[[18,24],[19,23],[17,25],[19,25]],()=>[goto('route3',11,0),...centerVisit('town4',24,6),goto('town4',11,21)]),talk('f3'),talk('f4'),goto('route3',11,0));
  plan.push(...centerVisit('town4',24,6),goto('town4',6,7),goto('town4',6,6),talk('guide3'),talk('g5'),talk('g6'),talk('leader3'),goto('gym3',6,16));
  plan.push(...centerVisit('town4',24,6),goto('town4',29,10));
  plan.push(talk('m1'),talk('m2'),grindAt('route4',27,[[28,10],[29,11],[27,9],[30,10]],()=>[goto('route4',0,10),...centerVisit('town4',24,6),goto('town4',29,10)]),talk('m3'),talk('m4'),goto('route4',49,9),goto('route4',49,8));
  plan.push(talk('s1'),talk('s2'),talk('s3'),talk('s4'),goto('station1',29,2));
  plan.push(talk('s5'),talk('s6'),talk('boss'));
  const LIMIT=opt.limit||600000;
  while(S.status==='play'&&stat.frames<LIMIT&&!failed){ tick(); if(!cur&&!plan.length&&!S.dialog&&!S.battle) break; }
  const done=S.status==='win';
  return {seed,done,failed,frames:stat.frames,minutes:(stat.frames/60/60).toFixed(1),...stat,badge:S.badge,money:S.money,party:S.party.map(m=>`${E.name(m)}${m.lv}`).join(' '),box:S.box.length,map:S.map,pos:[S.hero.tx,S.hero.ty],buys:stat.buys,shopMenus:stat.shopMenus,remaining:plan.length,cur:cur&&(cur.t+(cur.id||cur.map||'')),log:S.log,trace};
}
const si=process.argv.indexOf('--seeds'); const N=si>0?+process.argv[si+1]:3;
let botFail=0;
const only=(process.argv.find(a=>a.startsWith('--seed='))||'').slice(7); let r; for(let seed=only?+only:1;seed<=(only?+only:N);seed++){ r=bot(seed); if(!r.done) botFail++; console.log(`봇 시드 ${seed}: ${r.done?'완주':'실패'}${r.failed?' — '+r.failed:''} · ${r.minutes}분(60fps) · 전투 ${r.battles}(야생 ${r.wild} · 트레이너 ${r.trainers}) · 패배 ${r.losses} · 포획 ${r.caught} · 구매 ${r.buys||0}/${r.shopMenus||0} · 배지 ${r.badge} · ${r.money}원 · ${r.party} · 상자 ${r.box}${r.done?'':` · ${r.map} (${r.pos}) 남은 과업 ${r.remaining} 현재 ${r.cur}`}`); }
if(process.argv.includes('--log')) console.log(r.log.join(' | ')+'\n'+r.trace.join(' '));
if(errs.length||botFail){ console.log(`실패: 자료 오류 ${errs.length} · 봇 실패 ${botFail}`); process.exit(1); } else console.log('모두 통과');
