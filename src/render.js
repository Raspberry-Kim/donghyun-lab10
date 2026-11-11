/* 동현몬 그리기: 320×192 캔버스에 지도·사람·대화·전투 화면을 그린다. */
(function(root){
'use strict';
const D=root.DATA, {T,MAPS,ITEMS,MOVES,TYPES}=D, SP=root.Sprites, E=root.Engine;
const W=320,H=192, FONT="11px Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif", FONTB="bold 11px Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";
/* 지형만 별도 재료색으로 그린다. 사람·포동이·동현몬의 원본 팔레트와 도트는 보존한다. */
const TERRAIN={...SP.PAL,K:'#465751',E:'#eef0df',W:'#eee4cd',G:'#b6a082',
  '1':'#a0b996','2':'#88a782','3':'#d7c6a2','4':'#c1b18e','5':'#526f61','6':'#6e9275',
  '7':'#6e9fa9','8':'#b6d2cb','9':'#a5a89a',M:'#b57864',d:'#805851',B:'#698b9c',b:'#425f72',
  I:'#879c9b',i:'#c4cfc3',O:'#b29a70',o:'#817254',n:'#e4dfcd',h:'#655d4e',c:'#8c8876',
  Q:'#cbb68b',U:'#8ea9b4',u:'#e0dac6',v:'#ccc5ae',x:'#ad8272',z:'#cfa891',
  t:'#766b54',T:'#a99a76',a:'#959d90',A:'#5d6e67',g:'#72947a'};
const terrainCache={};
function terrain(key,flip){
  const ck=key+(flip?'f':'');if(terrainCache[ck])return terrainCache[ck];
  const rows=SP.SPR[key].replace(/^\n/,'').split('\n'),c=document.createElement('canvas');
  c.width=Math.max(...rows.map(r=>r.length));c.height=rows.length;const ctx=c.getContext('2d');
  rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(TERRAIN[ch]){ctx.fillStyle=TERRAIN[ch];ctx.fillRect(flip?c.width-x-1:x,y,1,1);}}));
  return terrainCache[ck]=c;
}
function spr(g,key,x,y,flip){ const c=key.startsWith('t_')?terrain(key,flip):SP.make(key,flip); g.drawImage(c,Math.round(x),Math.round(y)); }
function sprScaled(g,key,x,y,s,flip){ const c=SP.make(key,flip); g.drawImage(c,Math.round(x),Math.round(y),c.width*s,c.height*s); }
function entKey(base,e,hasWalk){ const d=e.dir==='right'?'left':e.dir; const f=(e.moving>0&&hasWalk&&(Math.floor(e.anim/4)%2===1))?'2':''; let k=base+'_'+d+f; if(!SP.has(k)) k=base+'_'+d; if(!SP.has(k)) k=base+'_down'; return k; }
function box(g,x,y,w,h){ g.fillStyle='#f5f0e2'; g.fillRect(x,y,w,h); g.fillStyle='#526861'; g.fillRect(x,y,w,1); g.fillRect(x,y+h-1,w,1); g.fillRect(x,y,1,h); g.fillRect(x+w-1,y,1,h); g.fillStyle='#fffaf0'; g.fillRect(x+1,y+1,w-2,1);g.fillStyle='#d0cebb';g.fillRect(x+1,y+h-2,w-2,1);g.fillStyle='#a89161';g.fillRect(x+2,y+2,7,1); }
function text(g,s,x,y,col,bold){ g.font=bold?FONTB:FONT; g.fillStyle=col||'#2e2a38'; g.textBaseline='top'; g.fillText(s,x,y); }
function wrap(g,s,maxW){ g.font=FONT; const out=[]; for(const para of s.split('\n')){ let line=''; for(const ch of para){ if(g.measureText(line+ch).width>maxW&&line){ out.push(line); line=ch; } else line+=ch; } out.push(line); } return out; }
function bar(g,x,y,w,h,ratio,col){ g.fillStyle='#2e2a38'; g.fillRect(x-1,y-1,w+2,h+2); g.fillStyle='#d8d2c4'; g.fillRect(x,y,w,h); g.fillStyle=col; g.fillRect(x,y,Math.round(w*Math.max(0,Math.min(1,ratio))),h); }
const hpCol=r=>r>0.5?'#548c72':r>0.2?'#bd944b':'#c26558';

