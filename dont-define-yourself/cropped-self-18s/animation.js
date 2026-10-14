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
 const DURATION=18;
 const CK=[
  {t:0,eye:[50,90,-1450],target:[45,-30,0]},
  {t:.85,eye:[15,75,-1350],target:[5,-10,0]},
  {t:1.7,eye:[-95,75,-1040],target:[-100,60,0]},
  {t:2.8,eye:[-115,85,-740],target:[-110,85,0]},
  {t:3.65,eye:[-115,75,-320],target:[-100,85,350]},
  {t:5.6,eye:[-105,75,450],target:[-100,85,950]},
  {t:6.0,eye:[-105,75,495],target:[-100,85,1000]},
  {t:6.9,eye:[-50,90,-1080],target:[-55,-10,0]},
  {t:8.65,eye:[40,105,-1140],target:[-45,-20,0]},
  {t:9.4,eye:[310,165,-1490],target:[400,-20,50]},
  {t:10.35,eye:[1490,90,-1210],target:[1490,-40,100]},
  {t:11.2,eye:[2130,130,-1290],target:[2210,-10,100]},
  {t:12.45,eye:[2870,105,-1240],target:[2940,-15,90]},
  {t:13.5,eye:[2910,95,-1300],target:[2980,0,90]},
  {t:16.1,eye:[2930,115,-1430],target:[2980,-30,120]},
  {t:17.0,eye:[3090,115,-1550],target:[3200,-35,100]},
  {t:18,eye:[3180,125,-1600],target:[3370,-35,120]}
 ];
 function spline(t,k){let i=0;while(i<CK.length-2&&t>CK[i+1].t)i++;const a=CK[i],b=CK[i+1],u=clamp((t-a.t)/(b.t-a.t)),d=b.t-a.t;return a[k].map((v,j)=>{const prev=CK[Math.max(0,i-1)],next=CK[Math.min(CK.length-1,i+2)];const v0=i===0?0:(b[k][j]-prev[k][j])/(b.t-prev.t),v1=i===CK.length-2?0:(next[k][j]-a[k][j])/(next.t-a.t);return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*d*v0+(-2*u**3+3*u*u)*b[k][j]+(u**3-u*u)*d*v1;});}
 function cameraAt(t){const eye=spline(t,'eye'),target=spline(t,'target'),forward=norm(sub(target,eye)),right=norm(cross([0,1,0],forward)),up=cross(forward,right);return {eye,target,forward,right,up,focal:1600,cx:960,cy:505,near:90};}
 function view(v,cam){const r=sub(v,cam.eye);return [dot(r,cam.right),dot(r,cam.up),dot(r,cam.forward)];}
 function project(v,cam){const a=view(v,cam);return {x:cam.cx+cam.focal*a[0]/Math.max(1,a[2]),y:cam.cy-cam.focal*a[1]/Math.max(1,a[2]),depth:a[2]};}
 function stroke(points,cam,color,alpha,width=1.3,progress=1){if(alpha<=0||progress<=0)return;c.save();c.strokeStyle=color;c.globalAlpha=clamp(alpha);c.lineWidth=width;c.lineCap='round';const total=(points.length-1)*clamp(progress),count=Math.floor(total),vv=points.slice(0,count+1);if(count<points.length-1)vv.push(vm(points[count],points[count+1],total-count));c.beginPath();for(let i=0;i<vv.length-1;i++){let a=vv[i],b=vv[i+1],da=view(a,cam)[2],db=view(b,cam)[2];if(da<cam.near&&db<cam.near)continue;if(da<cam.near)a=vm(a,b,(cam.near-da)/(db-da));if(db<cam.near)b=vm(b,a,(cam.near-db)/(view(a,cam)[2]-db));const p=project(a,cam),q=project(b,cam);c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}c.stroke();c.restore();}
 function label(g,str,x,y,size,color=C.white,align='left',alpha=1,serif=false){if(alpha<=0)return;g.save();g.globalAlpha*=clamp(alpha);g.font=`${size}px "${serif?'Noto Serif CJK SC':'Noto Sans CJK SC'}",sans-serif`;g.fillStyle=color;g.textAlign=align;g.textBaseline='alphabetic';if('letterSpacing' in g)g.letterSpacing='1.5px';g.fillText(str,x,y);if(g===c&&g.globalAlpha>.1){const m=g.measureText(str),left=align==='center'?x-m.width/2:align==='right'?x-m.width:x;textRuns.push({text:str,alpha:g.globalAlpha,left,right:left+m.width,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});}g.restore();}
 function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
 function line(g,points,color,width=2,alpha=1){g.save();g.strokeStyle=color;g.lineWidth=width;g.globalAlpha*=alpha;g.lineCap='round';g.lineJoin='round';g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();g.restore();}

 // Adult editorial silhouette, with a continuous articulated body rather
 // than stick limbs. Hands, gaze, breathing and planted feet tell the event.
 function ribbon(g,points,widths,color){
  const edges=[[],[]];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=Math.hypot(b[0]-a[0],b[1]-a[1])||1,n=[-(b[1]-a[1])/d,(b[0]-a[0])/d];for(let side=0;side<2;side++)edges[side].push([points[i][0]+n[0]*widths[i]*(side?-.5:.5),points[i][1]+n[1]*widths[i]*(side?-.5:.5)]);}
  g.fillStyle=color;g.beginPath();g.moveTo(...edges[0][0]);g.quadraticCurveTo(...edges[0][1],...edges[0][2]);g.lineTo(...edges[1][2]);g.quadraticCurveTo(...edges[1][1],...edges[1][0]);g.closePath();g.fill();
 }
 function hand(g,x,y,curl,angle,skin){
  g.save();g.translate(x,y);g.rotate(angle);g.fillStyle=skin;
  g.beginPath();g.moveTo(-3,-3);g.bezierCurveTo(0,-7,4,-7,mix(12,8,curl),mix(-7,-5,curl));
  g.quadraticCurveTo(mix(18,12,curl),mix(-8,-4,curl),mix(18,12,curl),mix(-5,1,curl));
  g.lineTo(mix(9,10,curl),mix(-2,2,curl));g.lineTo(mix(20,11,curl),mix(1,4,curl));
  g.quadraticCurveTo(mix(21,10,curl),mix(4,8,curl),mix(13,4,curl),7);g.lineTo(0,5);g.closePath();g.fill();
  line(g,[[mix(7,5,curl),-1],[mix(15,10,curl),mix(-1,2,curl)]],'#8C9890',.65,curl*.7);
  line(g,[[2,3],[mix(11,6,curl),mix(4,1,curl)]],'#8C9890',.7,.65);
  g.restore();
 }
 function shoe(g,x,y,role,flip=1){
  g.save();g.translate(x,y);g.scale(flip,1);g.fillStyle=role==='self'?'#CACCC0':'#71878A';g.beginPath();g.moveTo(-7,-6);g.lineTo(6,-6);g.bezierCurveTo(10,-5,13,-3,15,-2);g.quadraticCurveTo(17,0,12,0);g.lineTo(-8,0);g.quadraticCurveTo(-11,-3,-7,-6);g.fill();line(g,[[-8,0],[14,0]],'#17262C',.7);g.restore();
 }
 function actorPose(mode,t,clock){
  const gestureTime=mode==='friend'?clock:t,wave=Math.sin(gestureTime*3.3),fail=R(clock,.92,1.55),pause=R(t,11.52,11.75)*(1-R(t,12.15,12.4));
  if(mode==='friend')return {tension:.06,reach:.45+Math.sin(gestureTime*2.6)*.15,curl:0,lean:.05+Math.sin(t*2)*.014,nod:Math.sin(gestureTime*3)*.035,seat:1,walk:0,step:0,note:0,mouth:(Math.sin(gestureTime*7)+1)*.6};
  if(mode==='prepared'){
   const base={tension:.12+pause*.3,reach:.6-pause*.23,curl:.05,lean:-.015,nod:.16*pause,seat:0,walk:R(t,16.25,16.85),step:0,note:1,mouth:(Math.sin(t*7)+1)*.5*(1-pause)};
   const next={tension:.37,reach:.18+.62*R(t,17.05,17.7),curl:.5*(1-R(t,17.15,17.6)),lean:-.018,nod:0,seat:0,walk:1-R(t,17.3,17.7),step:0,note:1,mouth:R(t,17.45,17.85)*.7},q=R(t,16.35,16.95);
   return Object.fromEntries(Object.keys(base).map(k=>[k,mix(base[k],next[k],q)]));
  }
  if(mode==='try')return {tension:.37,reach:.18+.62*R(t,17.05,17.7),curl:.5*(1-R(t,17.15,17.6)),lean:-.018,nod:0,seat:0,walk:1-R(t,17.3,17.7),step:0,note:.7,mouth:R(t,17.45,17.85)*.7};
  if(mode==='listen')return {tension:.09,reach:.26+.12*Math.sin(t*2.1),curl:.03,lean:-.035,nod:Math.sin(t*2.7)*.045,seat:0,walk:0,step:0,note:0,mouth:.1};
  return {tension:fail*.85,reach:mix(.2+.66*R(clock,.08,.67),.33,fail),curl:fail,lean:mix(-.018,-.06,fail),nod:fail*.09,seat:0,walk:0,step:R(clock,1.5,2.0),note:0,mouth:(Math.sin(clock*9)+1)*.6*(1-fail)};
 }
 function person(g,x,y,size,pose,t,role='self',flip=false){
  g.save();g.translate(x,y);g.scale(flip?-size:size,size);
  const p=pose,seat=p.seat,shift=seat*19,breath=Math.sin(t*2.4)*.36;
  const skin=role==='self'?'#BABFB0':'#829899',coat=role==='self'?'#CDD1C2':'#748E93',shade=role==='self'?'#8FA6A1':'#526E79';
  const phase=(t-16.3)*7.6,walk=p.walk,stride=Math.sin(phase)*17*walk,heelA=Math.max(0,Math.sin(phase))*8*walk,heelB=Math.max(0,-Math.sin(phase))*8*walk;
  const feet=seat?[[10,0],[39,0]]:[[-18-stride-6*p.step,-heelA],[18+stride-4*p.step,-heelB]];
  const hips=[[-12,-79+shift],[10,-78+shift]],knees=seat?[[33,-60],[51,-61]]:[[-13-stride*.4,-39-heelA*.2],[15+stride*.4,-39-heelB*.2]];
  ribbon(g,[hips[0],knees[0],feet[0]],[19,14,9],'#465D65');shoe(g,...feet[0],role);
  ribbon(g,[hips[1],knees[1],feet[1]],[18,13,8],role==='self'?'#849791':'#5D7980');shoe(g,...feet[1],role);
  g.save();g.translate(0,shift+breath-Math.abs(Math.sin(phase))*1.2*walk);g.rotate(p.lean);
  // Far sleeve is behind the torso. The note hand actually approaches it.
  const farHand=p.note?[-29,-110]:[-27,-82];ribbon(g,[[-21,-133],[-28,-109],farHand],[16,13,9],shade);
  hand(g,...farHand,.25,p.note?-.9:.7,skin);
  const fabric=g.createLinearGradient(-28,0,25,0);fabric.addColorStop(0,shade);fabric.addColorStop(.18,coat);fabric.addColorStop(.7,coat);fabric.addColorStop(1,role==='self'?'#AABBB2':'#617D84');
  g.fillStyle=fabric;g.beginPath();g.moveTo(-10,-143);g.bezierCurveTo(-26,-145,-34,-134,-31,-119);g.lineTo(-23,-78);g.quadraticCurveTo(-1,-71,22,-80);g.lineTo(22,-119);g.bezierCurveTo(24,-135,11,-143,5,-142);g.closePath();g.fill();
  line(g,[[-8,-141],[0,-129],[9,-141]],'#6B8383',1.15);line(g,[[0,-129],[4,-85]],'#839A92',.85);line(g,[[-18,-108],[-10,-110]],'#849A93',.75);
  // Neck / profile / ear / brows and mouth share the gesture's tension.
  g.fillStyle=skin;g.beginPath();g.moveTo(-5,-149);g.lineTo(-5,-139);g.quadraticCurveTo(4,-134,9,-141);g.lineTo(10,-150);g.fill();
  g.save();g.translate(1,-149);g.rotate(p.nod);g.scale(.72,.72);
  g.fillStyle=skin;g.beginPath();g.moveTo(-10,-25);g.bezierCurveTo(-15,-41,6,-46,15,-35);g.quadraticCurveTo(20,-30,17,-23);g.lineTo(22,-18);g.quadraticCurveTo(23,-15,18,-14);g.lineTo(18,-8);g.quadraticCurveTo(14,2,6,1);g.quadraticCurveTo(-5,-4,-8,-13);g.closePath();g.fill();
  g.fillStyle='#8FA79F';g.beginPath();g.moveTo(-8,-24);g.quadraticCurveTo(-2,-19,-3,-8);g.lineTo(5,0);g.quadraticCurveTo(-9,-2,-11,-16);g.closePath();g.fill();
  g.fillStyle='#263B42';g.beginPath();g.moveTo(-11,-15);g.bezierCurveTo(-21,-37,-3,-49,12,-39);g.quadraticCurveTo(25,-32,16,-27);g.lineTo(8,-30);g.quadraticCurveTo(-2,-34,-5,-22);g.lineTo(-7,-15);g.closePath();g.fill();
  line(g,[[-5,-21],[-4,-15],[-1,-16]],'#748A83',.75);line(g,[[9,-23],[15,-23+p.tension*1.5]],'#526F72',.95);
  line(g,[[8,-27-p.tension],[15,-28+p.tension*2]],'#526F72',.85);
  g.strokeStyle='#718780';g.lineWidth=.7;g.beginPath();g.moveTo(12,-7);g.quadraticCurveTo(16,-6+seat*3-p.tension*5,18,-7-seat*2);g.stroke();
  if(p.mouth>.3){ellipse(g,16,-7,1.5,p.mouth*1.6,'#617978');}g.restore();
  const handPos=[mix(23,57,p.reach),mix(-89,-120,p.reach)+Math.sin(t*3.1)*1.4*(1-p.tension)],elbow=[29,-108+p.tension*3];
  ribbon(g,[[15,-133],elbow,handPos],[17,13,9],coat);line(g,[[handPos[0]-3,handPos[1]-3],[handPos[0]+2,handPos[1]+3]],shade,.85);
  hand(g,...handPos,p.curl,-.16+p.tension*.2,skin);line(g,[[19,-124],[25,-117]],shade,.7,.45);
  if(p.note){g.save();g.translate(-28,-110);g.rotate(-.08+p.nod*.5);g.fillStyle='#D7D3B9';g.beginPath();g.moveTo(-15,-13);g.lineTo(8,-14);g.lineTo(11,21);g.lineTo(-11,20);g.closePath();g.fill();for(let j=0;j<3;j++)line(g,[[-10,-5+j*6],[5,-6+j*6]],'#8B998D',.85);line(g,[[-8,13],[-5,16],[1,10]],C.gold,1.3);g.restore();hand(g,-30,-103,.72,-.9,skin);}
  g.restore();g.restore();
 }
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
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,1,2,0,2,3].flatMap(i=>vertices[i])),gl.DYNAMIC_DRAW);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.uniform1f(opacityUniform,opacity);gl.drawArrays(gl.TRIANGLES,0,6);
 }
 const GROUND=-300,FRIEND=1300,PREP=2850;
 const actorCanvas=document.createElement('canvas');actorCanvas.width=640;actorCanvas.height=880;
 function quad(center,w,h,angle=0){const cs=Math.cos(angle),sn=Math.sin(angle);return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>[center[0]+x*w*cs,center[1]+y*h,center[2]+x*w*sn]);}
 function bilinear(q,u,v){return vm(vm(q[0],q[1],u),vm(q[3],q[2],u),v);}
 function rootClock(t){
  const recorded=Math.min(t,2.15),replay=.92+.93*(.5+.5*Math.cos((t-3.35)*Math.PI*2/1.12));
  const same=mix(recorded,replay,R(t,3.0,3.45));return mix(same,clamp(t-6.85,0,2.2),R(t,6.35,6.95));
 }
 function rootZ(t){return 1000*R(t,3.05,5.65)*(1-R(t,6.05,6.85));}
 function futureX(t){return PREP+380*R(t,16.25,17.7);}
 function actorQuad(a){return quad([a.x,GROUND+288.75,a.z],240*a.scale,330*a.scale,a.angle||0);}
 function actorSpecs(t){
  const cl=rootClock(t),p=actorPose('fail',t,cl),z=rootZ(t),echo=R(t,3.15,3.75)*(1-R(t,6.1,6.8));
  const list=[
   {id:'self-first-and-new-strangers',x:-170-42*p.step,z,scale:1,mode:'fail',clock:cl,role:'self',alpha:1},
   {id:'stranger-first-and-new',x:405,z:z+35,scale:1.01,mode:'listen',clock:cl,role:'other',flip:true,alpha:1},
   {id:'self-with-friend',x:FRIEND,z:85,scale:1,mode:'friend',clock:t,role:'self',alpha:1},
   {id:'friend',x:FRIEND+405,z:115,scale:1,mode:'friend',clock:t+1.1,role:'other',flip:true,alpha:1},
   {id:'self-prepared-and-next-attempt',x:futureX(t),z:90,scale:1,mode:'prepared',clock:t,role:'self',alpha:1},
   {id:'next-listener',x:PREP+1100,z:185,scale:1,mode:'listen',clock:t+.6,role:'other',flip:true,alpha:1}
  ];
  for(let i=1;i<=2;i++)list.push({id:`same-memory-${i}`,x:-170-42*p.step,z:z+i*560,scale:1,mode:'fail',clock:cl,role:'self',alpha:echo*(.52-i*.12)});
  return list;
 }
 function drawActor(a,t,cam){
  const q=actorQuad(a),pp=q.map(p=>project(p,cam));if(a.alpha<.002||pp.every(p=>p.depth<cam.near)||Math.max(...pp.map(p=>p.x))< -150||Math.min(...pp.map(p=>p.x))>W+150||Math.max(...pp.map(p=>p.y))<0||Math.min(...pp.map(p=>p.y))>H+200)return;
  const g=actorCanvas.getContext('2d');g.clearRect(0,0,640,880);person(g,320,825,3.8,actorPose(a.mode,t,a.clock),a.mode==='friend'&&a.flip?t+.7:t,a.role,a.flip);
  paintPlane(actorCanvas,q,cam,a.alpha);
 }
 function polygon(points,cam,fill,alpha=1){
  // Clip geometry against the camera near plane rather than dropping an
  // entire wall/floor as soon as one corner passes behind the camera.
  const clipped=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],da=view(a,cam)[2],db=view(b,cam)[2],insideA=da>=cam.near,insideB=db>=cam.near;
   if(insideA)clipped.push(a);if(insideA!==insideB)clipped.push(vm(a,b,(cam.near-da)/(db-da)));
  }
  if(clipped.length<3)return;c.save();c.globalAlpha=alpha;c.fillStyle=fill;c.beginPath();clipped.map(p=>project(p,cam)).forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();c.restore();
 }
 function groundPool(x,z,rx,rz,cam,color,alpha=1){
  const pts=Array.from({length:49},(_,i)=>[x+Math.cos(i/48*Math.PI*2)*rx,GROUND-2,z+Math.sin(i/48*Math.PI*2)*rz]);polygon(pts,cam,color,alpha);
 }
 function frameAt(i,t){
  const memory=R(t,3.05,5.65),release=R(t,6.05,6.9),w=mix(880,180,memory)*(1-i*.055),z=rootZ(t)+120+i*350;
  const tunnel=quad([-105,35,z],w,330,.006*i);
  const positions=[[-640,35,415,150,335],[600,45,540,210,270],[-570,35,680,90,335],[665,45,760,120,270],[-400,90,1000,110,220],[490,110,1100,140,220]];
  const [x,y,zz,ww,hh]=positions[i],room=quad([x,y,zz],ww,hh,0);
  const vertices=tunnel.map((p,j)=>vm(p,room[j],release));return {id:`boundary-${i}`,vertices,memory,release};
 }
 function environment(t,cam){
  // A continuous floor links all moments. These are rooms, not framed panels.
  const y=GROUND-7;
  polygon([[-1700,y,-1000],[5000,y,-1000],[5000,y,4800],[-1700,y,4800]],cam,'#101A20');
  // The large ground plane crosses the near plane; a screen-space wash fills
  // that clipped foreground, while all meaningful ground anchors use 3D.
  const floor=c.createLinearGradient(0,550,0,1080);floor.addColorStop(0,'rgba(22,36,43,0)');floor.addColorStop(1,'rgba(18,29,34,.42)');c.fillStyle=floor;c.fillRect(0,550,W,530);
  for(let i=0;i<6;i++){
   const f=frameAt(i,t),at=R(t,2.7+i*.07,3.25+i*.07),alpha=(.11+f.memory*.23)*(i<2?1:.45)*(.18+.82*at);
   if(at<.001&&i>1)continue;
   for(let k=0;k<4;k++)stroke([f.vertices[k],f.vertices[(k+1)%4]],cam,C.line,alpha*(i<2?1:at),k===2?1.2:.9);
  }
  // Cafe window and a soft, warm practical light, outside the original crop.
  const window=quad([FRIEND+100,80,720],450,280,0);
  polygon(window,cam,'#1A2A2E',.42);for(let i=0;i<4;i++)stroke([window[i],window[(i+1)%4]],cam,'#92A09C',.27,1.1);
  stroke([[FRIEND+100,-200,720],[FRIEND+100,360,720]],cam,'#92A09C',.18,1);
  stroke([[-850,GROUND-2,120],[FRIEND-400,GROUND-2,120],[PREP+950,GROUND-2,120]],cam,C.line,.13,1.1);
  for(const a of actorSpecs(t))if(a.alpha>.1)groundPool(a.x,a.z,106*a.scale,52,cam,'#35545A',.10*a.alpha);
  groundPool(FRIEND+190,100,380,145,cam,'#736753',.075);
  groundPool(PREP+20,95,330,120,cam,'#607A81',.10);
 }
 function foregroundArchitecture(cam){
  // A real doorway post passes between viewer and performers.
  polygon([[2225,GROUND,-90],[2290,GROUND,-90],[2290,480,-90],[2225,480,-90]],cam,'#091218',.97);
  stroke([[2290,GROUND,-90],[2290,480,-90]],cam,C.line,.15,1.1);
  polygon([[3460,GROUND,180],[3502,GROUND,180],[3502,450,180],[3460,450,180]],cam,'#14252D',.62);
  stroke([[3502,GROUND,180],[3502,450,180]],cam,C.line,.16,1.1);
 }
 function newMeetingTable(t,cam){
  const q=R(t,6.42,7.24);if(q<.001)return;
  const x=125,top=GROUND+220*q,width=160*q;
  polygon([[x-width,top,35],[x+width,top,35],[x+width,top,145],[x-width,top,145]],cam,'#435B60');
  for(const dx of [-130,130])stroke([[x+dx*q,GROUND,70],[x+dx*q,top,70]],cam,C.line,1.5,.38);
  polygon([[x-20,top+3,75],[x+43,top+3,75],[x+43,top+3,118],[x-20,top+3,118]],cam,'#829389',q*.8);
 }
 function table(cam){
  const x=FRIEND+200,z=115,topY=GROUND+238;
  const top=Array.from({length:49},(_,i)=>[x+Math.cos(i/48*Math.PI*2)*178,topY,z+Math.sin(i/48*Math.PI*2)*92]);polygon(top,cam,'#667D78');
  stroke([[x,topY-5,z],[x,GROUND,z]],cam,'#708982',5,.9);
  for(const dx of [-67,65]){
   const p=project([x+dx,topY+22,z],cam),scale=cam.focal/p.depth;if(p.depth<90)continue;
   c.fillStyle='#BAC2AF';c.beginPath();c.roundRect(p.x-7*scale,p.y-12*scale,14*scale,20*scale,3*scale);c.fill();
   line(c,[[p.x+8*scale,p.y-8*scale],[p.x+12*scale,p.y-6*scale],[p.x+12*scale,p.y+1*scale],[p.x+8*scale,p.y+3*scale]],'#BAC2AF',2*scale);
  }
  for(const xx of [FRIEND,FRIEND+405]){
   const flip=xx===FRIEND?1:-1;
   stroke([[xx-60*flip,GROUND,100],[xx-60*flip,GROUND+265,100],[xx-63*flip,GROUND+345,100]],cam,'#485E64',3,.6);
   stroke([[xx-60*flip,GROUND+167,100],[xx+100*flip,GROUND+167,100],[xx+95*flip,GROUND,100]],cam,'#627A79',3,.7);
  }
 }
 function microphone(cam,x=PREP+180,z=125){
  stroke([[x,GROUND,z],[x,GROUND+442,z],[x+22,GROUND+463,z]],cam,C.line,2.6,.85);
  const p=project([x+22,GROUND+478,z],cam),scale=cam.focal/p.depth;if(p.depth>90){c.save();c.translate(p.x,p.y);c.rotate(.28);c.fillStyle='#CAD0C0';c.beginPath();c.roundRect(-6*scale,-19*scale,12*scale,27*scale,5*scale);c.fill();for(let i=0;i<4;i++)line(c,[[-3*scale,(-15+i*5)*scale],[3*scale,(-15+i*5)*scale]],'#6B8288',.7*scale);c.restore();}
  polygon([[x+28,GROUND,z],[x+96,GROUND,z],[x+96,GROUND+208,z],[x+28,GROUND+218,z]],cam,'#31494F');
  stroke([[x+20,GROUND+223,z],[x+106,GROUND+211,z]],cam,C.line,1.6,.45);
 }
 function audience(cam){
  for(let i=0;i<4;i++){
   const p=project([PREP-70+i*152,GROUND+10,-280],cam),scale=cam.focal/Math.max(90,p.depth);if(p.depth<90||p.x< -120||p.x>W+120)continue;
   c.save();c.translate(p.x,p.y);c.scale(scale,scale);c.fillStyle='#28434D';c.beginPath();c.moveTo(-45,23);c.quadraticCurveTo(-47,-23,-17,-33);c.bezierCurveTo(-28,-57,-15,-82,1,-82);c.bezierCurveTo(22,-81,29,-51,17,-32);c.quadraticCurveTo(49,-22,47,23);c.closePath();c.fill();c.restore();
  }
 }
 function voice(points,cam,t,progress,interrupted=0,alpha=1){
  const [a,b]=points,samples=Array.from({length:100},(_,i)=>{
   const u=i/99,p=vm(a,b,u);p[1]+=Math.sin(u*42-t*5.4)*Math.sin(u*19+t)*11*(.2+.8*Math.sin(Math.PI*u))*(1-interrupted*.4);return p;
  });
  const first=clamp(progress),breakA=mix(1,.37,interrupted),breakB=mix(1,.63,interrupted);
  stroke(samples.slice(0,Math.max(2,Math.floor(100*Math.min(first,breakA)))),cam,interrupted>.7?C.pause:C.gold,alpha,2.1);
  if(interrupted>.01&&first>breakB)stroke(samples.slice(Math.floor(100*breakB),Math.floor(100*first)),cam,C.pause,alpha,2.1);
 }
 function voices(t,cam){
  const clock=rootClock(t),failure=R(clock,.92,1.55),z=rootZ(t);
  voice([[-52,124,z],[275,124,z]],cam,clock,R(clock,.08,.9),failure,.88);
  voice([[FRIEND+91,95,92],[FRIEND+304,95,92]],cam,t,1,0,.83);
  voice([[FRIEND+292,25,105],[FRIEND+105,25,105]],cam,t+.8,1,0,.45);
  const prepProgress=.3+.7*R(t,12.12,12.75);
  voice([[PREP+100,122,100],[PREP+488,122,100]],cam,t,prepProgress,0,.86*(1-R(t,16.25,17.0)));
  voice([[futureX(t)+115,130,100],[futureX(t)+380,130,100]],cam,t,R(t,17.35,17.95),.12,.7*R(t,17.25,17.6));
 }
 function apertureAt(t){
  const closing=R(t,2.55,3.55),pressure=R(t,3.5,5.65),open=R(t,6.08,9.65);
  const half=mix(960,mix(540,270,pressure),closing),h=mix(540,mix(385,310,pressure),closing);
  return {cx:960,cy:520,halfW:mix(half,960,open),halfH:mix(h,560,open),closed:closing*(1-open)};
 }
 function crop(t){
  const a=apertureAt(t);if(a.closed<.001)return;
  const left=a.cx-a.halfW,right=a.cx+a.halfW,top=a.cy-a.halfH,bottom=a.cy+a.halfH;
  c.save();c.fillStyle='#070C11';c.fillRect(0,0,left,H);c.fillRect(right,0,W-right,H);c.fillRect(left,0,right-left,top);c.fillRect(left,bottom,right-left,H-bottom);
  line(c,[[left,top],[left,bottom]],C.line,1.1,.30*a.closed);line(c,[[right,top],[right,bottom]],C.line,1.1,.30*a.closed);line(c,[[left,bottom],[right,bottom]],C.line,.8,.20*a.closed);c.restore();
 }
 function glyphLayout(t){
  const a=apertureAt(t),rise=R(t,6.1,7.1),center=R(t,12.75,13.55),size=mix(mix(50,39,rise),54,center);
  const morph=R(t,13.58,15.12),advance=size+3,width=mix(7,11,morph)*advance;
  const cx=mix(mix(960,128+7*(39+3)/2,rise),960,center),y=mix(mix(945,a.cy+a.halfH+65,a.closed),155,rise);
  return {cx,y:mix(y,220,center),size,advance,width,morph,alpha:R(t,1.85,2.4)*(.93-.57*R(t,9.25,9.85)+.57*R(t,12.65,13.25))*(1-R(t,16.87,17.28))};
 }
 function judgement(t){
  const l=glyphLayout(t);if(l.alpha<.001)return;
  const minX=l.cx-l.width/2;c.save();c.globalAlpha=l.alpha;
  for(const m of window.GLYPH_MORPH.morphs){
   const p=R(t,13.58+m.targetIndex*.025,15.12+m.targetIndex*.016),extra=m.extra?R(p,.15,.54):1;
   if(extra<.001)continue;
   const oldStart=l.cx-7*l.advance/2+m.sourceIndex*l.advance,newStart=l.cx-11*l.advance/2+m.targetIndex*l.advance;
   const x=mix(oldStart,newStart,l.morph);c.save();c.globalAlpha*=extra;
   const highlight=Math.sin(Math.PI*p)*.35;c.fillStyle=highlight>.2?C.gold:C.white;c.beginPath();
   for(const contour of m.contours){contour.a.forEach((a,i)=>{const b=contour.b[i],px=x+mix(a[0],b[0],p)*l.size,py=l.y+mix(a[1],b[1],p)*l.size;i?c.lineTo(px,py):c.moveTo(px,py);});c.closePath();}
   c.fill('nonzero');c.restore();
  }
  c.restore();if(l.alpha>.1)textRuns.push({text:l.morph<.001?'我不擅长表达。':l.morph>.999?'我在陌生场合容易紧张。':'判断的连续字形修正',alpha:l.alpha,left:minX-4,right:minX+l.width+4,top:l.y-l.size,bottom:l.y+5});
 }
 function evidenceIntoWords(t,cam){
  const q=R(t,13.05,14.1),alpha=R(t,13.02,13.48)*(1-R(t,15.45,16.1));if(alpha<.001)return;
  const p=project([PREP+488,122,100],cam),l=glyphLayout(t),end=[l.cx-l.width/2+4,l.y+12],middle=[mix(p.x,l.cx,.5),l.y+70];
  c.save();c.strokeStyle=C.gold;c.globalAlpha=alpha*.54;c.lineWidth=1.45;c.lineCap='round';c.beginPath();
  for(let i=0;i<=80*q;i++){
   const u=i/80,v=1-u,x=v*v*p.x+2*v*u*middle[0]+u*u*end[0],y=v*v*p.y+2*v*u*middle[1]+u*u*end[1];i?c.lineTo(x,y):c.moveTo(x,y);
  }c.stroke();c.restore();
 }
 function captions(t){
  label(c,'陌生人面前',128,121,26,C.line,'left',R(t,.15,.6)*(1-R(t,2.4,2.9))*.65);
  label(c,'还是那一刻',128,121,26,C.line,'left',R(t,3.55,3.95)*(1-R(t,5.85,6.15))*.7);
  label(c,'又一个陌生场合',128,87,25,C.line,'left',R(t,7.05,7.5)*(1-R(t,8.65,9.1))*.7);
  label(c,'和朋友',128,103,25,C.gold,'left',R(t,10.05,10.4)*(1-R(t,10.8,11.2))*.75);
  label(c,'准备之后',128,103,25,C.gold,'left',R(t,11.75,12.1)*(1-R(t,12.5,12.9))*.75);
  label(c,'但准备和练习，可以带来改变。',960,957,36,C.white,'center',R(t,15.12,15.7)*(1-R(t,16.85,17.25)));
  label(c,'别急着定义自己',960,167,57,C.white,'center',R(t,17.08,17.48),true);
 }
 function getFrameState(time){
  const t=clamp(Number(time)||0,0,DURATION),cam=cameraAt(t),actors=actorSpecs(t),root=actors[0],friend=actors[2],prep=actors[4];
  const focus0=vm([root.x,GROUND,root.z],[friend.x,GROUND,friend.z],R(t,9.2,10.35)),focus=vm(focus0,[prep.x,GROUND,prep.z],R(t,11.0,12.25)),aperture=apertureAt(t);
  const samples=[root,friend,prep].map((a,i)=>{
   const p=project([a.x,GROUND+180,a.z],cam),v=p.depth>90&&p.x>aperture.cx-aperture.halfW-100&&p.x<aperture.cx+aperture.halfW+100?1:0;
   return {id:['experience-strangers','experience-friends','experience-prepared'][i],position:[a.x,GROUND,a.z],vertices:actorQuad(a),visible:v,connected:false};
  });
  return {t,camera:cam,core:{id:'person-self',position:focus,screen:project(focus,cam)},boundaries:Array.from({length:6},(_,i)=>frameAt(i,t)),samples,aperture,actors:actors.map(a=>({...a,pose:actorPose(a.mode,t,a.clock)})),judgement:glyphLayout(t),stage:t<3?'one-failed-utterance':t<6?'cropped-and-replayed':t<9?'new-place-same-pattern':t<13?'evidence-beyond-the-crop':t<17?'revising-a-judgement':'open-next-attempt'};
 }
 const noise=document.createElement('canvas');noise.width=noise.height=64;const ng=noise.getContext('2d'),nd=ng.createImageData(64,64);let seed=861;
 for(let i=0;i<nd.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;nd.data[i]=nd.data[i+1]=nd.data[i+2]=seed>>>24;nd.data[i+3]=255;}ng.putImageData(nd,0,0);const grain=c.createPattern(noise,'repeat');
 function renderFrame(time){
  textRuns=[];const state=getFrameState(time),{t,camera:cam}=state;c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle=C.bg;c.fillRect(0,0,W,H);
  const wash=c.createRadialGradient(960,455,50,950,520,1000);wash.addColorStop(0,'rgba(41,59,65,.42)');wash.addColorStop(1,'rgba(8,13,18,0)');c.fillStyle=wash;c.fillRect(0,0,W,H);
  environment(t,cam);newMeetingTable(t,cam);table(cam);microphone(cam);
  gl.clear(gl.COLOR_BUFFER_BIT);const actors=actorSpecs(t).sort((a,b)=>view([b.x,0,b.z],cam)[2]-view([a.x,0,a.z],cam)[2]);actors.forEach(a=>drawActor(a,t,cam));c.drawImage(planeBuffer,0,0);
  audience(cam);voices(t,cam);foregroundArchitecture(cam);crop(t);
  const shade=c.createLinearGradient(0,880,0,1080);shade.addColorStop(0,'rgba(8,13,18,0)');shade.addColorStop(1,'rgba(8,13,18,.9)');c.fillStyle=shade;c.fillRect(0,880,W,200);
  c.save();c.globalAlpha=.008;c.fillStyle=grain;c.fillRect(0,0,W,H);c.restore();evidenceIntoWords(t,cam);judgement(t);captions(t);state.textRuns=textRuns;window.lastRenderedState=state;return state;
 }
 window.renderFrame=renderFrame;window.getFrameState=getFrameState;window.motionDuration=DURATION;
 const renderMode=new URLSearchParams(location.search).has('render');if(renderMode)document.documentElement.classList.add('render-mode');
 let current=0,running=false,previous=null;const play=document.querySelector('#play'),seek=document.querySelector('#seek'),clock=document.querySelector('#clock');
 function sync(){play.textContent=running?'暂停':'播放';seek.value=current;clock.textContent=current.toFixed(2)+' / 18.00';}
 window.pauseAnimation=()=>{running=false;sync();};play.addEventListener('click',()=>{if(current>=DURATION)current=0;running=!running;previous=null;sync();});document.querySelector('#restart').addEventListener('click',()=>{current=0;running=true;previous=null;renderFrame(current);sync();});seek.addEventListener('input',()=>{running=false;current=Number(seek.value);renderFrame(current);sync();});
 function tick(now){if(running&&!renderMode&&previous!==null){current=clamp(current+(now-previous)/1000,0,DURATION);if(current>=DURATION)running=false;renderFrame(current);sync();}previous=now;requestAnimationFrame(tick);}
 renderFrame(0);if(!renderMode)requestAnimationFrame(tick);sync();
})();
