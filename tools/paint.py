# 동현몬 도트 그림 생성기. 실행하면 src/sprites.js를 다시 쓴다. 원작 게임의 그림은 한 점도 쓰지 않는다.
# python3 tools/paint.py
import json, os, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAL={
 'K':'#2e2a38','E':'#ffffff','W':'#f6ecd6','G':'#c9aa78','R':'#d6403a',
 # 땅·나무·물
 '1':'#8fd16a','2':'#5faa4b','3':'#e2c88f','4':'#c9ab6d','5':'#3f8a3a','6':'#58a84a','7':'#5fa8e0','8':'#b5dcf2','9':'#c9b8a0',
 # 건물·실내
 'M':'#e5483a','d':'#9a2620','B':'#3b63b5','b':'#24417a','I':'#8d919c','i':'#c7c9d1','O':'#d98a3c','o':'#8a5a2b','n':'#f3e6c8','h':'#6b4a2e',
 'c':'#8c7a63','Q':'#f0b56a','U':'#7f9fe0','u':'#e8dcc4','v':'#dccfb4','x':'#c76b5c','z':'#e9a08f','t':'#7a4a22','T':'#b07a3e','a':'#9a978c','A':'#5d5b53',
 # 사람·동현몬
 's':'#efc7a6','S':'#d9a785','y':'#edc776','N':'#b9b9b9','j':'#8a62b8','p':'#f0a3a3','P':'#d97b86','m':'#87546a','w':'#f6f2e8','Y':'#f2b705','k':'#231d18','g':'#6fb04a','L':'#ff9f86','q':'#ef9a8b','r':'#cf6157','e':'#49392f','D':'#d48a78','H':'#4b382e','C':'#2bb0c8','l':'#f59a9a'
}
def blank(w=16,h=16): return [['.']*w for _ in range(h)]
def put(g,x,y,c):
    if 0<=y<len(g) and 0<=x<len(g[0]): g[y][x]=c
def rect(g,x,y,w,h,c):
    for yy in range(y,y+h):
        for xx in range(x,x+w): put(g,xx,yy,c)
def blob(g,rows,x0,y0):
    for dy,r in enumerate(rows):
        for dx,ch in enumerate(r):
            if ch!=' ': put(g,x0+dx,y0+dy,ch)
def disc(g,cx,cy,r,c):
    for y in range(len(g)):
        for x in range(len(g[0])):
            if (x-cx+0.5)**2+(y-cy+0.5)**2<=r*r: g[y][x]=c
def outline(g,c='K'):
    h=len(g); w=len(g[0]); o=[r[:] for r in g]
    for y in range(h):
        for x in range(w):
            if g[y][x]=='.':
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    xx,yy=x+dx,y+dy
                    if 0<=xx<w and 0<=yy<h and g[yy][xx]!='.': o[y][x]=c; break
    return o
def flip(g): return [r[::-1] for r in g]
def S(g): return [''.join(r) for r in g]
SPR={}
def add(k,g): SPR[k]=S(g)

# ---------- 땅 타일 ----------
def tile_fill(c,dots=(),dc=None):
    g=blank(); rect(g,0,0,16,16,c)
    for x,y in dots: put(g,x,y,dc)
    return g
add('t_.',tile_fill('3',[(3,5),(11,2),(7,12),(13,9)],'4'))                       # 길
add('t_,',tile_fill('1',[(2,3),(9,6),(5,11),(13,13),(12,1)],'2'))               # 풀
g=tile_fill('1'); 
for x0 in (1,6,11):
    for y0 in (1,8):
        blob(g,['2 2','252','252',' 5 '][::-1],x0,y0)
add('t_t',g)                                                                   # 긴 풀
g=tile_fill('1'); disc(g,8,7,7.2,'5'); disc(g,6,5,3.6,'6'); rect(g,6,12,4,4,'t'); rect(g,5,15,6,1,'h'); add('t_T',g)  # 나무
g=tile_fill('7',[(2,4),(3,4),(10,9),(11,9),(6,13),(7,13),(12,2),(13,2)],'8'); add('t_w',g)       # 물
g=tile_fill('1'); rect(g,0,6,16,2,'T'); rect(g,0,11,16,2,'T'); rect(g,2,4,3,11,'t'); rect(g,11,4,3,11,'t'); rect(g,2,4,3,1,'h'); rect(g,11,4,3,1,'h'); add('t_f',g)  # 울타리
g=tile_fill('1'); blob(g,['.q.','qYq','.q.'],2,2); blob(g,['.l.','lYl','.l.'],9,8); blob(g,['.E.','EYE','.E.'],10,1); add('t_F',g)  # 꽃
g=tile_fill('1'); rect(g,3,3,10,8,'T'); rect(g,4,4,8,6,'n'); rect(g,5,6,6,1,'h'); rect(g,5,8,4,1,'h'); rect(g,7,11,2,4,'t'); add('t_s',g)  # 표지판
g=tile_fill('1'); disc(g,8,9,6,'A'); disc(g,7,8,4,'a'); add('t_#',g)                                   # 바위
# 지붕·벽·문
def roof(c1,c2,c3):
    # 위 테두리 → 밝은 줄 → 기와 → 처마 밝은 띠 → 그늘 → 아래 테두리 (동현워 건물의 지붕·처마 띠를 따른다)
    g=tile_fill(c1); rect(g,0,0,16,1,'K'); rect(g,0,1,16,1,c3)
    for y in range(4,13,4): rect(g,0,y,16,1,c2)
    for y in range(2,13,4):
        for x in range(0,16,4): put(g,x,y,c2); put(g,x+1,y,c2)
    rect(g,0,13,16,1,c3); rect(g,0,14,16,1,c2); rect(g,0,15,16,1,'K')
    return g