/* ---------- 지도 ---------- */
function camera(S){ const m=MAPS[S.map], mw=m.grid[0].length*T, mh=m.grid.length*T, h=S.hero; let cx,cy;
  if(mw<=W) cx=Math.round((mw-W)/2); else cx=Math.max(0,Math.min(mw-W,Math.round(h.x+T/2-W/2)));
  if(mh<=H) cy=Math.round((mh-H)/2); else cy=Math.max(0,Math.min(mh-H,Math.round(h.y+T/2-H/2)));
  S.cam.x=cx; S.cam.y=cy; return [cx,cy]; }
/* 건물 입체감(동현워 건물을 따른다): 지붕·벽의 바깥 모서리에 테두리, 벽 오른쪽에 그늘 기둥, 건물 아래 땅에 그림자. 이웃 칸을 보고 그리므로 지도 글자는 그대로다. */
const ROOF='RCLGZ', WALL='HWDV';
const ROOF_MAT={
  R:['#b19a73','#c5b38f','#988467'],C:['#b77f6b','#cfa18a','#9c6f61'],
  L:['#9cacaa','#c1ccc1','#7c9696'],G:['#688c9c','#92aebb','#547687'],
  Z:['#829a96','#a8bbb0','#637e7c']
};
function at(m,x,y){ const r=m.grid[y]; return r?(r[x]||' '):' '; }
function building(g,m,tx,ty,ch,px,py){
  const INK='#465751';
  if(ROOF.includes(ch)){
    // 큰 지붕 면은 잔무늬 대신 낮은 대비의 기와 단과 어긋난 줄눈으로 잇는다.
    const [base,hi,shade]=ROOF_MAT[ch];
    g.fillStyle=base;g.fillRect(px,py,T,T);
    for(let y=3;y<T;y+=5){g.fillStyle=shade;g.fillRect(px,py+y,T,1);g.fillStyle=hi;g.fillRect(px,py+y+1,T,1);g.fillStyle=shade;g.fillRect(px+((ty+y)%2?4:10),py+y-2,1,2);}
    if(!ROOF.includes(at(m,tx,ty-1))){g.fillStyle=INK;g.fillRect(px,py,T,1);g.fillStyle=hi;g.fillRect(px,py+1,T,1);}
    if(!ROOF.includes(at(m,tx,ty+1))){g.fillStyle=shade;g.fillRect(px,py+T-2,T,1);g.fillStyle=INK;g.fillRect(px,py+T-1,T,1);}
    g.fillStyle=INK; if(!ROOF.includes(at(m,tx-1,ty))) g.fillRect(px,py,1,T); if(!ROOF.includes(at(m,tx+1,ty))) g.fillRect(px+T-1,py,1,T);
    if(!ROOF.includes(at(m,tx+1,ty))){ g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(px+T-3,py+2,2,T-4); }
  } else if(WALL.includes(ch)){
    if(ROOF.includes(at(m,tx,ty-1))){g.fillStyle='rgba(55,75,69,.18)';g.fillRect(px,py,T,2);}
    const rightOpen=!WALL.includes(at(m,tx+1,ty)), leftOpen=!WALL.includes(at(m,tx-1,ty));
    if(rightOpen){ g.fillStyle='rgba(0,0,0,.14)'; g.fillRect(px+T-3,py+1,2,T-2); }
    g.fillStyle=INK; if(leftOpen) g.fillRect(px,py,1,T); if(rightOpen) g.fillRect(px+T-1,py,1,T);
  } else if(WALL.includes(at(m,tx,ty-1))){
    // 건물 바로 아래 땅: 오른쪽으로 살짝 치우친 그림자
    g.fillStyle='rgba(30,25,20,.22)'; g.fillRect(px+1,py,T-1,3); g.fillRect(px+3,py+3,T-3,1);
  }
}
/* 꾸밈(v0.20): 지도 글자는 그대로 두고 그릴 때만 다듬는다.
   · 풀·긴 풀·나무·꽃·바위는 자리 해시로 모양을 섞는다  · 물은 두 틀이 번갈아 흔들리고 뭍과 닿는 쪽에 물거품 줄
   · 길·모래는 풀과 닿는 모서리를 둥글게 깎고 가장자리에 옅은 테두리  · 실내 바닥은 격자 */
