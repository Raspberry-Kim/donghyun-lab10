/* 동현몬 확장 세계 생성기(v0.18): 뚱띠 고개·뿡뿡항·또치 숲·꽥꽥마을·멈춤 길·호숫길·신중동역과 실내 지도를 만들어 src/world.js로 적는다.
   node tools/worldgen.cjs  → src/world.js (정적 격자 + 새 사람 목록). 생성 뒤 이어진 길을 BFS로 확인한다.
   지도 글자는 data.js 머리말과 같다. 추가: P 부두 널빤지  n 모래  r 철로(막힘)  S 계단(밟으면 층 이동)
   Z 역 지붕  V 역 벽  O 기둥(막힘)  c 의자(막힘)  q 멈춘 열차(막힘) */
'use strict';
const fs=require('fs'), path=require('path');
function rngOf(seed){ let a=seed|0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const SOLID='Twfs#RCLGHW=kbBpqrZVOc';
class G{
  constructor(w,h,fill){ this.w=w; this.h=h; this.g=Array.from({length:h},()=>Array(w).fill(fill)); this.keep=new Set(); }
  at(x,y){ return (x<0||y<0||x>=this.w||y>=this.h)?'T':this.g[y][x]; }
  put(x,y,c,lock){ if(x<0||y<0||x>=this.w||y>=this.h) return; this.g[y][x]=c; if(lock) this.keep.add(x+','+y); }
  rect(x,y,w,h,c,lock){ for(let j=0;j<h;j++) for(let i=0;i<w;i++) this.put(x+i,y+j,c,lock); }
  border(c){ this.rect(0,0,this.w,1,c,true); this.rect(0,this.h-1,this.w,1,c,true); this.rect(0,0,1,this.h,c,true); this.rect(this.w-1,0,1,this.h,c,true); }
  /* 길: 두 점을 ㄱ자로 잇는다(가로 먼저). 폭 2 */
  road(x1,y1,x2,y2,w=2,c='.'){ const sx=Math.min(x1,x2), ex=Math.max(x1,x2); for(let x=sx;x<=ex;x++) for(let k=0;k<w;k++) this.put(x,y1+k,c,true); const sy=Math.min(y1,y2), ey=Math.max(y1,y2); for(let y=sy;y<=ey;y++) for(let k=0;k<w;k++) this.put(x2+k,y,c,true); }
  vroad(x,y1,y2,w=2,c='.'){ for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++) for(let k=0;k<w;k++) this.put(x+k,y,c,true); }
  hroad(y,x1,x2,w=2,c='.'){ for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++) for(let k=0;k<w;k++) this.put(x,y+k,c,true); }
  /* 건물: 지붕 rows줄 + 벽 1줄, 문은 벽 줄의 doorX */
  building(x,y,w,rows,roof,wall,doorX){ this.rect(x,y,w,rows,roof,true); this.rect(x,y+rows,w,1,wall,true); this.put(doorX,y+rows,'D',true); for(let i=0;i<w;i++) this.put(x+i,y+rows+1,this.at(x+i,y+rows+1)==='T'?',':this.at(x+i,y+rows+1),true); }
  /* 꾸밈: 잠기지 않은 풀 칸에 흩뿌린다 */
  scatter(rng,c,n,ok){ let tries=0; while(n>0&&tries<5000){ tries++; const x=1+Math.floor(rng()*(this.w-2)), y=1+Math.floor(rng()*(this.h-2)); if(this.keep.has(x+','+y)||this.g[y][x]!==',') continue; if(ok&&!ok(x,y)) continue; this.g[y][x]=c; n--; } }
  blob(rng,x,y,r,c,only){ for(let j=-r;j<=r;j++) for(let i=-r;i<=r;i++){ if(i*i+j*j>r*r+rng()*r) continue; const X=x+i,Y=y+j; if(this.keep.has(X+','+Y)) continue; if(only&&!only.includes(this.at(X,Y))) continue; this.put(X,Y,c); } }
  lines(){ return this.g.map(r=>r.join('')); }
}
const warp=(x,y,map,tx,ty,dir,tag)=>Object.assign({x,y,to:{map,x:tx,y:ty,dir}},tag?{tag}:{});
const back=(x,y)=>({x,y,to:'back'});
const MAPS={}, NPCS=[];
const T=(id,map,x,y,dir,spr,name,party,reward,text,after,extra)=>NPCS.push(Object.assign({id,map,x,y,dir,spr,sight:4,trainer:Object.assign({name,party,reward},extra&&extra.trainer||{}),text,after},extra&&extra.npc||{}));
const P=(id,map,x,y,dir,spr,text,extra)=>NPCS.push(Object.assign({id,map,x,y,dir,spr,text},extra||{}));

