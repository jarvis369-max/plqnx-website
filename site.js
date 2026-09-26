(()=>{"use strict";
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;

/* Navigation and reveal */
const menu=document.querySelector(".menu"),links=document.querySelector(".links");
if(menu&&links){
  menu.addEventListener("click",()=>{const o=links.classList.toggle("open");menu.setAttribute("aria-expanded",String(o));menu.textContent=o?"✕":"☰"});
  links.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>links.classList.remove("open")));
}
document.querySelectorAll("[data-year]").forEach(n=>n.textContent=new Date().getFullYear());
if(!reduce&&"IntersectionObserver"in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.08,rootMargin:"0px 0px -5% 0px"});
  document.querySelectorAll(".card,.panel,.step,.section h2,.section-intro,.hero-dashboard,.pagehero>*").forEach(el=>{el.classList.add("reveal");io.observe(el)});
}

/* Loader */
const style=document.createElement("style");
style.textContent=`
.plqnx-loader{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:radial-gradient(circle at 50% 48%,rgba(240,146,86,.16),transparent 31%),#fff7f0;transition:opacity .65s cubic-bezier(.16,1,.3,1),visibility .65s}
.plqnx-loader.hide{opacity:0;visibility:hidden;pointer-events:none}
.plqnx-loader-core{position:relative;width:220px;height:220px;display:grid;place-items:center}
.plqnx-loader-ring{position:absolute;width:168px;height:168px;border-radius:50%;border:1px solid rgba(211,132,79,.18);border-top-color:#df7d43;box-shadow:0 0 45px rgba(226,126,66,.16);animation:plqnxSpin 3.2s linear infinite}
.plqnx-loader-gear{position:absolute;border:2px solid rgba(186,101,53,.72);border-radius:50%;box-shadow:inset 0 0 0 7px rgba(238,144,83,.06),0 0 20px rgba(213,118,59,.12)}
.plqnx-loader-gear:after{content:"";position:absolute;inset:22%;border:2px solid rgba(202,125,75,.45);border-radius:50%}
.plqnx-loader-gear.a{width:78px;height:78px;left:34px;top:72px;animation:plqnxSpin 4s linear infinite}
.plqnx-loader-gear.b{width:55px;height:55px;left:103px;top:48px;animation:plqnxSpinR 3s linear infinite}
.plqnx-loader-gear.c{width:89px;height:89px;right:24px;top:93px;animation:plqnxSpin 5s linear infinite}
.plqnx-loader-copy{position:absolute;top:185px;width:280px;text-align:center;color:#9a725c;font:700 10px/1.5 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}
.plqnx-loader-copy b{display:block;color:#b96435;font-size:12px;margin-bottom:4px}
.plqnx-progress{position:absolute;top:226px;width:180px;height:2px;background:rgba(205,130,80,.13);overflow:hidden;border-radius:4px}
.plqnx-progress:after{content:"";display:block;height:100%;width:42%;background:linear-gradient(90deg,transparent,#df7d43,#ffc89f,transparent);animation:plqnxLoad 1.25s ease-in-out infinite}
.plqnx-machine-layer{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.plqnx-machine-layer canvas{display:block;width:100%;height:100%}
body>header,body>main,body>footer,.app{position:relative;z-index:2}
@keyframes plqnxSpin{to{transform:rotate(360deg)}}@keyframes plqnxSpinR{to{transform:rotate(-360deg)}}@keyframes plqnxLoad{from{transform:translateX(-130%)}to{transform:translateX(330%)}}
@media(max-width:720px){.plqnx-machine-layer{opacity:.55}}
@media(prefers-reduced-motion:reduce){.plqnx-loader-ring,.plqnx-loader-gear,.plqnx-progress:after{animation:none!important}.plqnx-machine-layer{display:none}}
`;
document.head.appendChild(style);

const loader=document.createElement("div");
loader.className="plqnx-loader";
loader.setAttribute("aria-hidden","true");
loader.innerHTML='<div class="plqnx-loader-core"><div class="plqnx-loader-ring"></div><div class="plqnx-loader-gear a"></div><div class="plqnx-loader-gear b"></div><div class="plqnx-loader-gear c"></div><div class="plqnx-loader-copy"><b>PLQNX CORE</b>Initializing receivables workspace</div><div class="plqnx-progress"></div></div>';
document.body.appendChild(loader);
const dismiss=()=>setTimeout(()=>loader.classList.add("hide"),430);
if(document.readyState==="complete")dismiss();else addEventListener("load",dismiss,{once:true});
setTimeout(()=>loader.classList.add("hide"),1800);

