(() => {
  'use strict';
  const canvas = document.querySelector('#film'), ctx = canvas.getContext('2d', {alpha:false});
  const W=1920,H=1080,C={bg:'#080D12',line:'#B5CCD2',gold:'#DFB674',white:'#E8ECE8',dim:'#607C89'};
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
  const smoother=v=>{v=clamp(v);return v*v*v*(v*(v*6-15)+10);};
  const ramp=(t,a,b)=>smoother((t-a)/(b-a));
  const vecmix=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=v=>{const m=Math.hypot(...v)||1;return v.map(x=>x/m);};
  const pool=window.SamplePool;
  // Introduce the two main routes first, then stable local pairs, then the
  // unintegrated experiences. IDs and final positions remain inherited.
  const arrivalOrder=[6,9,12,17,20,24,5,4,8,7,13,10,15,16,22,18,26,11,14,19,21,23,25,27,28,29,30,31];
  const arrivalRank=Object.fromEntries(arrivalOrder.map((id,index)=>[id,index]));
  const CAM_KEYS=[
    {t:0,eye:[630,340,-1950],target:[0,0,0]},
    {t:2.2,eye:[490,255,-1470],target:[0,0,0]},
    {t:3.5,eye:[220,105,-560],target:[0,0,345]},
    {t:5.0,eye:[48,30,-45],target:[0,0,660]},
    {t:5.4,eye:[44,35,-38],target:[0,0,660]},
    {t:6.2,eye:[370,610,-740],target:[0,-35,660]},
    {t:7.2,eye:[840,1180,-1500],target:[30,-80,660]},
    {t:8.0,eye:[960,1450,-1800],target:[50,-100,660]}
  ];
  // Cubic Hermite camera spline: matching derivatives at each key prevents cuts.
  function spline(t,prop){
    let k=0;while(k<CAM_KEYS.length-2&&t>CAM_KEYS[k+1].t)k++;
    const a=CAM_KEYS[k],b=CAM_KEYS[k+1],u=clamp((t-a.t)/(b.t-a.t)),dt=b.t-a.t;
    return a[prop].map((v,j)=>{
      const prev=CAM_KEYS[Math.max(0,k-1)],next=CAM_KEYS[Math.min(CAM_KEYS.length-1,k+2)];
      const va=k===0?0:(b[prop][j]-prev[prop][j])/(b.t-prev.t);
      const vb=k===CAM_KEYS.length-2?0:(next[prop][j]-a[prop][j])/(next.t-a.t);
      return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*dt*va+(-2*u**3+3*u*u)*b[prop][j]+(u**3-u*u)*dt*vb;
    });
  }
  function cameraAt(t){
    const eye=spline(t,'eye'),target=spline(t,'target'),forward=norm(sub(target,eye));
    const right=norm(cross([0,1,0],forward)),up=cross(forward,right);
    return {eye,target,forward,right,up,focal:1510,cx:960,cy:510,near:70};
  }
  function view(v,cam){const r=sub(v,cam.eye);return [dot(r,cam.right),dot(r,cam.up),dot(r,cam.forward)];}
  function project(v,cam){const p=view(v,cam);return {x:cam.cx+cam.focal*p[0]/Math.max(1,p[2]),y:cam.cy-cam.focal*p[1]/Math.max(1,p[2]),depth:p[2],factor:cam.focal/Math.max(1,p[2])};}
  function clipSegment(a,b,cam){
    const da=view(a,cam)[2],db=view(b,cam)[2];
    if(da<cam.near&&db<cam.near)return null;
    if(da<cam.near)a=vecmix(a,b,(cam.near-da)/(db-da));
    if(db<cam.near)b=vecmix(b,a,(cam.near-db)/(view(a,cam)[2]-db));
    return [project(a,cam),project(b,cam)];
  }
  function plane(w,h,z){return [[-w,h,z],[w,h,z],[w,-h,z],[-w,-h,z]];}
  const front=plane(330,210,-170),back=plane(330,210,230);
  const cube=Array.from({length:4},(_,i)=>[front[i],front[(i+1)%4],back[(i+1)%4],back[i]]).concat([back,front]);
  const inWidths=[410,340,275,220,160,107],inZ=[-130,180,370,515,635,760];
  const outRadii=[1180,985,790,610,420,235];

  function frameAt(i,t){
    const internal=ramp(t,2.18+i*.035,3.12+i*.035),pressure=ramp(t,3.15,5.1);
    const w=inWidths[i]*mix(1,.86,pressure),h=w*.64;
    const nested=plane(w,h,inZ[i]);
    let verts=cube[i].map((v,j)=>vecmix(v,nested[j],internal));
    const release=ramp(t,5.25+i*.02,6.62+i*.055);
    if(release>0){
      const angle=-Math.PI/2*release,r=mix(w,outRadii[i],release),hh=mix(h,outRadii[i]*.72,release);
      const centerZ=mix(inZ[i],660,release),centerY=mix(0,-155-(5-i)*16,release);
      const signs=[[-1,1],[1,1],[1,-1],[-1,-1]];
      verts=signs.map(([sx,sy])=>[sx*r,centerY+sy*hh*Math.cos(angle),centerZ+sy*hh*Math.sin(angle)]);
    }
    return {id:`boundary-${i}`,vertices:verts,release,internal,pressure};
  }
  function coreAt(t){
    const ingress=ramp(t,2.2,4.65),p=ramp(t,3.5,5.0),release=ramp(t,5.25,6.75);
    const movement=mix(36,9,p);
    let x=movement*(Math.sin(t*1.65)*.62+Math.sin(t*.8)*.2),y=movement*Math.sin(t*1.22)*.38;
    const contact=ramp(t,4.95,5.38)*(1-ramp(t,5.62,6.48));
    const rightEdge=frameAt(5,t).vertices;
    const contactPoint=vecmix(rightEdge[1],rightEdge[2],.48);
    x=mix(x,contactPoint[0],contact);y=mix(y,contactPoint[1],contact);
    x=mix(x,0,release);y=mix(y,18,release);
    const z=mix(660*ingress,contactPoint[2],contact*(1-release));
    return [x,y,z];
  }
  function sampleAt(i,t){
    const base=pool[i].v,ingress=ramp(t,2.2,4.65),pressure=ramp(t,3.15,5.1),release=ramp(t,5.3,6.75);
    if(i<4){
      const local=[base[0]*mix(1,.43,pressure),-base[1]*mix(1,.43,pressure),base[2]*mix(1,.5,pressure)];
      const expanded=[base[0]*2.8,-base[1]*1.4,660+base[2]*3.7];
      return vecmix([local[0],local[1],660*ingress+local[2]],expanded,release);
    }
    const rank=arrivalRank[i]??(i-4);
    const q=ramp(t,5.86+rank*.035,6.4+rank*.035);
    const final=[base[0]*1.15,base[1]*.65-24,660+base[2]*1.15];
    return vecmix([final[0]*1.65,final[1]+100,final[2]+150],final,q);
  }
  const early=[0,1,2,3];
  const activeNew=Array.from({length:28},(_,i)=>i+4);
  const connectedNew=new Set([4,5,6,7,8,9,10,12,13,15,16,17,18,20,22,24,26]);
  const validTimes=[0,.6,1.4,2.0,2.2,2.6,3.5,4.3,5,5.3,5.6,6,6.5,7.2,7.98];

  // Fixed microscopic paper grain; no animated noise or random particle emitter.
  const grain=document.createElement('canvas');grain.width=128;grain.height=128;
  const gc=grain.getContext('2d'),gd=gc.createImageData(128,128);let seed=881;
  for(let i=0;i<gd.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const a=(seed>>>24);gd.data[i]=gd.data[i+1]=gd.data[i+2]=a;gd.data[i+3]=255;}
  gc.putImageData(gd,0,0);const grainPattern=ctx.createPattern(grain,'repeat');

  function strokeWorld(points,cam,color,alpha,width=1.4,progress=1,dashed=false){
    if(alpha<=0||progress<=0||points.length<2)return;
    const count=(points.length-1)*clamp(progress),whole=Math.floor(count),fraction=count-whole;
    const visible=points.slice(0,whole+1);if(fraction>0&&whole<points.length-1)visible.push(vecmix(points[whole],points[whole+1],fraction));
    ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=clamp(alpha);ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dashed?[6,10]:[]);
    ctx.beginPath();for(let j=0;j<visible.length-1;j++){const clip=clipSegment(visible[j],visible[j+1],cam);if(!clip)continue;ctx.moveTo(clip[0].x,clip[0].y);ctx.lineTo(clip[1].x,clip[1].y);}ctx.stroke();ctx.restore();
  }
  function drawNode(pos,cam,radius,alpha,core=false){
    const p=project(pos,cam);if(p.depth<cam.near||alpha<=0)return;
    const r=clamp(radius*p.factor,core?5:1.5,core?13:5.5),halo=core?r*9:r*5;
    ctx.save();ctx.globalAlpha=clamp(alpha);
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,halo);g.addColorStop(0,'rgba(223,182,116,.25)');g.addColorStop(.3,'rgba(223,182,116,.06)');g.addColorStop(1,'rgba(223,182,116,0)');ctx.fillStyle=g;ctx.fillRect(p.x-halo,p.y-halo,halo*2,halo*2);
    const light=ctx.createRadialGradient(p.x-r*.2,p.y-r*.3,0,p.x,p.y,r);light.addColorStop(0,'#FFF9E8');light.addColorStop(.55,C.white);light.addColorStop(1,C.gold);ctx.fillStyle=light;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function edgePoints(frame,edge,t){
    const a=frame.vertices[edge],b=frame.vertices[(edge+1)%4];
    const center=frame.vertices.reduce((acc,v)=>add(acc,v),[0,0,0]).map(v=>v/4);
    const normal=norm(sub(vecmix(a,b,.5),center));
    const bow=Math.sin(frame.release*Math.PI)*130*(edge===1?1.25:.6);
    return Array.from({length:17},(_,j)=>{
      const s=j/16,v=vecmix(a,b,s),d=bow*Math.sin(Math.PI*s);
      return v.map((p,i)=>p+normal[i]*d);
    });
  }
  function drawBoundary(frame,cam,t){
    const pts=frame.vertices.map(v=>project(v,cam)),depth=pts.reduce((n,p)=>n+p.depth,0)/4;
    const nearFade=smooth((depth-80)/260),formed=ramp(t,.78+Number(frame.id.split('-')[1])*.095,1.95);
    if(nearFade<=0||formed<=0)return;
    const i=Number(frame.id.split('-')[1]);
    const distanceAlpha=clamp(1850/Math.max(depth,350),.65,1);
    const alpha=(i===5?.73:.36)*nearFade*distanceAlpha;
    if(pts.every(p=>p.depth>cam.near)){
      ctx.save();ctx.globalAlpha=(.014+.011*(i===5))*formed*nearFade*(1-frame.release*.4);ctx.fillStyle=C.line;ctx.beginPath();pts.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.restore();
    }
    for(let e=0;e<4;e++){
      const release=frame.release;
      const propagation=(5-i)*.028;
      const open=e===1?mix(1,.10,ramp(t,5.34+propagation,5.84+propagation)):1;
      const retain=release>0?mix(1,e===0||e===2?.30:.9,release):1;
      const points=edgePoints(frame,e,t);
      const edgeProgress=ramp(t,.84+i*.065+e*.12,1.53+i*.065+e*.12);
      strokeWorld(points,cam,C.line,alpha*open*retain,i===5?1.7:1.15,edgeProgress);
      if(i===5&&e===1){
        const warm=ramp(t,5.0,5.26)*(1-ramp(t,5.8,6.2));
        strokeWorld(points,cam,C.gold,alpha*open*retain*warm,1.7,edgeProgress);
      }
      if(release>.02&&(e===0||e===2)){
        // The original edges become paths: same point arrays, not new backdrops.
        strokeWorld(points,cam,e===0&&i%2===0?C.gold:C.dim,(e===0&&i%2===0?.42:.28)*release*nearFade,1.45);
      }
    }
  }
  function background(t,cam){
    ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
    const release=ramp(t,5.25,7.5),g=ctx.createRadialGradient(1000,470,90,960,540,1150);
    g.addColorStop(0,`rgba(35,52,59,${mix(.38,.48,release)})`);g.addColorStop(.65,'rgba(19,30,36,.12)');g.addColorStop(1,'rgba(8,13,18,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // A sparse world-space plane anchors parallax, with no HUD grid annotations.
    const floorAlpha=.035+.018*release;
    for(let i=-4;i<=4;i++){
      strokeWorld([[-1400,-300,660+i*300],[1400,-300,660+i*300]],cam,C.dim,floorAlpha,.8);
      if(i%2===0)strokeWorld([[i*300,-300,-300],[i*300,-300,1700]],cam,C.dim,floorAlpha*.65,.8);
    }
  }
  function drawEarlySamples(t,cam){
    const pressure=ramp(t,2.9,5),release=ramp(t,5.3,6.75);
    early.forEach(i=>drawNode(sampleAt(i,t),cam,3.4,ramp(t,.42+i*.12,.91+i*.12)));
    // The same four experiences recur on successive depth planes.
    if(pressure>0&&release<1){
      for(let layer=1;layer<=4;layer++)early.forEach(i=>{
        const base=sampleAt(i,t),offset=layer*98;
        const pos=[base[0]*(1+layer*.055),base[1]*(1+layer*.04),base[2]+offset];
        drawNode(pos,cam,2.3,.20*pressure*(1-release)*(1-layer*.13));
      });
    }
  }
  function drawExperience(t,cam,core){
    const formed=ramp(t,.7,2.05),pressure=ramp(t,2.3,4.8),release=ramp(t,5.28,6.65);
    const seeds=early.map(i=>sampleAt(i,t));
    // Three freedoms turn at the cognitive boundary as its sides finish closing.
    const maxFree=mix(510,315,formed);
    const possibilities=[[[maxFree,35,core[2]],[maxFree,-78,core[2]+25]], [[-maxFree,125,core[2]+35],[-maxFree,20,core[2]+90]], [[100,220,core[2]+90],[40,220,core[2]+145]]];
    possibilities.forEach((ends,i)=>{
      const progress=ramp(t,.25+i*.15,.85+i*.2);
      const weight=(1-pressure)*mix(.2,.38,formed);
      strokeWorld([core,...ends],cam,C.gold,weight,1.4,progress);
      const count=ramp(t,.65+i*.1,1.9);
      if(t<2.4){const tip=vecmix(core,ends[0],count);drawNode(tip,cam,1.8,.40*progress*(1-pressure));}
    });
    const loop=[core,...seeds,core];
    strokeWorld(loop,cam,C.gold,(.36+.22*pressure)*(1-release),1.7,ramp(t,.55,1.9));
    // Contact is local and restrained: a short lit portion of the inner edge.
    const touch=ramp(t,5.05,5.36)*(1-ramp(t,5.65,6.02));
    if(touch>0){
      const edge=frameAt(5,t).vertices;
      strokeWorld([vecmix(edge[1],edge[2],.2),vecmix(edge[1],edge[2],.5),vecmix(edge[1],edge[2],.8)],cam,C.gold,.66*touch,2.25);
    }
    // Reuse the early samples as entry points into two branches.
    const routes=[[core,seeds[0],sampleAt(6,t),sampleAt(12,t),sampleAt(20,t)], [core,seeds[1],sampleAt(9,t),sampleAt(17,t),sampleAt(24,t)]];
    routes.forEach((route,i)=>strokeWorld(route,cam,i===0?C.gold:C.line,(i===0?.62:.39)*release,1.7,ramp(t,5.75+i*.16,7.38+i*.1)));
    if(release>0){
      const short=[sampleAt(2,t),sampleAt(3,t),sampleAt(5,t)];
      strokeWorld(short,cam,C.line,.30*release,1.05,ramp(t,6.55,7.4));
      const pairs=[[4,8],[7,13],[10,15],[16,22],[18,26]];
      pairs.forEach(([a,b],i)=>strokeWorld([sampleAt(a,t),sampleAt(b,t)],cam,C.dim,.38*release,1.1,ramp(t,6.48+i*.07,7.55+i*.06)));
      // Incomplete attempts terminate before a free sample: no perfect network.
      for(const [a,b] of [[12,14],[20,28],[24,30]]){
        const start=sampleAt(a,t),finish=sampleAt(b,t);
        const incomplete=vecmix(start,finish,.72);
        strokeWorld([start,incomplete],cam,C.line,.26*release,1.05,ramp(t,7.0,7.8),true);
      }
    }
  }
  function write(value,x,y,size,alpha,color=C.white,align='left',serif=false,tracking=2){
    if(alpha<=0)return;
    ctx.save();ctx.globalAlpha=clamp(alpha);ctx.fillStyle=color;ctx.font=`${size}px "${serif?'Noto Serif CJK SC':'Noto Sans CJK SC'}",sans-serif`;ctx.textAlign=align;ctx.textBaseline='alphabetic';
    if('letterSpacing' in ctx)ctx.letterSpacing=tracking+'px';ctx.fillText(value,x,y);ctx.restore();
  }
  function textAt(t,cam){
    const labels=[['内向',[-440,260,-150]],['理性',[460,210,-90]],['不擅长表达',[460,-160,-100]]];
    labels.forEach(([label,pos],i)=>{
      const alpha=ramp(t,.6+i*.16,1.0+i*.16)*(1-ramp(t,2.15,2.65));
      const anchor=front[i];
      strokeWorld([pos,anchor],cam,C.line,alpha*.35,1,ramp(t,.74+i*.15,1.2+i*.15));
      const p=project(pos,cam);if(p.depth>100)write(label,p.x,p.y,28,alpha*.72,C.line);
    });
    const title=ramp(t,1.15,1.78)*(1-ramp(t,2.25,2.7));
    write('别急着定义自己',128,151+12*(1-title),60,title,C.white,'left',true,3);
    const inward=ramp(t,2.9,3.3)*(1-ramp(t,4.75,5.12));
    write('向内探索',128,151,50,inward,C.white,'left',true,3);
    write('同一组经历，反复回看。',960,961,34,inward*.9,C.line,'center',false,2);
    const outward=ramp(t,6.35,6.85);
    write('向外探索',128,151,50,outward,C.white,'left',true,3);
    write('经历变多，不等于理解自动发生。',960,961,38,outward,C.white,'center',false,1.8);
  }

  function getFrameState(time){
    const t=clamp(Number(time)||0,0,8),cam=cameraAt(t),core=coreAt(t);
    const boundaries=Array.from({length:6},(_,i)=>frameAt(i,t));
    const samples=pool.map((sample,i)=>{
      const rank=arrivalRank[i]??(i-4);
      return {id:`sample-${i}`,position:sampleAt(i,t),visible:i<4?ramp(t,.42+i*.12,.91+i*.12):i<32?ramp(t,5.86+rank*.035,6.4+rank*.035):0,connected:i<4||connectedNew.has(i)};
    });
    return {t,camera:cam,core:{id:'self-core',position:core,screen:project(core,cam)},boundaries,samples,stage:t<2.2?'opening':t<5.25?'inward':'outward',visibleNew:samples.slice(4).filter(s=>s.visible>.9).length,unconnectedNew:samples.slice(4).filter(s=>s.visible>.9&&!s.connected).length};
  }
  function renderFrame(time){
    const state=getFrameState(time),{t,camera:cam}=state;
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.setLineDash([]);background(t,cam);
    const sorted=state.boundaries.slice().sort((a,b)=>view(b.vertices[0],cam)[2]-view(a.vertices[0],cam)[2]);
    sorted.forEach(f=>drawBoundary(f,cam,t));
    drawExperience(t,cam,state.core.position);drawEarlySamples(t,cam);
    activeNew.forEach(i=>{
      const s=state.samples[i];
      if(s.connected){drawNode(s.position,cam,i%7===0?4.5:2.8,s.visible*.74);}
      else {
        // Unintegrated experiences remain hollow and detached, not another
        // completed graph link. This is semantic, not a decorative ring.
        const p=project(s.position,cam);
        if(p.depth>cam.near&&s.visible>0){
          ctx.save();ctx.globalAlpha=s.visible*.55;ctx.strokeStyle=C.gold;ctx.lineWidth=1.15;
          ctx.beginPath();ctx.arc(p.x,p.y,clamp(4.2*p.factor,2.3,5),.30,Math.PI*1.92);ctx.stroke();ctx.restore();
        }
      }
    });
    const life=1+.055*Math.sin(t*2.5),alpha=.30+.7*ramp(t,.05,.65);
    drawNode(state.core.position,cam,7.5*life,alpha,true);
    // Reserve a quiet subtitle region without introducing a UI panel.
    const footerShade=ctx.createLinearGradient(0,815,0,1080);
    footerShade.addColorStop(0,'rgba(8,13,18,0)');footerShade.addColorStop(.55,'rgba(8,13,18,.55)');footerShade.addColorStop(1,'rgba(8,13,18,.94)');
    ctx.fillStyle=footerShade;ctx.fillRect(0,815,W,265);
    ctx.save();ctx.globalAlpha=.017;ctx.fillStyle=grainPattern;ctx.fillRect(0,0,W,H);ctx.restore();
    const vignette=ctx.createRadialGradient(960,510,360,960,540,1160);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.40)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    textAt(t,cam);return state;
  }
  window.renderFrame=renderFrame;window.getFrameState=getFrameState;window.motionDuration=8;window.reviewTimes=validTimes;
  const renderMode=new URLSearchParams(location.search).has('render');
  if(renderMode)document.documentElement.classList.add('render-mode');
  let running=false,current=0,previous=null;
  const play=document.querySelector('#play'),seek=document.querySelector('#seek'),clock=document.querySelector('#clock');
  const sync=()=>{seek.value=current;clock.textContent=current.toFixed(2)+' / 8.00';play.textContent=running?'暂停':'播放';};
  window.pauseAnimation=()=>{running=false;sync();};
  play.addEventListener('click',()=>{if(current>=8)current=0;running=!running;previous=null;sync();});
  document.querySelector('#restart').addEventListener('click',()=>{current=0;previous=null;running=true;renderFrame(current);sync();});
  seek.addEventListener('input',()=>{running=false;current=Number(seek.value);renderFrame(current);sync();});
  function tick(now){if(running&&!renderMode&&previous!==null){current=clamp(current+(now-previous)/1000,0,8);if(current>=8)running=false;renderFrame(current);sync();}previous=now;requestAnimationFrame(tick);}
  renderFrame(0);if(!renderMode)requestAnimationFrame(tick);sync();
})();
