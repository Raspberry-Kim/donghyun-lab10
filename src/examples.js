/* 동현몬 출전 예제. 동현랭 출력 정수: 명령 번호 뒤에 값. 1 시작 마을(1~3) · 2 포동이 성격(1~5) · 3 야생 출현율(0~5) · 4 소지금(0~9999) · 5 시드 · 6 출전 */
function expression(n){
  if(n===0)return '도옹ㅠ';
  if(n<0)return 'ㅠ '+expression(-n);
  if(n<=10)return '도'+'오'.repeat(n-1)+'옹';
  for(let a=10;a>=2;a--)if(n%a===0)return expression(a)+' '+expression(n/a);
  return expression(n-1)+'도옹';
}
const output=(...ns)=>ns.map(n=>'뿡뿡 '+expression(n)+'~뿡뿡뿡').join('~');
const block=(label,...ns)=>'ㅋㅋ '+label+'\n'+output(...ns);
const wrap=a=>['나는 동현이냐?',...a,'동현이구나'].join('\n');
const sortie=block('출전',6);
const examples=[
 {id:'basic',title:'01 · 기본 모험(하얀마을)',note:'아무 명령 없이 출전만 한다. 하얀마을 집 앞에서 포동이(균형)와 출발. 동현볼은 왼쪽 위 연구소의 동현 박사에게 받는다. 방향키로 걷고 X로 말을 건다.',
  code:wrap([sortie])},
 {id:'route',title:'02 · 산책로에서 출발',note:'명령 1에 2를 준다. 풀숲 한가운데서 동현볼 5개를 들고 출발한다. 긴 풀을 밟으면 라이언·초파리·꼬마선충·슈슈가 나온다.',
  code:wrap([block('시작 마을 2 · 산책로',1,2),sortie])},
 {id:'city',title:'03 · 동현시에서 출발',note:'명령 1에 3을 준다. 체육관 앞에서 바로 출발한다. 포동이 Lv5 혼자서는 관장을 이기기 어려우니 산책로로 내려가 동료를 모으자.',
  code:wrap([block('시작 마을 3 · 동현시',1,3),sortie])},
 {id:'atk',title:'04 · 공격형 포동이',note:'명령 2에 2를 준다. 공격 +10%, 방어 −10%. 먼저 쓰러뜨리는 싸움에 어울린다.',
  code:wrap([block('성격 2 · 공격형',2,2),sortie])},
 {id:'def',title:'05 · 방어형 포동이',note:'명령 2에 3을 준다. 방어 +10%, 공격 −10%. 오래 버티며 동현볼을 던지기 좋다.',
  code:wrap([block('성격 3 · 방어형',2,3),sortie])},
 {id:'fast',title:'06 · 재빠른 포동이',note:'명령 2에 4를 준다. 속도 +10%, 체력 −10%. 대부분의 상대보다 먼저 움직인다.',
  code:wrap([block('성격 4 · 재빠름',2,4),sortie])},
 {id:'norate',title:'07 · 야생 없음',note:'명령 3에 0을 주면 긴 풀에서 아무도 나오지 않는다. 트레이너 승부만으로 체육관까지 가는 연습이다.',
  code:wrap([block('출현율 0 · 야생 없음',3,0),sortie])},
 {id:'many',title:'08 · 우글우글',note:'명령 3에 5를 주면 긴 풀 한 걸음마다 거의 매번 만난다. 도감을 빨리 채우고 싶을 때.',
  code:wrap([block('시작 마을 2 · 산책로',1,2),block('출현율 5 · 우글우글',3,5),sortie])},
 {id:'rich',title:'09 · 소지금 5000원',note:'명령 4에 5000을 준다. 동현시 가게에서 동현볼(200원)과 좋은상처약(700원)을 넉넉히 살 수 있다. 5000 = 10 × 10 × 5 × 10으로 곱해서 만든다.',
  code:wrap([block('소지금 5000',4,5000),sortie])},
 {id:'poor',title:'10 · 빈털터리',note:'명령 4에 0을 준다. 트레이너 상금과 길에 떨어진 물건만으로 버텨야 한다.',
  code:wrap([block('소지금 0',4,0),sortie])},
 {id:'seed',title:'11 · 시드 바꾸기',note:'명령 5에 7을 준다. 야생 동현몬의 종류·레벨·포획 성공 여부는 시드에 따라 정해지므로, 같은 시드로 같은 길을 걸으면 같은 일이 벌어진다.',
  code:wrap([block('시드 7',5,7),sortie])},
 {id:'calc',title:'12 · 계산해서 정하기',note:'동현 = 2 × 3 = 6을 변수에 넣고, 성격은 동현 − 4 = 2(공격형), 소지금은 동현 × 10 × 10 × 5 = 3000으로 계산한다. 동현랭의 변수·사칙연산을 써 본 예다.',
  code:wrap(['ㅋㅋ 동현 = 2 × 3','동현아 도오옹 도오오옹','ㅋㅋ 성격 ← 동현 − 4 (ㅠ 하나가 −1)','뿡뿡 도오옹~뿡뿡뿡~뿡뿡 동현ㅠㅠㅠㅠ~뿡뿡뿡','ㅋㅋ 소지금 ← 동현 × 10 × 10 × 5','뿡뿡 '+expression(4)+'~뿡뿡뿡~뿡뿡 동현 '+expression(10)+' '+expression(10)+' '+expression(5)+'~뿡뿡뿡',sortie])},
 {id:'blank',title:'13 · 빈 코드',note:'시작·끝 선언만 있다. 출전 명령 6이 없으면 나서지 않는다. 출전을 누르면 설정 미리보기만 보여 준다.',
  code:wrap([])}
];