if(reduce)return;

/* Tear-open industrial background */
const layer=document.createElement("div");
layer.className="plqnx-machine-layer";
const canvas=document.createElement("canvas");
layer.appendChild(canvas);
document.body.prepend(layer);
const ctx=canvas.getContext("2d",{alpha:true});
let W=innerWidth,H=innerHeight,D=Math.min(devicePixelRatio||1,1.5);
let pointer={x:W*.72,y:H*.32,tx:W*.72,ty:H*.32,active:false,r:0,tr:0};
function resize(){
  W=innerWidth;H=innerHeight;D=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.floor(W*D);canvas.height=Math.floor(H*D);
  canvas.style.width=W+"px";canvas.style.height=H+"px";
  ctx.setTransform(D,0,0,D,0,0);
}
resize();addEventListener("resize",resize,{passive:true});
addEventListener("pointermove",e=>{pointer.tx=e.clientX;pointer.ty=e.clientY;pointer.active=true;pointer.tr=Math.min(250,Math.max(150,W*.12))},{passive:true});
addEventListener("pointerleave",()=>{pointer.active=false;pointer.tr=0},{passive:true});

const gears=[
 {x:.08,y:.22,r:74,t:18,s:.0033,a:.1},{x:.20,y:.14,r:45,t:14,s:-.0051,a:.8},
 {x:.33,y:.28,r:96,t:22,s:.0025,a:1.1},{x:.49,y:.17,r:59,t:16,s:-.0041,a:.3},
 {x:.65,y:.31,r:113,t:24,s:.0020,a:.9},{x:.81,y:.18,r:54,t:15,s:-.0049,a:.5},
 {x:.92,y:.38,r:83,t:19,s:.0030,a:1.7},{x:.17,y:.74,r:104,t:22,s:-.0022,a:1.4},
 {x:.42,y:.79,r:62,t:16,s:.0040,a:.6},{x:.71,y:.73,r:91,t:20,s:-.0028,a:1.2},
 {x:.90,y:.79,r:49,t:14,s:.0051,a:.2}
];
const rods=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[7,8],[8,9],[9,10],[2,8],[4,9]];

