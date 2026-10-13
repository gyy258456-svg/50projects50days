import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Static design only. All three states reuse object IDs, vertices and samples.
// Later motion should interpolate this model, not dissolve these PNGs.
const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'exports');
mkdirSync(OUT, { recursive: true });
const C = { bg:'#080D12', line:'#B5CCD2', gold:'#DFB674', white:'#E8ECE8', dim:'#607C89' };
const n = v => Number(v.toFixed(2));
const lerp = (a,b,t) => a+(b-a)*t;
const esc = str => String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const P = ([x,y,z], camera) => [n(camera.x + camera.scale*(.91*x+.43*z)),n(camera.y + camera.scale*(.94*y+.14*x-.34*z))];
const pts = vertices => vertices.map(v=>v.join(',')).join(' ');
const path = points => `M ${points.map(v=>v.join(' ')).join(' L ')}`;
const poly = (id,vertices,stroke,opacity=.6,fill='none',width=1.6) => `<polygon id="${id}" points="${pts(vertices)}" fill="${fill}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
const text = (x,y,value,size=26,fill=C.white,extra='') => `<text x="${n(x)}" y="${n(y)}" font-size="${size}" fill="${fill}" ${extra}>${esc(value)}</text>`;

let seed=905;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const stars = Array.from({length:430},()=>({x:random()*1920,y:100+random()*790,r:.5+random()*1.2,a:.05+random()*.16}));
// Four fixed early samples, followed by a fixed set of new experiences.
const samples = [
 {id:0,v:[-95,-32,-35]}, {id:1,v:[56,-54,12]},
 {id:2,v:[38,64,-18]}, {id:3,v:[-47,48,52]},
 ...Array.from({length:44},(_,i)=>{
   const angle=(i*2.399963);const radius=245+Math.sqrt((i+1)/44)*650;
   return {id:i+4,v:[Math.cos(angle)*radius,(random()-.5)*190,Math.sin(angle)*radius*.82]};
 })
];
const states=[
 {name:'01-opening',title:'别急着定义自己',caption:'一个标签，装不下所有可能。',mode:'opening',camera:{x:1020,y:528,scale:1.27}},
 {name:'02-inward',title:'向内，看到多少？',caption:'层层深入，也可能只是有限经验的回声。',mode:'inward',camera:{x:1010,y:525,scale:1.4}},
 {name:'03-outward',title:'向外，理解了吗？',caption:'经历变多，不等于理解自动发生。',mode:'outward',camera:{x:990,y:555,scale:.83}}
];

function defs(){return `<defs>
 <radialGradient id="space"><stop offset="0" stop-color="#1B2930"/><stop offset=".5" stop-color="#101A20"/><stop offset="1" stop-color="${C.bg}"/></radialGradient>
 <radialGradient id="halo"><stop offset="0" stop-color="${C.gold}" stop-opacity=".30"/><stop offset=".28" stop-color="${C.gold}" stop-opacity=".07"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
 <radialGradient id="core"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#FFF4D8"/><stop offset=".75" stop-color="${C.gold}"/><stop offset="1" stop-color="#846035"/></radialGradient>
 <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#B4DBE5" stop-opacity=".045"/><stop offset=".5" stop-color="#658B9A" stop-opacity=".008"/><stop offset="1" stop-color="#AACFD8" stop-opacity=".065"/></linearGradient>
 <linearGradient id="lightEdge"><stop stop-color="${C.dim}" stop-opacity=".15"/><stop offset=".5" stop-color="${C.line}" stop-opacity=".8"/><stop offset="1" stop-color="${C.dim}" stop-opacity=".2"/></linearGradient>
 <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${C.dim}" stop-opacity="0"/><stop offset=".5" stop-color="${C.dim}" stop-opacity=".08"/><stop offset="1" stop-color="${C.dim}" stop-opacity="0"/></linearGradient>
 <filter id="softGlow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="7"/></filter>
 <filter id="tinyGlow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.5"/></filter>
 <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".68" numOctaves="3" seed="8" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
 <radialGradient id="vignette"><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".47"/></radialGradient>
 </defs>`;}

function glowNode(id,x,y,r=4,alpha=1,core=false){
 return `<g id="${id}" opacity="${alpha}">
 <circle cx="${x}" cy="${y}" r="${core?95:22}" fill="url(#halo)"/>
 <circle cx="${x}" cy="${y}" r="${r*2}" fill="${C.gold}" opacity=".42" filter="url(#softGlow)"/>
 <circle cx="${x}" cy="${y}" r="${r}" fill="url(#core)"/>
 ${core?`<circle cx="${x}" cy="${y}" r="${r+9}" stroke="${C.gold}" stroke-opacity=".28" stroke-width=".8" fill="none"/>`:''}</g>`;
}

function background(camera){
 let s=`<rect width="1920" height="1080" fill="${C.bg}"/><ellipse cx="1020" cy="515" rx="1110" ry="670" fill="url(#space)"/>`;
 s+=`<g id="ambient-particles">${stars.map(p=>`<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.r)}" fill="${C.line}" opacity="${n(p.a)}"/>`).join('')}</g>`;
 s+='<g id="depth-grid" stroke="'+C.dim+'" fill="none" stroke-width=".8">';
 for(let j=-6;j<=6;j++){
  const a=P([-1200,270,j*180],camera),b=P([1200,270,j*180],camera);
  s+=`<path d="${path([a,b])}" opacity=".10"/>`;
  const c=P([j*180,270,-1200],camera),d=P([j*180,270,1200],camera);
  s+=`<path d="${path([c,d])}" opacity=".10"/>`;
 }
 return s+'</g>';
}

function planeVertices(halfWidth,halfHeight,z){return [[-halfWidth,-halfHeight,z],[halfWidth,-halfHeight,z],[halfWidth,halfHeight,z],[-halfWidth,halfHeight,z]];}
function frame(id,world,camera,alpha=.6,fill='url(#glass)',accent=false){
 const vertices=world.map(v=>P(v,camera));
 let s=poly(id,vertices,C.line,alpha,fill);
 // Precise short corner ticks provide a shared information-space language.
 s+=`<g id="${id}-corners" stroke="${accent?C.gold:C.line}" stroke-opacity="${alpha}" stroke-width="2.3" fill="none">`;
 vertices.forEach((v,i)=>{
  const next=vertices[(i+1)%4],prev=vertices[(i+3)%4];
  const to=(q)=>{const len=Math.hypot(q[0]-v[0],q[1]-v[1]);return [n(lerp(v[0],q[0],Math.min(1,22/len))),n(lerp(v[1],q[1],Math.min(1,22/len)))];};
  s+=`<path d="${path([to(prev),v,to(next)])}"/>`;
 });
 return s+'</g>';
}

function opening(camera){
 let s='<g id="cognitive-system">';
 const front=planeVertices(330,212,-155),back=planeVertices(330,212,210);
 // Four translucent sides + two boundary slices = the same 6 boundary objects.
 for(let i=0;i<4;i++)s+=frame(`boundary-${i}`,[front[i],front[(i+1)%4],back[(i+1)%4],back[i]],camera,.24,'url(#glass)');
 s+=frame('boundary-4',back,camera,.23,'none');
 s+=frame('boundary-5',front,camera,.8,'url(#glass)',true);
 const core=P([0,20,0],camera);
 const samplePoints=samples.slice(0,4).map(a=>P(a.v,camera));
 let trace=[P([-560,20,-20],camera),P([-330,20,-20],camera),core,...samplePoints.slice(0,3)];
 s+=`<path id="experience-path" d="${path(trace)}" fill="none" stroke="${C.gold}" stroke-opacity=".48" stroke-width="1.5"/>`;
 s+=`<path d="${path(trace)}" fill="none" stroke="${C.gold}" stroke-opacity=".18" stroke-width="5" filter="url(#tinyGlow)"/>`;
 samples.forEach((a,i)=>{const p=P(a.v,camera);s+=glowNode(`sample-${a.id}`,p[0],p[1],i<4?3.5:2,i<4?.55:0);});
 s+=glowNode('self-core',core[0],core[1],10,1,true);
 // A faint reflection anchors the point in space rather than on a UI card.
 s+=`<ellipse cx="${core[0]}" cy="${core[1]+225}" rx="70" ry="9" fill="${C.gold}" opacity=".03" filter="url(#softGlow)"/>`;
 const labels=[{t:'内向',p:P([-330,-212,-155],camera),x:430,y:280},{t:'理性',p:P([330,-212,-155],camera),x:1510,y:345},{t:'不擅长表达',p:P([330,212,-155],camera),x:1460,y:795}];
 s+='<g id="identity-labels">';
 labels.forEach((l,i)=>{
  const tx=l.x,ty=l.y;
  s+=`<path d="${path([[tx,ty+18],[tx+90,ty+18],l.p])}" stroke="${C.dim}" stroke-opacity=".5" fill="none" stroke-width="1"/>`;
  s+=text(tx,ty,l.t,28,C.line,'letter-spacing="4"');
  s+=`<path d="M ${tx} ${ty+28} h ${i===2?175:76}" stroke="${C.gold}" stroke-opacity=".52" stroke-width="1.5"/>`;
 });
 return s+'</g></g>';
}

function inward(camera){
 let s='<g id="cognitive-system">';
 const sizes=[410,330,260,202,151,99];
 // Nested slices, not a pictorial corridor: the field and information shrink.
 const frames=sizes.map((r,i)=>planeVertices(r,r*.64,(-170+i*52)));
 frames.forEach((verts,i)=>{s+=frame(`boundary-${i}`,verts,camera,.15+i*.105,'url(#glass)',i===5);});
 // Four trajectories converge onto the smallest field.
 for(let corner=0;corner<4;corner++){
  const p=frames.map(v=>P(v[corner],camera));
  s+=`<path d="${path(p)}" stroke="${C.dim}" stroke-opacity=".28" fill="none" stroke-width="1"/>`;
 }
 const core=P([0,20,0],camera);
 const visible=samples.slice(0,4).map(a=>({id:a.id,v:a.v.map((v,i)=>i===2?v*.55:v*.56)}));
 const points=visible.map(a=>P(a.v,camera));
 s+=`<path id="experience-path" d="${path([core,...points,core])}" fill="none" stroke="${C.gold}" stroke-opacity=".8" stroke-width="1.8"/>`;
 s+=`<path d="${path([core,...points,core])}" fill="none" stroke="${C.gold}" stroke-opacity=".2" stroke-width="5" filter="url(#tinyGlow)"/>`;
 samples.forEach((a,i)=>{const v=i<4?visible[i].v:a.v;const p=P(v,camera);s+=glowNode(`sample-${a.id}`,p[0],p[1],3.5,i<4?.88:0);});
 // Mirrors are duplicated samples, not new IDs or evidence.
 for(let layer=0;layer<4;layer++){
  const offset=layer*40+65;
  s+=`<g id="sample-echo-${layer}" opacity="${.17-layer*.03}">`;
  visible.forEach(a=>{const p=P([a.v[0]*(1.4+layer*.32),a.v[1]*(1.4+layer*.32),offset],camera);s+=`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${C.line}"/>`;});
  s+='</g>';
 }
 s+=glowNode('self-core',core[0],core[1],10,1,true);
 // Off-axis bracket clarifies that the observable field is small.
 const l=P([-99,63,90],camera),r=P([99,63,90],camera);
 s+=`<path d="${path([[l[0],l[1]+40],[l[0],l[1]+60],[r[0],r[1]+60],[r[0],r[1]+40]])}" stroke="${C.gold}" stroke-opacity=".5" fill="none" stroke-width="1"/>`;
 s+=text(1330,310,'同一组经历',28,C.line,'letter-spacing="3"');
 s+=text(1330,351,'重复 ≠ 更多样本',23,C.line,'opacity=".78"');
 s+=`<path d="${path([[1325,367],[1220,367],points[1]])}" stroke="${C.dim}" stroke-opacity=".46" fill="none" stroke-width="1"/>`;
 s+=text(630,803,'可见范围',26,C.gold,'letter-spacing="3"');
 const fieldBracket=[n((l[0]+r[0])/2),n((l[1]+r[1])/2+60)];
 s+=`<path d="${path([[635,820],[735,820],fieldBracket])}" stroke="${C.dim}" stroke-opacity=".55" fill="none" stroke-width="1"/>`;
 return s+'</g>';
}

