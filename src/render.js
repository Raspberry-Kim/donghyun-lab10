/* 동현몬 그리기: 320×192 캔버스에 지도·사람·대화·전투 화면을 그린다. */
(function(root){
'use strict';
const {T,MAPS,ITEMS,MOVES,TYPES}=root.DATA, SP=root.Sprites, E=root.Engine;
const W=320,H=192, FONT="11px Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif", FONTB="bold 11px Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";
function spr(g,key,x,y,flip){ const c=SP.make(key,flip); g.drawImage(c,Math.round(x),Math.round(y)); }
function sprScaled(g,key,x,y,s,flip){ const c=SP.make(key,flip); g.drawImage(c,Math.round(x),Math.round(y),c.width*s,c.height*s); }
function entKey(base,e,hasWalk){ const d=e.dir==='right'?'left':e.dir; const f=(e.moving>0&&hasWalk&&(Math.floor(e.anim/4)%2===1))?'2':''; let k=base+'_'+d+f; if(!SP.has(k)) k=base+'_'+d; if(!SP.has(k)) k=base+'_down'; return k; }
function box(g,x,y,w,h){ g.fillStyle='#f8f4ea'; g.fillRect(x,y,w,h); g.fillStyle='#2e2a38'; g.fillRect(x,y,w,2); g.fillRect(x,y+h-2,w,2); g.fillRect(x,y,2,h); g.fillRect(x+w-2,y,2,h); g.fillStyle='#8a8070'; g.fillRect(x+2,y+2,w-4,1); g.fillRect(x+2,y+2,1,h-4); }
function text(g,s,x,y,col,bold){ g.font=bold?FONTB:FONT; g.fillStyle=col||'#2e2a38'; g.textBaseline='top'; g.fillText(s,x,y); }
function wrap(g,s,maxW){ g.font=FONT; const out=[]; for(const para of s.split('\n')){ let line=''; for(const ch of para){ if(g.measureText(line+ch).width>maxW&&line){ out.push(line); line=ch; } else line+=ch; } out.push(line); } return out; }
function bar(g,x,y,w,h,ratio,col){ g.fillStyle='#2e2a38'; g.fillRect(x-1,y-1,w+2,h+2); g.fillStyle='#d8d2c4'; g.fillRect(x,y,w,h); g.fillStyle=col; g.fillRect(x,y,Math.round(w*Math.max(0,Math.min(1,ratio))),h); }
const hpCol=r=>r>0.5?'#58b84a':r>0.2?'#e8b020':'#d6403a';

/* ---------- 지도 ---------- */
function camera(S){ const m=MAPS[S.map], mw=m.grid[0].length*T, mh=m.grid.length*T, h=S.hero; let cx,cy;
  if(mw<=W) cx=Math.round((mw-W)/2); else cx=Math.max(0,Math.min(mw-W,Math.round(h.x+T/2-W/2)));
  if(mh<=H) cy=Math.round((mh-H)/2); else cy=Math.max(0,Math.min(mh-H,Math.round(h.y+T/2-H/2)));
  S.cam.x=cx; S.cam.y=cy; return [cx,cy]; }
/* 건물 입체감(동현워 건물을 따른다): 지붕·벽의 바깥 모서리에 테두리, 벽 오른쪽에 그늘 기둥, 건물 아래 땅에 그림자. 이웃 칸을 보고 그리므로 지도 글자는 그대로다. */
const ROOF='RCLG', WALL='HWD';
function at(m,x,y){ const r=m.grid[y]; return r?(r[x]||' '):' '; }
function building(g,m,tx,ty,ch,px,py){
  const INK='#2e2a38';
  if(ROOF.includes(ch)){
    g.fillStyle=INK; if(!ROOF.includes(at(m,tx-1,ty))) g.fillRect(px,py,1,T); if(!ROOF.includes(at(m,tx+1,ty))) g.fillRect(px+T-1,py,1,T);
    if(!ROOF.includes(at(m,tx+1,ty))){ g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(px+T-3,py+2,2,T-4); }
  } else if(WALL.includes(ch)){
    const rightOpen=!WALL.includes(at(m,tx+1,ty)), leftOpen=!WALL.includes(at(m,tx-1,ty));
    if(rightOpen){ g.fillStyle='rgba(0,0,0,.14)'; g.fillRect(px+T-3,py+1,2,T-2); }
    g.fillStyle=INK; if(leftOpen) g.fillRect(px,py,1,T); if(rightOpen) g.fillRect(px+T-1,py,1,T);
  } else if(WALL.includes(at(m,tx,ty-1))){
    // 건물 바로 아래 땅: 오른쪽으로 살짝 치우친 그림자
    g.fillStyle='rgba(30,25,20,.22)'; g.fillRect(px+1,py,T-1,3); g.fillRect(px+3,py+3,T-3,1);
  }
}
function drawWorld(g,S){ const m=MAPS[S.map], [cx,cy]=camera(S);
  g.fillStyle='#1a1826'; g.fillRect(0,0,W,H);
  const x0=Math.max(0,Math.floor(cx/T)), y0=Math.max(0,Math.floor(cy/T)), x1=Math.min(m.grid[0].length-1,Math.floor((cx+W)/T)), y1=Math.min(m.grid.length-1,Math.floor((cy+H)/T));
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){ const ch=m.grid[ty][tx]; const k='t_'+ch; spr(g,SP.has(k)?k:'t_.',tx*T-cx,ty*T-cy); building(g,m,tx,ty,ch,tx*T-cx,ty*T-cy); }
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
  g.fillStyle='#eef3e6'; g.fillRect(0,0,W,H);
  g.fillStyle='#d8e6c4'; g.beginPath(); g.ellipse(278,48,28,6,0,0,Math.PI*2); g.fill(); g.beginPath(); g.ellipse(76,136,70,14,0,0,Math.PI*2); g.fill();
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
  else if(B.phase==='bag'){ const list=['ball','potion','superpotion'].filter(k=>S.bag[k]>0); if(!list.length) text(g,'가방이 비었다.',24,H-44);
    list.forEach((k,i)=>{ text(g,`${ITEMS[k].name} ×${S.bag[k]}`,24,H-45+i*11); if(B.bcur===i) text(g,'▶',10,H-45+i*11); }); text(g,'Z 돌아가기',240,H-16,'#5a5262'); }
  else { const lines=wrap(g,B.text.slice(0,B.n),W-28); lines.slice(0,3).forEach((l,i)=>text(g,l,12,H-44+i*13)); }
  if(B.phase==='party') drawParty(g,S,B.pcur,B.forced?'싸울 동현몬을 고르자':'교대할 동현몬 (Z 돌아가기)',B.text&&B.phase==='party'&&B.text.includes('!')?B.text:null);
}
function drawParty(g,S,cur,title,note){ g.fillStyle='rgba(20,18,30,0.55)'; g.fillRect(0,0,W,H); box(g,14,10,W-28,H-20); text(g,title,24,15,'#2e2a38',true);
  S.party.forEach((m,i)=>{ const y=32+i*24; if(i===cur) text(g,'▶',20,y+4); sprScaled(g,'m_'+m.key,32,y-2,1,false); text(g,E.name(m),62,y,m.hp>0?'#2e2a38':'#9a3a3a',true); text(g,'Lv'+m.lv,150,y); bar(g,190,y+4,90,4,m.hp/m.maxhp,hpCol(m.hp/m.maxhp)); text(g,`${m.hp}/${m.maxhp}`,190,y+10,'#5a5262'); });
  if(note) text(g,note,24,H-26,'#9a3a3a'); }
/* ---------- 전체 ---------- */
function draw(g,S){ g.imageSmoothingEnabled=false;
  if(S.battle) drawBattle(g,S); else { drawWorld(g,S); drawDialog(g,S); }
  const a=S.fade>0?1-S.fade/20:S.fadeIn>0?S.fadeIn/14:0; if(a>0){ g.fillStyle=`rgba(10,8,16,${Math.min(1,a).toFixed(2)})`; g.fillRect(0,0,W,H); }
  if(S.status==='win'&&!S.dialog&&!S.battle){ box(g,60,70,200,52); text(g,'배지를 얻었다!',110,78,'#2e2a38',true); text(g,'동현몬스터 화이트 · 승리',96,98,'#5a5262'); }
}
root.Render={draw,drawParty,W,H};
})(window);
