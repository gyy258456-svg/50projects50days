(() => {
 'use strict';
 const film=document.querySelector('#film'),c=film.getContext('2d',{alpha:false});
 let textRuns=[];
 const W=1920,H=1080,C={bg:'#080D12',line:'#B5CCD2',gold:'#DFB674',white:'#E8ECE8',dim:'#607C89',pause:'#B68D7A'};
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),mix=(a,b,t)=>a+(b-a)*t;
 const S=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);},R=(t,a,b)=>S((t-a)/(b-a));
 const vm=(a,b,q)=>a.map((v,i)=>mix(v,b[i],q)),sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 const DURATION=15;
 const CK=[
  {t:0,eye:[70,75,-1380],target:[0,30,240]},
  {t:1.9,eye:[80,75,-1250],target:[-30,20,240]},
  {t:3.6,eye:[-20,120,-1270],target:[0,20,240]},
  {t:4.9,eye:[-730,230,-760],target:[-770,0,800]},
  {t:5.5,eye:[-600,210,-720],target:[-620,0,800]},
  {t:6.4,eye:[40,210,-730],target:[0,0,800]},
  {t:7.15,eye:[140,240,-800],target:[120,0,800]},
  {t:8.1,eye:[700,230,-850],target:[770,0,800]},
  {t:9.25,eye:[170,320,-1460],target:[0,-20,840]},
  {t:10.5,eye:[100,280,-1480],target:[0,0,900]},
  {t:12.7,eye:[65,240,-1480],target:[0,15,900]},
  {t:15,eye:[0,245,-1490],target:[0,15,900]}
 ];
 function spline(t,k){let i=0;while(i<CK.length-2&&t>CK[i+1].t)i++;const a=CK[i],b=CK[i+1],u=clamp((t-a.t)/(b.t-a.t)),d=b.t-a.t;return a[k].map((v,j)=>{const prev=CK[Math.max(0,i-1)],next=CK[Math.min(CK.length-1,i+2)];const v0=i===0?0:(b[k][j]-prev[k][j])/(b.t-prev.t),v1=i===CK.length-2?0:(next[k][j]-a[k][j])/(next.t-a.t);return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*d*v0+(-2*u**3+3*u*u)*b[k][j]+(u**3-u*u)*d*v1;});}
 function cameraAt(t){const eye=spline(t,'eye'),target=spline(t,'target'),forward=norm(sub(target,eye)),right=norm(cross([0,1,0],forward)),up=cross(forward,right);return {eye,target,forward,right,up,focal:1600,cx:960,cy:505,near:90};}
 function view(v,cam){const r=sub(v,cam.eye);return [dot(r,cam.right),dot(r,cam.up),dot(r,cam.forward)];}
 function project(v,cam){const a=view(v,cam);return {x:cam.cx+cam.focal*a[0]/Math.max(1,a[2]),y:cam.cy-cam.focal*a[1]/Math.max(1,a[2]),depth:a[2]};}
 function stroke(points,cam,color,alpha,width=1.3,progress=1){if(alpha<=0||progress<=0)return;c.save();c.strokeStyle=color;c.globalAlpha=clamp(alpha);c.lineWidth=width;c.lineCap='round';const total=(points.length-1)*clamp(progress),count=Math.floor(total),vv=points.slice(0,count+1);if(count<points.length-1)vv.push(vm(points[count],points[count+1],total-count));c.beginPath();for(let i=0;i<vv.length-1;i++){let a=vv[i],b=vv[i+1],da=view(a,cam)[2],db=view(b,cam)[2];if(da<cam.near&&db<cam.near)continue;if(da<cam.near)a=vm(a,b,(cam.near-da)/(db-da));if(db<cam.near)b=vm(b,a,(cam.near-db)/(view(a,cam)[2]-db));const p=project(a,cam),q=project(b,cam);c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}c.stroke();c.restore();}
 function label(g,str,x,y,size,color=C.white,align='left',alpha=1,serif=false){if(alpha<=0)return;g.save();g.globalAlpha*=clamp(alpha);g.font=`${size}px "${serif?'Noto Serif CJK SC':'Noto Sans CJK SC'}",sans-serif`;g.fillStyle=color;g.textAlign=align;g.textBaseline='alphabetic';if('letterSpacing' in g)g.letterSpacing='1.5px';g.fillText(str,x,y);if(g===c&&g.globalAlpha>.1){const m=g.measureText(str),left=align==='center'?x-m.width/2:align==='right'?x-m.width:x;textRuns.push({text:str,alpha:g.globalAlpha,left,right:left+m.width,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});}g.restore();}
 function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
 function line(g,points,color,width=2,alpha=1){g.save();g.strokeStyle=color;g.lineWidth=width;g.globalAlpha*=alpha;g.lineCap='round';g.lineJoin='round';g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();g.restore();}

 // An adult figure with curved silhouette, collar, cuff, bent limbs and a
 // genuine facial profile. The figure is one performer, not a stick icon.
 function person(g,x,y,size,pose,t,role='self',flip=false,motion={}){
  g.save();g.translate(x,y);g.scale(flip?-size:size,size);
  const tension=motion.tension ?? (pose==='stranger'?.68:pose==='stuck'?R(t,1.08,1.52):0);
  const step=motion.step||0, foot=Math.sin(step*Math.PI)*11, reach=motion.reach; 
  const talk=pose==='talk'||pose==='prepared'||(pose==='stuck'&&tension<1);
  const lean=mix(talk?-.012:0,.05,tension);g.rotate(lean);
  const breathe=Math.sin(t*2.4)*.6;g.translate(0,breathe);
  const coat=role==='self'?'#CDD3CD':'#75858B',skin=role==='self'?'#B6BDB6':'#82918F';
  // Two independent trouser contours and grounded shoes.
  g.save();g.translate(-foot,0);g.fillStyle='#515C61';g.beginPath();g.moveTo(-20,-68);g.bezierCurveTo(-23,-46,-23,-27,-21,-7);g.lineTo(-8,-7);g.bezierCurveTo(-5,-32,0,-48,3,-68);g.closePath();g.fill();
  g.restore();g.save();g.translate(foot,0);g.fillStyle='#88938F';g.beginPath();g.moveTo(2,-68);g.bezierCurveTo(7,-42,11,-28,16,-6);g.lineTo(29,-7);g.bezierCurveTo(26,-33,26,-51,21,-72);g.closePath();g.fill();
  g.restore();g.save();g.translate(-foot,0);g.fillStyle='#CDD3CD';g.beginPath();g.moveTo(-22,-9);g.lineTo(-8,-9);g.quadraticCurveTo(1,-1,-1,1);g.lineTo(-29,1);g.quadraticCurveTo(-32,-4,-22,-9);g.fill();
  g.restore();g.save();g.translate(foot,0);g.beginPath();g.moveTo(16,-9);g.lineTo(29,-9);g.quadraticCurveTo(42,-2,40,2);g.lineTo(15,2);g.closePath();g.fill();
  g.restore();
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
  const elbow=vm([25,-91],[20,-89],tension);
  const hand=reach===undefined?vm(talk?[45+gesture*7,-104+gesture*5]:[24,-69],[22,-65],tension):vm([24,-69],[49,-103],reach);
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

 // Every scene is a live, layered vector performance; no PNG is sampled here.
 const textures=Array.from({length:3},()=>{const q=document.createElement('canvas');q.width=1280;q.height=760;return q;});
 function retreatAt(t){
  const first=R(t,.9,1.65),reset=R(t,1.95,2.5),second=R(t,2.78,3.5);
  return clamp(first*(1-reset)+second);
 }
 function reachAt(t){return R(t,.18,.65)*(1-R(t,.93,1.42)) + R(t,2.42,2.72)*(1-R(t,2.85,3.3));}
 function audience(g,alpha=1){
  g.save();g.globalAlpha=alpha;
  for(let i=0;i<4;i++){
   const x=335+i*207,y=710+(i%2)*15;
   g.fillStyle=i%2?'#35454B':'#3E5158';g.beginPath();g.moveTo(x-47,y+48);g.quadraticCurveTo(x-50,y-10,x-17,y-16);g.bezierCurveTo(x-25,y-40,x-17,y-62,x,y-62);g.bezierCurveTo(x+21,y-62,x+28,y-35,x+16,y-16);g.quadraticCurveTo(x+47,y-9,x+47,y+48);g.closePath();g.fill();
  }g.restore();
 }
 function room(g,m){
  // One room turns into another: wall joints move, the meeting table extends,
  // and the doorway becomes a tall window. People and the floor persist.
  line(g,[[172,145],[172,640],[1125,640],[1125,145]],'#50656F',1.25,.32);
  const x=mix(955,988,m),w=mix(130,88,m);
  line(g,[[x,190],[x+w,190],[x+w,638],[x,638],[x,190]],C.line,1.3,.25);
  line(g,[[x+10,420],[x+w-10,420]],C.dim,1.1,m*.5);
  const yy=mix(440,540,m),xx=mix(250,545,m);
  g.fillStyle='#36474E';g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+mix(50,248,m),yy+mix(4,10,m));g.lineTo(xx+mix(50,248,m),yy+mix(9,22,m));g.lineTo(xx,yy+12);g.closePath();g.fill();
  line(g,[[xx+18,yy+12],[xx+18,633]],'#53676D',2.2,.8);line(g,[[xx+mix(35,222,m),yy+12],[xx+mix(35,222,m),633]],'#53676D',2.2,m);
  // The event notice physically slides aside as discussion notes settle in.
  g.save();g.globalAlpha=1-m;g.fillStyle='#17272E';g.fillRect(254-m*80,203,152,134);line(g,[[276-m*80,239],[374-m*80,239]],C.line,1.3,.55);label(g,'交流会',330-m*80,278,24,C.line,'center');g.restore();
  for(let k=0;k<3;k++){
   g.save();g.globalAlpha=m;g.translate(370+k*66,250+Math.sin(k)*10);g.rotate((k-1)*.045*m);g.fillStyle='#2C3D43';g.fillRect(-24,-29,48,58);line(g,[[-12,-10],[12,-10]],C.line,1.1,.35);line(g,[[-12,0],[7,0]],C.line,1.1,.35);g.restore();
  }
 }
 function speech(g,x,y,width,t,kind='fluent',progress=1,alpha=1){
  // A single stroke grows with the utterance, stalls, then can continue.
  const n=Math.floor(width*clamp(progress)/3);if(n<1)return;
  g.save();g.globalAlpha=alpha;g.lineWidth=2.5;g.lineCap='round';g.strokeStyle=kind==='nervous'?C.pause:C.gold;g.beginPath();
  for(let k=0;k<=n;k++){
   const px=k*3,envelope=Math.sin(Math.PI*clamp(px/width))*.8+.2;
   const amp=(kind==='nervous'?8:12)*envelope,yy=y+Math.sin(px*.17-t*5)*Math.sin(px*.045+t)*amp;
   if(kind==='nervous'&&px>width*.40&&px<width*.65){g.moveTo(x+px,yy);continue;}
   k?g.lineTo(x+px,yy):g.moveTo(x+px,yy);
  }g.stroke();g.restore();
 }
 function sceneTexture(id,t){
  const q=textures[id],g=q.getContext('2d');g.clearRect(0,0,1280,760);
  const wash=g.createRadialGradient(640,380,65,640,400,600);wash.addColorStop(0,'rgba(44,61,66,.48)');wash.addColorStop(1,'rgba(8,13,18,0)');g.fillStyle=wash;g.fillRect(0,0,1280,760);
  line(g,[[164,640],[1120,640]],C.line,1.2,.33);
  if(id===2){
   const m=R(t,1.92,2.6);room(g,m);
   const back=retreatAt(Math.min(t,3.6)),reach=reachAt(Math.min(t,3.6)),x=530-95*back;
   ellipse(g,630,641,386,24,'rgba(110,135,141,.12)');
   // The two traces have identical coordinates and timing, despite the room.
   const p1=R(t,.9,1.65),p2=R(t,2.78,3.5),traceA=.58*(1-R(t,4,5.3)),traceB=.75*(1-R(t,4,5.3));
   line(g,[[530,652],[mix(530,435,p1),652]],C.line,2,traceA*p1);
   line(g,[[530,660],[mix(530,435,p2),660]],C.gold,2,traceB*p2);
   if(t>1.45&&t<4.8){label(g,'后退',399,691,22,C.line,'center',R(t,1.45,1.8)*(1-R(t,4,4.8)));}
   person(g,x,623,2.75,'stranger',t,'self',false,{tension:mix(.25,.78,back),reach,step:back});
   person(g,905,623,2.75,'talk',t+.7,'other',true,{tension:.1});
   const speaking=R(t,.25,.7)*(1-R(t,.95,1.22))+R(t,2.43,2.74)*(1-R(t,2.87,3.15));
   speech(g,585,294,210,t,speaking>.45?'fluent':'nervous',1,.8);
   if(t<4){label(g,'……',615,380,32,C.line,'center',R(back,.24,.65)*.8);}
  }else if(id===0){
   // Familiar company has an unmistakable table-and-two-cups relationship.
   line(g,[[292,210],[986,210]],C.line,1.1,.13);
   ellipse(g,646,641,355,22,'rgba(110,135,141,.12)');
   person(g,451,623,2.6,'talk',t,'self');person(g,905,623,2.6,'talk',t+.8,'other',true);
   ellipse(g,676,552,119,17,'#6B7F81');line(g,[[676,566],[676,639]],'#687B7F',6);
   g.fillStyle='#BBC3BA';g.beginPath();g.roundRect(622,523,24,25,4);g.fill();g.beginPath();g.roundRect(706,523,24,25,4);g.fill();
   speech(g,548,275,240,t,'fluent',1,.9);speech(g,691,347,149,t+.8,'fluent',1,.55);
  }else{
   const beam=g.createLinearGradient(0,100,0,670);beam.addColorStop(0,'rgba(181,204,210,.01)');beam.addColorStop(.7,'rgba(181,204,210,.065)');beam.addColorStop(1,'rgba(181,204,210,0)');g.fillStyle=beam;g.beginPath();g.moveTo(409,92);g.lineTo(772,92);g.lineTo(969,650);g.lineTo(196,650);g.closePath();g.fill();
   ellipse(g,640,638,380,24,'rgba(110,135,141,.13)');
   // Preparation doesn't remove nerves: the speaker pauses, checks the note,
   // then resumes. The previously incomplete utterance reaches its endpoint.
   const pause=R(t,6.05,6.22)*(1-R(t,6.5,6.7));
   person(g,560,611,2.8,'prepared',t,'self',false,{tension:.16+pause*.36});microphone(g,766,613);
   g.fillStyle='#3C4B50';g.beginPath();g.moveTo(805,474);g.lineTo(875,480);g.lineTo(872,600);g.lineTo(812,600);g.fill();line(g,[[795,471],[879,479]],'#869A9F',2);
   const progress=mix(.40,1,R(t,6.5,7.0));speech(g,839,317,245,t,'fluent',progress,.9);
   label(g,'……',733,231,32,C.line,'center',pause*.85);
   // A final small endpoint marks that a thought was completed, not a score.
   ellipse(g,1084,317,3.1,3.1,`rgba(223,182,116,${R(t,6.85,7.1)*.7})`);
   audience(g,.72);
  }
  return q;
 }
 function quad(center,w,h,angle=0){const cs=Math.cos(angle),sn=Math.sin(angle);return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>[center[0]+x*w*cs,center[1]+y*h,center[2]+x*w*sn]);}
 function experienceQuad(id,t){
  const center=[(id-1)*770,0,800],angle=(id-1)*-.055;
  const q=R(t,id===0?4.02:id===1?4.18:3.93,id===0?5.24:id===1?5.44:5.27);
  let v;
  if(id===2){
   const initial=quad([0,0,240],800,475,.01),target=quad(center,350,235,angle);
   v=initial.map((p,i)=>vm(p,target[i],q));
  }else{
   // Rooms rotate out of a shared wall, retaining their actual aspect ratio.
   // They are not pictures stretched from one pixel into a slideshow card.
   const initial=[id===0?-785:0,0,270],theta=id===0?1.49:-1.49;
   v=quad(vm(initial,center,q),350,235,mix(theta,angle,q));
  }
  const final=quad([(id-1)*790,-10,900],365,242,(id-1)*-.025);
  const compare=R(t,8.72,9.8);return v.map((p,i)=>vm(p,final[i],compare));
 }
 function heroCenter(t){return bilinear(experienceQuad(2,t),mix(530,435,retreatAt(Math.min(t,3.6)))/1280,.55);}
 function bilinear(q,u,v){return vm(vm(q[0],q[1],u),vm(q[3],q[2],u),v);}


 // Exact, seam-free perspective mapping of LIVE vector layers. A quad is
 // rendered as a perspective-correct GPU surface, not an affine grid. This
 // keeps diagonal rasterisation seams out of faces, sleeves and shoes.
 const planeBuffer=document.createElement('canvas');planeBuffer.width=W;planeBuffer.height=H;
 const gl=planeBuffer.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true});
 if(!gl)throw new Error('WebGL surface mapping is unavailable; use the supplied MP4 for playback.');
 function shader(kind,source){const q=gl.createShader(kind);gl.shaderSource(q,source);gl.compileShader(q);if(!gl.getShaderParameter(q,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(q));return q;}
 const program=gl.createProgram();
 gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec4 position;attribute vec2 texcoord;varying vec2 uv;void main(){gl_Position=position;uv=texcoord;}'));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision highp float;varying vec2 uv;uniform sampler2D image;uniform float opacity;void main(){gl_FragColor=texture2D(image,uv)*opacity;}'));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer(),position=gl.getAttribLocation(program,'position'),texcoord=gl.getAttribLocation(program,'texcoord'),opacityUniform=gl.getUniformLocation(program,'opacity');
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,4,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(texcoord);gl.vertexAttribPointer(texcoord,2,gl.FLOAT,false,24,16);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);gl.viewport(0,0,W,H);
 function paintPlane(img,q,cam,opacity=1){
  if(opacity<=0)return;
  const uv=[[0,0],[1,0],[1,1],[0,1]],far=10000;
  const vertices=q.map((v,i)=>{
   const [x,y,z]=view(v,cam);return [2*cam.focal/W*x+(2*cam.cx/W-1)*z,2*cam.focal/H*y+(1-2*cam.cy/H)*z,(far+cam.near)/(far-cam.near)*z-2*cam.near*far/(far-cam.near),z,...uv[i]];
  });
  gl.clear(gl.COLOR_BUFFER_BIT);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,1,2,0,2,3].flatMap(i=>vertices[i])),gl.DYNAMIC_DRAW);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.uniform1f(opacityUniform,opacity);gl.drawArrays(gl.TRIANGLES,0,6);c.drawImage(planeBuffer,0,0);
 }
 function frameAt(i,t){
  const id=i%3,unfold=R(t,3.95+i*.025,5.35+i*.025),test=R(t,9.12,10.05),open=R(t,10.6,13.15);
  const start=quad([0,-5,235+i*4],820,470,.01),target=quad([(id-1)*790,-25-i*2,900],386,258,(id-1)*-.025);
  let vertices=start.map((p,j)=>vm(p,target[j],unfold));
  if(i===5){
   const box=quad([0,448,900],427,72,0);vertices=vertices.map((p,j)=>vm(p,box[j],test));
   // The closed judgement boundary bends into a shared open comparison axis.
   const axis=[[-1170,-270,900],[1170,-270,900],[1170,-380,900],[-1170,-380,900]];
   vertices=vertices.map((p,j)=>[mix(p[0],axis[j][0],R(t,10.6,11.6)),mix(p[1],axis[j][1],R(t,11.6,13.15)),mix(p[2],axis[j][2],open)]);
  }
  return {id:`boundary-${i}`,vertices,unfold,test,open};
 }
 function drawBoundaries(t,cam){
  for(let i=0;i<6;i++){
   const f=frameAt(i,t),base=(i===0?.12:i<3?.03:.12)*R(t,.1,.8);
   const alpha=i===5?mix(base,.43,f.test):base;
   f.vertices.forEach((a,e)=>{
    const b=f.vertices[(e+1)%4],progress=i===5?R(t,9.1+e*.12,9.65+e*.12):1;
    const ww=i===5?1.5:1.0,bow=i===5?Math.sin(Math.PI*f.open)*56:Math.sin(Math.PI*f.unfold)*42;
    const pts=Array.from({length:21},(_,j)=>{const p=vm(a,b,j/20);p[1]+=bow*Math.sin(j/20*Math.PI);return p;});
    // Side/top walls are quiet spatial anchors; the last edge of the
    // judgement opens instead of asserting a completed closed identity.
    const openEdge=i===5&&e===0?1-f.open:i===5&&e===2?1-Math.sin(Math.PI*f.open)**2*.94:1;
    if(i!==5&&e!==2&&e!==3&&t<8.9)return;
    stroke(pts,cam,i===5?C.gold:C.line,alpha*openEdge,ww,progress);
   });
  }
 }
 function worldLabel(str,point,cam,size,color,alpha=1,dy=0){const p=project(point,cam);if(p.depth<cam.near)return;const half=str.length*size/2+18;const edge=R(p.x,64+half,128+half)*(1-R(p.x,W-128-half,W-64-half));label(c,str,p.x,p.y+dy,size,color,'center',alpha*edge);}
 function drawEvidence(t,cam){
  const v=R(t,9.45,10.55);if(v<=0)return;
  const open=R(t,11.5,13.15);
  for(let i=0;i<3;i++){
   const q=R(t,i===2?9.3:10.3+i*.12,i===2?10.25:11.4+i*.12);
   // Initially, an experience is compared to the absolute judgement above.
   // The same paths subsequently bend into the open comparison axis below.
   const proof=[[(i-1)*790+40,74,900],[(i-1)*790,317,900],[(i-1)*180,448,900]];
   const axis=[[(i-1)*790,-290,900],[(i-1)*790,-352,900],[0,-375,900]];
   const path=proof.map((p,j)=>vm(p,axis[j],open));
   stroke(path,cam,i===2?C.line:C.gold,q*(i===2?.29:.60)*(1-Math.sin(Math.PI*open)*.55),i===2?1.1:1.6,q);
   const p=project(path[0],cam);ellipse(c,p.x,p.y,3.1,3.1,i===2?C.line:C.gold);
  }
  const anchor=project([0,-375,900],cam);ellipse(c,anchor.x,anchor.y,4*open,4*open,C.gold);
  const right=project([790,-298,900],cam),fa=R(t,10.0,10.7)*(1-R(t,12.6,13.25));
  label(c,'事实  ·  停顿了几秒',right.x,right.y+45,24,C.line,'center',fa);
  label(c,'感受  ·  当时很紧张',right.x,right.y+83,24,C.line,'center',fa);
  const asking=R(t,11.05,11.5)*(1-R(t,12.3,12.9));
  label(c,'能概括全部吗？',960,287,27,C.gold,'center',asking);
 }
 function chapter(t,cam){
  const beginning=R(t,.12,.65)*(1-R(t,3.8,4.35));
  label(c,'环境变了，反应却没变',128,145,48,C.white,'left',beginning,true);
  const m=R(t,1.95,2.6);
  label(c,'新公司的交流会',960,231,31,C.line,'center',beginning*(1-m));
  label(c,'陌生人的小组讨论',960,231,31,C.line,'center',beginning*m);
  label(c,'同样陌生，也没作准备',960,966,32,C.line,'center',R(t,.7,1.2)*(1-R(t,3.8,4.3)));
  const contrast=R(t,4.22,4.8)*(1-R(t,8.8,9.4));label(c,'把不同经历放在一起',128,145,48,C.white,'left',contrast,true);
  const contexts=['和熟悉的朋友','充分准备之后','陌生、没有准备'],outcomes=['说得自然','会停顿，也能讲完','仍然会退缩'];
  for(let i=0;i<3;i++){
   const q=experienceQuad(i,t),a=i===2?R(t,4.22,4.9):R(t,4.4+i*.18,5.0+i*.18),top=bilinear(q,.5,.02),bottom=bilinear(q,.5,.94);
   worldLabel(contexts[i],top,cam,31,C.line,a,-16);
   const out=outcomes[i];
   worldLabel(out,bottom,cam,29,i===2?C.pause:C.gold,a,37);
  }
  const judge=R(t,9.1,9.8)*(1-R(t,12.25,13.2));
  const verdict=project([0,448,900],cam);
  label(c,'一个过早的判断',verdict.x,verdict.y-46,24,C.line,'center',judge);
  label(c,'“我不擅长表达。”',verdict.x,verdict.y+18,47,C.white,'center',judge,true);
  // The old verdict isn't replaced by a flattering absolute verdict.
  label(c,'这些表现，也与条件有关。',960,972,34,C.line,'center',R(t,11.55,12.2)*(1-R(t,13.15,13.65)));
  const close=R(t,12.8,13.5);label(c,'别急着定义自己',128,87,24,C.line,'left',close);
  label(c,'先比较，再判断',128,153,57,C.white,'left',close,true);
  label(c,'更多经历，也需要认真回看。',960,972,34,C.white,'center',R(t,13.35,14.05));
 }
 function getFrameState(time){
  const t=clamp(Number(time)||0,0,DURATION),cam=cameraAt(t);
  return {t,camera:cam,core:{id:'person-self',position:heroCenter(t),screen:project(heroCenter(t),cam)},boundaries:Array.from({length:6},(_,i)=>frameAt(i,t)),samples:Array.from({length:3},(_,i)=>({id:['experience-friends','experience-prepared','experience-stranger'][i],position:bilinear(experienceQuad(i,t),.5,.5),vertices:experienceQuad(i,t),visible:i===2?1:i===0?R(t,4.05,4.85):R(t,4.88,5.4),connected:R(t,10.1+i*.09,11.5+i*.12)>.9})),retreat:retreatAt(Math.min(t,3.6)),preparedPause:R(t,6.05,6.22)*(1-R(t,6.5,6.7)),stage:t<4?'same-pattern-in-new-place':t<9?'different-conditions-different-performance':t<13?'facts-challenge-absolute-label':'compare-before-defining'};
 }
 // Fixed low-contrast grain only: no unrelated moving particles.
 const noise=document.createElement('canvas');noise.width=noise.height=96;const ng=noise.getContext('2d'),nd=ng.createImageData(96,96);let seed=661;
 for(let i=0;i<nd.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;nd.data[i]=nd.data[i+1]=nd.data[i+2]=seed>>>24;nd.data[i+3]=255;}ng.putImageData(nd,0,0);const grain=c.createPattern(noise,'repeat');

 function renderFrame(time){
  textRuns=[];const state=getFrameState(time),{t,camera:cam}=state;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=C.bg;c.fillRect(0,0,W,H);
  const wash=c.createRadialGradient(980,465,100,960,520,1080);wash.addColorStop(0,'rgba(33,49,56,.42)');wash.addColorStop(1,'rgba(8,13,18,0)');c.fillStyle=wash;c.fillRect(0,0,W,H);
  const planes=state.samples.map((s,id)=>({id,quad:s.vertices,alpha:s.visible})).filter(p=>p.alpha>0);
  planes.sort((a,b)=>view(b.quad[0],cam)[2]-view(a.quad[0],cam)[2]);
  planes.forEach(p=>paintPlane(sceneTexture(p.id,t),p.quad,cam,p.alpha));
  drawBoundaries(t,cam);drawEvidence(t,cam);
  const shade=c.createLinearGradient(0,900,0,1080);shade.addColorStop(0,'rgba(8,13,18,0)');shade.addColorStop(1,'rgba(8,13,18,.91)');c.fillStyle=shade;c.fillRect(0,900,W,180);
  c.save();c.globalAlpha=.013;c.fillStyle=grain;c.fillRect(0,0,W,H);c.restore();chapter(t,cam);state.textRuns=textRuns;window.lastRenderedState=state;return state;
 }
 window.renderFrame=renderFrame;window.getFrameState=getFrameState;window.motionDuration=DURATION;
 const renderMode=new URLSearchParams(location.search).has('render');if(renderMode)document.documentElement.classList.add('render-mode');
 let current=0,running=false,previous=null;const play=document.querySelector('#play'),seek=document.querySelector('#seek'),clock=document.querySelector('#clock');
 function sync(){play.textContent=running?'暂停':'播放';seek.value=current;clock.textContent=current.toFixed(2)+' / 15.00';}
 window.pauseAnimation=()=>{running=false;sync();};play.addEventListener('click',()=>{if(current>=DURATION)current=0;running=!running;previous=null;sync();});document.querySelector('#restart').addEventListener('click',()=>{current=0;running=true;previous=null;renderFrame(current);sync();});seek.addEventListener('input',()=>{running=false;current=Number(seek.value);renderFrame(current);sync();});
 function tick(now){if(running&&!renderMode&&previous!==null){current=clamp(current+(now-previous)/1000,0,DURATION);if(current>=DURATION)running=false;renderFrame(current);sync();}previous=now;requestAnimationFrame(tick);}
 renderFrame(0);if(!renderMode)requestAnimationFrame(tick);sync();
})();