function outward(camera){
 let s='<g id="cognitive-system">';
 // The original six frames rotate into six expanding world/sample planes.
 const floors=Array.from({length:6},(_,i)=>{
   const r=190+i*130,y=95+i*20;
   return [[-r,y,-r*.78],[r,y,-r*.78],[r,y,r*.78],[-r,y,r*.78]];
 });
 floors.slice().reverse().forEach((verts,j)=>{const i=5-j;s+=frame(`boundary-${i}`,verts,camera,.12+(5-i)*.045,i===0?'url(#glass)':'none',i===0);});
 // Network is structured by distance, not a random decorative spaghetti.
 const nodes=samples.map(a=>({...a,p:P(a.v,camera)}));
 s+='<g id="sample-network" stroke="'+C.line+'" fill="none" stroke-width="1">';
 const edges=[];
 nodes.forEach((a,i)=>{
  if(i<4)return;
  const near=nodes.map((b,j)=>({b,j,d:Math.hypot(a.v[0]-b.v[0],a.v[2]-b.v[2])})).filter(b=>b.j!==i).sort((a,b)=>a.d-b.d).slice(0,2);
  near.forEach(({b,j})=>{
   const key=[i,j].sort((a,b)=>a-b).join('-');if(edges.includes(key))return;edges.push(key);
   s+=`<path d="${path([a.p,b.p])}" stroke-opacity="${i%5===0?.28:.12}" ${i%5===0?'stroke-dasharray="4 9"':''}/>`;
  });
 });
 s+='</g>';
 // Retain the original early nodes around the observer.
 const core=P([0,20,0],camera);
 const route=[core,nodes[0].p,nodes[1].p,nodes[4].p,nodes[12].p,nodes[20].p];
 s+=`<path id="experience-path" d="${path(route)}" fill="none" stroke="${C.gold}" stroke-opacity=".65" stroke-width="2"/>`;
 s+=`<path d="${path(route)}" fill="none" stroke="${C.gold}" stroke-opacity=".17" stroke-width="5" filter="url(#tinyGlow)"/>`;
 // Secondary paths branch, then end before being explained/connected.
 for(const index of [8,16,28,36]){
  const p=nodes[index].p;
  const mid=[n((p[0]+core[0])/2),n(Math.min(p[1],core[1])-100-index*.7)];
  s+=`<path id="branch-${index}" d="M ${core.join(' ')} Q ${mid.join(' ')} ${p.join(' ')}" fill="none" stroke="${C.line}" stroke-opacity=".3" stroke-width="1.25"/>`;
 }
 nodes.forEach((a,i)=>{s+=glowNode(`sample-${a.id}`,a.p[0],a.p[1],i<4?3.8:i%7===0?5.2:2.5,i<4?.7:i%7===0?1:.42);});
 for(const i of [11,25,43]){
  const p=nodes[i].p;s+=`<circle cx="${p[0]}" cy="${p[1]}" r="17" fill="${C.bg}" fill-opacity=".55" stroke="${C.line}" stroke-opacity=".85" stroke-width="1.7" stroke-dasharray="20 15"/>`;
 }
 s+=glowNode('self-core',core[0],core[1],10,1,true);
 const observed=nodes[20].p;
 s+=text(1350,292,'新的经历',28,C.gold,'letter-spacing="3"');
 s+=`<path d="${path([[1355,313],[1400,350],observed])}" fill="none" stroke="${C.gold}" stroke-opacity=".32" stroke-width="1"/>`;
 s+=text(390,784,'还未建立的理解',28,C.line,'letter-spacing="3"');
 const unresolved=nodes[11].p;
 s+=`<path d="${path([[615,773],[646,738],unresolved])}" fill="none" stroke="${C.line}" stroke-opacity=".5" stroke-width="1" stroke-dasharray="3 6"/>`;
 return s+'</g>';
}