add('t_R',roof('O','o','Q')); add('t_C',roof('M','d','l')); add('t_L',roof('i','I','w')); add('t_G',roof('B','b','U'))
g=tile_fill('n'); rect(g,0,0,16,1,'c'); rect(g,4,4,8,7,'8'); rect(g,4,4,8,1,'h'); rect(g,4,10,8,1,'h'); rect(g,4,4,1,7,'h'); rect(g,11,4,1,7,'h'); rect(g,7,4,1,7,'h'); rect(g,5,5,2,2,'E'); rect(g,4,11,8,1,'c'); rect(g,0,15,16,1,'K'); add('t_H',g)   # 벽+창(창턱·유리 반사·아래 테두리)
g=tile_fill('i'); rect(g,0,0,16,1,'I'); rect(g,4,4,8,7,'8'); rect(g,4,4,8,1,'A'); rect(g,4,10,8,1,'A'); rect(g,4,4,1,7,'A'); rect(g,11,4,1,7,'A'); rect(g,5,5,2,2,'E'); rect(g,4,11,8,1,'I'); rect(g,0,15,16,1,'K'); add('t_W',g)
g=tile_fill('n'); rect(g,0,0,16,1,'c'); rect(g,3,2,10,14,'h'); rect(g,4,3,8,13,'t'); put(g,10,9,'Y'); rect(g,0,15,3,1,'K'); rect(g,13,15,3,1,'K'); add('t_D',g)   # 문(문턱은 길로 열린다)
# 실내
g=tile_fill('9'); rect(g,0,0,16,4,'c'); rect(g,0,13,16,3,'c'); add('t_=',g)
add('t__',tile_fill('u',[(0,0),(8,8),(1,9),(9,1)],'v'))
g=tile_fill('u'); rect(g,0,3,16,9,'T'); rect(g,0,3,16,2,'n'); rect(g,0,12,16,2,'t'); add('t_k',g)      # 탁자
g=tile_fill('u'); rect(g,1,0,14,14,'t'); rect(g,2,1,12,5,'h'); rect(g,2,8,12,5,'h');
for i,c in enumerate('MBYgMB'): rect(g,2+i*2,2,2,4,c)
for i,c in enumerate('gYMBgY'): rect(g,2+i*2,9,2,4,c)
add('t_b',g)                                                                                            # 책장
g=tile_fill('u'); rect(g,2,1,12,13,'A'); rect(g,3,2,10,6,'a'); rect(g,4,3,8,4,'8'); put(g,5,4,'E'); rect(g,4,10,3,2,'g'); rect(g,9,10,3,2,'M'); add('t_B',g)   # 기계
g=tile_fill('u'); rect(g,5,10,6,5,'x'); rect(g,6,9,4,1,'z'); disc(g,8,6,3.5,'5'); disc(g,7,5,1.6,'6'); add('t_p',g)   # 화분
g=tile_fill('x'); rect(g,0,0,16,2,'z'); rect(g,0,14,16,2,'z'); rect(g,2,4,12,8,'z'); rect(g,4,6,8,4,'x'); add('t_m',g)  # 매트
# 확장(v0.18): 부두 널빤지·모래·철로·계단·역 지붕·역 벽·기둥·의자·멈춘 열차
g=tile_fill('T'); rect(g,0,0,16,1,'h'); rect(g,0,5,16,1,'h'); rect(g,0,10,16,1,'h'); rect(g,0,15,16,1,'h'); put(g,2,2,'t'); put(g,13,7,'t'); put(g,6,12,'t'); add('t_P',g)   # 부두 널빤지(걷는다)
add('t_n',tile_fill('n',[(2,3),(9,6),(5,11),(13,13),(12,1),(7,8)],'4'))                                 # 모래(걷는다)
g=tile_fill('9'); rect(g,0,3,16,1,'A'); rect(g,0,11,16,1,'A'); rect(g,1,1,2,14,'t'); rect(g,7,1,2,14,'t'); rect(g,13,1,2,14,'t'); rect(g,0,3,16,1,'A'); rect(g,0,11,16,1,'A'); add('t_r',g)   # 철로(막힘)
g=tile_fill('u'); rect(g,0,2,16,3,'v'); rect(g,0,5,16,1,'c'); rect(g,0,8,16,3,'v'); rect(g,0,11,16,1,'c'); rect(g,0,14,16,2,'c'); add('t_S',g)   # 계단(밟으면 층을 오르내린다)
add('t_Z',roof('a','A','N'))                                                                              # 역 지붕
g=tile_fill('i'); rect(g,0,0,16,1,'I'); rect(g,3,3,10,8,'8'); rect(g,3,3,10,1,'A'); rect(g,3,10,10,1,'A'); rect(g,3,3,1,8,'A'); rect(g,12,3,1,8,'A'); rect(g,7,3,1,8,'A'); rect(g,4,4,2,2,'E'); rect(g,0,15,16,1,'K'); add('t_V',g)   # 역 벽
g=tile_fill('u'); rect(g,5,0,6,16,'i'); rect(g,5,0,1,16,'I'); rect(g,10,0,1,16,'I'); rect(g,4,0,8,2,'I'); rect(g,4,14,8,2,'I'); add('t_O',g)   # 기둥
g=tile_fill('u'); rect(g,1,5,14,5,'T'); rect(g,1,5,14,1,'n'); rect(g,2,10,2,4,'h'); rect(g,12,10,2,4,'h'); rect(g,1,2,14,3,'t'); add('t_c',g)   # 의자
g=tile_fill('9'); rect(g,0,2,16,11,'B'); rect(g,0,2,16,1,'U'); rect(g,2,4,5,4,'8'); rect(g,9,4,5,4,'8'); rect(g,0,10,16,2,'b'); rect(g,2,13,3,3,'K'); rect(g,11,13,3,3,'K'); rect(g,0,12,16,1,'K'); add('t_q',g)   # 멈춘 열차(막힘)
# ---------- 꾸밈(v0.20): 같은 글자의 다른 모양(그리기가 자리 해시로 고른다)과 새 꾸밈 칸 ----------
# 풀 변형: 작은 풀잎 다발 / 세잎·하얀 점
g=tile_fill('1'); blob(g,['2 2',' 2 '],3,4); blob(g,['2 2',' 2 '],10,10); put(g,12,3,'2'); put(g,6,12,'2'); add('t_,2',g)
g=tile_fill('1',[(2,3),(9,6),(5,11),(13,13)],'2'); blob(g,['E','6'],11,2); blob(g,['E','6'],4,9); put(g,8,13,'6'); add('t_,3',g)
# 긴 풀 변형: 자리가 엇갈린 다발
g=tile_fill('1')
for x0 in (3,9):
    for y0 in (1,8):
        blob(g,['2 2','252','252',' 5 '][::-1],x0,y0)