/* ================= 뚱띠 고개 (route2) 64×20 ================= */
{
  const r=rngOf(201), g=new G(64,20,','); g.border('T');
  g.hroad(9,1,12); g.road(12,9,24,4); g.hroad(4,24,40); g.road(40,4,52,12); g.hroad(12,52,58); g.road(58,12,61,8); g.hroad(8,58,62);
  /* 서쪽 입구 주머니: (1~2, 9~10)만 열리고 (3,10)은 바위, (3,9)에 멈춤단원이 선다 */
  g.rect(1,8,3,1,'#',true); g.rect(1,11,3,1,'#',true); g.put(3,10,'#',true); g.put(3,9,'.',true);
  /* 바위 능선 */
  for(let x=4;x<60;x+=1){ if(r()<.55) g.put(x,1+Math.floor(r()*2),'#'); }
  g.blob(r,18,15,3,'#',[',']); g.blob(r,33,14,3,'#',[',']); g.blob(r,47,3,2,'#',[',']); g.blob(r,8,15,2,'#',[',']);
  /* 긴 풀 */
  g.blob(r,16,7,3,'t',[',']); g.blob(r,30,8,4,'t',[',']); g.blob(r,44,9,3,'t',[',']); g.blob(r,55,16,3,'t',[',']); g.blob(r,26,16,3,'t',[',']); g.blob(r,50,6,2,'t',[',']);
  g.scatter(r,'T',40); g.scatter(r,'F',12); g.scatter(r,'#',10);
  MAPS.route2={name:'뚱띠 고개',kind:'out',grid:g.lines(),
    warps:[warp(0,9,'town2',22,7,'left'),warp(0,10,'town2',22,8,'left'),warp(63,8,'town3',1,8,'right'),warp(63,9,'town3',1,9,'right')],
    signs:[{x:5,y:7,text:['뚱띠 고개\n← 동현시   뿡뿡항 →\n"고개는 길을 반으로 나눈다."']},{x:57,y:7,text:['뚱띠 고개 동쪽\n바닷바람이 분다. → 뿡뿡항']}],
    items:[{x:30,y:16,item:'potion',n:2},{x:46,y:15,item:'ball',n:3},{x:54,y:3,item:'superpotion',n:1}],
    wild:[{maxX:30,maxY:99,table:[['inf',25],['pike',20],['archer',20],['scout',20],['copter',15]],lv:[9,12]},{maxX:99,maxY:99,table:[['scout',30],['archer',20],['pike',20],['copter',20],['inf',10]],lv:[11,14]}],
    spawn:{x:1,y:9,dir:'right'}};
  T('h1','route2',3,9,'left','halt','멈춤단원 하나',[['inf',9],['archer',9]],300,['멈춤단원: 오겡끼데스까!\n여기서부터 멈춤단의 고개다.\n돌아가지 않으면 멈춰 주마!'],['멈춤단원: 으윽… 이번엔 내가 멈췄다.\n역장님께 알려야겠다!'],{trainer:{flee:true},npc:{sight:3}});
  T('h2','route2',13,7,'down','hiker','등산가 바위',[['inf',10],['pike',10]],340,['등산가 바위: 고개를 오르는 사람은\n누구든 내 상대가 된다!'],['등산가 바위: 다리가 튼튼하군.\n고개 너머는 바다다.']);
  T('h3','route2',36,6,'up','girl','활 소녀 시위',[['archer',11],['copter',11]],360,['활 소녀 시위: 멀리서 다 보고 있었어.\n겨냥은 내가 더 정확해!'],['활 소녀 시위: 졌다…\n뿡뿡항 관장은 하늘을 쓴대.']);
  T('h4','route2',51,13,'left','hiker','등산가 벼랑',[['pike',12],['scout',12],['inf',12]],400,['등산가 벼랑: 멈춤단이 고개를 막더니\n요즘 여행자가 통 안 온다. 반갑구나!'],['등산가 벼랑: 좋은 승부였다.\n뿡뿡항 회복소에서 쉬어 가라.']);
  P('h5','route2',57,10,'down','old',['뚱띠는 몫이다. 고개는 길을 둘로 나눈다.\n멈춤단은 세상 프로그램을 멈추려 한다더라.\n신중동역에 그 역장이 산다지.'],{wander:1});
}

/* ================= 뿡뿡항 (town3) 30×22 ================= */
{
  const r=rngOf(301), g=new G(30,22,','); g.border('T');
  g.rect(0,16,30,6,'w',true); g.rect(1,15,28,1,'n',true); g.rect(1,14,28,1,'n'); /* 바다와 모래 */
  g.rect(12,15,2,6,'P',true); g.rect(10,19,6,1,'P',true); g.rect(26,15,2,4,'P',true);    /* 부두 */
  g.hroad(8,1,14); g.vroad(14,1,13); g.hroad(12,3,26); g.vroad(21,8,12);
  g.building(3,3,6,2,'G','H',6);     /* 체육관 (문 6,5) */
  g.building(18,2,5,1,'C','H',20);   /* 회복소 (문 20,3) */
  g.building(24,6,4,1,'R','H',25);   /* house3a (문 25,7) */
  g.building(4,10,4,1,'R','H',5);    /* house3b (문 5,11) */
  g.put(7,9,'.',true); g.put(5,12,'.',true); g.put(20,4,'.',true); g.put(25,8,'.',true);
  g.scatter(r,'F',10,(x,y)=>y<14); g.scatter(r,'T',6,(x,y)=>y<13&&x>22); g.put(2,8,'.',true);
  MAPS.town3={name:'뿡뿡항',kind:'out',grid:g.lines(),
    warps:[warp(0,8,'route2',62,8,'left'),warp(0,9,'route2',62,9,'left'),warp(14,0,'route3',14,46,'up'),warp(15,0,'route3',15,46,'up'),
      warp(6,5,'gym2',6,16,'up'),warp(20,3,'center',5,6,'up','center3'),warp(25,7,'house3a',4,6,'up'),warp(5,11,'house3b',4,6,'up')],
    signs:[{x:10,y:6,text:['뿡뿡항\n뿡뿡 소리로 배를 부르는 항구.\n체육관 관장: 뿡뿡 (비행)']},{x:16,y:13,text:['뿡뿡항 부두\n배는 멈춤단 때문에 다니지 않는다.\n↑ 또치 숲']}],
    items:[{x:27,y:18,item:'hyperpotion',n:1},{x:10,y:19,item:'ball',n:2}],
    spawn:{x:14,y:11,dir:'up'}};
  P('p1','town3',16,9,'down','sailor',['뱃사람: 멈춤단이 역을 막은 뒤로\n배가 한 척도 안 뜬다. 뿡뿡 소리만 울리지.'],{wander:2});
  P('p2','town3',22,13,'left','woman',['관장 뿡뿡은 비행 동현몬을 쓴다.\n강철 기술이 잘 통하지. 전차·기사가 있으면 좋아.'],{wander:1});
  P('p3','town3',12,17,'down','fisher',['낚시꾼: 바다 너머에도 길이 있다는데\n멈춤단이 열차를 세워서 가 볼 수가 없다.']);
  P('p4','town3',8,13,'right','boy',['뚱띠 고개 바위 뒤에 좋은상처약이 있었어.\n봤어? 못 봤으면 돌아가 봐!'],{wander:1});
  P('h3a','house3a',6,3,'left','mom',['우리 아이가 체육관에 다닌단다.\n관장 뿡뿡은 뿔피리를 불며 동현몬을 부른대.']);
  P('h3b','house3b',3,3,'right','old',['동현랭에서 뿡뿡은 값을 적는 말이다.\n뿡뿡뿡이면 글자로 적지. 항구 이름이 거기서 왔다.','멈춤단의 "오겡끼데스까"는 프로그램을 멈추는 말이다.\n그들은 세상 전체를 멈추려 한다.']);
}

