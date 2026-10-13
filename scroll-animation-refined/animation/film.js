// Deterministic 2D animation: every shot can be rendered at an exact time.
const canvas = document.getElementById('film');
const ctx = canvas.getContext('2d');
const W = 1280, H = 720;
const paper = '#f3f3ef', ink = '#191919', gray = '#b8b8b2';
const clamp = (x, a=0, b=1) => Math.min(b, Math.max(a,x));
const ease = x => { x=clamp(x);return x*x*(3-2*x); };
function line(x1,y1,x2,y2,color=ink,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function path(points,color,width=5){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function cloud(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);path([[-55,9],[-30,9],[-23,-3],[-7,-9],[8,-4],[17,-19],[38,-19],[49,-7],[61,9],[84,9]],'#b8b8b2',1.5);ctx.restore();}
function buildings(t,near=false){
 const spacing=near?180:150;
 for(let i=-3;i<12;i++){
  const x=i*spacing-(t*(near?60:16))%spacing;
  const h=near?130+(i+12)%4*37:170+(i+12)%5*26;
  const y=520-h;
  rect(x,y,spacing-22,h,near?'#e0e0db':'#eaeae5');
  line(x,y,x+spacing-22,y,near?'#999992':'#c7c7c0',1);
  for(let r=0;r<Math.floor(h/37)-1;r++)for(let c=0;c<3;c++)rect(x+20+c*36,y+22+r*34,12,16,near?'#b8b8b2':'#d6d6cf');
  if(near){line(x+8,y-10,x+8,y,'#999992',1);line(x+8,y-10,x+37,y-10,'#999992',1);}
 }
}
function tree(x,y,s,t){ctx.save();ctx.translate(x,y);ctx.scale(s,s);line(0,0,0,-133,ink,4);line(0,-65,-37,-95,ink,3);line(0,-87,38,-119,ink,3);const sway=Math.sin(t*1.8)*3;circle(-25+sway,-135,43,'#d1d1ca');circle(27+sway,-150,48,'#d1d1ca');circle(sway,-180,47,'#d1d1ca');ctx.restore();}
function lamp(x){line(x,525,x,284,ink,3);path([[x,287],[x+12,275],[x+54,275]],ink,3);rect(x+41,275,28,8,ink);}
function bird(x,y,t,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);let wing=Math.sin(t*9)*12;path([[-17,-wing],[0,2],[17,-wing]],ink,2);ctx.restore();}
function person(x,y,s,t,stop=0){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 const amp=1-stop;const cycle=t*8.6;const swing=Math.sin(cycle)*amp;const bob=Math.abs(Math.cos(cycle))*2.5*amp;
 ctx.translate(0,-bob);
 ctx.save();ctx.scale(1,.18);circle(0,12,35,'#d2d2cc');ctx.restore();
 // Articulated legs: alternating thigh and shin, shoes remain clear silhouettes.
 for(const side of [-1,1]){
  const phase=swing*side;const hip=side*5;
  const kneeX=hip+phase*17;const kneeY=-31-Math.max(0,phase)*5;
  const footX=hip+phase*29;const footY=-2-Math.max(0,-phase)*10;
  path([[hip,-63],[kneeX,kneeY],[footX,footY]],side===-1?'#777770':ink,9);
  path([[footX-5,footY],[footX+9,footY]],ink,7);
 }
 // Coat, backpack, neck, head, hair, nose, arms.
 ctx.fillStyle=ink;ctx.beginPath();ctx.moveTo(-17,-117);ctx.quadraticCurveTo(0,-125,15,-111);ctx.lineTo(22,-63);ctx.lineTo(-23,-63);ctx.closePath();ctx.fill();
 ctx.fillStyle='#777770';ctx.beginPath();ctx.roundRect(-30,-114,17,43,7);ctx.fill();
 rect(-3,-135,9,15,paper);circle(1,-145,17,paper);
 ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(1,-145,17,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle=ink;ctx.beginPath();ctx.arc(0,-150,16,Math.PI,Math.PI*2);ctx.lineTo(13,-144);ctx.lineTo(-15,-144);ctx.fill();
 path([[15,-147],[20,-143],[15,-141]],ink,2);circle(11,-149,1.4,ink);
 path([[10,-110],[15-swing*12,-87],[17-swing*24,-66-stop*9]],paper,5);
 path([[10,-110],[15-swing*12,-87],[17-swing*24,-66-stop*9]],ink,2);
 // Scarf tails trail and flutter with the walk.
 path([[-5,-128],[-24,-124],[-39,-128+Math.sin(t*7)*3*amp]],'#888881',5);
 ctx.restore();
}
function caption(text){ctx.fillStyle=ink;ctx.font='20px "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.fillText(text,640,665);}
function wide(t){
 cloud(205-t*8,150,1.2);cloud(990-t*10,108,.9);circle(1080,155,38,'#e0e0da');buildings(t);buildings(t,true);
 rect(0,520,W,200,paper);line(0,520,W,520,ink,2);line(0,581,W,581,'#c9c9c2',1);
 tree(1035-t*36,521,1.15,t);lamp(210-t*35);
 for(let i=0;i<9;i++)line(i*200-t*50,558,i*200+65-t*50,558,'#b8b8b2',1);
 person(275+t*88,545,1,t);
 bird(480+t*65,130,t,.65);bird(425+t*65,154,t+.4,.5);
 caption('穿过城市，听见自己的节奏。');
}
function tracking(t){
 ctx.save();ctx.translate(640,445);ctx.scale(1.65,1.65);ctx.translate(-640,-445);
 cloud(900-t*10,170,1);buildings(t+4);buildings(t+4,true);rect(0,520,W,200,paper);line(0,520,W,520,ink,2);
 for(let i=-3;i<14;i++)line(i*170-t*125,577,i*170+75-t*125,577,'#b8b8b2',1);
 lamp(1120-t*145);tree(1420-t*130,525,.9,t);person(635,550,1.23,t+3.3);
 ctx.restore();caption('一步一步，向前。');
}
function riverside(t){
 const camera=1.12-.12*ease(t/3.2);
 ctx.save();ctx.translate(640,360);ctx.scale(camera,camera);ctx.translate(-640,-360);
 circle(1010,160,52,'#deded8');cloud(240-t*10,130,1.1);cloud(770-t*8,95,.8);
 // Far skyline across water.
 ctx.save();ctx.translate(0,-60);ctx.scale(1,.75);buildings(t*.2);ctx.restore();
 rect(0,373,W,180,'#e4e4df');
 for(let i=0;i<15;i++){const y=387+i*11;const x=120+(i*137)%1000+Math.sin(t*1.3+i)*15;line(x,y,x+40+(i%4)*17,y,'#b8b8b2',1);}
 rect(0,540,W,180,paper);line(0,540,W,540,ink,2);
 for(let i=0;i<14;i++)line(i*115,462,i*115,540,'#777770',2);
 line(0,460,W,460,ink,3);line(0,494,W,494,'#777770',2);
 tree(175,548,1.15,t);tree(1130,548,.85,t);
 const stop=ease((t-.65)/1.1);person(480+75*Math.min(t,1.35),565,1,t+6.8,stop);
 bird(800+t*48,210-t*11,t,.8);bird(865+t*48,190-t*9,t+.4,.6);bird(740+t*48,185-t*8,t+.7,.55);
 ctx.restore();caption('停一停，世界仍在轻轻移动。');
}
window.renderFrame = function(time){
 const t=clamp(time,0,10);ctx.setTransform(1,0,0,1,0,0);rect(0,0,W,H,paper);
 if(t<3.3)wide(t);else if(t<6.5)tracking(t-3.3);else riverside(t-6.5);
 // Soft white shutter transitions connect the three camera setups.
 let alpha=0;
 for(const cut of [3.3,6.5])alpha=Math.max(alpha,1-Math.abs(t-cut)/.22);
 alpha=Math.max(alpha,1-t/.35,(t-9.65)/.35);
 if(alpha>0){ctx.globalAlpha=clamp(alpha);rect(0,0,W,H,paper);ctx.globalAlpha=1;}
};
let playing=true, elapsed=0, previous;
const button=document.getElementById('play');
button.addEventListener('click',()=>{playing=!playing;button.textContent=playing?'暂停':'播放';});
document.getElementById('restart').addEventListener('click',()=>{elapsed=0;playing=true;button.textContent='暂停';});
function tick(now){if(previous!==undefined && playing)elapsed+=Math.min((now-previous)/1000,.1);previous=now;if(elapsed>=10){elapsed=10;playing=false;button.textContent='播放';}if(!window.captureMode)window.renderFrame(elapsed);requestAnimationFrame(tick);}
window.renderFrame(0);requestAnimationFrame(tick);
