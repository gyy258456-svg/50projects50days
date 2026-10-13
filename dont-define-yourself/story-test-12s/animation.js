(() => {
 'use strict';
 const film=document.querySelector('#film'),c=film.getContext('2d',{alpha:false});
 const W=1920,H=1080,C={bg:'#080D12',line:'#B5CCD2',gold:'#DFB674',white:'#E8ECE8',dim:'#607C89',pause:'#B68D7A'};
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),mix=(a,b,t)=>a+(b-a)*t;
 const S=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);},R=(t,a,b)=>S((t-a)/(b-a));
 const vm=(a,b,q)=>a.map((v,i)=>mix(v,b[i],q)),sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 const CK=[
  {t:0,eye:[140,90,-1700],target:[0,0,0]},
  {t:2.3,eye:[95,70,-1500],target:[0,0,0]},
  {t:3.6,eye:[380,180,-1300],target:[0,0,170]},
  {t:4.5,eye:[200,100,-980],target:[0,0,400]},
  {t:6.3,eye:[35,24,-200],target:[0,0,880]},
  {t:6.65,eye:[-130,80,-240],target:[-130,0,890]},
  {t:7.15,eye:[-820,250,-530],target:[-710,0,1000]},
  {t:8.05,eye:[-100,230,-570],target:[0,0,1000]},
  {t:8.9,eye:[640,245,-580],target:[690,0,1000]},
  {t:9.6,eye:[350,440,-1390],target:[0,0,1000]},
  {t:10.8,eye:[220,540,-1680],target:[0,-25,1000]},
  {t:12,eye:[100,565,-1760],target:[0,-25,1000]}
 ];
 function spline(t,k){let i=0;while(i<CK.length-2&&t>CK[i+1].t)i++;const a=CK[i],b=CK[i+1],u=clamp((t-a.t)/(b.t-a.t)),d=b.t-a.t;return a[k].map((v,j)=>{const prev=CK[Math.max(0,i-1)],next=CK[Math.min(CK.length-1,i+2)];const v0=i===0?0:(b[k][j]-prev[k][j])/(b.t-prev.t),v1=i===CK.length-2?0:(next[k][j]-a[k][j])/(next.t-a.t);return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*d*v0+(-2*u**3+3*u*u)*b[k][j]+(u**3-u*u)*d*v1;});}
 function cameraAt(t){const eye=spline(t,'eye'),target=spline(t,'target'),forward=norm(sub(target,eye)),right=norm(cross([0,1,0],forward)),up=cross(forward,right);return {eye,target,forward,right,up,focal:1490,cx:960,cy:505,near:90};}
 function view(v,cam){const r=sub(v,cam.eye);return [dot(r,cam.right),dot(r,cam.up),dot(r,cam.forward)];}
 function project(v,cam){const a=view(v,cam);return {x:cam.cx+cam.focal*a[0]/Math.max(1,a[2]),y:cam.cy-cam.focal*a[1]/Math.max(1,a[2]),depth:a[2]};}
 function stroke(points,cam,color,alpha,width=1.3,progress=1){if(alpha<=0||progress<=0)return;c.save();c.strokeStyle=color;c.globalAlpha=clamp(alpha);c.lineWidth=width;c.lineCap='round';const total=(points.length-1)*clamp(progress),count=Math.floor(total),vv=points.slice(0,count+1);if(count<points.length-1)vv.push(vm(points[count],points[count+1],total-count));c.beginPath();for(let i=0;i<vv.length-1;i++){let a=vv[i],b=vv[i+1],da=view(a,cam)[2],db=view(b,cam)[2];if(da<cam.near&&db<cam.near)continue;if(da<cam.near)a=vm(a,b,(cam.near-da)/(db-da));if(db<cam.near)b=vm(b,a,(cam.near-db)/(view(a,cam)[2]-db));const p=project(a,cam),q=project(b,cam);c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}c.stroke();c.restore();}
 function label(g,str,x,y,size,color=C.white,align='left',alpha=1,serif=false){if(alpha<=0)return;g.save();g.globalAlpha=clamp(alpha);g.font=`${size}px "${serif?'Noto Serif CJK SC':'Noto Sans CJK SC'}",sans-serif`;g.fillStyle=color;g.textAlign=align;g.textBaseline='alphabetic';if('letterSpacing' in g)g.letterSpacing='1.5px';g.fillText(str,x,y);g.restore();}
 function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
 function line(g,points,color,width=2,alpha=1){g.save();g.strokeStyle=color;g.lineWidth=width;g.globalAlpha=alpha;g.lineCap='round';g.lineJoin='round';g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();g.restore();}

 // An adult figure with curved silhouette, collar, cuff, bent limbs and a
 // genuine facial profile. The figure is one performer, not a stick icon.
 function person(g,x,y,size,pose,t,role='self',flip=false){
  g.save();g.translate(x,y);g.scale(flip?-size:size,size);
  const tension=pose==='stranger'?.68:pose==='stuck'?R(t,1.08,1.52):0;
  const talk=pose==='talk'||pose==='prepared'||(pose==='stuck'&&tension<1);
  const lean=mix(talk?-.012:0,.05,tension);g.rotate(lean);
  const breathe=Math.sin(t*2.4)*.6;g.translate(0,breathe);
  const coat=role==='self'?'#CDD3CD':'#75858B',skin=role==='self'?'#B6BDB6':'#82918F';
  // Two independent trouser contours and grounded shoes.
  g.fillStyle='#515C61';g.beginPath();g.moveTo(-20,-68);g.bezierCurveTo(-23,-46,-23,-27,-21,-7);g.lineTo(-8,-7);g.bezierCurveTo(-5,-32,0,-48,3,-68);g.closePath();g.fill();
  g.fillStyle='#88938F';g.beginPath();g.moveTo(2,-68);g.bezierCurveTo(7,-42,11,-28,16,-6);g.lineTo(29,-7);g.bezierCurveTo(26,-33,26,-51,21,-72);g.closePath();g.fill();
  g.fillStyle='#CDD3CD';g.beginPath();g.moveTo(-22,-9);g.lineTo(-8,-9);g.quadraticCurveTo(1,-1,-1,1);g.lineTo(-29,1);g.quadraticCurveTo(-32,-4,-22,-9);g.fill();
  g.beginPath();g.moveTo(16,-9);g.lineTo(29,-9);g.quadraticCurveTo(42,-2,40,2);g.lineTo(15,2);g.closePath();g.fill();
  // Jacket silhouette and fabric details.
  g.fillStyle=coat;g.beginPath();g.moveTo(-13,-119);g.bezierCurveTo(-23,-119,-33,-111,-31,-96);g.lineTo(-25,-65);g.quadraticCurveTo(-2,-56,23,-68);g.lineTo(20,-98);g.quadraticCurveTo(18,-114,6,-117);g.closePath();g.fill();
  line(g,[[-7,-115],[2,-104],[9,-116]],'#6F7C7B',1.3);line(g,[[2,-104],[4,-70]],'#8B9690',1);line(g,[[-19,-84],[-10,-87]],'#8B9690',1);
  // Neck then profile head; no round-ball face.
  g.fillStyle=skin;g.beginPath();g.moveTo(-5,-124);g.lineTo(-6,-114);g.quadraticCurveTo(4,-110,11,-118);g.lineTo(10,-126);g.fill();
  g.save();g.translate(0,-124);g.rotate(mix(-.015,.11,tension));g.scale(.66,.66);
  g.fillStyle=skin;g.beginPath();g.moveTo(-13,-28);g.bezierCurveTo(-16,-39,-8,-44,3,-42);g.bezierCurveTo(16,-41,20,-33,18,-24);g.lineTo(23,-17);g.quadraticCurveTo(24,-14,19,-13);g.lineTo(19,-6);g.quadraticCurveTo(13,4,4,3);g.lineTo(-8,-6);g.quadraticCurveTo(-13,-13,-13,-28);g.fill();
  g.fillStyle='#303A3F';g.beginPath();g.moveTo(-14,-19);g.bezierCurveTo(-21,-40,-2,-50,13,-41);g.quadraticCurveTo(23,-35,16,-28);g.lineTo(6,-31);g.lineTo(-5,-28);g.lineTo(-9,-15);g.closePath();g.fill();
  line(g,[[10,-21],[15,-21]],'#465052',1.2);line(g,[[14,-8],[18,-8]],'#68746F',.8);g.restore();
  // Near arm: bent elbow, articulated cuff, naturally spread fingers.
  const gesture=talk?Math.sin(t*4.3)*.45*(1-tension):0;
  const elbow=vm([25,-91],[20,-89],tension),hand=vm(talk?[45+gesture*7,-104+gesture*5]:[24,-69],[22,-65],tension);
  g.fillStyle=coat;g.beginPath();g.moveTo(8,-113);g.quadraticCurveTo(22,-113,elbow[0]+5,elbow[1]);g.quadraticCurveTo(elbow[0]+3,elbow[1]+9,hand[0]-3,hand[1]+4);g.lineTo(hand[0]+3,hand[1]-2);g.quadraticCurveTo(elbow[0]+7,elbow[1]-2,19,-115);g.closePath();g.fill();
  line(g,[[hand[0]-5,hand[1]+3],[hand[0]+1,hand[1]-4]],'#6E7B79',1.3);
  g.fillStyle=skin;g.beginPath();g.moveTo(hand[0]-2,hand[1]-3);g.quadraticCurveTo(hand[0]+7,hand[1]-6,hand[0]+10,hand[1]-3);g.lineTo(hand[0]+6,hand[1]-1);g.lineTo(hand[0]+12,hand[1]+1);g.quadraticCurveTo(hand[0]+11,hand[1]+6,hand[0]+2,hand[1]+5);g.lineTo(hand[0]-4,hand[1]+3);g.closePath();g.fill();
  // Far arm has a distinct sleeve and subdued contour.
  line(g,[[-23,-105],[-27,-85],[-23,-69]],'#93A09A',6);
  if(pose==='prepared'){
   g.save();g.translate(-19,-92);g.rotate(-.12);g.fillStyle='#D8DACE';g.fillRect(-13,-15,22,28);line(g,[[-9,-7],[4,-7]],'#7B8985',1);line(g,[[-9,-2],[3,-2]],'#7B8985',1);line(g,[[-9,4],[-6,7],[-1,1]],C.gold,1.4);g.restore();
  }
  g.restore();
 }
 function microphone(g,x,y){
  ellipse(g,x,y,28,4,'#38484E');line(g,[[x,y],[x,y-242],[x+17,y-270]],'#A5B5B7',3.4);
  g.save();g.translate(x+18,y-270);g.rotate(.28);g.fillStyle='#C5CFCA';g.beginPath();g.roundRect(-8,-25,16,30,8);g.fill();for(let i=0;i<4;i++)line(g,[[-4,-21+i*5],[4,-21+i*5]],'#6B7D82',.9);g.restore();
 }
 function wave(g,x,y,width,t,kind='fluent',alpha=1){
  g.save();g.globalAlpha=alpha;g.lineWidth=2.4;g.lineCap='round';
  const broken=kind==='stuck'||kind==='nervous';
  for(let part=0;part<(broken?2:1);part++){
   const lo=part===0?0:width*.74,hi=broken?(part===0?width*.38:width*.9):width;
   g.strokeStyle=broken?C.pause:C.gold;g.beginPath();
   for(let k=lo;k<=hi;k+=3){let a=Math.sin(k*.15-t*8)*Math.sin(k*.055+t*2.8);const amp=kind==='nervous'?9:kind==='stuck'?6:13;const yy=y+a*amp; k===lo?g.moveTo(x+k,yy):g.lineTo(x+k,yy);}g.stroke();
  }
  if(broken){line(g,[[x+width*.44,y],[x+width*.62,y]],C.dim,1.2,.6);}
  g.restore();
 }
 const textures=Array.from({length:4},()=>{const q=document.createElement('canvas');q.width=1280;q.height=760;return q;});
 function sceneTexture(id,t){
  const q=textures[id],g=q.getContext('2d');g.clearRect(0,0,1280,760);
  const wash=g.createRadialGradient(600,370,80,630,380,600);wash.addColorStop(0,'rgba(43,58,61,.48)');wash.addColorStop(1,'rgba(8,13,18,0)');g.fillStyle=wash;g.fillRect(0,0,1280,760);
  const local=t<2.35?t:1.78+.06*Math.sin(t*8);
  if(id===0||id===2){
   const prepared=id===2,stuck=!prepared&&local>1.08;
   // A small speaking stage: light, mic, lectern and foreground listeners.
   const beam=g.createLinearGradient(0,95,0,670);beam.addColorStop(0,'rgba(181,204,210,.015)');beam.addColorStop(.7,'rgba(181,204,210,.06)');beam.addColorStop(1,'rgba(181,204,210,0)');g.fillStyle=beam;g.beginPath();g.moveTo(390,80);g.lineTo(760,80);g.lineTo(965,658);g.lineTo(195,658);g.closePath();g.fill();
   ellipse(g,640,638,390,24,'rgba(110,135,141,.13)');line(g,[[210,640],[1090,640]],'#50636B',1.2,.7);
   person(g,590,611,2.8,prepared?'prepared':stuck?'stuck':'talk',prepared?t:t,'self');microphone(g,766,613);
   if(prepared){g.fillStyle='#3C4B50';g.beginPath();g.moveTo(798,470);g.lineTo(865,476);g.lineTo(862,600);g.lineTo(805,600);g.fill();line(g,[[788,467],[869,475]],'#869A9F',2);}
   const pulse=prepared?'fluent':stuck?'stuck':'fluent';wave(g,849,341,210,t,pulse,R(t,.1,.45));
   if(stuck){label(g,'……',717,234,42,C.line,'center',R(local,1.05,1.3));label(g,'卡壳',959,408,34,C.pause,'center',R(local,1.25,1.6));}
   // Audience viewed from the back; real shoulder shapes, not icon sticks.
   for(let i=0;i<6;i++){
    const x=225+i*174,y=710+(i%2)*18;
    g.fillStyle=i%2?'#39484C':'#44545A';g.beginPath();g.moveTo(x-54,y+48);g.quadraticCurveTo(x-55,y-10,x-19,y-16);g.bezierCurveTo(x-29,y-40,x-17,y-65,x,y-65);g.bezierCurveTo(x+23,y-66,x+31,y-35,x+17,y-16);g.quadraticCurveTo(x+51,y-9,x+54,y+48);g.closePath();g.fill();
    if(stuck)line(g,[[x,y-54],[592,328]],C.line,.9,R(local,1.25,1.8)*.16);
   }
  }else if(id===1){
   // Familiar conversation: two relaxed bodies, a low table and alternating turns.
   ellipse(g,638,638,350,22,'rgba(110,135,141,.12)');
   person(g,455,623,2.5,'talk',t,'self');person(g,895,623,2.5,'talk',t+.8,'other',true);
   ellipse(g,668,572,110,18,'#687B7F');line(g,[[666,583],[666,638]],'#687B7F',6);
   g.fillStyle='#ADBAB5';g.beginPath();g.roundRect(621,541,23,25,4);g.fill();g.beginPath();g.roundRect(707,541,23,25,4);g.fill();
   wave(g,545,271,220,t,'fluent',.8);wave(g,715,352,140,t+.8,'fluent',.45);
  }else{
   // The same self in unfamiliar company: smaller gesture, interrupted utterance.
   ellipse(g,645,638,360,20,'rgba(110,135,141,.10)');
   person(g,475,621,2.6,'stranger',t,'self');person(g,915,620,2.7,'neutral',t,'other',true);
   wave(g,613,298,185,t,'nervous',.85);
   line(g,[[721,439],[768,439]],C.dim,1.2,.3);
  }
  return q;
 }

 function quad(center,w,h,angle=0){const cs=Math.cos(angle),sn=Math.sin(angle);return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>[center[0]+x*w*cs,center[1]+y*h,center[2]+x*w*sn]);}
 function heroCenter(t){const mem=R(t,2.35,3.65),ingress=R(t,4.4,6.25);return [0,0,mix(170*mem,880,ingress)];}
 function memoryQuad(t,i=0){const mem=R(t,2.35,3.65),pressure=R(t,4.4,6.3);const w=mix(650,360,mem)*mix(1,.58,pressure),h=w*.595;const center=heroCenter(t);return quad([0,0,center[2]+i*330],w*Math.pow(.82,i),h*Math.pow(.82,i),mix(0,.05,mem));}
 function experienceQuad(i,t){
  const release=R(t,6.38+i*.065,7.15+i*.08),comparison=R(t,9.45,10.7);
  const original=memoryQuad(t,Math.max(0,i-1));
  const target=quad([(i-2)*740,0,1000],345,217,(i-2)*.06);
  let vv=original.map((v,j)=>vm(v,target[j],release));
  const arranged=quad([(i-2)*660,0,1030],310,204,(i-2)*.07);
  vv=vv.map((v,j)=>vm(v,arranged[j],comparison));return vv;
 }
 function failureQuad(t){const q=memoryQuad(t,0),release=R(t,6.38,7.1),comp=R(t,9.5,10.6);const faded=quad([-1050,-285,1400],170,102,-.16);return q.map((v,j)=>vm(v,faded[j],Math.max(release,comp)));}
 function bilinear(q,u,v){return vm(vm(q[0],q[1],u),vm(q[3],q[2],u),v);}
 function paintTriangle(img,src,dst,opacity){
  const [a,b,d]=src,[A,B,D]=dst;const den=(b[0]-a[0])*(d[1]-a[1])-(d[0]-a[0])*(b[1]-a[1]);if(Math.abs(den)<.01)return;
  const m11=((B.x-A.x)*(d[1]-a[1])-(D.x-A.x)*(b[1]-a[1]))/den;
  const m21=((B.y-A.y)*(d[1]-a[1])-(D.y-A.y)*(b[1]-a[1]))/den;
  const m12=((D.x-A.x)*(b[0]-a[0])-(B.x-A.x)*(d[0]-a[0]))/den;
  const m22=((D.y-A.y)*(b[0]-a[0])-(B.y-A.y)*(d[0]-a[0]))/den;
  c.save();c.globalAlpha=opacity;c.beginPath();c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.lineTo(D.x,D.y);c.closePath();c.clip();c.setTransform(m11,m21,m12,m22,A.x-m11*a[0]-m12*a[1],A.y-m21*a[0]-m22*a[1]);c.drawImage(img,0,0);c.restore();
 }
 function paintPlane(img,q,cam,opacity=1){
  if(opacity<=0)return;
  const nx=6,ny=4;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
   const u=i/nx,v=j/ny,du=1/nx,dv=1/ny,coords=[[u,v],[u+du,v],[u+du,v+dv],[u,v+dv]],src=coords.map(([x,y])=>[x*img.width,y*img.height]),dst=coords.map(([x,y])=>project(bilinear(q,x,y),cam));
   if(dst.some(p=>p.depth<cam.near))continue;
   paintTriangle(img,[src[0],src[1],src[2]],[dst[0],dst[1],dst[2]],opacity);paintTriangle(img,[src[0],src[2],src[3]],[dst[0],dst[2],dst[3]],opacity);
  }
 }
 function frameAt(i,t){
  const center=heroCenter(t),formed=R(t,2.7,4.1),deep=R(t,4.4,6.3),release=R(t,6.35+i*.025,7.35+i*.03);
  const start=quad([0,0,170],390,244,-.04);
  const tight=quad([0,0,center[2]-370+i*165],(445-i*43)*mix(1,.54,deep),(270-i*25)*mix(1,.54,deep),.018*i);
  let vv=start.map((v,j)=>vm(v,tight[j],R(t,4.32,5.18)));
  const open=quad([(i%3-1)*740,-250-i*8,1000],410,135,.06*(i%3-1));
  vv=vv.map((v,j)=>vm(v,open[j],release));
  return {id:`boundary-${i}`,vertices:vv,formed,deep,release};
 }
 function drawBoundaries(t,cam){
  const formed=R(t,2.7,4.1),release=R(t,6.35,7.55),comp=R(t,9.5,10.8);
  const frames=Array.from({length:6},(_,i)=>frameAt(i,t));
  for(let i=0;i<6;i++){
   const f=frames[i],pp=f.vertices.map(v=>project(v,cam)),depth=pp.reduce((s,p)=>s+p.depth,0)/4;
   const near=R(depth,100,380);let alpha=(i===5?.55:.20)*formed*near*(1-comp*.55);
   if(t<4.4&&i<5)alpha*=.28;
   for(let e=0;e<4;e++){
    const a=f.vertices[e],b=f.vertices[(e+1)%4],mid=vm(a,b,.5),bow=Math.sin(Math.PI*f.release)*65;
    const samples=Array.from({length:15},(_,j)=>{const u=j/14,p=vm(a,b,u);p[1]+=bow*Math.sin(Math.PI*u);return p;});
    const opening=e===1?1-R(t,6.45+i*.025,7.05+i*.025)*.85:1;
    stroke(samples,cam,C.line,alpha*opening,e===0?1.6:1.05,R(t,2.8+e*.18,3.35+e*.18));
   }
  }
  // The sentence is visibly responsible for closing the frame.
  if(formed>0&&t<4.4){const top=frameAt(5,t).vertices[0];stroke([[-430,370,170],top],cam,C.gold,formed*.38,1.3,R(t,2.65,3.25));}
 }
 function drawComparison(t,cam){
  const q=R(t,9.42,10.95);if(q<=0)return;
  // Measured comparisons link context to a specific performance, not a
  // generic network that claims all future experiences are explained.
  const hubs=[[-660,-250,1030],[0,-250,1030],[660,-250,1030]],understanding=[0,-390,980];
  hubs.forEach((v,i)=>{
   const p=project(v,cam),a=project(understanding,cam);
   stroke([v,[v[0],-350,1010],understanding],cam,i===2?C.line:C.gold,q*(i===2?.35:.60),1.6,R(t,9.55+i*.12,10.5+i*.12));
   ellipse(c,p.x,p.y,4,4,i===2?C.line:C.gold);
  });
  const p=project(understanding,cam);ellipse(c,p.x,p.y,5,5,C.gold);
  label(c,'条件不同，表现不同',960,830,32,C.line,'center',q);
 }
 function chapter(t,cam){
  const first=R(t,.15,.65)*(1-R(t,2.12,2.55));label(c,'第一次公开分享',128,151,48,C.white,'left',first,true);
  const judgement=R(t,2.4,2.95)*(1-R(t,4.05,4.5));const anchor=project([-430,370,170],cam);
  label(c,'“我不擅长表达。”',anchor.x,anchor.y-24,49,C.white,'left',judgement,true);
  const inward=R(t,4.48,4.85)*(1-R(t,6.1,6.5));label(c,'反复回想',128,151,48,C.white,'left',inward,true);
  label(c,'反复看的，还是这一次。',960,968,34,C.line,'center',inward);
  const cases=['与朋友交谈','充分准备后','陌生人面前'],performance=['自然流畅','表达清楚','仍有些紧张'];
  for(let i=1;i<=3;i++){
   const q=experienceQuad(i,t),p=project(bilinear(q,.5,.02),cam),bottom=project(bilinear(q,.5,.92),cam),alpha=R(t,6.65+(i-1)*.08,7.2+(i-1)*.08);
   const edgeFade=R(p.x,160,280)*(1-R(p.x,1640,1760));
   const lowerFade=R(bottom.x,160,280)*(1-R(bottom.x,1640,1760));
   if(p.depth>100)label(c,cases[i-1],p.x,p.y-18,32,C.line,'center',alpha*edgeFade);
   label(c,performance[i-1],bottom.x,bottom.y+40,30,i===3?C.pause:C.gold,'center',alpha*lowerFade);
  }
  const compare=R(t,9.4,10.0)*(1-R(t,10.65,11.05));label(c,'一次经历 ≠ 全部能力',128,151,48,C.white,'left',compare,true);
  const end=R(t,10.65,11.25);label(c,'别急着定义自己',128,151,60,C.white,'left',end,true);
  label(c,'多经历，也多回看。',960,972,36,C.white,'center',end);
 }
 function getFrameState(time){
  const t=clamp(Number(time)||0,0,12),cam=cameraAt(t),center=heroCenter(t);
  return {t,camera:cam,core:{id:'person-self',position:center,screen:project(center,cam)},boundaries:Array.from({length:6},(_,i)=>frameAt(i,t)),samples:Array.from({length:4},(_,i)=>({id:['experience-public','experience-friends','experience-prepared','experience-stranger'][i],position:i===0?center:[(i-2)*740,0,1000],visible:i===0?1:R(t,6.42+i*.065,7.05+i*.08),connected:true})),stage:t<2.5?'public-stumble':t<4.5?'premature-definition':t<6.5?'replaying-one-memory':t<9.5?'different-contexts':'compare-and-understand'};
 }
 // Fixed low-contrast grain only: no unrelated moving particles.
 const noise=document.createElement('canvas');noise.width=noise.height=96;const ng=noise.getContext('2d'),nd=ng.createImageData(96,96);let seed=661;
 for(let i=0;i<nd.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;nd.data[i]=nd.data[i+1]=nd.data[i+2]=seed>>>24;nd.data[i+3]=255;}ng.putImageData(nd,0,0);const grain=c.createPattern(noise,'repeat');
 function renderFrame(time){
  const state=getFrameState(time),{t,camera:cam}=state;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=C.bg;c.fillRect(0,0,W,H);
  const wash=c.createRadialGradient(960,470,100,960,520,1080);wash.addColorStop(0,'rgba(33,49,56,.40)');wash.addColorStop(1,'rgba(8,13,18,0)');c.fillStyle=wash;c.fillRect(0,0,W,H);
  const failure=sceneTexture(0,t),mem=R(t,4.38,5.1),release=R(t,6.38,7.1);
  // The first scene is literally retained as the memory, not replaced by
  // unrelated abstract content. Echoes are the same recorded incident.
  if(t>4.38&&t<7.2){for(let i=2;i>=1;i--)paintPlane(failure,memoryQuad(t,i),cam,mem*(1-release)*(.75-i*.12));}
  paintPlane(failure,failureQuad(t),cam,mix(1,.45,release));
  drawBoundaries(t,cam);
  const planes=[];
  for(let i=1;i<=3;i++){
   const a=R(t,6.38+i*.065,7.05+i*.08);if(a>0)planes.push({id:i,alpha:a,quad:experienceQuad(i,t)});
  }
  planes.sort((a,b)=>view(b.quad[0],cam)[2]-view(a.quad[0],cam)[2]);
  planes.forEach(p=>paintPlane(sceneTexture(p.id,t),p.quad,cam,p.alpha));
  drawComparison(t,cam);
  const shade=c.createLinearGradient(0,865,0,1080);shade.addColorStop(0,'rgba(8,13,18,0)');shade.addColorStop(1,'rgba(8,13,18,.95)');c.fillStyle=shade;c.fillRect(0,865,W,215);
  c.save();c.globalAlpha=.014;c.fillStyle=grain;c.fillRect(0,0,W,H);c.restore();chapter(t,cam);return state;
 }
 window.renderFrame=renderFrame;window.getFrameState=getFrameState;window.motionDuration=12;
 const renderMode=new URLSearchParams(location.search).has('render');if(renderMode)document.documentElement.classList.add('render-mode');
 let current=0,running=false,previous=null;const play=document.querySelector('#play'),seek=document.querySelector('#seek'),clock=document.querySelector('#clock');
 function sync(){play.textContent=running?'暂停':'播放';seek.value=current;clock.textContent=current.toFixed(2)+' / 12.00';}
 window.pauseAnimation=()=>{running=false;sync();};play.addEventListener('click',()=>{if(current>=12)current=0;running=!running;previous=null;sync();});document.querySelector('#restart').addEventListener('click',()=>{current=0;running=true;previous=null;renderFrame(current);sync();});seek.addEventListener('input',()=>{running=false;current=Number(seek.value);renderFrame(current);sync();});
 function tick(now){if(running&&!renderMode&&previous!==null){current=clamp(current+(now-previous)/1000,0,12);if(current>=12)running=false;renderFrame(current);sync();}previous=now;requestAnimationFrame(tick);}
 renderFrame(0);if(!renderMode)requestAnimationFrame(tick);sync();
})();