/* ================= 뿡뿡항 체육관 (gym2) 14×18 ================= */
{
  const g=new G(14,18,'_'); g.border('='); g.rect(1,0,12,1,'=',true);
  g.put(6,16,'m',true); g.put(7,16,'m',true); g.put(3,4,'p',true); g.put(10,4,'p',true); g.rect(2,11,1,1,'p',true); g.rect(11,11,1,1,'p',true);
  MAPS.gym2={name:'뿡뿡항 체육관',kind:'in',grid:g.lines(),warps:[warp(6,16,'town3',6,6,'down'),warp(7,16,'town3',6,6,'down')],signs:[],spawn:{x:6,y:15,dir:'down'}};
  P('guide2','gym2',2,15,'right','boy',['여기는 뿡뿡항 체육관.\n관장 뿡뿡은 초파리·꼬리콥터·전투기·폭격기를 쓴다.\n비행에는 강철이 2배!','수련생 뿡뿡뿡은 글자 하나 차이로\n관장과 이름이 다르다. 셋 다 하늘을 난다.']);
  T('g3','gym2',4,12,'right','guard','수련생 날개',[['fly',12],['copter',12]],480,['수련생 날개: 하늘의 맛을 보여 주지!'],['수련생 날개: 날개가 꺾였다…']);
  T('g4','gym2',9,8,'left','guard','수련생 뿡뿡뿡',[['copter',13],['jet',14]],540,['수련생 뿡뿡뿡: 나는 글자 하나가 더 많다!\n그래서 한 수 위다!'],['수련생 뿡뿡뿡: 글자 수는 상관없었군.']);
  T('leader2','gym2',6,2,'down','leader2','관장 뿡뿡',[['fly',13],['copter',14],['jet',15],['bomber',16]],2200,['관장 뿡뿡: 뿡뿡! 바다 위를 나는 동현몬은\n땅의 동현몬보다 빠르다.','관장 뿡뿡: 소리 배지가 탐나거든 날개를 꺾어 봐라!'],['관장 뿡뿡: 훌륭하다. 소리 배지를 받아라.\n또치 숲을 지나 꽥꽥마을로 가 봐라.\n멈춤단을 막을 사람이 더 필요하다.'],{trainer:{badge:true},npc:{sight:0}});
  P('h3c','house3a',3,5,'down','girl',['포동이다! 우리 집 앞 부두에서\n꼬리콥터가 날아다니는 걸 봤어.']);
}

/* ================= 또치 숲 (route3) 24×48 ================= */
{
  const r=rngOf(401), g=new G(24,48,','); g.border('T');
  g.vroad(14,40,46); g.road(14,40,6,34); g.vroad(6,26,34); g.road(6,26,16,20); g.vroad(16,12,20); g.road(16,12,11,6); g.vroad(11,1,6);
  g.hroad(40,8,14,2); g.hroad(20,6,16,2); g.hroad(12,11,16,2); g.hroad(6,11,16,2);
  /* 우거진 숲: 길 밖은 대부분 나무, 군데군데 빈터와 긴 풀 */
  for(let y=1;y<47;y++) for(let x=1;x<23;x++){ if(g.keep.has(x+','+y)) continue; const nearRoad=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].some(([dx,dy])=>g.at(x+dx,y+dy)==='.'); if(!nearRoad&&r()<.72) g.put(x,y,'T'); }
  g.blob(r,9,38,2,'t',[',']); g.blob(r,4,30,2,'t',[',']); g.blob(r,18,24,3,'t',[',']); g.blob(r,8,22,2,'t',[',']); g.blob(r,19,15,2,'t',[',']); g.blob(r,7,9,2,'t',[',']); g.blob(r,14,3,2,'t',[',']);
  g.rect(3,36,3,1,'t'); g.rect(10,30,3,2,'t'); g.rect(18,9,3,3,'t');
  g.scatter(r,'F',8);
  MAPS.route3={name:'또치 숲',kind:'out',grid:g.lines(),
    warps:[warp(14,47,'town3',14,1,'down'),warp(15,47,'town3',15,1,'down'),warp(11,0,'town4',11,20,'up'),warp(12,0,'town4',12,20,'up')],
    signs:[{x:13,y:44,text:['또치 숲\n"나머지는 숲에 남는다."\n↑ 꽥꽥마을   ↓ 뿡뿡항']},{x:10,y:4,text:['또치 숲 북쪽\n↑ 꽥꽥마을. 벌레 동현몬이 많다.']}],
    items:[{x:4,y:37,item:'ball',n:3},{x:19,y:22,item:'superpotion',n:1},{x:8,y:10,item:'potion',n:2},{x:21,y:9,item:'hyperpotion',n:1}],
    wild:[{maxX:99,maxY:24,table:[['worm',25],['lion',20],['fly',20],['shushu',15],['copter',10],['scout',10]],lv:[14,17]},{maxX:99,maxY:99,table:[['worm',30],['lion',25],['fly',25],['shushu',10],['pike',10]],lv:[13,16]}],
    spawn:{x:14,y:45,dir:'up'}};
  T('f1','route3',8,36,'left','bugcatcher','벌레 채집가 또치',[['lion',14],['worm',14],['fly',15]],520,['벌레 채집가 또치: 숲의 벌레를 전부\n모을 거야! 너도 나머지로 남아라!'],['벌레 채집가 또치: 나머지가 0이 됐다…\n숲 북쪽은 슈슈가 자주 나온다.']);
  T('f2','route3',5,27,'down','girl','숲지기 솔',[['shushu',15],['copter',15]],560,['숲지기 솔: 숲을 시끄럽게 하는 자는\n여기서 멈춘다!'],['숲지기 솔: 미안, 멈춤단인 줄 알았어.\n그들은 숲 북쪽 길을 자주 지나.']);
  T('f3','route3',17,16,'down','halt','멈춤단원 둘',[['inf',15],['pike',15],['archer',16]],600,['멈춤단원: 오겡끼데스까!\n하나가 당했다더니 네놈이구나.\n여기서 멈춰라!'],['멈춤단원: 둘도 멈췄다…\n꽥꽥마을 너머 멈춤 길은 우리 구역이다. 오지 마라!']);
  T('f4','route3',10,8,'right','bugcatcher','벌레 채집가 잎',[['fly',16],['lion',16],['worm',17]],600,['벌레 채집가 잎: 날개 소리 들리지?\n내 초파리들이야!'],['벌레 채집가 잎: 꽥꽥마을 관장은\n격투와 벌레를 써. 비행이 잘 통해.']);
}