function svg(state){
 let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" role="img" aria-labelledby="frame-title frame-description"><title id="frame-title">${state.title}</title><desc id="frame-description">${state.caption} 抽象信息空间静态关键画面。</desc>${defs()}<g font-family="Noto Sans CJK SC, sans-serif">${background(state.camera)}`;
 s+=({opening,inward,outward}[state.mode])(state.camera);
 s+=`<rect width="1920" height="1080" fill="url(#vignette)" pointer-events="none"/><rect width="1920" height="1080" opacity=".026" filter="url(#grain)" pointer-events="none"/>`;
 s+=text(130,128,state.title,46,C.white,'font-family="Noto Serif CJK SC, serif" letter-spacing="5"');
 s+=text(130,169,'认知的边界 · '+({opening:'形成',inward:'收缩',outward:'展开'}[state.mode]),21,C.line,'letter-spacing="3" opacity=".7"');
 s+=`<path d="M 130 192 h 80" stroke="${C.gold}" stroke-opacity=".5" stroke-width="1"/>`;
 s+=text(960,972,state.caption,36,C.white,'text-anchor="middle" letter-spacing="2"');
 s+=`<path d="M 921 1010 h 78" stroke="${C.dim}" stroke-opacity=".5"/>`;
 s+=text(1780,128,'别急着定义自己',18,C.dim,'text-anchor="end" letter-spacing="2"');
 return s+'</g></svg>';
}