blob(g,['2 2','252',' 5 '][::-1],0,5); blob(g,['2 2','252',' 5 '][::-1],13,12); add('t_t2',g)
# 나무 변형: 조금 더 둥글고 밝은 잎, 왼쪽 위 반짝임
g=tile_fill('1'); disc(g,8,8,7.4,'5'); disc(g,8,7,6,'6'); disc(g,6,5,2.6,'g'); put(g,5,4,'1'); rect(g,6,13,4,3,'t'); rect(g,5,15,6,1,'h'); add('t_T2',g)
# 꽃 변형: 노란 꽃 / 하얀·분홍 꽃
g=tile_fill('1'); blob(g,['.Y.','YEY','.Y.'],2,3); blob(g,['.Y.','YEY','.Y.'],9,9); blob(g,['.q.','qYq','.q.'],10,1); put(g,5,12,'2'); add('t_F2',g)
g=tile_fill('1'); blob(g,['.E.','EYE','.E.'],3,2); blob(g,['.p.','pEp','.p.'],9,7); blob(g,['.E.','EYE','.E.'],2,10); put(g,13,13,'2'); add('t_F3',g)
# 바위 변형: 작은 바위 둘
g=tile_fill('1'); disc(g,5,9,3.6,'A'); disc(g,4,8,2.4,'a'); disc(g,11,11,2.8,'A'); disc(g,10,10,1.6,'a'); add('t_#2',g)
# 물 변형(두 틀 번갈아 흔들린다)
g=tile_fill('7',[(3,4),(4,4),(11,9),(12,9),(7,13),(8,13),(13,2),(14,2)],'8'); add('t_w2',g)
# 실내 바닥 변형: 격자 무늬의 옅은 칸
add('t__2',tile_fill('v',[(0,0),(8,8),(1,9),(9,1)],'u'))
# 가로등(막힘): 어두운 기둥, 노란 등, 받침
g=tile_fill('1'); rect(g,7,3,2,11,'A'); rect(g,5,14,6,1,'A'); rect(g,5,1,6,3,'Y'); rect(g,6,0,4,1,'A'); rect(g,5,4,6,1,'A'); put(g,6,2,'E'); add('t_o',g)
# 벤치(막힘): 나무 널과 다리
g=tile_fill('1'); rect(g,1,5,14,2,'T'); rect(g,1,8,14,3,'T'); rect(g,1,8,14,1,'n'); rect(g,2,11,2,3,'h'); rect(g,12,11,2,3,'h'); rect(g,1,5,14,1,'n'); add('t_x',g)
# 덤불(막힘): 둥근 짙은 덤불에 붉은 열매
g=tile_fill('1'); disc(g,8,9,6.2,'5'); disc(g,7,8,4.6,'6'); put(g,5,7,'R'); put(g,10,10,'R'); put(g,8,5,'R'); put(g,6,10,'g'); add('t_i',g)
# 연잎(물 위 · 막힘): 초록 잎과 분홍 꽃
g=tile_fill('7',[(2,3),(13,13)],'8'); disc(g,8,9,4.6,'6'); rect(g,8,6,1,3,'7'); blob(g,['.p.','pEp','.p.'],3,2); add('t_j',g)
# 양탄자(걷는다): 붉은 바탕에 금빛 테두리 점
g=tile_fill('x'); rect(g,0,0,1,16,'z'); rect(g,15,0,1,16,'z')
for y in range(1,16,3): put(g,2,y,'Y'); put(g,13,y,'Y')
add('t_a',g)
# 깃발 벽(막힘): 체육관 벽에 걸린 깃발
g=tile_fill('9'); rect(g,0,0,16,4,'c'); rect(g,0,13,16,3,'c'); rect(g,4,3,8,8,'B'); rect(g,4,3,8,1,'U'); rect(g,4,11,8,1,'B'); rect(g,5,12,6,1,'B'); rect(g,7,13,2,1,'B'); rect(g,6,6,4,3,'Y'); add('t_Y',g)
# 물건·말풍선
g=blank(); disc(g,8,8,5,'E'); 
for y in range(16):
    for x in range(16):
        if g[y][x]=='E' and y<8: g[y][x]='R'