/* ================= 꽥꽥마을 (town4) 30×22 ================= */
{
  const r=rngOf(501), g=new G(30,22,','); g.border('T');
  g.vroad(11,12,20); g.hroad(10,1,28); g.vroad(11,4,10); g.hroad(4,11,20); g.vroad(20,4,9);
  g.building(4,4,6,2,'G','H',6);     /* 체육관3 (문 6,6) */
  g.building(22,5,5,1,'C','H',24);   /* 회복소 (문 24,6) */
  g.building(3,13,4,1,'R','H',4);    /* house4a (문 4,14) */
  g.building(22,14,4,1,'R','H',23);  /* house4b (문 23,15) */
  g.vroad(6,7,9,1); g.vroad(24,7,9,1); g.vroad(4,15,16,1); g.hroad(16,4,11,1); g.vroad(23,16,17,1); g.hroad(17,11,23,1);
  g.rect(14,14,4,3,'w',true); g.rect(13,13,6,1,'F'); g.rect(13,17,6,1,'F'); g.put(13,14,'F'); g.put(13,15,'F'); g.put(13,16,'F'); g.put(18,14,'F'); g.put(18,15,'F'); g.put(18,16,'F');
  g.scatter(r,'F',8); g.scatter(r,'T',8,(x,y)=>y<3||y>18||x>26);
  MAPS.town4={name:'꽥꽥마을',kind:'out',grid:g.lines(),
    warps:[warp(11,21,'route3',11,1,'down'),warp(12,21,'route3',12,1,'down'),warp(29,10,'route4',1,10,'right'),warp(29,11,'route4',1,11,'right'),
      warp(0,10,'route5',38,14,'left'),warp(0,11,'route5',38,15,'left'),
      warp(6,6,'gym3',6,16,'up'),warp(24,6,'center',5,6,'up','center4'),warp(4,14,'house4a',4,6,'up'),warp(23,15,'house4b',4,6,'up')],
    signs:[{x:9,y:12,text:['꽥꽥마을\n묻기 좋아하는 사람들의 마을.\n체육관 관장: 꽥꽥 (격투·벌레)']},{x:27,y:9,text:['→ 멈춤 길 · 신중동역\n멈춤단 구역. 배지 셋이 없으면 못 들어간다.']},{x:2,y:9,text:['← 호숫길 · 하얀마을 지름길\n하얀마을 쪽 공사 중.']}],
    items:[{x:16,y:2,item:'ball',n:3},{x:27,y:19,item:'superpotion',n:1}],
    spawn:{x:11,y:18,dir:'up'}};
  P('q1','town4',14,8,'down','girl',['꽥꽥은 묻는 말이야. 그래서 이 마을 사람들은\n뭐든 묻지. 너도 하나 물을래?'],{ask:{q:'포동이는 말티즈냐?',items:['그렇다','아니다'],ans:['맞아! 하얀 털에 늘어진 귀.\n잘 아네.','틀렸어. 포동이는 말티즈야.\n하얀 털에 늘어진 귀!']}});
  P('q2','town4',19,12,'left','old',['관장 꽥꽥은 격투와 벌레를 쓴다.\n비행 기술이 둘 다에 2배란다.\n뿡뿡항에서 꼬리콥터를 잡았겠지?']);
  P('q3','town4',26,10,'left','worker',['멈춤 길 입구는 멈춤단 간부가 지킨다.\n배지 셋을 모아야 지나갈 수 있대.'],{ask:{q:'배지는 몇 개 모았냐?',items:['셋 다 모았다','아직이다'],ans:['그럼 당장 멈춤 길로 가라!\n간부가 길을 열 것이다.','체육관부터 가 봐라.\n관장 꽥꽥이 기다린다.']}});
  P('q4','town4',8,17,'right','boy',['호숫길로 가면 하얀마을이 금방이야.\n하얀마을 쪽은 공사 아저씨가 막고 있지만.'],{wander:1});
  P('h4a','house4a',6,3,'left','mom',['우리 집 아이는 묻는 걸 너무 좋아해.\n꽥꽥 하고 값을 받으면 그걸로 셈을 한단다.']);
  P('h4b','house4b',3,3,'right','old',['신중동역은 원래 열차가 서는 곳이었다.\n동현랭에서 신중동역 N은 N번째 줄로 뛰는 말이지.','멈춤단은 역을 점거하고 세상 프로그램을\n"오겡끼데스까"로 멈추려 한다.\n역장 오겡끼가 두목이다.']);
  P('h4c','house4b',6,5,'up','girl',['상자에 맡긴 동현몬은 체력이 가득 찬단다.\n회복소에서 상자를 열어 바꿀 수 있어.']);
}