const hash=(x,y)=>{ let h=(x*374761393+y*668265263)|0; h=(h^(h>>>13))*1274126177|0; return ((h^(h>>>16))>>>0)/4294967296; };
const VARIANT={',':[.62,.84],'t':[.5],'T':[.5],'F':[.4,.7],'#':[.6]};
const GRASSY=',tTF#fsoxi', GROUND='.n', WATER='wj';
function tileKey(ch,tx,ty,frame){
  if(ch==='w') return (frame>>5)%2?'t_w2':'t_w';
  if(ch==='_') return (tx+ty)%2?'t__2':'t__';
  const v=VARIANT[ch]; if(v){ const h=hash(tx,ty); let i=0; while(i<v.length&&h>=v[i]) i++; if(i>0) return 't_'+ch+(i+1); }
  return 't_'+ch;
}
function trim(g,m,tx,ty,ch,px,py){
  if(GROUND.includes(ch)){
    const grass=ch2=>GRASSY.includes(ch2), L=grass(at(m,tx-1,ty)), R=grass(at(m,tx+1,ty)), U=grass(at(m,tx,ty-1)), D=grass(at(m,tx,ty+1));
    const edge=ch==='.'?'#c1b18e':'#d0c4a6', green=TERRAIN['1'];
    g.fillStyle=edge; if(L) g.fillRect(px,py,1,T); if(R) g.fillRect(px+T-1,py,1,T); if(U) g.fillRect(px,py,T,1); if(D) g.fillRect(px,py+T-1,T,1);
    g.fillStyle=green; if(L&&U){ g.fillRect(px,py,2,1); g.fillRect(px,py,1,2); } if(R&&U){ g.fillRect(px+T-2,py,2,1); g.fillRect(px+T-1,py,1,2); } if(L&&D){ g.fillRect(px,py+T-1,2,1); g.fillRect(px,py+T-2,1,2); } if(R&&D){ g.fillRect(px+T-2,py+T-1,2,1); g.fillRect(px+T-1,py+T-2,1,2); }
    g.fillStyle=edge; if(L&&U) g.fillRect(px+1,py+1,1,1); if(R&&U) g.fillRect(px+T-2,py+1,1,1); if(L&&D) g.fillRect(px+1,py+T-2,1,1); if(R&&D) g.fillRect(px+T-2,py+T-2,1,1);
  } else if(WATER.includes(ch)){
    const land=ch2=>!WATER.includes(ch2)&&ch2!==' ', L=land(at(m,tx-1,ty)), R=land(at(m,tx+1,ty)), U=land(at(m,tx,ty-1)), D=land(at(m,tx,ty+1));
    g.fillStyle=TERRAIN['8']; if(L) g.fillRect(px,py,1,T); if(R) g.fillRect(px+T-1,py,1,T); if(U) g.fillRect(px,py,T,1); if(D) g.fillRect(px,py+T-1,T,1);
    g.fillStyle='#dce9db'; if(U){ const o=(tx*5+(S_FRAME>>4))%6; g.fillRect(px+o,py+1,2,1); } if(L){ const o=(ty*5+(S_FRAME>>4))%6; g.fillRect(px+1,py+o,1,2); }
  }
}
let S_FRAME=0;
function drawWorld(g,S){ const m=MAPS[S.map], [cx,cy]=camera(S); S_FRAME=S.frame;
  g.fillStyle='#1a1826'; g.fillRect(0,0,W,H);
  const x0=Math.max(0,Math.floor(cx/T)), y0=Math.max(0,Math.floor(cy/T)), x1=Math.min(m.grid[0].length-1,Math.floor((cx+W)/T)), y1=Math.min(m.grid.length-1,Math.floor((cy+H)/T));
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){ const ch=m.grid[ty][tx]; const k=tileKey(ch,tx,ty,S.frame); const px=tx*T-cx, py=ty*T-cy; spr(g,SP.has(k)?k:'t_.',px,py); trim(g,m,tx,ty,ch,px,py); building(g,m,tx,ty,ch,px,py); }
  for(const it of (m.items||[])){ if(S.picked[S.map+':'+it.x+':'+it.y]) continue; spr(g,'ball',it.x*T-cx,it.y*T-cy); }
  const ents=[]; for(const n of S.npcs) if(n.map===S.map) ents.push({e:n,key:entKey(n.spr,n,true),bang:n.bang});
  if(!S.petHidden) ents.push({e:S.pet,key:entKey('pet',S.pet,true)});
  ents.push({e:S.hero,key:entKey('hero',S.hero,true)});
  ents.sort((a,b)=>a.e.y-b.e.y);
  for(const o of ents){ const e=o.e; spr(g,o.key,e.x-cx,e.y-cy,e.dir==='right'); if(o.bang>0) spr(g,'bang',e.x-cx,e.y-cy-14); }
  // 지도 이름 띠
  if(S.mapTitle>0){ const nm=m.name; g.font=FONTB; const w=g.measureText(nm).width+14; box(g,4,4,w,18); text(g,nm,11,7,'#2e2a38',true); }
}
/* ---------- 대화 ---------- */
function drawDialog(g,S){ const d=S.dialog; if(!d||d.wait) return;
  if(d.choice){ const c=d.choice; g.font=FONT; const w=Math.max(...c.items.map(s=>g.measureText(s).width))+30, h=c.items.length*14+10; const x=W-w-6, y=H-50-h; box(g,x,y,w,h);
    c.items.forEach((s,i)=>{ text(g,s,x+18,y+5+i*14); if(i===c.i) text(g,'▶',x+6,y+5+i*14); }); return; }
  box(g,2,H-50,W-4,48); const page=d.pages[d.i]||''; const shown=page.slice(0,d.n); const lines=wrap(g,shown,W-28);
  lines.slice(0,3).forEach((l,i)=>text(g,l,12,H-44+i*13));
  if(d.n>=page.length&&(S.frame>>4)%2===0) spr(g,'arrow',W-18,H-14);
}
/* ---------- 전투 ---------- */
function drawBattle(g,S){ const B=S.battle, me=S.party[B.me], f=B.foes[B.fi], fr=S.frame;
  // 먼 능선과 가까운 발판. 캐릭터 크기·위치·전투 원근은 그대로 둔다.
  const bg=g.createLinearGradient(0,0,0,142);bg.addColorStop(0,'#b6c9c3');bg.addColorStop(.48,'#e4e5cf');bg.addColorStop(1,'#d2d7ba');g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.fillStyle='#b2c3aa';g.beginPath();g.moveTo(0,66);g.quadraticCurveTo(75,45,156,70);g.quadraticCurveTo(234,48,320,64);g.lineTo(320,83);g.lineTo(0,83);g.fill();
  g.fillStyle='#c1cba9';g.fillRect(0,81,W,1);
  for(const [x,y,rx,ry] of [[278,48,28,6],[76,136,70,14]]){
    g.fillStyle='#a8b998';g.beginPath();g.ellipse(x,y+2,rx,ry,0,0,Math.PI*2);g.fill();
    g.fillStyle='#dce0be';g.beginPath();g.ellipse(x,y,rx-2,ry-2,0,0,Math.PI*2);g.fill();
    g.fillStyle='#bdc9a5';g.fillRect(x-rx*.45,y+1,rx*.32,1);
  }
  const sx=B.shake>0?Math.round(Math.sin(fr*1.7)*3):0;
  // 상대
  const vis=(m,fl)=>(m.hp>0||(B.cur&&B.cur.t==='hp'))&&!(fl>0&&(fr>>1)%2===0);
  if(vis(f,B.flash.foe)) sprScaled(g,'m_'+f.key,262+sx,14,1.5,false);
  // 나
  if(vis(me,B.flash.me)) sprScaled(g,'m_'+me.key,40-sx,70,3,true);
  // 상대 정보
  box(g,6,8,124,34); text(g,E.name(f),12,11,'#2e2a38',true); text(g,'Lv'+f.lv,96,11); bar(g,30,30,92,5,f.hp/f.maxhp,hpCol(f.hp/f.maxhp)); text(g,'HP',12,26,'#8a4a2a',true);
  if(S.dex.caught[f.key]&&B.kind==='wild') spr(g,'ball',114,8);
  // 내 정보
  box(g,186,92,128,46); text(g,E.name(me),192,95,'#2e2a38',true); text(g,'Lv'+me.lv,280,95); bar(g,214,113,92,5,me.hp/me.maxhp,hpCol(me.hp/me.maxhp)); text(g,'HP',192,109,'#8a4a2a',true);
  text(g,`${me.hp}/${me.maxhp}`,250,121); const e0=E.expFor(me.lv), e1=E.expFor(me.lv+1); bar(g,214,133,92,2,me.lv>=E.MAXLV?1:(me.exp-e0)/(e1-e0),'#3b63b5');
  // 아래 상자
  box(g,2,H-50,W-4,48);
  if(B.phase==='menu'){ const lines=wrap(g,B.text,150); lines.slice(0,3).forEach((l,i)=>text(g,l,12,H-44+i*13)); box(g,170,H-50,148,48);
    ['싸운다','가방','동현몬','도망'].forEach((s,i)=>{ const x=190+(i%2)*68, y=H-42+Math.floor(i/2)*18; text(g,s,x,y,'#2e2a38',true); if(B.cursor===i) text(g,'▶',x-12,y); }); }
  else if(B.phase==='moves'){ const mv=me.moves; mv.forEach((k,i)=>{ text(g,MOVES[k].name,24,H-45+i*11); if(B.mcur===i) text(g,'▶',10,H-45+i*11); });
    const m=MOVES[mv[Math.min(B.mcur,mv.length-1)]]||{type:'normal'}; box(g,170,H-50,148,48); text(g,'속성 '+TYPES[m.type],180,H-44); text(g,'위력 '+(m.pow||'—'),180,H-31); text(g,'명중 '+(m.acc||100),250,H-31); text(g,m.desc||'',180,H-18,'#5a5262'); }
  else if(B.phase==='bag'){ const list=D.ITEM_ORDER.filter(k=>S.bag[k]>0); if(!list.length) text(g,'가방이 비었다.',24,H-44);
    list.forEach((k,i)=>{ text(g,`${ITEMS[k].name} ×${S.bag[k]}`,24,H-45+i*11); if(B.bcur===i) text(g,'▶',10,H-45+i*11); }); text(g,'Z 돌아가기',240,H-16,'#5a5262'); }
  else { const lines=wrap(g,B.text.slice(0,B.n),W-28); lines.slice(0,3).forEach((l,i)=>text(g,l,12,H-44+i*13)); }
  if(B.phase==='keep'&&B.keep) drawParty(g,S,B.pcur,E.josa(`${E.name(B.keep)}과(와) 누구를 바꿀까?`),'Z: 새 동현몬을 맡긴다');
  if(B.phase==='party') drawParty(g,S,B.pcur,B.forced?'싸울 동현몬을 고르자':'교대할 동현몬 (Z 돌아가기)',B.text&&B.phase==='party'&&B.text.includes('!')?B.text:null);
}
function drawParty(g,S,cur,title,note){ g.fillStyle='rgba(20,18,30,0.55)'; g.fillRect(0,0,W,H); box(g,14,10,W-28,H-20); text(g,title,24,15,'#2e2a38',true);
  S.party.forEach((m,i)=>{ const y=32+i*24; if(i===cur) text(g,'▶',20,y+4); sprScaled(g,'m_'+m.key,32,y-2,1,false); text(g,E.name(m),62,y,m.hp>0?'#2e2a38':'#9a3a3a',true); text(g,'Lv'+m.lv,150,y); bar(g,190,y+4,90,4,m.hp/m.maxhp,hpCol(m.hp/m.maxhp)); text(g,`${m.hp}/${m.maxhp}`,190,y+10,'#5a5262'); });
  if(note){ if(S.party.length>=6){ g.font=FONT; text(g,note,W-28-g.measureText(note).width,16,'#9a3a3a'); } else text(g,note,24,H-26,'#9a3a3a'); } } /* 여섯이 다 찼으면 안내를 제목 줄 오른쪽에 둔다(여섯째 줄과 겹치지 않게) */