rect(g,3,7,10,1,'K'); disc(g,8,8,1.4,'E'); add('ball',outline(g))
g=blank(); rect(g,5,1,6,10,'E'); rect(g,6,11,4,2,'E'); rect(g,7,3,2,5,'K'); rect(g,7,9,2,2,'K'); add('bang',outline(g))
g=blank(8,8); blob(g,['KKKKKKK','.KKKKK.','..KKK..','...K...'],0,2); add('arrow',g)

# ---------- 사람 16×16 (아래·위·왼쪽; 오른쪽은 뒤집기) ----------
def human(hair,shirt,pants,skin='s',hat=None,hair_long=False,glasses=False,coat=None,extra=None):
    out={}
    for view in ('down','up','left'):
        g=blank()
        if view!='left':
            # 머리
            rect(g,5,2,6,6,skin); rect(g,5,1,6,2,hair); rect(g,4,2,1,3,hair); rect(g,11,2,1,3,hair)
            if hair_long: rect(g,4,2,1,6,hair); rect(g,11,2,1,6,hair)
            if view=='up': rect(g,5,2,6,5,hair)
            else:
                put(g,6,5,'K'); put(g,9,5,'K')
                if glasses: rect(g,5,5,3,1,'K'); rect(g,8,5,3,1,'K'); put(g,5,5,'8'); put(g,10,5,'8')
            # 몸
            rect(g,5,8,6,5,shirt); rect(g,4,9,1,3,shirt); rect(g,11,9,1,3,shirt); put(g,4,12,skin); put(g,11,12,skin)
            if coat: rect(g,4,9,1,4,coat); rect(g,11,9,1,4,coat); rect(g,5,8,1,5,coat); rect(g,10,8,1,5,coat); rect(g,5,13,6,1,coat)
            rect(g,5,13,2,2,pants); rect(g,9,13,2,2,pants); rect(g,5,15,2,1,'K'); rect(g,9,15,2,1,'K')
            if hat:
                rect(g,4,1,8,2,hat); rect(g,5,0,6,1,hat)
                if view=='down': rect(g,3,3,10,1,hat)
        else:
            rect(g,6,2,5,6,skin); rect(g,6,1,5,2,hair); rect(g,6,2,1,4,hair); rect(g,6,2,2,6 if hair_long else 3,hair)
            put(g,9,5,'K')
            if glasses: rect(g,8,5,3,1,'K'); put(g,10,5,'8')
            rect(g,6,8,5,5,shirt); rect(g,7,9,2,3,shirt if not coat else coat); put(g,8,12,skin)
            if coat: rect(g,6,8,1,5,coat); rect(g,6,13,5,1,coat)
            rect(g,6,13,2,2,pants); rect(g,9,13,2,2,pants); rect(g,6,15,2,1,'K'); rect(g,9,15,2,1,'K')
            if hat: rect(g,5,1,7,2,hat); rect(g,6,0,5,1,hat); rect(g,4,3,8,1,hat)
        if extra: extra(g,view)
        out[view]=outline(g)
        # 걷기: 다리 바꾸기
        w=[r[:] for r in g]
        for y in (13,14):
            w[y]=g[y][:]
        if view=='left':
            rect(w,6,13,2,2,'.'); rect(w,6,15,2,1,'.'); rect(w,5,13,2,2,pants); rect(w,5,15,2,1,'K'); rect(w,10,13,2,2,pants); rect(w,10,15,2,1,'K'); rect(w,9,13,1,3,'.')
        else:
            rect(w,5,15,2,1,'.'); rect(w,5,14,2,1,'K'); rect(w,9,14,2,1,pants)
        out[view+'2']=outline(w)
    # 옆모습은 눈이 왼쪽에 오도록 좌우를 뒤집는다(걷는 방향과 얼굴 방향이 맞게). render는 오른쪽을 볼 때 이 그림을 다시 뒤집는다
    for k in ('left','left2'): out[k]=[r[::-1] for r in out[k]]
    return out
def net(g,view):
    if view=='left': rect(g,2,4,1,10,'T'); rect(g,0,2,4,3,'i'); put(g,1,3,'E')
    else: rect(g,13,4,1,10,'T'); rect(g,12,1,4,3,'i'); put(g,13,2,'E')