const manifest=states.map(state=>{
 const source=svg(state);writeFileSync(join(OUT,state.name+'.svg'),source);
 return {name:state.name,title:state.title,width:1920,height:1080,mode:state.mode,camera:state.camera,ids:['self-core','experience-path',...Array.from({length:6},(_,i)=>`boundary-${i}`),...samples.map(a=>`sample-${a.id}`)]};
});
writeFileSync(join(OUT,'manifest.json'),JSON.stringify({stage:'static-keyframe-design',animated:false,palette:C,frames:manifest,samples},null,2));
writeFileSync(join(ROOT,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>别急着定义自己 · V2关键画面</title><style>body{margin:0;background:#080D12;color:#E8ECE8;font:16px system-ui}main{max-width:1440px;margin:40px auto;padding:0 24px}h1{font-size:24px;font-weight:500}p{color:#93a8af}img{width:100%;display:block}figure{margin:32px 0}figcaption{padding:16px 0;color:#b5ccd2}a{color:#dfb674}</style><main><h1>《别急着定义自己》 · 三个静态关键画面</h1><p>本阶段没有动画。图片均来自共享的程序化图形结构，供确认视觉方向。</p>${states.map((s,i)=>`<figure><img src="exports/${s.name}.png" alt="${s.caption}"><figcaption>${i+1} · ${s.title}　<a href="exports/${s.name}.png" download>下载 PNG</a></figcaption></figure>`).join('')}<a href="exports/overview.png" download>下载三图并排总览</a></main></html>`);
console.log('Generated 3 SVG source frames, shared scene manifest, and static review page.');