/* ================= 꽥꽥마을 체육관 (gym3) 14×18 ================= */
{
  const g=new G(14,18,'_'); g.border('=');
  g.put(6,16,'m',true); g.put(7,16,'m',true); g.rect(5,6,4,1,'k',true); g.put(2,3,'p',true); g.put(11,3,'p',true); g.put(2,13,'p',true); g.put(11,13,'p',true);
  MAPS.gym3={name:'꽥꽥마을 체육관',kind:'in',grid:g.lines(),warps:[warp(6,16,'town4',6,7,'down'),warp(7,16,'town4',6,7,'down')],signs:[],spawn:{x:6,y:15,dir:'down'}};
  P('guide3','gym3',11,15,'left','boy',['여기는 꽥꽥마을 체육관.\n관장 꽥꽥은 슈슈·창병·보병을 쓴다.\n격투에는 비행이 2배, 벌레에도 비행이 2배!','수련생들은 물음표처럼 생긴 길로\n관장님 앞에 선다. 탁자를 돌아가라.']);
  T('g5','gym3',3,11,'right','guard','수련생 물음',[['pike',17],['shushu',17]],640,['수련생 물음: 묻겠다. 지나갈 자신 있냐?'],['수련생 물음: 답은 "있다"였군.']);
  T('g6','gym3',10,8,'left','guard','수련생 느낌',[['shushu',18],['inf',18],['pike',18]],700,['수련생 느낌: 느낌표처럼 강하게 간다!'],['수련생 느낌: 느낌이 안 좋더라니.']);
  T('leader3','gym3',6,2,'down','leader3','관장 꽥꽥',[['shushu',20],['pike',20],['inf',21],['shushu',22]],2800,['관장 꽥꽥: 묻겠다. 멈춤단을 막으러 왔냐?\n그렇다면 먼저 나를 넘어라.','관장 꽥꽥: 격투의 답을 보여 주마!'],['관장 꽥꽥: 답은 네 쪽이었군. 물음 배지를 받아라.\n배지 셋이면 멈춤 길 간부가 길을 연다.\n신중동역의 역장 오겡끼를 멈춰라.'],{trainer:{badge:true},npc:{sight:0}});
}

/* ================= 멈춤 길 (route4) 56×24 ================= */
{
  const r=rngOf(601), g=new G(56,24,','); g.border('T');
  g.hroad(10,1,10); g.road(10,10,20,16); g.hroad(16,20,38); g.road(38,16,46,10); g.hroad(10,46,52); g.vroad(49,9,10,1);
  /* 신중동역 정면: 지붕 Z 3줄 + 벽 V, 문 (49,8) */
  g.rect(44,5,11,3,'Z',true); g.rect(44,8,11,1,'V',true); g.put(49,8,'D',true); g.rect(44,9,11,1,',',true); g.put(49,9,'.',true);
  g.rect(44,4,11,1,'T',true); g.rect(43,4,1,6,'T',true); g.rect(55,4,1,6,'T',true);
  /* 철로가 역 뒤로 지나간다(막힘) */
  g.rect(1,2,54,1,'r',true); g.put(0,2,'T',true);
  g.blob(r,8,16,3,'t',[',']); g.blob(r,15,5,3,'t',[',']); g.blob(r,28,10,4,'t',[',']); g.blob(r,30,20,3,'t',[',']); g.blob(r,40,6,3,'t',[',']); g.blob(r,50,18,3,'t',[',']); g.blob(r,22,20,2,'t',[',']);
  g.blob(r,36,5,2,'#',[',']); g.blob(r,12,20,2,'#',[',']); g.blob(r,52,14,2,'#',[',']);
  g.scatter(r,'T',40,(x,y)=>y>3); g.scatter(r,'#',12,(x,y)=>y>3); g.scatter(r,'F',6,(x,y)=>y>3);
  MAPS.route4={name:'멈춤 길',kind:'out',grid:g.lines(),
    warps:[warp(0,10,'town4',28,10,'left'),warp(0,11,'town4',28,11,'left'),warp(49,8,'station1',15,15,'up')],
    signs:[{x:4,y:9,text:['멈춤 길\n멈춤단 구역. "오겡끼데스까!"\n→ 신중동역']},{x:46,y:10,text:['신중동역\n멈춤단 본부. 역장: 오겡끼\n열차는 멈춰 있다.']}],
    items:[{x:9,y:17,item:'hyperpotion',n:1},{x:31,y:21,item:'ball',n:3},{x:41,y:5,item:'superpotion',n:2}],
    wild:[{maxX:28,maxY:99,table:[['knight',25],['jet',20],['tank',15],['scout',20],['bomber',15],['paladin',5]],lv:[17,19]},{maxX:99,maxY:99,table:[['jet',25],['tank',20],['bomber',20],['knight',15],['scout',10],['paladin',10]],lv:[19,21]}],
    spawn:{x:1,y:10,dir:'right'}};
  T('m1','route4',9,8,'down','halt','멈춤단원 셋',[['inf',19],['tank',19]],760,['멈춤단원: 오겡끼데스까!\n여기까지 왔다니. 멈춰라!'],['멈춤단원: 셋도 멈췄다…']);
  T('m2','route4',24,18,'up','halt','멈춤단원 넷',[['archer',20],['knight',20],['scout',20]],820,['멈춤단원: 역장님은 세상을 멈추시고\n새로 짜실 것이다! 방해 마라!'],['멈춤단원: 새로 짜는 건 멈추지 않아도 되는데…']);
  T('m3','route4',45,14,'right','halt','멈춤단원 다섯',[['jet',21],['tank',21],['pike',22]],880,['멈춤단원: 간부님 앞까지 올 줄이야.\n여기서 끝이다! 오겡끼데스까!'],['멈춤단원: 간부님… 죄송합니다…']);
  P('m4','route4',49,9,'down','chief',['멈춤단 간부: 오겡끼데스까!\n여기는 신중동역. 배지 셋을 가진 자만\n역장님을 뵐 수 있다.'],{gate:{badge:3,aside:{x:47,y:9},open:['멈춤단 간부: 배지 셋… 정말이군.\n들어가라. 역장님이 기다리신다.'],closed:['멈춤단 간부: 배지가 모자라다.\n하얀·소리·물음 배지를 모아 와라.']}});
  P('m5','route4',3,13,'right','old',['멈춤단원들은 지면 바로 돌아간단다.\n배지 셋이면 간부도 길을 비켜 준다지.']);
}