def staff(g,view):
    if view=='left': rect(g,3,6,1,9,'T')
    else: rect(g,13,7,1,8,'T')
def pack(g,view):
    if view=='left': rect(g,11,8,3,6,'t'); rect(g,11,8,3,1,'h')
    elif view=='up': rect(g,5,8,6,5,'t'); rect(g,5,8,6,1,'h'); rect(g,7,9,2,3,'h')
def rod(g,view):
    if view=='left': rect(g,2,1,1,14,'T'); put(g,1,0,'T'); rect(g,0,0,1,6,'N')
    else: rect(g,13,1,1,14,'T'); put(g,14,0,'T'); rect(g,15,0,1,6,'N')
def band(g,view):
    if view!='up': rect(g,5,9,6,1,'Y')
def horn(g,view):
    if view=='left': rect(g,0,6,4,3,'Y'); rect(g,0,6,1,3,'O')
    else: rect(g,12,6,4,3,'Y'); rect(g,15,6,1,3,'O')
PEOPLE={
 'hero':human('K','B','b',hat='M'),
 'mom':human('o','q','j',hair_long=True),
 'doc':human('N','i','A',coat='w',glasses=True),
 'girl':human('y','l','E',hair_long=True),
 'old':human('N','g','o',extra=staff),
 'nurse':human('p','E','E',hat='M'),
 'clerk':human('K','B','k',hat='B'),
 'boy':human('o','Y','B',hat='g'),
 'bugcatcher':human('K','g','o',hat='y',extra=net),
 'guard':human('K','I','k',hat='I'),
 'leader':human('K','R','k',glasses=True,coat='k'),
 'halt':human('K','a','A',hat='A',extra=band),
 'chief':human('N','k','K',hat='K',glasses=True,coat='A'),
 'sailor':human('o','E','B',hat='B'),
 'leader2':human('y','E','b',hat='E',extra=horn),
 'leader3':human('O','Y','o',hat='Y',glasses=True),
 'hiker':human('h','g','t',hat='t',extra=pack),
 'fisher':human('N','7','b',hat='Y',extra=rod),
 'worker':human('K','O','A',hat='Y'),
 'woman':human('h','P','j',hair_long=True),
}
for k,v in PEOPLE.items():
    for view,g in v.items(): add(f'{k}_{view}',g)

# ---------- 포동이 16×16 (뒤따르기) ----------
# 앞·뒤: 동현크의 둥근 머리를 따르고, 원본 포동이처럼 귀가 머리 양옆으로 늘어진다(말티즈). 눈 2×2에 흰 점, 코 2×2.
# 앞·뒤: 양옆에 늘어진 귀는 4~10행(7칸)
pet_down=[
".....KKKKKK.....",
"...KKWWWWWWKK...",
"..KWWWWWWWWWWK..",
".KWWWWWWWWWWWWK.",
"KWWWEKWWWWEKWWWK",
"KWWWKKWWWWKKWWWK",
"KWWKWWWKKWWWKWWK",
"KWWKWWWKKWWWKWWK",
"KWWKKWWWWWWKKWWK",
"KWWKRRRRRRRRKWWK",
".KKKWWWWWWWWKKK.",
"..KWWWWWWWWWWK..",
"..KWWKWWWWKWWK..",
"..KGGK.GG.KGGK..",
"..KKKK....KKKK..",
"................"
]
pet_up=[
".....KKKKKK.....",
"...KKWWWWWWKK...",
"..KWWWWWWWWWWK..",
".KWWWWWWWWWWWWK.",
"KWWWWWWWWWWWWWWK",
"KWWWWWWWWWWWWWWK",
"KWWKWWWWWWWWKWWK",
"KWWKWWWWWWWWKWWK",
"KWWKKWWWWWWKKWWK",
"KWWKWWWWWWWWKWWK",
".KKKWWWWWWWWKKK.",
"..KWWWWWWWWWWWWK",
"..KWWKWWWWKWWKK.",
"..KGGK.GG.KGGK..",
"..KKKK....KKKK..",
"................"
]
# 옆: 앞모습을 그대로 돌린 꼴. 큰 머리, 뒤통수 쪽에 늘어진 귀덮개(3~8행, 처음 길이의 80%), 앞쪽 코, 목줄, 뒤로 작은 몸과 꼬리.
pet_left=[
"...KKKKKK.......",
".KKWWWWWWKK.....",
"KWWWWWWWWWWK....",
"KWWWWWWWKWWWK...",
"KWEKWWWWKWWWWK..",
"KWKKWWWWKWWWWK..",
"KKWWWWWWKWWWWK..",
"KKWWWWWWKWWWWK..",
".KWWWWWWKKKKKKK.",
"..KKRRRRRRRRRKWK",
"...KWWWWWWWWWKWK",
"...KWWWWWWWWWWK.",
"...KWWKWWWWKWWK.",
"...KGGK..KGGKK..",
"...KKKK..KKKK...",
"................"
]
pet_left2=[
"...KKKKKK.......",
".KKWWWWWWKK.....",
"KWWWWWWWWWWK....",
"KWWWWWWWKWWWK...",
"KWEKWWWWKWWWWK..",
"KWKKWWWWKWWWWK..",
"KKWWWWWWKWWWWK..",
"KKWWWWWWKWWWWK..",
".KWWWWWWKKKKKKK.",
"..KKRRRRRRRRRKWK",
"...KWWWWWWWWWKWK",
"...KWWWWWWWWWWK.",
"...KWWKWWWWKWWK.",
"..KGGKK..KGGK...",
"..KKKK...KKKK...",
"................"
]
add('pet_down',pet_down); add('pet_up',pet_up); add('pet_left',pet_left); add('pet_left2',pet_left2)
pet_down2=[
".....KKKKKK.....",
"...KKWWWWWWKK...",
"..KWWWWWWWWWWK..",
".KWWWWWWWWWWWWK.",
"KWWWEKWWWWEKWWWK",
"KWWWKKWWWWKKWWWK",
"KWWKWWWKKWWWKWWK",
"KWWKWWWKKWWWKWWK",
"KWWKKWWWWWWKKWWK",
"KWWKRRRRRRRRKWWK",
".KKKWWWWWWWWKKK.",
"..KWWWWWWWWWWK..",
"..KWWKWWWWKWWK..",
"..KGGKGG..KGGK..",
"..KKKK....KKKK..",
"................"
]
pet_up2=[
".....KKKKKK.....",
"...KKWWWWWWKK...",
"..KWWWWWWWWWWK..",
".KWWWWWWWWWWWWK.",
"KWWWWWWWWWWWWWWK",
"KWWWWWWWWWWWWWWK",
"KWWKWWWWWWWWKWWK",
"KWWKWWWWWWWWKWWK",
"KWWKKWWWWWWKKWWK",
"KWWKWWWWWWWWKWWK",
".KKKWWWWWWWWKKK.",
"..KWWWWWWWWWWWWK",
"..KWWKWWWWKWWKK.",
"..KGGK..GGKGGK..",
"..KKKK....KKKK..",
"................"
]
add('pet_down2',pet_down2); add('pet_up2',pet_up2)

