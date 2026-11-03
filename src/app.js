/* 동현몬 앱: 동현랭 편집기 → 출전 규약(시작 마을·성격·출현율·소지금·시드) → 키보드 모험. 동현전·동현워와 같은 키 배치. */
(function(){
const HINT0='<span><kbd>X</kbd>확인·말걸기</span><span><kbd>Z</kbd>취소</span><span><kbd>S</kbd>동현몬</span><span><kbd>↵</kbd>메뉴</span>';
const $=s=>document.querySelector(s), E=window.Engine, R=window.Render, {SPECIES,TYPES,MOVES,ITEMS,PERSONALITY,MAPS,START,NPCS}=window.DATA;
const canvas=$('#board'), g=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------- 화면 전환·소리·탭 ---------- */
$('#theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').setAttribute('aria-pressed',String(dark));};
const SND=DHSFX('donghyunmon:sound');
function sndUI(){ const b=$('#sound'); b.setAttribute('aria-pressed',String(SND.on)); b.classList.toggle('muted',!SND.on); b.title=SND.on?'효과음 끄기 (M)':'효과음 켜기 (M)'; }
$('#sound').onclick=()=>{ SND.set(!SND.on); sndUI(); }; sndUI();
document.addEventListener('keydown',e=>{ if(e.code!=='KeyM'||e.metaKey||e.ctrlKey||e.altKey) return; const el=document.activeElement; if(el&&(el.tagName==='TEXTAREA'||el.tagName==='INPUT'||el.tagName==='SELECT')) return; SND.set(!SND.on); sndUI(); });
let tab='play';
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
  tab=b.dataset.tab;
  document.querySelectorAll('.tabs button').forEach(x=>{const on=x.dataset.tab===tab;x.classList.toggle('active',on);on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current');});
  document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+tab);
  if(tab==='play') fit();
});
$('.brand').onclick=e=>{e.preventDefault();document.querySelector('[data-tab=play]').click();scrollTo({top:0,behavior:'smooth'});};

/* ---------- 규칙 탭 표 ---------- */
$('#mon-grid').innerHTML=SPECIES.map(sp=>`<article><h4>${String(sp.id).padStart(2,'0')} · ${sp.name}<small>${sp.from}</small></h4><p>${sp.desc}</p><p class="stat">${sp.types.map(t=>TYPES[t]).join('·')} · 체력 ${sp.base[0]} 공격 ${sp.base[1]} 방어 ${sp.base[2]} 속도 ${sp.base[3]}</p></article>`).join('');
$('#type-table').innerHTML='<thead><tr><th>공격 ↓ / 방어 →</th>'+Object.values(TYPES).map(t=>`<th>${t}</th>`).join('')+'</tr></thead><tbody>'+Object.keys(TYPES).map(a=>`<tr><th>${TYPES[a]}</th>`+Object.keys(TYPES).map(d=>{const e=E.effect(a,[d]);return `<td class="${e>1?'eff-up':e<1?'eff-dn':''}">${e===1?'·':e>1?'2배':e===0?'0':'½'}</td>`;}).join('')+'</tr>').join('')+'</tbody>';

