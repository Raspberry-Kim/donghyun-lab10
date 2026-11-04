/* 동현몬 엔진: 칸 단위 이동·뒤따르는 포동이·사람과 대화·야생 조우·턴제 전투·포획·회복·가게·체육관.
   화면 그리기와 입력 장치는 모르고 상태 S만 바꾼다. 소리는 S.events로 알린다. */
(function(root){
'use strict';
const D=root.DATA, {T,SOLID,CHART,MOVES,SPECIES,ITEMS,PERSONALITY,MAPS,START,NPCS}=D;
const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}, BACK={up:'down',down:'up',left:'right',right:'left'};
const STEP=8, MAXLV=50, PARTY=6;
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const species=key=>SPECIES.find(s=>s.key===key);
const expFor=lv=>lv*lv*lv;

/* ---------- 동현몬 ---------- */
function calcStats(m){
  const sp=species(m.key), mod=m.mod||{}, f=(b,i)=>Math.max(1,Math.floor((Math.floor(b*2*m.lv/100)+5)*(mod[i]||1)));
  m.maxhp=Math.max(1,Math.floor((Math.floor(sp.base[0]*2*m.lv/100)+m.lv+10)*(mod.hp||1)));
  m.atk=f(sp.base[1],'atk'); m.def=f(sp.base[2],'def'); m.spd=f(sp.base[3],'spd');
}
function makeMon(key,lv,mod){
  const sp=species(key), m={key,lv,exp:expFor(lv),mod:mod||{},moves:[],st:{atk:0,def:0,spd:0}};
  for(const [l,mv] of sp.learn) if(l<=lv){ m.moves.push(mv); if(m.moves.length>4) m.moves.shift(); }
  calcStats(m); m.hp=m.maxhp; return m;
}
const name=m=>species(m.key).name;
/* 조사 고르기: '포동이은(는)' → '포동이는'. 한글로 끝나는 말 뒤의 괄호 조사만 바꾼다 */
function josa(text){ return String(text).replace(/([가-힣])(은\(는\)|이\(가\)|을\(를\)|과\(와\)|으로\(로\))/g,(m,ch,p)=>{ const bat=(ch.charCodeAt(0)-0xAC00)%28; const [a,b]=p.replace(')','').split('('); return ch+(p==='으로(로)'?(bat===0||bat===8?b:a):(bat?a:b)); }); }
const stage=s=>s>=0?(2+s)/2:2/(2-s);
function effect(type,def){ let e=1; for(const t of def){ const c=CHART[type]; if(c&&c[t]!==undefined) e*=c[t]; } return e; }

/* ---------- 상태 ---------- */
function newGame(o){
  const seed=o.seed||1, rng=mulberry32(seed*7919+13), st=START[o.startMap||1];
  const S={seed,rng,status:'play',mode:'world',frame:0,time:0,steps:0,map:st.map,
    hero:ent(st.x,st.y,st.dir),pet:ent(st.x,st.y,st.dir),petHidden:true,
    party:[makeMon('podong',5,PERSONALITY[o.pers||1].mod)],box:[],bag:{ball:o.startMap===1?0:5,potion:2,superpotion:0},money:o.money??1000,badge:0,
    dex:{seen:{podong:1},caught:{podong:1}},flags:{},picked:{},rate:o.rate??1,pers:o.pers||1,startMap:o.startMap||1,
    npcs:NPCS.map(n=>({...n,...ent(n.x,n.y,n.dir),hx:n.x,hy:n.y,beaten:false,t:0,bang:0})),
    lastHeal:{map:st.map,x:st.x,y:st.y,dir:st.dir},backDoor:null,
    dialog:null,battle:null,fade:0,events:[],log:[],cam:{x:0,y:0}};
  return S;
}
function ent(tx,ty,dir){ return {tx,ty,x:tx*T,y:ty*T,dir,moving:0,fx:0,fy:0,anim:0}; }
const map=S=>MAPS[S.map];
function tile(S,tx,ty){ const g=map(S).grid; if(ty<0||ty>=g.length||tx<0||tx>=g[0].length) return 'T'; return g[ty][tx]; }
function occupied(S,tx,ty,self){
  if(S.hero!==self&&S.hero.tx===tx&&S.hero.ty===ty) return S.hero;
  if(S.pet!==self&&self!==S.hero&&!S.petHidden&&S.pet.tx===tx&&S.pet.ty===ty) return S.pet; /* 주인공은 포동이와 자리를 바꾼다 */
  for(const n of S.npcs) if(n!==self&&n.map===S.map&&n.tx===tx&&n.ty===ty) return n;
  for(const it of (map(S).items||[])) if(!S.picked[S.map+':'+it.x+':'+it.y]&&it.x===tx&&it.y===ty) return it;
  return null;
}
function walkable(S,tx,ty,self){ const t=tile(S,tx,ty); if(SOLID[t]) return false; return !occupied(S,tx,ty,self); }
function startMove(e,dir){ const [dx,dy]=DIRS[dir]; e.dir=dir; e.tx+=dx; e.ty+=dy; e.moving=STEP; e.fx=dx; e.fy=dy; }
function tickMove(e){ if(e.moving>0){ e.moving--; e.x=e.tx*T-e.fx*e.moving*(T/STEP); e.y=e.ty*T-e.fy*e.moving*(T/STEP); e.anim++; if(e.moving===0){ e.x=e.tx*T; e.y=e.ty*T; return true; } } return false; }

/* ---------- 한 틀 ---------- */
function step(S,keys){
  if(S.status!=='play') return;
  S.frame++; S.time++;
  if(S.fade>0){ S.fade--; if(S.fade===0&&S.after){ const f=S.after; S.after=null; f(); } return; }
  if(S.battle){ battleTick(S,keys); return; }
  if(S.dialog){ dialogTick(S,keys); npcTick(S,true); return; }
  heroTick(S,keys); npcTick(S,false);
}
function heroTick(S,keys){
  const h=S.hero;
  if(h.moving>0){ if(tickMove(h)) arrived(S); }
  if(h.moving===0&&!S.dialog&&!S.battle){
    if(keys.aPressed){ interact(S); }
    else { const want=keys.up?'up':keys.down?'down':keys.left?'left':keys.right?'right':null;
      if(want){ h.dir=want; const [dx,dy]=DIRS[want];
        if(walkable(S,h.tx+dx,h.ty+dy,h)){ petFollow(S); startMove(h,want); S.steps++; if((S.steps&1)===0) S.events.push({t:'step'}); }
        else { h.anim++; if(S.frame%24===0) S.events.push({t:'bump'}); } } }
  }
  if(S.pet.moving>0) tickMove(S.pet);
}
function petFollow(S){ const h=S.hero, p=S.pet; if(S.petHidden){ S.petHidden=false; p.tx=h.tx; p.ty=h.ty; p.x=h.x; p.y=h.y; p.dir=h.dir; return; }
  if(p.tx===h.tx&&p.ty===h.ty) return; const dx=h.tx-p.tx, dy=h.ty-p.ty; const dir=dx>0?'right':dx<0?'left':dy>0?'down':'up'; p.tx=h.tx; p.ty=h.ty; p.dir=dir; p.moving=STEP; p.fx=Math.sign(dx); p.fy=Math.sign(dy); }
function arrived(S){
  const h=S.hero, m=map(S);
  const w=(m.warps||[]).find(w=>w.x===h.tx&&w.y===h.ty);
  if(w){ warp(S,w); return; }
  if(tile(S,h.tx,h.ty)==='t'&&S.rate>0&&m.wild){ if(S.rng()<0.1*S.rate){ const zone=m.wild.find(z=>h.ty<=z.maxY)||m.wild[m.wild.length-1]; const tot=zone.table.reduce((a,b)=>a+b[1],0); let r=S.rng()*tot, key=zone.table[0][0]; for(const [k,wt] of zone.table){ if(r<wt){ key=k; break; } r-=wt; } const lv=zone.lv[0]+Math.floor(S.rng()*(zone.lv[1]-zone.lv[0]+1)); startBattle(S,{kind:'wild',foes:[makeMon(key,lv)]}); return; } }
  for(const n of S.npcs){ if(n.map!==S.map||!n.trainer||n.beaten||!n.sight) continue; if(sees(S,n,h)){ engage(S,n); return; } }
}
function sees(S,n,h){ const [dx,dy]=DIRS[n.dir]; for(let i=1;i<=n.sight;i++){ const tx=n.tx+dx*i, ty=n.ty+dy*i; if(tx===h.tx&&ty===h.ty) return true; if(SOLID[tile(S,tx,ty)]||occupied(S,tx,ty,n)) return false; } return false; }
function warp(S,w){
  let to=w.to; if(to==='back') to=S.backDoor||{map:'town1',x:18,y:4,dir:'down'};
  if(w.tag) S.backDoor={map:S.map,x:w.x,y:w.y+1,dir:'down'};
  S.events.push({t:'door'}); S.fade=14;
  S.after=()=>{ S.map=to.map; const h=S.hero; h.tx=to.x; h.ty=to.y; h.x=to.x*T; h.y=to.y*T; h.dir=to.dir; h.moving=0; S.petHidden=true; S.pet.moving=0; S.fade=0; S.fadeIn=14; };
}
function npcTick(S,frozen){
  for(const n of S.npcs){ if(n.map!==S.map) continue; if(n.moving>0){ tickMove(n); continue; } if(frozen||n.bang>0){ if(n.bang>0) n.bang--; continue; }
    if(n.wander&&S.rng()<0.012){ const dirs=Object.keys(DIRS), d=dirs[Math.floor(S.rng()*4)]; n.dir=d; const [dx,dy]=DIRS[d], tx=n.tx+dx, ty=n.ty+dy;
      if(Math.abs(tx-n.hx)<=n.wander&&Math.abs(ty-n.hy)<=n.wander&&walkable(S,tx,ty,n)&&tile(S,tx,ty)!=='m'&&!(map(S).warps||[]).some(w=>w.x===tx&&w.y===ty)) startMove(n,d); }
    else if(!n.trainer&&S.rng()<0.004){ n.dir=Object.keys(DIRS)[Math.floor(S.rng()*4)]; }
  }
}

/* ---------- 대화 ---------- */
function say(S,pages,onDone,opt){ S.dialog={pages:(Array.isArray(pages)?pages.slice():[pages]).map(josa),i:0,n:0,onDone:onDone||null,choice:null,opt:opt||{}}; S.mode='dialog'; }
function choice(S,items,onPick,i0){ S.dialog={pages:[],i:0,n:0,choice:{items,i:i0||0,onPick},onDone:null,opt:{}}; S.mode='dialog'; }
function dialogTick(S,keys){
  const d=S.dialog;
  if(d.choice){ const c=d.choice;
    if(keys.upPressed){ c.i=(c.i-1+c.items.length)%c.items.length; S.events.push({t:'tick'}); }
    if(keys.downPressed){ c.i=(c.i+1)%c.items.length; S.events.push({t:'tick'}); }
    if(keys.aPressed){ const it=c.items[c.i]; S.dialog=null; S.mode='world'; S.events.push({t:'pop'}); c.onPick(c.i,it); }
    else if(keys.bPressed){ S.dialog=null; S.mode='world'; c.onPick(-1,null); }
    return; }
  const page=d.pages[d.i]||'';
  if(d.n<page.length){ d.n+=1; if(d.n%3===0&&d.n<page.length) S.events.push({t:'blip'}); if(keys.aPressed||keys.bPressed) d.n=page.length; return; }
  if(keys.aPressed||keys.bPressed){ if(d.i+1<d.pages.length){ d.i++; d.n=0; } else { const f=d.onDone; S.dialog=null; S.mode='world'; if(f) f(); } }
}
/* 책장 글: 지도별. 연구소는 왼쪽(x<6)·오른쪽 책장이 다르다 */
const BOOKS={
  home:['책장: 『포동이 산책 일지』 『백신학 개론』\n『소아감염학』이 꽂혀 있다.\n『예방접종 지침』 사이에 포동이 사진이 끼워져 있다.'],
  lab:['책장: 『동현랭 입문』 『도옹 세는 법』\n『신중동과 뭉치: 0과 음수의 조건문』\n『뚱띠와 또치: 몫과 나머지』가 꽂혀 있다.','책장: 『예방접종 지침』 『역학조사 수첩』\n『소아감염학』 『동현몬 도감 초안』이\n꽂혀 있다. 책갈피가 백신 장에 있다.'],
  houseA:['책장: 『강아지 기르기』 『하얀 털 손질법』\n『백신학 개론』이 꽂혀 있다.\n강아지도 예방접종은 챙기는 집이다.'],
  houseB:['책장: 『동현전 전차 도감』 『동현워 기사 열전』\n『꽥꽥: 값을 받는 법』 『오겡끼데스까: 멈추는 법』\n동현랭 책이 많다.'],
};
function faceTile(S){ const h=S.hero, [dx,dy]=DIRS[h.dir]; return [h.tx+dx,h.ty+dy,dx,dy]; }
function interact(S){
  const [tx,ty,dx,dy]=faceTile(S), m=map(S);
  let t=tile(S,tx,ty), ox=tx, oy=ty;
  if(t==='k'){ ox=tx+dx; oy=ty+dy; } /* 탁자 너머의 사람과 말한다 */
  const n=S.npcs.find(n=>n.map===S.map&&n.tx===ox&&n.ty===oy&&n.moving===0);
  if(n){ n.dir=BACK[S.hero.dir]; talk(S,n); return; }
  const sg=(m.signs||[]).find(s=>s.x===tx&&s.y===ty); if(sg){ say(S,sg.text); return; }
  const it=(m.items||[]).find(i=>i.x===tx&&i.y===ty&&!S.picked[S.map+':'+i.x+':'+i.y]);
  if(it){ S.picked[S.map+':'+it.x+':'+it.y]=1; S.bag[it.item]=(S.bag[it.item]||0)+it.n; S.events.push({t:'item'}); say(S,[`${ITEMS[it.item].name}${it.n>1?' '+it.n+'개':''}를 주웠다!`]); return; }
  if(t==='B') say(S,['기계가 윙 소리를 내며 돌아간다.']);
  else if(t==='b'){ const bs=BOOKS[S.map]||BOOKS.home; say(S,[bs[Math.min(bs.length-1,tx>=6?1:0)]]); }
}
function talk(S,n){
  if(n.trainer){ if(n.beaten) say(S,n.after); else engage(S,n); return; }
  if(n.heal){ const its=n.box?['네, 부탁해요','상자를 연다','아니요']:['네, 부탁해요','아니요']; say(S,n.text,()=>choice(S,its,i=>{ if(n.box&&i===1){ boxMenu(S); return; } if(i===0){ healParty(S); S.lastHeal={map:S.backDoor?S.backDoor.map:S.map,x:S.hero.tx,y:S.hero.ty,dir:'down'}; if(S.backDoor) S.lastHeal={...S.backDoor}; S.events.push({t:'heal'}); say(S,['동현몬이 모두 건강해졌어요.\n또 오세요!']); } else say(S,['또 오세요!']); })); return; }
  if(n.shop){ say(S,n.text,()=>shopMenu(S,n)); return; }
  if(n.gift){ const k='gift:'+n.id; if(!S.flags[k]){ say(S,n.text,()=>{ S.flags[k]=1; S.bag[n.gift.item]=(S.bag[n.gift.item]||0)+n.gift.n; S.events.push({t:'item'}); say(S,[`${ITEMS[n.gift.item].name} ${n.gift.n}개를 받았다!`].concat(n.after||[])); }); } else if(n.box) say(S,n.after,()=>choice(S,['상자를 연다','그만둔다'],i=>{ if(i===0) boxMenu(S); })); else say(S,n.after); return; }
  say(S,n.text);
}
function shopMenu(S,n){
  const items=n.shop.map(k=>`${ITEMS[k].name}  ${ITEMS[k].price}원`).concat(['그만둔다']);
  choice(S,items,(i)=>{ if(i<0||i>=n.shop.length){ say(S,['또 오세요!']); return; } const k=n.shop[i], it=ITEMS[k];
    if(S.money<it.price){ say(S,['돈이 모자라요.'],()=>shopMenu(S,n)); return; }
    S.money-=it.price; S.bag[k]=(S.bag[k]||0)+1; S.events.push({t:'buy'}); say(S,[`${it.name}을(를) 샀다. 남은 돈 ${S.money}원.`],()=>shopMenu(S,n)); },0);
  S.dialog.opt={shop:true};
}
function healParty(S){ for(const m of S.party){ m.hp=m.maxhp; m.st={atk:0,def:0,spd:0}; } }
/* 연구소 상자: 맡긴 동현몬은 쉬면서 체력이 가득 찬다. 회복소·연구소에서 열어 데리고 있는 동현몬과 바꾼다 */
function deposit(S,m){ m.hp=m.maxhp; m.st={atk:0,def:0,spd:0}; S.box.push(m); }
const monLabel=m=>`${name(m)} Lv${m.lv}`;
const BOX_PAGE=5;
function boxMenu(S,page){
  page=page||0; const n=S.box.length;
  if(!n){ say(S,['상자는 비어 있다.']); return; }
  if(page*BOX_PAGE>=n) page=0;
  const slice=S.box.slice(page*BOX_PAGE,page*BOX_PAGE+BOX_PAGE), more=(page+1)*BOX_PAGE<n;
  const items=slice.map(monLabel); if(more) items.push('다음 쪽 ▶'); items.push('그만둔다');
  choice(S,items,(i)=>{ if(i<0||i>=items.length-1) return; if(more&&i===items.length-2){ boxMenu(S,page+1); return; } pickPartyFor(S,page*BOX_PAGE+i,page); },0);
  S.dialog.opt={box:true};
}
function pickPartyFor(S,bi,page){
  const b=S.box[bi]; if(!b){ boxMenu(S); return; }
  const items=S.party.map(monLabel).concat(['그만둔다']);
  say(S,[`${name(b)}과(와) 누구를 바꿀까?`],()=>choice(S,items,(i)=>{ if(i<0||i>=S.party.length){ boxMenu(S,page); return; }
    const out=S.party[i]; S.party[i]=b; S.box.splice(bi,1); deposit(S,out); S.events.push({t:'pop'});
    say(S,[`${name(out)}을(를) 상자에 맡기고\n${name(b)}을(를) 데려왔다.`],()=>boxMenu(S,page)); },0));
}
function engage(S,n){ n.bang=30; S.hero.moving=0; const dist=Math.abs(n.tx-S.hero.tx)+Math.abs(n.ty-S.hero.ty);
  const go=()=>say(S,n.text,()=>startBattle(S,{kind:'trainer',npc:n,foes:n.trainer.party.map(([k,l])=>makeMon(k,l))}));
  if(dist>1){ /* 트레이너가 다가온다 */ n.walk=dist-1; n.walkDir=n.dir; S.dialog={pages:[],i:0,n:0,wait:true}; S.mode='dialog'; S.approach={n,go}; }
  else { S.hero.dir=BACK[n.dir]; go(); }
}
/* 다가오는 트레이너는 대화 상태에서 움직인다 */
const _dialogTick=dialogTick;
dialogTick=function(S,keys){ if(S.approach){ const {n,go}=S.approach; if(n.bang>0){ n.bang--; return; } if(n.moving>0){ tickMove(n); return; } if(n.walk>0){ n.walk--; startMove(n,n.walkDir); return; } S.approach=null; S.dialog=null; S.hero.dir=BACK[n.dir]; go(); return; } _dialogTick(S,keys); };

/* ---------- 전투 ---------- */
function startBattle(S,o){
  const me=S.party.findIndex(m=>m.hp>0); if(me<0) return;
  const B={kind:o.kind,npc:o.npc||null,foes:o.foes,fi:0,me,q:[],cur:null,text:'',n:0,wait:0,phase:'q',cursor:0,mcur:0,pcur:0,bcur:0,runs:0,flash:{me:0,foe:0},shake:0,result:null,expbar:0};
  S.battle=B; S.mode='battle'; S.events.push({t:'encounter'});
  const foe=B.foes[0]; S.dex.seen[foe.key]=1;
  if(B.kind==='wild') msg(B,`앗! 야생 ${name(foe)}이(가) 나타났다!`); else msg(B,`${B.npc.trainer.name}이(가) 승부를 걸어왔다!`,`${B.npc.trainer.name}은(는) ${name(foe)}을(를) 내보냈다!`);
  msg(B,`가라! ${name(S.party[me])}!`); B.q.push({t:'menu'});
}
const foe=B=>B.foes[B.fi];
const mine=(S,B)=>S.party[B.me];
function msg(B,...texts){ for(const t of texts) B.q.push({t:'msg',text:josa(t)}); }
function battleTick(S,keys){
  const B=S.battle;
  if(B.flash.me>0) B.flash.me--; if(B.flash.foe>0) B.flash.foe--; if(B.shake>0) B.shake--;
  if(B.phase==='q'){
    if(!B.cur){ if(!B.q.length){ B.q.push({t:'menu'}); } B.cur=B.q.shift(); B.n=0; B.wait=0;
      if(B.cur.t==='fn'){ const f=B.cur.fn; B.cur=null; f(); return; }
      if(B.cur.t==='menu'){ B.phase='menu'; B.cur=null; B.text=josa(`${name(mine(S,B))}은(는) 무엇을 할까?`); B.n=B.text.length; return; }
      if(B.cur.t==='party'){ B.phase='party'; B.forced=B.cur.forced; B.pcur=0; B.cur=null; return; }
      if(B.cur.t==='keep'){ B.phase='keep'; B.keep=B.cur.mon; B.pcur=0; B.cur=null; return; }
      if(B.cur.t==='end'){ const r=B.cur; B.cur=null; endBattle(S,r); return; }
      if(B.cur.t==='msg'){ B.text=josa(B.cur.text); }
    }
    const c=B.cur;
    if(c.t==='msg'){ if(B.n<B.text.length){ B.n++; if(B.n%3===0) S.events.push({t:'blip'}); if(keys.aPressed||keys.bPressed) B.n=B.text.length; return; } B.wait++; if(keys.aPressed||keys.bPressed||B.wait>50){ B.cur=null; } return; }
    if(c.t==='hp'){ const m=c.who==='foe'?foe(B):mine(S,B); if(!Number.isFinite(c.to)||!Number.isFinite(m.hp)){ m.hp=Number.isFinite(c.to)?c.to:0; B.cur=null; return; } if(m.hp>c.to){ m.hp=Math.max(c.to,m.hp-Math.max(1,Math.ceil(m.maxhp/40))); } else if(m.hp<c.to){ m.hp=Math.min(c.to,m.hp+Math.max(1,Math.ceil(m.maxhp/40))); } else B.cur=null; return; }
    if(c.t==='exp'){ const m=mine(S,B); if(!Number.isFinite(c.to)||!Number.isFinite(m.exp)){ if(Number.isFinite(c.to)) m.exp=c.to; B.cur=null; return; } if(m.exp<c.to){ m.exp=Math.min(c.to,m.exp+Math.max(1,Math.ceil((c.to-c.from)/30))); } else B.cur=null; return; }
    if(c.t==='pause'){ B.wait++; if(B.wait>=(c.n||1)) B.cur=null; return; }
    B.cur=null; return; /* 모르는 항목은 건너뛴다 */
  }
  if(B.phase==='menu'){
    if(keys.leftPressed||keys.rightPressed){ B.cursor^=1; S.events.push({t:'tick'}); } if(keys.upPressed||keys.downPressed){ B.cursor^=2; S.events.push({t:'tick'}); }
    if(keys.aPressed){ S.events.push({t:'pop'}); if(B.cursor===0){ B.phase='moves'; } else if(B.cursor===1){ B.phase='bag'; B.bcur=0; } else if(B.cursor===2){ B.phase='party'; B.forced=false; B.pcur=0; } else tryRun(S,B); }
    return;
  }
  if(B.phase==='moves'){ const mv=mine(S,B).moves; if(B.mcur>=mv.length) B.mcur=0; /* 기술이 적은 동현몬으로 바꾼 뒤 커서가 범위를 벗어나 멈추던 것 */
    if(keys.upPressed){ B.mcur=(B.mcur-1+mv.length)%mv.length; S.events.push({t:'tick'}); } if(keys.downPressed){ B.mcur=(B.mcur+1)%mv.length; S.events.push({t:'tick'}); }
    if(keys.bPressed){ B.phase='menu'; return; }
    if(keys.aPressed){ S.events.push({t:'pop'}); B.phase='q'; turn(S,B,{type:'move',key:mv[B.mcur]}); }
    return; }
  if(B.phase==='bag'){ const list=bagList(S);
    if(keys.upPressed){ B.bcur=(B.bcur-1+list.length)%list.length; S.events.push({t:'tick'}); } if(keys.downPressed){ B.bcur=(B.bcur+1)%list.length; S.events.push({t:'tick'}); }
    if(keys.bPressed){ B.phase='menu'; return; }
    if(keys.aPressed){ const it=list[B.bcur]; if(!it){ B.phase='menu'; return; } S.events.push({t:'pop'}); B.phase='q'; turn(S,B,{type:'item',key:it}); }
    return; }
  if(B.phase==='keep'){ const n=S.party.length, f=B.keep; /* 여섯이 찼을 때 잡은 동현몬: 누구를 상자에 맡길지 고른다. Z면 새 동현몬을 맡긴다 */
    if(keys.upPressed){ B.pcur=(B.pcur-1+n)%n; S.events.push({t:'tick'}); } if(keys.downPressed){ B.pcur=(B.pcur+1)%n; S.events.push({t:'tick'}); }
    if(keys.bPressed){ B.keep=null; B.phase='q'; B.q.unshift({t:'msg',text:`${name(f)}은(는) 연구소 상자로 보내졌다.`},{t:'fn',fn:()=>deposit(S,f)}); return; } /* 맡기기는 안내문 뒤에: 안내문 중에 상대 체력 막대가 차오르지 않게 */
    if(keys.aPressed){ const out=S.party[B.pcur], i=B.pcur; B.keep=null; B.phase='q'; S.events.push({t:'pop'}); B.q.unshift({t:'msg',text:`${name(out)}을(를) 상자에 맡기고\n${name(f)}이(가) 함께 가게 되었다.`},{t:'fn',fn:()=>{ S.party[i]=f; deposit(S,out); }}); return; } /* 교체는 안내문 뒤에: 싸우던 동현몬을 바꿀 때 안내문 중 내 쪽 그림이 먼저 바뀌지 않게 */
    return; }
  if(B.phase==='party'){ const n=S.party.length;
    if(keys.upPressed){ B.pcur=(B.pcur-1+n)%n; S.events.push({t:'tick'}); } if(keys.downPressed){ B.pcur=(B.pcur+1)%n; S.events.push({t:'tick'}); }
    if(keys.bPressed&&!B.forced){ B.phase='menu'; return; }
    if(keys.aPressed){ const m=S.party[B.pcur]; if(B.pcur===B.me&&!B.forced){ B.text=josa(`${name(m)}은(는) 이미 나와 있다!`); return; } if(m.hp<=0){ B.text=josa(`${name(m)}은(는) 싸울 힘이 없다!`); return; }
      S.events.push({t:'pop'}); B.phase='q'; if(B.forced){ B.forced=false; B.me=B.pcur; mine(S,B).st={atk:0,def:0,spd:0}; msg(B,`가라! ${name(m)}!`); B.q.push({t:'menu'}); } else turn(S,B,{type:'switch',i:B.pcur}); }
    return; }
}
function bagList(S){ return ['ball','potion','superpotion'].filter(k=>S.bag[k]>0); }
function tryRun(S,B){
  B.phase='q';
  if(B.kind==='trainer'){ msg(B,'트레이너 승부에서는 도망칠 수 없다!'); B.q.push({t:'menu'}); return; }
  B.runs++; const a=mine(S,B).spd*stage(mine(S,B).st.spd), b=foe(B).spd*stage(foe(B).st.spd);
  if(a>=b||S.rng()<0.5+B.runs*0.15){ msg(B,'무사히 도망쳤다!'); B.q.push({t:'end',result:'run'}); } else { msg(B,'도망칠 수 없다!'); foeAct(S,B); B.q.push({t:'menu'}); }
}
function turn(S,B,act){
  const me=mine(S,B), f=foe(B);
  if(act.type==='item'){ useItem(S,B,act.key); return; }
  if(act.type==='switch'){ msg(B,`돌아와, ${name(me)}!`); B.q.push({t:'fn',fn:()=>{ me.st={atk:0,def:0,spd:0}; B.me=act.i; }}); msg(B,`가라! ${name(S.party[act.i])}!`); foeAct(S,B); B.q.push({t:'menu'}); return; }
  const mySpd=me.spd*stage(me.st.spd), fSpd=f.spd*stage(f.st.spd), first=mySpd>fSpd||(mySpd===fSpd&&S.rng()<0.5);
  if(first){ useMove(S,B,'me',act.key); foeAct(S,B); } else { foeAct(S,B); useMove(S,B,'me',act.key); }
  B.q.push({t:'menu'});
}
function foeAct(S,B){ B.q.push({t:'fn',fn:()=>{ const f=foe(B), me=mine(S,B); if(f.hp<=0||me.hp<=0) return; const dmg=f.moves.filter(k=>MOVES[k].pow); let pick=f.moves[Math.floor(S.rng()*f.moves.length)];
  if(dmg.length&&S.rng()<0.6){ const sup=dmg.filter(k=>effect(MOVES[k].type,species(me.key).types)>1); pick=(sup.length&&S.rng()<0.7?sup:dmg)[Math.floor(S.rng()*(sup.length&&S.rng()<0.7?sup:dmg).length)]||pick; }
  const q=B.q; B.q=[]; useMove(S,B,'foe',pick); B.q=B.q.concat(q); }}); }
function useMove(S,B,who,key){
  B.q.push({t:'fn',fn:()=>{ const user=who==='me'?mine(S,B):foe(B), tgt=who==='me'?foe(B):mine(S,B); if(user.hp<=0||tgt.hp<=0) return;
    const mv=MOVES[key], un=(who==='me'?'':'상대 ')+name(user), tn=(who==='me'?'상대 ':'')+name(tgt), q=[];
    q.push({t:'msg',text:`${un}의 ${mv.name}!`});
    if(mv.acc&&S.rng()*100>=mv.acc){ q.push({t:'msg',text:'그러나 빗나갔다!'}); B.q=q.concat(B.q); return; }
    if(mv.stat){ const t=mv.target==='self'?user:tgt, tnm=mv.target==='self'?un:tn; const cur=t.st[mv.stat]; if((mv.d>0&&cur>=6)||(mv.d<0&&cur<=-6)) q.push({t:'msg',text:`${tnm}의 ${{atk:'공격',def:'방어',spd:'속도'}[mv.stat]}은(는) 더 ${mv.d>0?'오르지':'내려가지'} 않는다!`}); else { t.st[mv.stat]=cur+mv.d; q.push({t:'fn',fn:()=>S.events.push({t:'stat',up:mv.d>0})},{t:'msg',text:`${tnm}의 ${{atk:'공격',def:'방어',spd:'속도'}[mv.stat]}이(가) ${mv.d>0?'올랐다':'떨어졌다'}!`}); } B.q=q.concat(B.q); return; }
    const stab=species(user.key).types.includes(mv.type)?1.5:1, eff=effect(mv.type,species(tgt.key).types), crit=S.rng()<1/16?1.5:1, rnd=0.85+S.rng()*0.15;
    const A=user.atk*stage(user.st.atk), Df=tgt.def*stage(tgt.st.def);
    let dmg=Math.floor((Math.floor(2*user.lv/5+2)*mv.pow*A/Df/50+2)*stab*eff*crit*rnd); if(eff>0) dmg=Math.max(1,dmg);
    const to=Math.max(0,tgt.hp-dmg);
    q.push({t:'fn',fn:()=>{ if(who==='me') B.flash.foe=14; else { B.flash.me=14; B.shake=10; } S.events.push({t:'hit',eff}); }},{t:'hp',who:who==='me'?'foe':'me',to});
    if(crit>1) q.push({t:'msg',text:'급소에 맞았다!'});
    if(eff===0) q.push({t:'msg',text:'효과가 없는 듯하다…'}); else if(eff>1) q.push({t:'msg',text:'효과가 굉장했다!'}); else if(eff<1) q.push({t:'msg',text:'효과가 별로인 듯하다…'});
    q.push({t:'fn',fn:()=>{ if(tgt.hp<=0) faint(S,B,who==='me'?'foe':'me'); }});
    B.q=q.concat(B.q); }});
}
function faint(S,B,who){
  const q=[];
  if(who==='foe'){ const f=foe(B), me=mine(S,B); S.events.push({t:'faint'}); q.push({t:'msg',text:`${B.kind==='wild'?'야생 ':'상대 '}${name(f)}은(는) 쓰러졌다!`});
    const gain=Math.floor(species(f.key).exp*f.lv/7*(B.kind==='trainer'?1.5:1));
    q.push({t:'msg',text:`${name(me)}은(는) ${gain}의 경험치를 얻었다!`},{t:'exp',from:me.exp,to:me.exp+gain},{t:'fn',fn:()=>levelUps(S,B,me)});
    q.push({t:'fn',fn:()=>{ if(B.kind==='trainer'&&B.fi+1<B.foes.length){ B.fi++; S.dex.seen[foe(B).key]=1; B.q=[{t:'msg',text:`${B.npc.trainer.name}은(는) ${name(foe(B))}을(를) 내보냈다!`},{t:'menu'}].concat(B.q.filter(x=>x.t!=='menu')); }
      else if(B.kind==='trainer'){ const tr=B.npc.trainer; B.q=[{t:'msg',text:`${tr.name}과(와)의 승부에서 이겼다!`},{t:'fn',fn:()=>{ S.money+=tr.reward; S.events.push({t:'money'}); }},{t:'msg',text:`상금으로 ${tr.reward}원을 받았다!`},{t:'end',result:'win'}]; }
      else B.q=[{t:'end',result:'win'}]; }});
  } else { const me=mine(S,B); S.events.push({t:'faint'}); q.push({t:'msg',text:`${name(me)}은(는) 쓰러졌다!`});
    q.push({t:'fn',fn:()=>{ if(S.party.some(m=>m.hp>0)){ B.q=[{t:'party',forced:true}].concat(B.q.filter(x=>x.t!=='menu')); } else { B.q=[{t:'msg',text:'눈앞이 캄캄해졌다!'},{t:'end',result:'lose'}]; } }}); }
  B.q=q.concat(B.q.filter(x=>x.t!=='menu'&&x.t!=='fn'));
}
function levelUps(S,B,m){
  const q=[];
  while(m.lv<MAXLV&&m.exp>=expFor(m.lv+1)){ m.lv++; const old=m.maxhp; calcStats(m); m.hp=Math.min(m.maxhp,m.hp+(m.maxhp-old)); S.events.push({t:'levelup'});
    q.push({t:'msg',text:`${name(m)}은(는) 레벨 ${m.lv}이(가) 되었다! 체력 ${m.maxhp} · 공격 ${m.atk} · 방어 ${m.def} · 속도 ${m.spd}`});
    for(const [l,k] of species(m.key).learn) if(l===m.lv&&!m.moves.includes(k)){ if(m.moves.length<4){ m.moves.push(k); q.push({t:'msg',text:`${name(m)}은(는) ${MOVES[k].name}을(를) 배웠다!`}); } else { const old=m.moves.shift(); m.moves.push(k); q.push({t:'msg',text:`${name(m)}은(는) ${MOVES[old].name}을(를) 잊고 ${MOVES[k].name}을(를) 배웠다!`}); } } }
  B.q=q.concat(B.q);
}
function useItem(S,B,key){
  const me=mine(S,B), f=foe(B), it=ITEMS[key];
  if(key==='ball'){
    if(B.kind==='trainer'){ msg(B,'트레이너의 동현몬은 잡을 수 없다!'); B.q.push({t:'menu'}); return; }
    S.bag.ball--; msg(B,`${name(me)}의 주인은 동현볼을 던졌다!`);
    const sp=species(f.key), a=Math.max(1,Math.floor((3*f.maxhp-2*f.hp)*sp.catch/(3*f.maxhp))), ok=S.rng()*255<a;
    const shakes=ok?3:Math.min(2,Math.floor(a/85));
    for(let i=0;i<shakes;i++) B.q.push({t:'fn',fn:()=>{ S.events.push({t:'shake'}); B.shake=6; }},{t:'pause',n:28});
    if(ok){ B.q.push({t:'fn',fn:()=>{ S.events.push({t:'caught'}); S.dex.caught[f.key]=1; }}); msg(B,`잡았다! ${name(f)}을(를) 잡았다!`);
      B.q.push({t:'fn',fn:()=>{ f.st={atk:0,def:0,spd:0}; if(S.party.length<PARTY){ S.party.push(f); B.q.unshift({t:'msg',text:`${name(f)}이(가) 함께 가게 되었다.`}); } else { B.q.unshift({t:'keep',mon:f}); } }});
      B.q.push({t:'end',result:'catch'}); }
    else { msg(B,['아! 나와 버렸다!','아깝다! 거의 잡을 뻔했다!','앗! 잡힌 줄 알았는데!'][shakes]); foeAct(S,B); B.q.push({t:'menu'}); }
    return; }
  if(me.hp>=me.maxhp){ msg(B,`${name(me)}의 체력은 이미 가득하다!`); B.q.push({t:'menu'}); return; }
  S.bag[key]--; msg(B,`${it.name}을(를) 썼다.`); B.q.push({t:'fn',fn:()=>S.events.push({t:'heal'})},{t:'hp',who:'me',to:Math.min(me.maxhp,me.hp+it.heal)}); msg(B,`${name(me)}의 체력이 회복되었다!`); foeAct(S,B); B.q.push({t:'menu'});
}
function endBattle(S,r){
  const B=S.battle; for(const m of S.party) m.st={atk:0,def:0,spd:0};
  S.battle=null; S.mode='world'; S.events.push({t:'battleEnd',result:r.result,kind:B.kind});
  if(r.result==='lose'){ const lose=Math.floor(S.money/2); S.money-=lose; const h=S.lastHeal; S.fade=20; S.after=()=>{ S.map=h.map; S.hero.tx=h.x; S.hero.ty=h.y; S.hero.x=h.x*T; S.hero.y=h.y*T; S.hero.dir=h.dir; S.hero.moving=0; S.petHidden=true; healParty(S); S.fadeIn=14; say(S,[`눈앞이 캄캄해졌다… 서둘러 ${MAPS[h.map].name}으로 돌아왔다.`+(lose>0?`\n${lose}원을 잃어버렸다.`:'')]); }; return; }
  if(B.kind==='trainer'&&r.result==='win'){ const n=B.npc; n.beaten=true; S.log.push(`${n.trainer.name} 승리`); const done=()=>{ if(n.trainer.boss){ S.badge=1; S.status='win'; S.events.push({t:'win'}); } };
    S.pendingSay={pages:n.after,done}; }
}
function tickPending(S){ if(S.pendingSay&&!S.dialog&&!S.battle&&S.fade===0){ const p=S.pendingSay; S.pendingSay=null; say(S,p.pages,p.done); } }
const _step=step;
step=function(S,keys){ _step(S,keys); tickPending(S); if(S.fadeIn>0) S.fadeIn--; };
/* 바깥 가방 쓰기(메뉴) */
function useOutside(S,key,pi){ const m=S.party[pi], it=ITEMS[key]; if(!it.heal||!(S.bag[key]>0)) return '쓸 수 없다.'; if(m.hp<=0) return `${name(m)}은(는) 쓰러져 있어 상처약이 듣지 않는다.`; if(m.hp>=m.maxhp) return `${name(m)}의 체력은 이미 가득하다.`; S.bag[key]--; m.hp=Math.min(m.maxhp,m.hp+it.heal); S.events.push({t:'heal'}); return `${name(m)}의 체력이 ${m.hp}/${m.maxhp}이 되었다.`; }
function swapParty(S,i,j){ if(S.battle) return false; const t=S.party[i]; S.party[i]=S.party[j]; S.party[j]=t; return true; }
root.Engine={newGame,step,startBattle,boxMenu,rng:mulberry32,josa,makeMon,calcStats,expFor,species,name,effect,useOutside,swapParty,map,tile,T,MAXLV,PARTY,DIRS};
})(window);