# ---------- 동현몬 24×24 ----------
MON={}
def mon(key,g): MON[key]=S(g)
# 포동이: 동현크 P_idle(24×20)을 그대로 쓴다(donghyuncr/src/sprites.js와 같은 글자 격자)
podong=[
"..............KKKKKK....",
"............KKWWWWWWKK..",
"...........KKWWWWWWWWK..",
".KKK......KWWKWWWWWWWKK.",
"KWWWK.....KWWKEKKWEKKWWK",
"KWWWK.....KWWKKKKWKKKWWK",
".KWWK......KKWKKKWKKKKK.",
"..KWK......KWWWWWWWWWWK.",
"...KKKKKKKKKWWWWWKKWWWK.",
"...KWWWWWWWKWWWWWKKWWWK.",
"..KWWWWWWWWWKKWWWWWWKK..",
"..KWWWWWWWKRRWKKKKKK....",
"..KWWWWWWWKRRRWWWK......",
"..KWWWWWWWWKKRRWWK......",
"...KWWWWWWWWWKKWK.......",
"..KWWWKKKKWWWKKKK.......",
"..KWWWKGGKWWWKGGK.......",
"..KGGGKGGKGGGKGGK.......",
"..KKKKKKKKKKKKKKK.......",
"........................",
"........................",
"........................",
"........................",
"........................"]
MON['podong']=[r+'.'*(24-len(r)) for r in podong]
# 라이언: 분홍 선충
g=blank(24,24)
for i,(x,y) in enumerate([(2,15),(5,13),(8,11),(11,10),(14,11),(17,12),(20,13)]):
    disc(g,x+1,y+1,2.6 if i<6 else 2.2,'p')
disc(g,20,13,2.8,'p'); rect(g,19,12,1,1,'K'); rect(g,22,12,1,1,'K'); put(g,21,15,'P')
for x in range(4,18,3): put(g,x,13,'P')
mon('lion',outline(g))
# 슈슈: 복싱 소녀
g=blank(24,24); rect(g,8,2,8,8,'s'); rect(g,8,1,8,2,'H'); rect(g,7,2,1,7,'H'); rect(g,16,2,1,7,'H'); put(g,10,6,'K'); put(g,13,6,'K'); rect(g,9,8,6,1,'D')
rect(g,8,10,8,7,'q'); rect(g,9,11,6,5,'r'); rect(g,9,17,2,4,'D'); rect(g,13,17,2,4,'D'); rect(g,9,21,2,1,'K'); rect(g,13,21,2,1,'K')
disc(g,5,12,3,'M'); disc(g,19,10,3,'M'); put(g,4,11,'L'); put(g,18,9,'L')
mon('shushu',outline(g))
# 초파리
g=blank(24,24); disc(g,12,13,5,'o'); disc(g,12,7,3.4,'K'); disc(g,11,7,1.3,'R'); disc(g,13,7,1.3,'R'); rect(g,10,3,1,2,'K'); rect(g,13,3,1,2,'K')
for x,y in ((4,10),(19,10)): rect(g,x,y-1,2,1,'8'); 
rect(g,2,9,8,4,'8'); rect(g,14,9,8,4,'8'); rect(g,3,10,6,2,'E'); rect(g,15,10,6,2,'E')
rect(g,8,18,1,3,'K'); rect(g,12,19,1,3,'K'); rect(g,15,18,1,3,'K'); rect(g,10,17,1,2,'K'); rect(g,13,17,1,2,'K')
mon('fly',outline(g))
# 꼬마선충: 주황 선충(분홍 라이언과 구별)
g=blank(24,24)
for i,(x,y) in enumerate([(3,16),(6,17),(9,16),(12,14),(15,12),(18,10),(20,8)]):
    disc(g,x+1,y+1,3.0,'O')