/* ---------- 동현랭 편집기(동현랭 시리즈와 같은 모양) ---------- */
for(const ex of examples){const o=document.createElement('option');o.value=ex.id;o.textContent=ex.title;$('#example').append(o);}
const DH_TOKEN=/(ㅋㅋ.*$)|(나는 동현이냐\?|동현이구나)|(오겡끼데스까)|(신중동역|신중동|뭉치)|(뿡뿡뿡|뿡뿡|포동이)|(꽥꽥)|(동+현아)|(동+현)|(도오*옹)|(ㅠ+)|(뚱띠|또치)/g;
const DH_CLS=[null,'t-cmt','t-frame','t-halt','t-ctl','t-out','t-in','t-assign','t-var','t-num','t-minus','t-op'];
function dhLine(line){let html='',last=0;line.replace(DH_TOKEN,(m,...gr)=>{const idx=gr[gr.length-2];html+=esc(line.slice(last,idx));const k=gr.slice(0,11).findIndex(x=>x!==undefined)+1;html+=`<span class="${DH_CLS[k]}">${esc(m)}</span>`;last=idx+m.length;return m;});return html+esc(line.slice(last));}
const code=$('#code'), area=document.createElement('div'), hl=document.createElement('div');
area.className='code-area'; hl.id='hl'; hl.setAttribute('aria-hidden','true'); code.parentNode.insertBefore(area,code); area.append(hl,code);
function hlSync(){hl.scrollTop=code.scrollTop;hl.scrollLeft=code.scrollLeft;}
function hlMetrics(){const cs=getComputedStyle(code);for(const p of ['paddingTop','paddingRight','paddingBottom','paddingLeft','fontFamily','fontSize','lineHeight','tabSize','letterSpacing'])hl.style[p]=cs[p];}
function highlight(){hlMetrics();hl.innerHTML=code.value.split('\n').map(l=>`<span class="ln">${dhLine(l)||' '}</span>`).join('')+'<span class="ln"> </span>';hlSync();}
code.addEventListener('scroll',()=>{hlSync();$('#lines').scrollTop=code.scrollTop;});addEventListener('resize',()=>{highlight();fit();});
function indent(){
  const text=code.value,lines=text.split('\n'),lead=l=>l.length-l.replace(/^[ \t]+/,'').length;
  const next=lines.map(l=>{const b=l.slice(lead(l));if(!b)return '';if(b.startsWith('ㅋㅋ'))return '   '+b;const s=b.split('~')[0].replace(/ㅋㅋ.*$/,'').trim();return (s==='나는 동현이냐?'||s==='동현이구나'?'':'  ')+b;});
  const {selectionStart:a,selectionEnd:b,selectionDirection:dir,scrollTop:y,scrollLeft:x}=code;
  const moved=p=>{let o=0,n=0;for(let i=0;i<lines.length;i++){const L=lines[i].length;if(p<=o+L){const c=p-o,ol=lead(lines[i]),nl=lead(next[i]);return n+Math.min(next[i].length,c<ol?nl:c-ol+nl);}o+=L+1;n+=next[i].length+1;}return n;};
  const value=next.join('\n'),na=moved(a),nb=moved(b);if(value===text&&na===a&&nb===b)return;if(value!==text)code.value=value;code.setSelectionRange(na,nb,dir);code.scrollTop=y;code.scrollLeft=x;
}
function codeChanged(e){if(!e?.isComposing)indent();const n=code.value.split('\n').length;$('#line-count').textContent=n+'줄';$('#lines').textContent=Array.from({length:n},(_,i)=>i+1).join('\n');highlight();autoPreview();}
code.addEventListener('compositionend',()=>codeChanged());
function codeLead(){const a=code.selectionStart,v=code.value,ls=v.lastIndexOf('\n',a-1)+1,le=v.indexOf('\n',ls);return {a,ls,lead:/^[ \t]*/.exec(v.slice(ls,le<0?v.length:le))[0].length};}
document.addEventListener('selectionchange',()=>{if(document.activeElement!==code||code.selectionStart!==code.selectionEnd)return;const {a,ls,lead}=codeLead();if(a-ls<lead)code.setSelectionRange(ls+lead,ls+lead);});
code.addEventListener('beforeinput',e=>{const {a,ls,lead}=codeLead();if(a!==code.selectionEnd)return;if(e.inputType==='deleteContentBackward'&&ls>0&&a>ls&&a-ls<=lead){e.preventDefault();code.setRangeText('',ls-1,a,'end');codeChanged();}});
code.oninput=codeChanged;
code.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();sortie();}});
function selectExample(){const ex=examples.find(e=>e.id===$('#example').value);code.value=ex.code;$('#example-note').textContent=ex.note;codeChanged();}
$('#example').onchange=selectExample;
$('#save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([code.value+'\n'],{type:'text/plain;charset=utf-8'}));a.download='sortie.dh';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('#open').onchange=async e=>{const f=e.target.files[0];if(!f)return;code.value=(await f.text()).replace(/\r/g,'').replace(/\n$/,'');codeChanged();e.target.value='';};
$('#run').onclick=()=>sortie();



/* ---------- 출전 규약: 1 시작 마을 · 2 포동이 성격 · 3 야생 출현율 · 4 소지금 · 5 시드 · 6 출전 ---------- */
const DEFAULT={startMap:1,pers:1,rate:1,money:1000,seed:1};
let cfg={...DEFAULT};
function parseSortie(out){
  const tok=out.split(/\s+/).filter(Boolean).map(Number), c={...DEFAULT}, err=[];
  let go=false;
  const rule={1:['시작 마을','startMap',v=>Number.isInteger(v)&&v>=1&&v<=3,'1 하얀마을 · 2 산책로 · 3 동현시'],2:['포동이 성격','pers',v=>Number.isInteger(v)&&v>=1&&v<=5,'1~5'],3:['야생 출현율','rate',v=>Number.isInteger(v)&&v>=0&&v<=5,'0(없음)~5'],4:['소지금','money',v=>Number.isInteger(v)&&v>=0&&v<=9999,'0~9999'],5:['시드','seed',v=>Number.isInteger(v)&&Math.abs(v)<=1e9,'정수']};
  for(let i=0;i<tok.length;i++){
    const n=tok[i];
    if(go){ err.push(`출전 명령 6 뒤에 ${tok.length-i}개의 정수가 더 나왔다. 6은 마지막에 출력하자.`); break; }
    if(n===6){ go=true; continue; }
    const r=rule[n];
    if(!r){ err.push(`${i+1}번째 정수 ${n}은 출전 명령이 아니다. 명령은 1 시작 마을 · 2 성격 · 3 출현율 · 4 소지금 · 5 시드 · 6 출전이다.`); break; }
    if(i+1>=tok.length){ err.push(`명령 ${n}(${r[0]}) 뒤에 값이 없다.`); break; }
    const v=tok[++i];
    if(!r[2](v)){ err.push(`${r[0]} 값 ${v}은 쓸 수 없다. ${r[3]}만 된다.`); break; }
    c[r[1]]=v;
  }
  return {c,go,err};
}
const rateName=r=>['없음','기본','조금 많음','많음','아주 많음','우글우글'][r];
function sortieCard(c){
  $('#sortie-card').innerHTML=[['시작 마을',`${c.startMap} · ${START[c.startMap].name}`],['포동이 성격',`${c.pers} · ${PERSONALITY[c.pers].name}`],['야생 출현율',`${c.rate} · ${rateName(c.rate)}`],['소지금',c.money.toLocaleString('ko-KR')+'원'],['시드',String(c.seed)],['조작','X 확인 · Z 취소 · ↵ 메뉴']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
}
function result(text,kind){ const r=$('#result'); r.textContent=text; r.dataset.kind=kind||''; }
function status(t,kind){ const s=$('#status'); s.textContent=t; s.dataset.kind=kind||''; }
let previewT=0;
function autoPreview(){ clearTimeout(previewT); previewT=setTimeout(()=>{ if(S) return; try{ const r=Donghyun.run(code.value,{maxSteps:300000}); const p=parseSortie(r.output); if(!p.err.length){ cfg=p.c; sortieCard(cfg); preview(cfg); } }catch(e){} },250); }
function sortie(){
  if(S) return;
  let out;
  try{ const r=Donghyun.run(code.value,{maxSteps:300000}); out=r.output; }
  catch(e){ result(`동현랭 오류${e.line?` (${e.line}줄)`:''}: ${e.message}`,'error'); status('동현랭 오류','error'); return; }
  const p=parseSortie(out);
  if(p.err.length){ result('출전 규약 오류: '+p.err[0],'error'); status('출전 규약 오류','error'); return; }
  cfg=p.c; sortieCard(cfg); preview(cfg);
  if(!p.go){ result(`설정을 읽었다(${START[cfg.startMap].name} · ${PERSONALITY[cfg.pers].name} · 출현율 ${cfg.rate} · ${cfg.money}원 · 시드 ${cfg.seed}). 출전 명령 6을 마지막에 출력하면 나선다.`); status('설정만 읽음'); return; }
  startGame(cfg);
}

/* ---------- 상태·화면 ---------- */
let S=null, previewS=null, mode='setup', paused=false, menu=null, lastMap=null;
const keys={up:false,down:false,left:false,right:false,upPressed:false,downPressed:false,leftPressed:false,rightPressed:false,aPressed:false,bPressed:false};
function clearPressed(){ keys.upPressed=keys.downPressed=keys.leftPressed=keys.rightPressed=keys.aPressed=keys.bPressed=false; }
function preview(c){ previewS=E.newGame({...c}); $('#day').textContent=`${START[c.startMap].name} · 미리보기`; $('#tile-info').textContent=`${START[c.startMap].name}에서 포동이와 함께 출발한다. ${PERSONALITY[c.pers].name} 성격 · 출현율 ${rateName(c.rate)}.`; fit(); }
function fit(){
  if(!canvas.width) return;
  const full=document.getElementById('stage-full');
  if(full&&full.classList.contains('fs')){ /* 전체 화면: 띠와 화면 단추를 뺀 자리에 비율을 지켜 최대로 */
    const side=full.classList.contains('side'), cs=getComputedStyle(full), h=el=>el&&el.offsetHeight||0;
    let aw=full.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight), ah=full.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    if(side) aw-=2*190+20; else ah-=h(full.querySelector('.board-top'))+h(full.querySelector('.board-bottom'))+h(full.querySelector('.touchpad'))+30;
    canvas.style.width=Math.max(120,Math.min(aw,ah*canvas.width/canvas.height))+'px'; canvas.style.margin='0 auto'; return; }
  const st=canvas.parentElement, w=st.clientWidth; if(!w) return;
  const maxH=Math.max(240,innerHeight-230), byH=maxH*canvas.width/canvas.height;
  canvas.style.width=Math.min(w,byH)+'px'; canvas.style.margin='0 auto';
}
let last=0, acc=0; const STEP=1000/60;
function tickOnce(){ E.step(S,keys); clearPressed(); if(S.map!==lastMap){ lastMap=S.map; S.mapTitle=110; $('#day').textContent=MAPS[S.map].name; $('#tile-info').textContent=MAPS[S.map].kind==='out'?'긴 풀을 지나면 야생 동현몬이 나온다. 표지판과 사람에게 X로 말을 걸자.':'문 앞 매트를 밟으면 밖으로 나간다.'; } else if(S.mapTitle>0) S.mapTitle--; events(); }
/* 한 번의 예외로 화면 전체가 멈추지 않게 한다: 기록하고, 전투 중이면 그 장면을 건너뛴다 */
let errCount=0;
function tickError(e){ errCount++; console.error('동현몬 오류',e); if(errCount===1) status('오류가 있어 한 장면을 건너뛰었다 · '+(e&&e.message||e).slice(0,60),'bad'); if(S&&S.battle){ const B=S.battle; B.cur=null; if(B.phase!=='q'&&B.phase!=='menu'&&B.phase!=='party'){ B.phase='menu'; } if(B.phase==='moves'||B.mcur>=S.party[B.me].moves.length) B.mcur=0; } if(errCount>50){ paused=true; status('오류가 반복되어 멈췄다 · 메뉴(Enter)에서 저장하거나 포기할 수 있다','bad'); } }
function frame(now){
  if(S&&S.status==='play'&&!paused){
    if(!last) last=now; acc=Math.min(acc+(now-last),100); last=now;
    while(acc>=STEP){ try{ tickOnce(); }catch(e){ tickError(e); } acc-=STEP; if(S.status!=='play') break; }
  } else { last=now; acc=0; }
  if(S&&S.status!=='play'&&mode==='play') finish();
  if(S&&mode==='over'&&$('#result-card').hidden&&!S.dialog) resultCard();
  const s=S||previewS;
  if(s){ try{ R.draw(g,s); }catch(e){ tickError(e); } if(S&&paused&&menu) drawPauseDim(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function drawPauseDim(){ g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,0,canvas.width,canvas.height); }

/* ---------- 사건 → 소리·기록 ---------- */
const SNDMAP={step:'foot',bump:'thud',door:'swap',tick:'tick',pop:'pop',item:'sparkle',heal:'heartup',buy:'bell',encounter:'alert',hit:'hurt',stat:'ping',faint:'fall',levelup:'heartup',shake:'thud',caught:'sparkle',money:'bell',win:'win'};
function events(){
  for(const ev of S.events){
    if(SNDMAP[ev.t]) SND.play(SNDMAP[ev.t]);
    if(ev.t==='encounter'){ const B=S.battle; log(B.kind==='wild'?`야생 ${E.name(B.foes[0])} Lv${B.foes[0].lv} 등장.`:`${B.npc.trainer.name}과(와) 승부.`); }
    if(ev.t==='caught') log(`${E.name(S.battle.foes[S.battle.fi])}을(를) 잡았다. 도감 ${Object.keys(S.dex.caught).length}종.`);
    if(ev.t==='levelup') log(`${E.name(S.party[S.battle?S.battle.me:0])} Lv${S.party[S.battle?S.battle.me:0].lv}.`);
    if(ev.t==='battleEnd'){ if(ev.result==='lose'){ SND.play('lose'); log('모든 동현몬이 쓰러졌다. 회복소로 돌아간다.'); } else if(ev.result==='run') log('무사히 도망쳤다.'); else if(ev.kind==='wild'&&ev.result==='win') log('야생 동현몬을 쓰러뜨렸다.'); }
    if(ev.t==='heal'&&!S.battle) log('동현몬이 모두 회복되었다.');
    if(ev.t==='item'&&S.dialog) log(S.dialog.pages[0].replace(/\n/g,' '));
    if(ev.t==='win') log('체육관 배지를 얻었다. 동현몬스터 화이트, 승리.');
  }
  S.events.length=0; hud();
}
function log(html){ const li=document.createElement('li'); li.innerHTML=esc(E.josa(html)); const l=$('#log'); l.prepend(li); while(l.children.length>40) l.lastChild.remove(); }
const hpCls=r=>r>0.5?'ok':r>0.2?'mid':'low';
function hud(){
  $('#party-card').innerHTML=S.party.map((m,i)=>`<div class="pm ${m.hp<=0?'ko':''}"><b>${esc(E.name(m))}</b><small>Lv${m.lv}</small><div class="hpbar"><i class="${hpCls(m.hp/m.maxhp)}" style="width:${Math.round(100*m.hp/m.maxhp)}%"></i></div><span>${m.hp}/${m.maxhp}</span></div>`).join('')+(S.box.length?`<small class="boxnote">상자 ${S.box.length}마리</small>`:'');
  $('#info-card').innerHTML=[['소지금',S.money.toLocaleString('ko-KR')+'원'],['동현볼',String(S.bag.ball||0)],['상처약',`${S.bag.potion||0} · 좋은 ${S.bag.superpotion||0}`],['배지',S.badge?'1':'0'],['도감',`${Object.keys(S.dex.caught).length} / ${SPECIES.length}`],['걸음·시간',`${S.steps} · ${Math.floor(S.time/60)}초`]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
  $('#turn-badge').textContent=MAPS[S.map].name+(S.battle?' · 전투':''); $('#turn-badge').className='';
}

/* ---------- 시작·종료 ---------- */
function liveUI(){ $('#setup-panel').hidden=true; $('#hud').hidden=false; $('#board-wrap').classList.add('live'); $('#touchpad').classList.add('on'); $('#full').disabled=false; fit(); $('#board-wrap').focus({preventScroll:true}); }
function startGame(c){
  S=E.newGame({...c}); mode='play'; paused=false; closeMenu(); $('#result-card').hidden=true; lastMap=null;
  liveUI(); $('#board-wrap').scrollIntoView({block:'nearest',behavior:reduced?'auto':'smooth'});
  $('#log').innerHTML=''; log(`${START[c.startMap].name}에서 출발. 포동이 ${PERSONALITY[c.pers].name} · 출현율 ${rateName(c.rate)} · ${c.money}원 · 시드 ${c.seed}.`);
  $('#hint').innerHTML=HINT0; status('진행 중'); hud();
}
function backToSetup(){
  S=null; mode='setup'; paused=false; closeMenu(); $('#result-card').hidden=true;
  $('#setup-panel').hidden=false; $('#hud').hidden=true; $('#board-wrap').classList.remove('live'); $('#touchpad').classList.remove('on'); exitFull(); $('#full').disabled=true;
  preview(cfg); status('출전 준비'); result('다시 나서려면 코드를 고치거나 그대로 출전을 누르자.'); $('#hint').innerHTML=HINT0; renderSlotList();
}
function finish(){
  mode='over'; status('배지 획득'); keys.up=keys.down=keys.left=keys.right=false;
  $('#hint').innerHTML='<span><kbd>X</kbd><kbd>↵</kbd>출전 준비로</span>';
}
function resultCard(){
  $('#result-card').innerHTML=`<div><h3 class="win">체육관 배지를 얻었다</h3><div class="rc-grid"><div><span>배지</span><strong>1</strong></div><div><span>도감</span><strong>${Object.keys(S.dex.caught).length} / ${SPECIES.length}</strong></div><div><span>걸음</span><strong>${S.steps.toLocaleString('ko-KR')}</strong></div><div><span>시간</span><strong>${Math.floor(S.time/60)}초</strong></div></div><p>X 또는 Enter로 출전 준비로 돌아간다.</p><button id="rc-back">출전 준비로</button></div>`; $('#rc-back').onclick=backToSetup;
  $('#result-card').hidden=false;
}
$('#concede').onclick=()=>{ if(!S||mode==='over') return; confirmMenu('포기하고 출전 준비로 돌아갈까?',[['포기한다',backToSetup],['계속 간다',()=>{}]]); };

/* ---------- 메뉴(일시정지): 항목 {label,note,off,fn}, 뒤로 가기 onCancel ---------- */
function openMenu(title,items,onCancel){ paused=true; menu={title,items:items.map(it=>Array.isArray(it)?{label:it[0],fn:it[1]}:it),onCancel}; menu.i=Math.max(0,menu.items.findIndex(it=>!it.off)); drawMenu(); keys.up=keys.down=keys.left=keys.right=false; clearPressed(); }
function drawMenu(){ const m=$('#menu'); if(!menu){ m.hidden=true; return; } m.hidden=false; m.className='game-menu center'; m.innerHTML=(menu.title?`<h4>${esc(menu.title)}</h4>`:'')+menu.items.map((it,i)=>`<div class="mi ${i===menu.i?'sel':''} ${it.off?'off':''}" role="menuitem" data-i="${i}"><span>${esc(it.label)}</span>${it.note?`<small>${esc(it.note)}</small>`:''}</div>`).join(''); m.querySelectorAll('.mi').forEach(el=>el.onclick=()=>{menu.i=+el.dataset.i;pick();}); m.querySelector('.sel')?.scrollIntoView({block:'nearest'}); }
function closeMenu(){ menu=null; $('#menu').hidden=true; paused=false; last=0; }
function cancelMenu(){ const c=menu&&menu.onCancel; closeMenu(); if(c) c(); }
function pick(){ const it=menu.items[menu.i]; if(!it||it.off) return; closeMenu(); it.fn(); }
function confirmMenu(q,opts,back){ openMenu(q,opts.map(([label,fn])=>({label,fn})),back); }
const monNote=m=>`Lv${m.lv} · 체력 ${m.hp}/${m.maxhp} · ${m.moves.map(k=>MOVES[k].name).join(' ')}`;
function mainMenu(){ const inWorld=S.mode==='world'; openMenu('잠시 멈춤',[['계속 간다',()=>{}],{label:'동현몬',note:'순서 바꾸기 · 상처약',off:!inWorld,fn:partyMenu},{label:'가방',note:bagNote(),off:!inWorld,fn:bagMenu},['도감',dexMenu],{label:'저장',off:!inWorld,note:inWorld?'':'전투·대화 중에는 저장할 수 없다',fn:saveMenu},['불러오기',loadMenu],['포기하고 출전 준비로',()=>confirmMenu('포기하고 출전 준비로 돌아갈까?',[['포기한다',backToSetup],['계속 간다',()=>{}]],mainMenu)]]); }
function bagNote(){ return ['ball','potion','superpotion'].filter(k=>S.bag[k]>0).map(k=>`${ITEMS[k].name} ${S.bag[k]}`).join(' · ')||'비어 있음'; }
function partyMenu(sel){
  const items=S.party.map((m,i)=>({label:`${i+1}. ${E.name(m)}`,note:monNote(m),fn:()=>{ if(sel!==undefined){ if(sel!==i){ E.swapParty(S,sel,i); log(`${E.name(S.party[i])}을(를) ${i+1}번째로 옮겼다.`); hud(); } partyMenu(); return; }
    openMenu(`${E.name(m)} · ${SPECIES.find(s=>s.key===m.key).from}`,[{label:'순서 바꾸기',note:'바꿀 자리를 고른다',off:S.party.length<2,fn:()=>partyMenu(i)},{label:'상처약 쓰기',note:`${S.bag.potion||0}개`,off:!(S.bag.potion>0),fn:()=>{ log(E.useOutside(S,'potion',i)); hud(); partyMenu(); }},{label:'좋은상처약 쓰기',note:`${S.bag.superpotion||0}개`,off:!(S.bag.superpotion>0),fn:()=>{ log(E.useOutside(S,'superpotion',i)); hud(); partyMenu(); }},['돌아가기',partyMenu]],partyMenu); }}));
  openMenu(sel!==undefined?`${E.name(S.party[sel])}을(를) 어디로?`:'동현몬',items,sel!==undefined?()=>partyMenu():mainMenu);
}
function bagMenu(){ const list=['ball','potion','superpotion'].filter(k=>S.bag[k]>0); openMenu('가방',list.length?list.map(k=>({label:`${ITEMS[k].name} ×${S.bag[k]}`,note:ITEMS[k].desc,fn:()=>{ if(!ITEMS[k].heal){ log('동현볼은 전투 중에만 던질 수 있다.'); mainMenu(); return; } openMenu(`${ITEMS[k].name}을(를) 누구에게?`,S.party.map((m,i)=>({label:E.name(m),note:`체력 ${m.hp}/${m.maxhp}`,fn:()=>{ log(E.useOutside(S,k,i)); hud(); bagMenu(); }})),bagMenu); }})):[{label:'가방이 비었다',note:'동현시 가게에서 살 수 있다',fn:mainMenu}],mainMenu); }
function dexMenu(){ openMenu(`도감 · 잡은 ${Object.keys(S.dex.caught).length} / 본 ${Object.keys(S.dex.seen).length} / 전체 ${SPECIES.length}`,SPECIES.map(sp=>{ const c=S.dex.caught[sp.key], s=S.dex.seen[sp.key]; return {label:`${String(sp.id).padStart(2,'0')} ${c?sp.name:s?sp.name+' (본 적 있음)':'???'}`,note:c?`${sp.from} · ${sp.desc}`:s?sp.from:'',off:!s,fn:dexMenu}; }).concat([['돌아가기',mainMenu]]),mainMenu); }

/* ---------- 저장·불러오기: 동현전·동현워와 같은 브라우저 칸 3개 + .dhsave 파일 ---------- */
const SAVE_FORMAT='donghyunmon-save', SAVE_VERSION=1, SLOT_KEY=n=>'donghyunmon:slot'+n, SLOTS=3;
function snapshot(){
  const state=JSON.parse(JSON.stringify(S,(k,v)=>k==='events'?[]:k==='rng'?undefined:v));
  const logs=[...$('#log').children].reverse().map(li=>li.textContent);
  return {format:SAVE_FORMAT,version:SAVE_VERSION,savedAt:new Date().toISOString(),summary:{map:MAPS[S.map].name,lead:E.name(S.party[0]),lv:S.party[0].lv,dex:Object.keys(S.dex.caught).length,badge:S.badge,money:S.money},state,logs};
}
function restore(data){
  if(!data||data.format!==SAVE_FORMAT) throw new Error('동현몬 저장 파일이 아니다.');
  if(data.version!==SAVE_VERSION) throw new Error('지원하지 않는 저장 형식 버전이다('+data.version+').');
  const st=data.state; if(!st||!MAPS[st.map]) throw new Error('지도 정보가 맞지 않는다.');
  const grid=MAPS[st.map].grid;
  if(!st.hero||!(Number.isInteger(st.hero.tx)&&st.hero.tx>=0&&st.hero.tx<grid[0].length&&Number.isInteger(st.hero.ty)&&st.hero.ty>=0&&st.hero.ty<grid.length)) throw new Error('주인공 위치가 맞지 않는다.');
  if(!Array.isArray(st.party)||!st.party.length||st.party.length>E.PARTY||st.party.some(m=>!E.species(m.key)||!(m.lv>=1&&m.lv<=E.MAXLV)||!Array.isArray(m.moves)||m.moves.some(k=>!MOVES[k]))) throw new Error('동현몬 정보가 맞지 않는다.');
  if(!Array.isArray(st.box)||st.box.some(m=>!E.species(m.key))) throw new Error('상자 정보가 맞지 않는다.');
  if(!Array.isArray(st.npcs)||st.npcs.length!==NPCS.length||st.npcs.some((n,i)=>n.id!==NPCS[i].id)) throw new Error('마을 사람 정보가 맞지 않는다.');
  if(!(Number.isInteger(st.money)&&st.money>=0)) throw new Error('소지금 정보가 맞지 않는다.');
  if(st.status!=='play') throw new Error('이미 끝난 판이다.');
  if(st.mode!=='world'||st.battle||st.dialog) throw new Error('전투·대화 중에 만든 저장은 불러올 수 없다.');
  st.events=[]; st.rng=E.rng(((st.seed|0)*7919+13+(st.steps|0)*31)|0); st.fade=0; st.fadeIn=0; st.after=null; st.pendingSay=null; st.approach=null; st.cam=st.cam||{x:0,y:0};
  for(const m of st.party.concat(st.box)){ m.st=m.st||{atk:0,def:0,spd:0}; E.calcStats(m); m.hp=Math.max(0,Math.min(m.maxhp,m.hp|0)); }
  closeMenu(); $('#result-card').hidden=true;
  S=st; mode='play'; cfg={startMap:S.startMap,pers:S.pers,rate:S.rate,money:cfg.money,seed:S.seed}; lastMap=S.map; S.mapTitle=110;
  liveUI(); $('#day').textContent=MAPS[S.map].name;
  const l=$('#log'); l.innerHTML=''; for(const t of (data.logs||[]).slice(-39)) log(String(t).replace(/<[^>]*>/g,''));
  log('저장한 판을 불러왔다.'); $('#hint').innerHTML=HINT0; status('진행 중'); hud();
}
function readSlot(n){ try{ const t=localStorage.getItem(SLOT_KEY(n)); return t?JSON.parse(t):null; }catch(e){ return null; } }
function slotNote(d){ if(!d) return '비어 있음'; const t=new Date(d.savedAt); const pad=v=>String(v).padStart(2,'0'); return `${d.summary.map} · ${d.summary.lead} Lv${d.summary.lv} · ${t.getMonth()+1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`; }
function toast(t){ log(t); status(t); }
function saveToSlot(n){ try{ localStorage.setItem(SLOT_KEY(n),JSON.stringify(snapshot())); toast(`브라우저 칸 ${n}에 저장했다.`); renderSlotList(); } catch(e){ toast('브라우저 저장에 실패했다. 파일로 내려받아 저장하자.'); } }
function deleteSlot(n){ try{ localStorage.removeItem(SLOT_KEY(n)); }catch(e){} renderSlotList(); }
function saveToFile(){ const d=snapshot(), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'})); a.download=`donghyunmon-${S.map}-lv${d.summary.lv}.dhsave`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast('저장 파일을 내려받았다.'); }
function saveMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),fn:()=>{ if(d) confirmMenu(`칸 ${n}에 덮어쓸까?`,[['덮어쓴다',()=>saveToSlot(n)],['그만둔다',()=>{}]],saveMenu); else saveToSlot(n); }}); }
  items.push({label:'파일로 내려받기',note:'.dhsave',fn:saveToFile},{label:'칸 지우기',fn:deleteMenu},['돌아가기',mainMenu]);
  openMenu('저장',items,mainMenu);
}
function deleteMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),off:!d,fn:()=>confirmMenu(`칸 ${n}${n===2?'를':'을'} 지울까? 되돌릴 수 없다.`,[['지운다',()=>{ deleteSlot(n); toast(`브라우저 칸 ${n}${n===2?'를':'을'} 지웠다.`); }],['그만둔다',()=>{}]],deleteMenu)}); }
  items.push(['돌아가기',saveMenu]); openMenu('칸 지우기',items,saveMenu);
}
function loadFrom(d){ try{ restore(d); }catch(e){ const msg='불러오기 실패: '+e.message; if(S){ toast(msg); } else { result(msg,'error'); status('불러오기 실패','error'); } } }
function loadMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),off:!d,fn:()=>confirmMenu('지금 판을 버리고 불러올까?',[['불러온다',()=>loadFrom(readSlot(n))],['그만둔다',()=>{}]],loadMenu)}); }
  items.push({label:'파일에서 불러오기',note:'.dhsave',fn:()=>$('#load-file').click()},['돌아가기',mainMenu]);
  openMenu('불러오기',items,mainMenu);
}
async function loadFile(input){ const f=input.files[0]; input.value=''; if(!f) return; try{ loadFrom(JSON.parse(await f.text())); }catch(e){ loadFrom(null); } }
$('#load-file').onchange=e=>loadFile(e.target); $('#load-file-setup').onchange=e=>loadFile(e.target);
document.querySelector('.load-head label').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); $('#load-file-setup').click(); } });
function renderSlotList(){
  const box=$('#slot-list'); box.innerHTML='';
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); const b=document.createElement('button'); b.className='slot-btn'; b.disabled=!d;
    b.innerHTML=`<b>칸 ${n}</b><span>${esc(slotNote(d))}</span>${d?`<small>도감 ${d.summary.dex} · 배지 ${d.summary.badge} · ${Number(d.summary.money).toLocaleString('ko-KR')}원</small>`:''}`;
    b.onclick=()=>loadFrom(d);
    const row=document.createElement('div'); row.className='slot-row'; row.append(b);
    if(d){ const x=document.createElement('button'); x.className='slot-del'; x.type='button'; x.textContent='지우기'; x.setAttribute('aria-label',`칸 ${n} 지우기`);
      x.onclick=()=>{ if(confirm(`칸 ${n}${n===2?'를':'을'} 지울까? 되돌릴 수 없다.`)){ deleteSlot(n); status(`브라우저 칸 ${n}${n===2?'를':'을'} 지웠다.`); } }; row.append(x); }
    box.append(row);
  }
}