/* ================= 호숫길 (route5) 40×40 ================= */
{
  const r=rngOf(701), g=new G(40,40,','); g.border('T');
  g.hroad(14,31,38); g.road(31,14,24,22); g.hroad(22,10,24); g.road(10,22,4,14); g.hroad(14,1,4);
  /* 남쪽 낚시터: 길에서 내려가 작은 못을 돈다 */
  g.vroad(22,24,34); g.hroad(34,10,30); g.vroad(10,30,34); g.hroad(30,10,16);
  g.blob(r,16,31,2,'w',[',']); g.blob(r,30,30,2,'w',[',']); g.blob(r,6,34,2,'t',[',']); g.blob(r,33,36,2,'t',[',']); g.blob(r,20,37,2,'t',[',']);
  g.blob(r,20,12,6,'w',[',']); g.rect(14,8,12,9,'w'); g.rect(12,10,16,5,'w'); g.blob(r,27,11,3,'w',[',']);
  for(let y=1;y<39;y++) for(let x=1;x<39;x++){ if(g.g[y][x]==='w'){ for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X=x+dx,Y=y+dy; if(g.at(X,Y)===','&&!g.keep.has(X+','+Y)) g.put(X,Y,'n'); } } }
  g.rect(19,17,2,3,'P',true); g.rect(19,16,2,1,'P',true); g.put(18,19,'P',true); g.put(21,19,'P',true); g.hroad(20,18,19,1); g.vroad(19,20,21,1); g.put(19,16,'P',true);
  g.blob(r,6,5,3,'t',[',']); g.blob(r,33,6,3,'t',[',']); g.blob(r,8,25,3,'t',[',']); g.blob(r,33,24,3,'t',[',']); g.blob(r,30,19,2,'t',[',']); g.blob(r,4,19,2,'t',[',']);
  g.scatter(r,'T',52); g.scatter(r,'F',16); g.scatter(r,'#',10);
  /* 서쪽 출구 주머니 */
  g.rect(1,13,2,1,'#',true); g.rect(1,16,2,1,'#',true);
  MAPS.route5={name:'호숫길',kind:'out',grid:g.lines(),
    warps:[warp(39,14,'town4',1,10,'right'),warp(39,15,'town4',1,11,'right'),warp(0,14,'town1',1,6,'right'),warp(0,15,'town1',1,6,'right')],
    signs:[{x:34,y:13,text:['호숫길\n← 하얀마을   꽥꽥마을 →\n호수에는 낚시꾼이 많다.']},{x:5,y:13,text:['호숫길 서쪽\n← 하얀마을 (공사 중)']}],
    items:[{x:30,y:19,item:'hyperpotion',n:1},{x:5,y:5,item:'ball',n:3},{x:33,y:25,item:'potion',n:3},{x:13,y:37,item:'superpotion',n:2}],
    wild:[{maxX:99,maxY:99,table:[['copter',25],['fly',20],['archer',20],['scout',15],['shushu',10],['worm',10]],lv:[15,19]}],
    spawn:{x:38,y:14,dir:'left'}};
  T('l1','route5',33,16,'up','fisher','낚시꾼 찌',[['worm',16],['copter',17]],600,['낚시꾼 찌: 쉿! 고기 다 달아난다…\n아, 이미 달아났군. 승부다!'],['낚시꾼 찌: 고기는 못 잡고 졌네.']);
  T('l2','route5',19,21,'down','fisher','낚시꾼 미끼',[['copter',17],['archer',17],['fly',18]],660,['낚시꾼 미끼: 부두 끝은 내 자리다!'],['낚시꾼 미끼: 부두는 양보하지.\n호수 서쪽은 하얀마을이야.']);
  T('l3','route5',10,18,'up','hiker','등산가 능선',[['scout',18],['inf',18],['pike',19]],720,['등산가 능선: 하얀마을까지 지름길이지?\n나를 넘고 가라!'],['등산가 능선: 하얀마을 쪽은 공사 중이던데.\n배지가 있으면 열어 준대.']);
  T('l5','route5',27,35,'up','fisher','낚시꾼 물결',[['worm',17],['shushu',18],['copter',18]],700,['낚시꾼 물결: 남쪽 못까지 오는 사람은 드문데.\\n심심하던 참이다. 승부!'],['낚시꾼 물결: 고기보다 네가 더 세구나.\\n못 건너 풀숲에 좋은상처약을 떨어뜨렸다.']);
  P('l4','route5',36,12,'down','girl',['호수 부두에서 낚시꾼 아저씨가\n꼬리콥터를 낚았대. 거짓말 같지?'],{wander:1});
}