disc(g,20,8,3.2,'O'); put(g,19,7,'K'); put(g,21,7,'K'); disc(g,8,16,1.2,'Q'); disc(g,14,13,1.2,'Q')
mon('worm',outline(g))
# 보병(붉은별)
g=blank(24,24); rect(g,8,2,8,2,'A'); rect(g,7,4,10,2,'A'); put(g,12,3,'M'); rect(g,8,6,8,4,'s'); put(g,10,7,'K'); put(g,13,7,'K')
rect(g,8,10,8,8,'a'); rect(g,7,11,1,5,'a'); rect(g,16,11,1,5,'a'); rect(g,11,10,2,8,'A'); rect(g,8,18,3,4,'A'); rect(g,13,18,3,4,'A'); rect(g,8,22,3,1,'K'); rect(g,13,22,3,1,'K')
rect(g,17,6,2,12,'k'); rect(g,16,14,4,2,'t')
mon('inf',outline(g))
# 전차
g=blank(24,24); rect(g,2,15,20,6,'A'); rect(g,3,16,18,4,'a'); 
for x in range(4,20,4): rect(g,x,17,2,2,'k')
rect(g,4,10,16,5,'a'); rect(g,8,6,8,4,'A'); rect(g,14,7,9,2,'A'); put(g,11,8,'M'); put(g,12,8,'M')
mon('tank',outline(g))
# 전투기
g=blank(24,24); rect(g,3,11,18,3,'a'); rect(g,19,10,3,5,'A'); rect(g,14,9,4,2,'8'); rect(g,6,5,4,8,'a'); rect(g,7,14,4,6,'a'); rect(g,2,8,4,3,'A'); rect(g,2,14,4,3,'A'); put(g,12,12,'M'); put(g,13,12,'M'); rect(g,0,12,3,1,'E')
mon('jet',outline(g))
# 창병
g=blank(24,24); rect(g,8,2,8,2,'I'); rect(g,7,4,10,2,'I'); rect(g,8,6,8,4,'s'); put(g,10,7,'K'); put(g,13,7,'K')
rect(g,8,10,8,8,'B'); rect(g,9,11,6,6,'b'); rect(g,8,18,3,4,'h'); rect(g,13,18,3,4,'h'); rect(g,8,22,3,1,'K'); rect(g,13,22,3,1,'K')
rect(g,18,1,1,21,'T'); rect(g,17,0,3,3,'i'); put(g,18,0,'E')
mon('pike',outline(g))
# 궁수
g=blank(24,24); rect(g,8,3,8,2,'g'); rect(g,7,5,10,1,'g'); rect(g,8,6,8,4,'s'); put(g,10,7,'K'); put(g,13,7,'K')
rect(g,8,10,8,8,'t'); rect(g,9,11,6,6,'T'); rect(g,8,18,3,4,'h'); rect(g,13,18,3,4,'h'); rect(g,8,22,3,1,'K'); rect(g,13,22,3,1,'K')
for i in range(12): put(g,19+(i//6),4+i,'o')
rect(g,19,4,1,12,'o'); rect(g,20,3,1,1,'o'); rect(g,20,16,1,1,'o'); rect(g,21,4,1,12,'E'); rect(g,17,10,4,1,'i')
mon('archer',outline(g))
# 기사
g=blank(24,24); rect(g,8,2,8,8,'I'); rect(g,9,5,6,2,'K'); rect(g,11,0,2,3,'B'); rect(g,8,10,8,8,'i'); rect(g,11,11,2,6,'I'); rect(g,8,18,3,4,'I'); rect(g,13,18,3,4,'I'); rect(g,8,22,3,1,'K'); rect(g,13,22,3,1,'K')
rect(g,2,9,6,9,'B'); rect(g,3,10,4,7,'b'); rect(g,4,12,2,3,'Y'); rect(g,17,3,2,15,'i'); rect(g,16,15,4,2,'T')
mon('knight',outline(g))
# 꼬리콥터
g=blank(24,24); rect(g,10,3,2,4,'A'); rect(g,2,2,18,2,'C'); disc(g,11,12,5,'C'); rect(g,8,10,4,3,'8'); rect(g,15,11,7,2,'A'); rect(g,20,8,2,6,'C'); rect(g,6,17,10,1,'A'); rect(g,8,16,1,2,'A'); rect(g,14,16,1,2,'A'); put(g,13,13,'Y')
mon('copter',outline(g))
# 둠가이
g=blank(24,24); rect(g,7,1,10,5,'g'); rect(g,6,4,12,2,'5'); rect(g,8,6,8,4,'s'); put(g,10,7,'K'); put(g,13,7,'K'); rect(g,9,9,6,1,'D')
rect(g,7,10,10,8,'5'); rect(g,8,11,8,6,'g'); rect(g,8,18,3,4,'h'); rect(g,13,18,3,4,'h'); rect(g,8,22,3,1,'K'); rect(g,13,22,3,1,'K')
rect(g,14,12,9,2,'k'); rect(g,12,13,4,3,'t'); rect(g,21,11,2,1,'K')
mon('doom',outline(g))

# 정찰기병(동현워): 갈색 말 위의 푸른 기수
g=blank(24,24); rect(g,3,12,16,6,'t'); rect(g,2,13,3,4,'t'); rect(g,17,9,5,6,'t'); rect(g,18,8,3,2,'t'); put(g,20,11,'K'); rect(g,4,18,2,5,'h'); rect(g,8,18,2,5,'h'); rect(g,13,18,2,5,'h'); rect(g,16,18,2,5,'h'); rect(g,0,11,3,4,'h')
rect(g,9,3,5,4,'s'); rect(g,9,2,5,2,'I'); put(g,10,5,'K'); put(g,12,5,'K'); rect(g,9,7,5,5,'B'); rect(g,8,8,1,3,'B'); rect(g,14,8,1,3,'B'); rect(g,14,4,1,7,'T')
mon('scout',outline(g))
# 폭격기(동현전): 넓은 날개와 폭탄
g=blank(24,24); rect(g,2,8,20,3,'A'); rect(g,0,9,24,1,'a'); rect(g,9,3,6,14,'a'); rect(g,10,2,4,2,'A'); rect(g,8,16,8,2,'A'); rect(g,11,17,2,4,'A'); rect(g,10,6,4,2,'8'); put(g,4,9,'M'); put(g,19,9,'M'); rect(g,5,12,2,3,'k'); rect(g,17,12,2,3,'k'); rect(g,11,13,2,3,'k')
mon('bomber',outline(g))
# 팔라딘(동현워): 하얀 말 위의 은빛 기사, 창과 붉은 깃
g=blank(24,24); rect(g,3,12,16,6,'E'); rect(g,2,13,3,4,'E'); rect(g,17,9,5,6,'E'); rect(g,18,8,3,2,'N'); put(g,20,11,'K'); rect(g,4,18,2,5,'N'); rect(g,8,18,2,5,'N'); rect(g,13,18,2,5,'N'); rect(g,16,18,2,5,'N'); rect(g,0,11,3,4,'N')
rect(g,9,2,5,5,'I'); rect(g,10,4,3,1,'K'); rect(g,11,0,1,3,'M'); rect(g,9,7,5,5,'i'); rect(g,8,8,1,3,'i'); rect(g,14,8,1,3,'i'); rect(g,10,8,3,3,'B'); rect(g,15,1,1,15,'T'); rect(g,15,0,1,2,'i'); rect(g,5,7,3,5,'B'); rect(g,6,8,1,3,'Y')
mon('paladin',outline(g))
for k,v in MON.items(): SPR['m_'+k]=v
# ---------- 파일 쓰기 ----------
lines=['/* 동현몬 그림: 모든 도트는 tools/paint.py가 글자 격자로 새로 그린다. 원작 게임의 그림은 한 점도 쓰지 않는다.',
'   t_* 땅·건물·실내 16×16 · 사람 16×16(아래·위·왼쪽, 오른쪽은 뒤집기, 2는 걷기) · pet_* 뒤따르는 포동이 · m_* 동현몬 24×24 */',
'(function(root){','\'use strict\';','const PAL={\'.\':null,'+','.join(f"'{k}':'{v}'" for k,v in PAL.items())+'};','const SPR={']
for k,v in SPR.items(): lines.append(f"{json.dumps(k)}:`\n"+"\n".join(v)+"`,")
lines.append('};')
lines.append('''const cache={};
function rows(key){ return SPR[key].replace(/^\\n/,'').split('\\n'); }
function make(key,flip){
  const ck=key+(flip?'|f':''); if(cache[ck]) return cache[ck];
  if(!SPR[key]) key='ball';
  const rs=rows(key), h=rs.length, w=Math.max(...rs.map(r=>r.length));
  const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
  for(let y=0;y<h;y++) for(let x=0;x<rs[y].length;x++){ const col=PAL[rs[y][x]]; if(!col) continue; g.fillStyle=col; g.fillRect(flip?w-1-x:x,y,1,1); }
  cache[ck]=c; return c;
}
function has(key){ return !!SPR[key]; }
root.Sprites={make,has,PAL,SPR};
})(window);''')
open(os.path.join(ROOT,'src','sprites.js'),'w',encoding='utf8').write('\n'.join(lines)+'\n')
# 미리보기
try:
    from PIL import Image
    keys=list(SPR); sc=3; cols=16; cw=26*sc
    im=Image.new('RGB',(cols*cw,((len(keys)+cols-1)//cols)*cw),(120,180,230)); px=im.load()
    for i,k in enumerate(keys):
        ox=(i%cols)*cw; oy=(i//cols)*cw
        for y,r in enumerate(SPR[k]):
            for x,ch in enumerate(r):
                c=PAL.get(ch)
                if not c: continue
                rgb=tuple(int(c[j:j+2],16) for j in (1,3,5))
                for dy in range(sc):
                    for dx in range(sc): px[ox+x*sc+dx,oy+y*sc+dy]=rgb
    im.save('/tmp/mon_sheet.png'); print('sheet /tmp/mon_sheet.png', len(keys))
except Exception as e: print('no preview',e)