/* ---------- 전체 ---------- */
function draw(g,S){ g.imageSmoothingEnabled=false;
  if(S.battle) drawBattle(g,S); else { drawWorld(g,S); drawDialog(g,S); }
  const a=S.fade>0?1-S.fade/20:S.fadeIn>0?S.fadeIn/14:0; if(a>0){ g.fillStyle=`rgba(10,8,16,${Math.min(1,a).toFixed(2)})`; g.fillRect(0,0,W,H); }
  if(S.status==='win'&&!S.dialog&&!S.battle){ box(g,52,70,216,52); text(g,'멈춤단을 물리쳤다!',98,78,'#2e2a38',true); text(g,'동현이구나 · 동현몬스터 화이트 승리',72,98,'#5a5262'); }
}
/* 출전 전 미리보기: 시작 마을 위에 코드가 정한 설정(성격·능력치·출현율·소지금·시드)을 카드로 띄운다. 예제를 바꾸면 바로 바뀐다 */
function preview(g,S,pv){ draw(g,S); if(!pv) return; const h=56, y=H-h-6; box(g,6,y,W-12,h);
  sprScaled(g,'m_podong',14,y+8,1.5,false);
  text(g,'미리보기 · '+pv.title,58,y+6,'#2e2a38',true); text(g,pv.stats,58,y+21,'#5a5262'); text(g,pv.world,58,y+36,'#5a5262'); }
root.Render={draw,drawParty,preview,W,H};
})(window);