/* ================= 신중동역 대합실 (station1) 32×18 ================= */
{
  const g=new G(32,18,'_'); g.border('=');
  g.put(15,16,'m',true); g.put(16,16,'m',true);
  for(const x of [5,12,19,26]) for(const y of [4,11]) g.put(x,y,'O',true);
  g.rect(7,7,4,1,'c',true); g.rect(13,7,6,1,'c',true); g.rect(21,7,4,1,'c',true); g.rect(2,2,5,1,'k',true); g.put(29,2,'S',true); g.rect(27,1,1,3,'p',true); g.rect(29,5,2,1,'p',true);
  g.put(2,14,'p',true); g.put(29,14,'p',true); g.put(2,9,'b',true); g.put(29,9,'b',true);
  MAPS.station1={name:'신중동역 대합실',kind:'in',grid:g.lines(),
    warps:[warp(15,16,'route4',49,9,'down'),warp(16,16,'route4',49,9,'down'),warp(29,2,'station2',2,2,'right')],
    signs:[{x:16,y:2,text:['신중동역 안내판\n"모든 열차는 멈춰 있습니다. 오겡끼데스까!"\n승강장 ↗ 계단']}],
    items:[{x:3,y:15,item:'hyperpotion',n:2}],spawn:{x:15,y:15,dir:'up'}};
  T('s1','station1',10,13,'right','halt','멈춤단원 여섯',[['knight',22],['jet',22]],900,['멈춤단원: 대합실까지! 오겡끼데스까!'],['멈춤단원: 여섯도 멈췄다…']);
  T('s2','station1',20,9,'left','halt','멈춤단원 일곱',[['tank',23],['bomber',23],['pike',23]],960,['멈춤단원: 열차는 멈췄다. 너도 멈춰라!'],['멈춤단원: 계단은 저 위 오른쪽이다… 말해 버렸네.']);
  T('s3','station1',27,5,'down','halt','멈춤단원 여덟',[['scout',24],['paladin',24],['jet',24]],1020,['멈춤단원: 계단은 못 올라간다!\n역장님은 승강장에 계신다!'],['멈춤단원: 역장님… 오겡끼데스까…']);
  P('s4','station1',4,1,'down','clerk',['매표원: 표는 팔지 않는다. 열차가 멈췄으니까.\n…멈춤단이 무서워서 여기 있을 뿐이다.\n저 동현몬들 좀 쉬게 해 줄까?'],{heal:true});
}

/* ================= 신중동역 승강장 (station2) 32×16 ================= */
{
  const g=new G(32,16,'_'); g.border('=');
  g.put(1,2,'S',true); g.rect(1,7,30,1,'c'); g.rect(2,7,1,1,'_',true); g.rect(12,7,8,1,'_',true); g.rect(28,7,2,1,'_',true);
  for(const x of [6,14,22]) g.put(x,3,'O',true);
  g.rect(1,9,30,2,'r',true); g.rect(8,9,16,2,'q',true); g.rect(1,11,30,4,'_',true); g.rect(1,14,30,1,'c'); 
  g.rect(1,11,30,1,'r',true); g.rect(1,12,30,3,'=',true);
  g.put(3,1,'p',true); g.put(30,1,'p',true); g.put(30,6,'p',true);
  MAPS.station2={name:'신중동역 승강장',kind:'in',grid:g.lines(),
    warps:[warp(1,2,'station1',28,2,'left')],
    signs:[{x:16,y:1,text:['승강장 안내\n다음 열차: ——  (멈춤)\n"동현이구나"를 외치면 프로그램이 끝난다.']}],
    items:[{x:29,y:8,item:'hyperpotion',n:1}],spawn:{x:2,y:2,dir:'right'}};
  T('s5','station2',9,5,'up','halt','멈춤단원 아홉',[['bomber',24],['knight',24]],1100,['멈춤단원: 승강장은 역장님 자리다!'],['멈춤단원: 아홉도 멈췄다… 열도 없는데…']);
  T('s6','station2',20,2,'down','halt','멈춤단 부간부',[['tank',25],['paladin',25],['jet',25]],1200,['멈춤단 부간부: 오겡끼데스까!\n역장님 바로 앞이다. 여기서 멈춰라!'],['멈춤단 부간부: 역장님… 뒤를 부탁드립니다…']);
  T('boss','station2',29,4,'left','chief','역장 오겡끼',[['tank',23],['bomber',24],['knight',24],['doom',25],['paladin',26]],5000,['역장 오겡끼: 오겡끼데스까… 잘 지냈냐.\n세상 프로그램은 끝없이 돈다. 지친다.\n그래서 나는 멈추려 한다.','역장 오겡끼: "오겡끼데스까"는 멈추는 말.\n네가 이기면 "동현이구나"로 끝내 보여라!'],['역장 오겡끼: …그렇군. 멈추는 게 아니라\n끝내는 거였어. 동현이구나.\n열차를 다시 움직이마.'],{trainer:{final:true},npc:{sight:6}});
}

/* ================= 집 (house3a/3b/4a/4b) ================= */
function house(name,bookA){ const g=new G(10,8,'_'); g.border('='); g.put(1,1,'b',true); g.put(7,1,'B',true); g.put(7,4,'p',true); g.put(4,6,'m',true); g.put(5,6,'m',true); return g.lines(); }
MAPS.house3a={name:'뿡뿡항 집',kind:'in',grid:house(),warps:[warp(4,6,'town3',25,8,'down'),warp(5,6,'town3',25,8,'down')],signs:[],spawn:{x:4,y:5,dir:'down'}};
MAPS.house3b={name:'뿡뿡항 집',kind:'in',grid:house(),warps:[warp(4,6,'town3',5,12,'down'),warp(5,6,'town3',5,12,'down')],signs:[],spawn:{x:4,y:5,dir:'down'}};
MAPS.house4a={name:'꽥꽥마을 집',kind:'in',grid:house(),warps:[warp(4,6,'town4',4,15,'down'),warp(5,6,'town4',4,15,'down')],signs:[],spawn:{x:4,y:5,dir:'down'}};
MAPS.house4b={name:'꽥꽥마을 집',kind:'in',grid:house(),warps:[warp(4,6,'town4',23,16,'down'),warp(5,6,'town4',23,16,'down')],signs:[],spawn:{x:4,y:5,dir:'down'}};