function gearPos(g){return{x:g.x*W,y:g.y*H}}
function drawGear(g){
  const p=gearPos(g),r=Math.min(g.r,Math.max(30,W*.07));
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(g.a);
  ctx.strokeStyle="rgba(105,71,50,.44)";ctx.lineWidth=1.6;
  for(let i=0;i<g.t;i++){const a=i*Math.PI*2/g.t;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(r*.9,0);ctx.lineTo(r*1.09,0);ctx.stroke();ctx.restore()}
  const metal=ctx.createRadialGradient(-r*.28,-r*.28,r*.08,0,0,r);
  metal.addColorStop(0,"#efe7df");metal.addColorStop(.38,"#b7ada6");metal.addColorStop(.7,"#736962");metal.addColorStop(1,"#4c4540");
  ctx.fillStyle=metal;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(61,49,41,.75)";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#3f3935";ctx.beginPath();ctx.arc(0,0,r*.69,0,Math.PI*2);ctx.fill();
  for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.fillStyle="#8d837b";ctx.fillRect(r*.18,-r*.065,r*.48,r*.13);ctx.restore()}
  const hub=ctx.createRadialGradient(-r*.04,-r*.04,2,0,0,r*.2);hub.addColorStop(0,"#d9d2cc");hub.addColorStop(1,"#5b534d");
  ctx.fillStyle=hub;ctx.beginPath();ctx.arc(0,0,r*.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#2e2a27";ctx.beginPath();ctx.arc(0,0,r*.075,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawRod(a,b){
  const p1=gearPos(gears[a]),p2=gearPos(gears[b]);
  ctx.strokeStyle="rgba(78,67,60,.34)";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
  ctx.strokeStyle="rgba(230,218,206,.23)";ctx.lineWidth=1.2;ctx.stroke();
}
function piston(x,y,len,phase,t){
  const off=Math.sin(t*.0024+phase)*24;
  ctx.save();ctx.translate(x,y);
  const rail=ctx.createLinearGradient(-len/2,0,len/2,0);rail.addColorStop(0,"#675f59");rail.addColorStop(.5,"#c9c1ba");rail.addColorStop(1,"#675f59");
  ctx.strokeStyle=rail;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(len/2,0);ctx.stroke();
  ctx.strokeStyle="rgba(83,72,65,.7)";ctx.lineWidth=1;ctx.strokeRect(-len/2-12,-19,len+24,38);
  const pgrad=ctx.createLinearGradient(off-28,0,off+28,0);pgrad.addColorStop(0,"#5f5751");pgrad.addColorStop(.5,"#d8d0c9");pgrad.addColorStop(1,"#665e57");
  ctx.fillStyle=pgrad;ctx.fillRect(off-29,-16,58,32);ctx.strokeStyle="#524a45";ctx.strokeRect(off-29,-16,58,32);
  ctx.restore();
}
function tearPath(cx,cy,r,t){
  const pts=34;
  ctx.beginPath();
  for(let i=0;i<=pts;i++){
    const a=i/pts*Math.PI*2;
    const wobble=Math.sin(i*2.17+t*.002)*9+Math.sin(i*4.31+t*.0013)*5+((i%2)?5:-4);
    const rr=r+wobble;
    const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.78;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();
}
function frame(t){
  pointer.x+=(pointer.tx-pointer.x)*.07;pointer.y+=(pointer.ty-pointer.y)*.07;
  pointer.r+=(pointer.tr-pointer.r)*.09;
  ctx.clearRect(0,0,W,H);

  /* Warm paper surface */
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"rgba(255,250,245,.72)");bg.addColorStop(1,"rgba(255,244,235,.78)");
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  if(pointer.r>8){
    ctx.save();
    tearPath(pointer.x,pointer.y,pointer.r,t);
    ctx.clip();

    /* dark machine cavity */
    const cavity=ctx.createRadialGradient(pointer.x,pointer.y,20,pointer.x,pointer.y,pointer.r*1.2);
    cavity.addColorStop(0,"#29231f");cavity.addColorStop(.65,"#1d1916");cavity.addColorStop(1,"#15120f");
    ctx.fillStyle=cavity;ctx.fillRect(pointer.x-pointer.r*1.2,pointer.y-pointer.r,pointer.r*2.4,pointer.r*2);

    rods.forEach(v=>drawRod(v[0],v[1]));
    piston(W*.27,H*.51,Math.min(230,W*.22),0,t);
    piston(W*.66,H*.57,Math.min(270,W*.24),1.8,t);
    piston(W*.86,H*.52,Math.min(190,W*.18),3.2,t);
    gears.forEach(g=>{g.a+=g.s;drawGear(g)});
    ctx.restore();

    /* torn paper rim */
    ctx.save();
    tearPath(pointer.x,pointer.y,pointer.r,t);
    ctx.strokeStyle="rgba(114,73,47,.22)";ctx.lineWidth=14;ctx.shadowColor="rgba(78,43,24,.16)";ctx.shadowBlur=16;ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle="rgba(255,255,255,.9)";ctx.lineWidth=5;ctx.stroke();
    ctx.strokeStyle="rgba(199,124,75,.26)";ctx.lineWidth=1.5;ctx.stroke();
    ctx.restore();

    /* curled paper shards */
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2 + Math.sin(i*1.73)*.12;
      const rr=pointer.r+10;
      const x=pointer.x+Math.cos(a)*rr,y=pointer.y+Math.sin(a)*rr*.78;
      ctx.save();ctx.translate(x,y);ctx.rotate(a);
      const len=18+((i*13)%20);
      const g=ctx.createLinearGradient(0,0,len,0);g.addColorStop(0,"rgba(255,250,246,.96)");g.addColorStop(1,"rgba(235,187,153,.7)");
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-5);ctx.quadraticCurveTo(len*.55,-11,len,0);ctx.quadraticCurveTo(len*.5,8,0,5);ctx.closePath();ctx.fill();
      ctx.restore();
    }
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();