/* ---------- 키 입력 ---------- */
const KEYMAP={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyX:'x',KeyZ:'z',KeyS:'s',KeyA:'a',Enter:'enter',NumpadEnter:'enter',Space:'x'};
function keyOf(e){ return KEYMAP[e.code]||({x:'x',z:'z',s:'s',a:'a',X:'x',Z:'z',S:'s',A:'a',Enter:'enter',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'})[e.key]||null; }
document.addEventListener('keydown',e=>{
  if(!S||tab!=='play') return;
  const el=document.activeElement; if(el&&(el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.tagName==='INPUT')) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  const k=keyOf(e); if(!k) return; e.preventDefault(); if(e.repeat) return; keyDown(k);
});
document.addEventListener('keyup',e=>{ const k=keyOf(e); if(!k) return; keyUp(k); });
GP.start({hint:'A 확인 · B 취소 · X 동현몬 · Y 상태 · + 메뉴',status:t=>status(t),
  down(k){ if(!S||tab!=='play') return; keyDown(k); }, up(k){ if(!S) return; keyUp(k); }});
function keyDown(k){
  if(!S) return;
  if(mode==='over'){ if(S.dialog){ keys.aPressed=true; return; } if(k==='x'||k==='enter'||k==='z') backToSetup(); return; }
  if(menu){ if(k==='up'||k==='down'){ const n=menu.items.length; menu.i=(menu.i+(k==='up'?-1:1)+n)%n; drawMenu(); } else if(k==='x'||k==='enter'){ pick(); } else if(k==='z'){ cancelMenu(); } return; }
  if(k==='up'||k==='down'||k==='left'||k==='right'){ keys[k]=true; keys[k+'Pressed']=true; }
  else if(k==='x') keys.aPressed=true;
  else if(k==='z') keys.bPressed=true;
  else if(k==='s'){ if(S.mode==='world') partyMenu(); }
  else if(k==='a'){ const m=S.party[0]; toast(`${MAPS[S.map].name} · ${E.name(m)} Lv${m.lv} 체력 ${m.hp}/${m.maxhp} · ${S.money}원 · 동현볼 ${S.bag.ball||0}`); }
  else if(k==='enter') mainMenu();
}
function keyUp(k){ if(k==='up'||k==='down'||k==='left'||k==='right') keys[k]=false; }
document.querySelectorAll('#touchpad [data-key]').forEach(b=>{
  const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',x:'x',z:'z',s:'s',a:'a',Enter:'enter'}[b.dataset.key];
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keyDown(m);});
  const up=e=>{e.preventDefault();keyUp(m);}; b.addEventListener('pointerup',up); b.addEventListener('pointercancel',up); b.addEventListener('lostpointercapture',up);
});
addEventListener('blur',()=>{ keys.up=keys.down=keys.left=keys.right=false; });

/* ---------- 시험용 연결 ---------- */
window.render_game_to_text=()=>JSON.stringify(S?{mode,paused,status:S.status,map:S.map,gameMode:S.mode,hero:{tx:S.hero.tx,ty:S.hero.ty,dir:S.hero.dir},pet:S.petHidden?null:{tx:S.pet.tx,ty:S.pet.ty},
  party:S.party.map(m=>({key:m.key,lv:m.lv,hp:m.hp,maxhp:m.maxhp})),money:S.money,bag:S.bag,badge:S.badge,dex:Object.keys(S.dex.caught),dialog:S.dialog?{page:S.dialog.pages[S.dialog.i],choice:S.dialog.choice?S.dialog.choice.items:null}:null,
  battle:S.battle?{kind:S.battle.kind,phase:S.battle.phase,text:S.battle.text,foe:{key:S.battle.foes[S.battle.fi].key,hp:S.battle.foes[S.battle.fi].hp}}:null}:{mode:'setup',cfg});
window.__donghyunmon={get state(){return S;},snapshot,restore,readSlot,saveToSlot,keyDown,keyUp,keys,parseSortie,examples,get mode(){return mode;},start:(c)=>startGame(c||cfg),step:(n=1)=>{for(let i=0;i<n;i++){if(!S||S.status!=='play')break;tickOnce();}}};
selectExample(); sortieCard(cfg); preview(cfg); renderSlotList();
/* ---------- 전체 화면(동현둠과 같은 규칙) ---------- */
const stageFull=$('#stage-full');
const fullEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
const canNativeFull=!!((document.fullscreenEnabled||document.webkitFullscreenEnabled)&&(stageFull.requestFullscreen||stageFull.webkitRequestFullscreen));
const isPseudo=()=>stageFull.classList.contains('pseudo-full');
const isFull=()=>fullEl()===stageFull||isPseudo();
const SIDE_MQ=matchMedia('(orientation: landscape) and (pointer: coarse)');
function setPseudo(on){ stageFull.classList.toggle('pseudo-full',on); document.documentElement.classList.toggle('pseudo-full-on',on); onFull(); }
function exitFull(){ if(isPseudo()) return setPseudo(false); if(fullEl()===stageFull) (document.exitFullscreen||document.webkitExitFullscreen||(()=>{})).call(document); }
let hintTimer=0;
function onFull(){ const on=isFull(); stageFull.classList.toggle('fs',on); stageFull.classList.toggle('side',on&&SIDE_MQ.matches);
  $('#exit-full').hidden=!on; $('#full').textContent=on?'전체 화면 닫기':'전체 화면';
  clearTimeout(hintTimer); $('#full-hint').hidden=!on; if(on) hintTimer=setTimeout(()=>$('#full-hint').hidden=true,5000);
  fit(); setTimeout(fit,60); if(on) $('#full').blur(); if(S) hud(); }
document.addEventListener('fullscreenchange',onFull); document.addEventListener('webkitfullscreenchange',onFull);
SIDE_MQ.addEventListener?SIDE_MQ.addEventListener('change',onFull):SIDE_MQ.addListener(onFull);
$('#exit-full').onclick=exitFull;
$('#full').onclick=()=>{ if(isFull()) return exitFull(); if(!S) return;
  if(!canNativeFull) return setPseudo(true);
  try{ const r=stageFull.requestFullscreen?stageFull.requestFullscreen():stageFull.webkitRequestFullscreen();
    if(r&&r.catch) r.catch(()=>setPseudo(true)); }catch(e){ setPseudo(true); } };
})();