/* ================= 검사: 이어짐·자리 ================= */
function check(){
  const errs=[];
  for(const [k,m] of Object.entries(MAPS)){
    const g=m.grid, W=g[0].length, H=g.length;
    if(g.some(r=>r.length!==W)) errs.push(`${k}: 줄 길이가 다르다`);
    const npcAt=(x,y)=>NPCS.find(n=>n.map===k&&n.x===x&&n.y===y);
    const walk=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&!SOLID.includes(g[y][x]);
    /* 출발점: 첫 출입구(또는 spawn) */
    const start=m.warps[0]; const seen=new Set([start.x+','+start.y]); const q=[[start.x,start.y]];
    while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X=x+dx,Y=y+dy, key=X+','+Y; if(seen.has(key)||!walk(X,Y)) continue; const n=npcAt(X,Y); if(n&&!(n.trainer||n.gate)) continue; seen.add(key); q.push([X,Y]); } }
    for(const w of m.warps){ if(!walk(w.x,w.y)) errs.push(`${k}: 출입구 (${w.x},${w.y}) 가 막혀 있다 '${g[w.y][w.x]}'`); if(!seen.has(w.x+','+w.y)) errs.push(`${k}: 출입구 (${w.x},${w.y}) 로 이어지지 않는다`); }
    for(const s of m.signs||[]){ const adj=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((s.x+dx)+','+(s.y+dy))); if(!adj) errs.push(`${k}: 표지판 (${s.x},${s.y}) 옆에 설 수 없다`); if(!SOLID.includes(g[s.y][s.x])) errs.push(`${k}: 표지판 (${s.x},${s.y}) 칸이 's'가 아니다`); }
    for(const it of m.items||[]){ if(!walk(it.x,it.y)) errs.push(`${k}: 물건 (${it.x},${it.y}) 이 막힌 칸에 있다`); const adj=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((it.x+dx)+','+(it.y+dy))); if(!adj) errs.push(`${k}: 물건 (${it.x},${it.y}) 에 닿을 수 없다`); }
    for(const n of NPCS.filter(n=>n.map===k)){ if(!walk(n.x,n.y)) errs.push(`${k}: ${n.id} (${n.x},${n.y}) 가 막힌 칸에 서 있다`); if(![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((n.x+dx)+','+(n.y+dy)))) errs.push(`${k}: ${n.id} (${n.x},${n.y}) 에 닿을 수 없다`); if(m.warps.some(w=>w.x===n.x&&w.y===n.y)) errs.push(`${k}: ${n.id} 가 출입구 위에 서 있다`); }
    if(m.spawn&&!walk(m.spawn.x,m.spawn.y)) errs.push(`${k}: spawn 이 막혀 있다`);
  }
  const ids=NPCS.map(n=>n.id); if(new Set(ids).size!==ids.length) errs.push('사람 id 가 겹친다');
  return errs;
}
/* 출입구 칸은 걷는 칸: 가장자리 나무는 길로, 실내 출입구는 매트로 */
for(const m of Object.values(MAPS)) for(const w of m.warps){ const row=m.grid[w.y].split(''); if('T'.includes(row[w.x])) row[w.x]='.'; if(m.kind==='in'&&row[w.x]==='_') row[w.x]='m'; m.grid[w.y]=row.join(''); }
/* 표지판 칸을 's'로 찍는다 */
for(const m of Object.values(MAPS)) for(const s of m.signs||[]){ const row=m.grid[s.y].split(''); row[s.x]='s'; m.grid[s.y]=row.join(''); }
/* 물건 칸은 걷는 칸이어야 한다: 풀이면 그대로, 나무·바위면 풀로 */
for(const m of Object.values(MAPS)) for(const it of m.items||[]){ const row=m.grid[it.y].split(''); if('T#'.includes(row[it.x])) row[it.x]=','; m.grid[it.y]=row.join(''); }
/* 사람 칸도 걷는 칸으로 */
for(const n of NPCS){ const m=MAPS[n.map]; const row=m.grid[n.y].split(''); if('T#'.includes(row[n.x])) row[n.x]=m.kind==='in'?'_':','; m.grid[n.y]=row.join(''); }
const errs=check();
if(errs.length){ console.error(errs.join('\n')); process.exit(1); }
let tiles=0; for(const m of Object.values(MAPS)) tiles+=m.grid.length*m.grid[0].length;
const out=`/* 동현몬 확장 세계(v0.18). tools/worldgen.cjs 가 만든다. 손으로 고치지 말 것.\n   지도 ${Object.keys(MAPS).length}장 · ${tiles}칸 · 사람 ${NPCS.length}명 */\n(function(root){\n'use strict';\nroot.WORLD={MAPS:${JSON.stringify(MAPS)},\nNPCS:${JSON.stringify(NPCS)}};\n})(window);\n`;
fs.writeFileSync(path.join(__dirname,'..','src','world.js'),out);
console.log(`world.js: 지도 ${Object.keys(MAPS).length}장, ${tiles}칸, 사람 ${NPCS.length}명`);
for(const [k,m] of Object.entries(MAPS)) console.log(k, m.grid[0].length+'x'+m.grid.length);
if(process.argv.includes('--show')) for(const k of process.argv.slice(3)) console.log(k+'\n'+MAPS[k].grid.join('\n'));
