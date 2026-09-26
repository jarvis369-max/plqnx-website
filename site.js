(()=>{"use strict";
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;

/* Navigation + reveal */
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

/* Calm industrial loading */
const style=document.createElement("style");
style.textContent=`
.plqnx-loader{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:radial-gradient(circle at 50% 48%,rgba(240,146,86,.12),transparent 31%),#fff8f2;transition:opacity .55s cubic-bezier(.16,1,.3,1),visibility .55s}
.plqnx-loader.hide{opacity:0;visibility:hidden;pointer-events:none}
.plqnx-loader-core{position:relative;width:200px;height:200px;display:grid;place-items:center}
.plqnx-loader-disc{position:absolute;width:126px;height:126px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4ede7 0%,#c4b8af 36%,#8c817a 68%,#5f5751 100%);box-shadow:inset 0 0 0 9px #7a7069,inset 0 0 0 11px #c7bdb5,0 18px 36px rgba(115,74,45,.12);animation:plqnxSpin 4.8s linear infinite}
.plqnx-loader-disc:before{content:"";position:absolute;inset:32px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#dad2cc,#6c625c 72%);box-shadow:inset 0 0 0 3px #4e4742}
.plqnx-loader-disc:after{content:"";position:absolute;inset:53px;border-radius:50%;background:#463f3a;box-shadow:0 0 0 4px #aaa098}
.plqnx-loader-orbit{position:absolute;width:158px;height:158px;border:1px solid rgba(195,120,72,.2);border-top-color:#df7d43;border-radius:50%;animation:plqnxSpinR 6s linear infinite}
.plqnx-loader-copy{position:absolute;top:167px;width:300px;text-align:center;color:#9a725c;font:700 10px/1.5 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}
.plqnx-loader-copy b{display:block;color:#b96435;font-size:12px;margin-bottom:4px}
.plqnx-progress{position:absolute;top:207px;width:170px;height:2px;background:rgba(205,130,80,.13);overflow:hidden;border-radius:4px}
.plqnx-progress:after{content:"";display:block;height:100%;width:42%;background:linear-gradient(90deg,transparent,#df7d43,#ffc89f,transparent);animation:plqnxLoad 1.2s ease-in-out infinite}
.plqnx-machine-layer{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.plqnx-machine-layer canvas{display:block;width:100%;height:100%}
body>header,body>main,body>footer,.app{position:relative;z-index:2}
@keyframes plqnxSpin{to{transform:rotate(360deg)}}@keyframes plqnxSpinR{to{transform:rotate(-360deg)}}@keyframes plqnxLoad{from{transform:translateX(-130%)}to{transform:translateX(330%)}}
@media(max-width:720px){.plqnx-machine-layer{opacity:.38}}
@media(prefers-reduced-motion:reduce){.plqnx-loader-disc,.plqnx-loader-orbit,.plqnx-progress:after{animation:none!important}.plqnx-machine-layer{display:none}}
`;
document.head.appendChild(style);

const loader=document.createElement("div");
loader.className="plqnx-loader";
loader.setAttribute("aria-hidden","true");
loader.innerHTML='<div class="plqnx-loader-core"><div class="plqnx-loader-orbit"></div><div class="plqnx-loader-disc"></div><div class="plqnx-loader-copy"><b>PLQNX CORE</b>Preparing receivables workspace</div><div class="plqnx-progress"></div></div>';
document.body.appendChild(loader);
const dismiss=()=>setTimeout(()=>loader.classList.add("hide"),320);
if(document.readyState==="complete")dismiss();else addEventListener("load",dismiss,{once:true});
setTimeout(()=>loader.classList.add("hide"),1500);

if(reduce)return;

/* Subtle inspection-window mechanical reveal */
const layer=document.createElement("div");
layer.className="plqnx-machine-layer";
const canvas=document.createElement("canvas");
layer.appendChild(canvas);
document.body.prepend(layer);
const ctx=canvas.getContext("2d",{alpha:true});
let W=innerWidth,H=innerHeight,D=Math.min(devicePixelRatio||1,1.5);
let pointer={x:W*.76,y:H*.28,tx:W*.76,ty:H*.28,active:false,r:0,tr:0};
function resize(){
  W=innerWidth;H=innerHeight;D=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.floor(W*D);canvas.height=Math.floor(H*D);
  canvas.style.width=W+"px";canvas.style.height=H+"px";
  ctx.setTransform(D,0,0,D,0,0);
}
resize();addEventListener("resize",resize,{passive:true});
addEventListener("pointermove",e=>{pointer.tx=e.clientX;pointer.ty=e.clientY;pointer.active=true;pointer.tr=Math.min(220,Math.max(145,W*.115))},{passive:true});
addEventListener("pointerleave",()=>{pointer.active=false;pointer.tr=0},{passive:true});

const gears=[
 {x:.11,y:.24,r:73,t:18,s:.0018,a:.1},{x:.22,y:.16,r:44,t:14,s:-.0029,a:.8},
 {x:.35,y:.29,r:92,t:22,s:.0015,a:1.1},{x:.50,y:.18,r:58,t:16,s:-.0024,a:.3},
 {x:.65,y:.31,r:109,t:24,s:.0012,a:.9},{x:.81,y:.20,r:53,t:15,s:-.0028,a:.5},
 {x:.91,y:.40,r:78,t:19,s:.0017,a:1.7},{x:.19,y:.73,r:99,t:22,s:-.0013,a:1.4},
 {x:.43,y:.78,r:60,t:16,s:.0023,a:.6},{x:.71,y:.73,r:87,t:20,s:-.0016,a:1.2},
 {x:.89,y:.79,r:48,t:14,s:.0028,a:.2}
];
const rods=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[7,8],[8,9],[9,10],[2,8],[4,9]];

function gp(g){return{x:g.x*W,y:g.y*H}}
function drawBearing(x,y,r){
  const outer=ctx.createRadialGradient(x-r*.3,y-r*.3,r*.05,x,y,r);
  outer.addColorStop(0,"#f5f0ec");outer.addColorStop(.32,"#c8c0ba");outer.addColorStop(.68,"#888079");outer.addColorStop(1,"#5c5651");
  ctx.fillStyle=outer;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(70,61,55,.72)";ctx.lineWidth=1.4;ctx.stroke();
  ctx.fillStyle="#49433f";ctx.beginPath();ctx.arc(x,y,r*.56,0,Math.PI*2);ctx.fill();
  for(let i=0;i<10;i++){const a=i*Math.PI*2/10;ctx.fillStyle="#cfc7c0";ctx.beginPath();ctx.arc(x+Math.cos(a)*r*.39,y+Math.sin(a)*r*.39,r*.07,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle="#6b625c";ctx.beginPath();ctx.arc(x,y,r*.23,0,Math.PI*2);ctx.fill();
}
function drawGear(g){
  const p=gp(g),r=Math.min(g.r,Math.max(30,W*.068));
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(g.a);
  for(let i=0;i<g.t;i++){
    const a=i*Math.PI*2/g.t;ctx.save();ctx.rotate(a);
    const tg=ctx.createLinearGradient(r*.88,-6,r*1.08,6);tg.addColorStop(0,"#6d655f");tg.addColorStop(.5,"#bdb4ad");tg.addColorStop(1,"#5f5752");
    ctx.fillStyle=tg;ctx.fillRect(r*.88,-5.5,r*.22,11);ctx.restore()
  }
  const metal=ctx.createRadialGradient(-r*.28,-r*.28,r*.08,0,0,r);
  metal.addColorStop(0,"#f1ebe6");metal.addColorStop(.34,"#c0b7b0");metal.addColorStop(.72,"#817872");metal.addColorStop(1,"#5b534e");
  ctx.fillStyle=metal;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(58,50,45,.72)";ctx.lineWidth=1.7;ctx.stroke();
  ctx.fillStyle="#4a4440";ctx.beginPath();ctx.arc(0,0,r*.68,0,Math.PI*2);ctx.fill();
  for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);const sg=ctx.createLinearGradient(r*.18,-5,r*.61,5);sg.addColorStop(0,"#786f69");sg.addColorStop(.5,"#a79e97");sg.addColorStop(1,"#675f59");ctx.fillStyle=sg;ctx.fillRect(r*.18,-r*.058,r*.45,r*.116);ctx.restore()}
  drawBearing(0,0,r*.20);
  ctx.restore();
}
function drawRod(a,b){
  const p1=gp(gears[a]),p2=gp(gears[b]);
  const grad=ctx.createLinearGradient(p1.x,p1.y,p2.x,p2.y);grad.addColorStop(0,"#5c554f");grad.addColorStop(.5,"#aaa19a");grad.addColorStop(1,"#605853");
  ctx.strokeStyle=grad;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,.16)";ctx.lineWidth=1;ctx.stroke();
}
function piston(x,y,len,phase,t){
  const off=Math.sin(t*.00155+phase)*20;
  ctx.save();ctx.translate(x,y);
  const rail=ctx.createLinearGradient(-len/2,0,len/2,0);rail.addColorStop(0,"#66605b");rail.addColorStop(.5,"#d0c9c3");rail.addColorStop(1,"#66605b");
  ctx.strokeStyle=rail;ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(len/2,0);ctx.stroke();
  const pgrad=ctx.createLinearGradient(off-28,0,off+28,0);pgrad.addColorStop(0,"#66605b");pgrad.addColorStop(.5,"#ded7d1");pgrad.addColorStop(1,"#6b645f");
  ctx.fillStyle=pgrad;ctx.fillRect(off-28,-14,56,28);ctx.strokeStyle="#5b534e";ctx.strokeRect(off-28,-14,56,28);
  ctx.restore();
}
function drawAssembly(t){
  rods.forEach(v=>drawRod(v[0],v[1]));
  piston(W*.28,H*.52,Math.min(220,W*.21),0,t);
  piston(W*.66,H*.57,Math.min(250,W*.23),1.8,t);
  piston(W*.85,H*.52,Math.min(180,W*.17),3.2,t);
  gears.forEach(g=>{g.a+=g.s;drawGear(g)});
}
function frame(t){
  pointer.x+=(pointer.tx-pointer.x)*.075;pointer.y+=(pointer.ty-pointer.y)*.075;
  pointer.r+=(pointer.tr-pointer.r)*.085;
  ctx.clearRect(0,0,W,H);

  if(pointer.r>8){
    ctx.save();

    /* quiet inspection lens; no ripping or harsh edges */
    const lens=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,pointer.r);
    lens.addColorStop(0,"rgba(255,255,255,.02)");
    lens.addColorStop(.72,"rgba(255,255,255,.02)");
    lens.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=lens;ctx.beginPath();ctx.arc(pointer.x,pointer.y,pointer.r,0,Math.PI*2);ctx.fill();

    ctx.beginPath();ctx.arc(pointer.x,pointer.y,pointer.r,0,Math.PI*2);ctx.clip();

    const cavity=ctx.createRadialGradient(pointer.x-pointer.r*.18,pointer.y-pointer.r*.20,18,pointer.x,pointer.y,pointer.r*1.18);
    cavity.addColorStop(0,"#3d3935");cavity.addColorStop(.55,"#2b2825");cavity.addColorStop(1,"#1f1c1a");
    ctx.fillStyle=cavity;ctx.fillRect(pointer.x-pointer.r*1.2,pointer.y-pointer.r*1.2,pointer.r*2.4,pointer.r*2.4);

    drawAssembly(t);

    /* realistic glass reflection */
    const glass=ctx.createLinearGradient(pointer.x-pointer.r,pointer.y-pointer.r,pointer.x+pointer.r,pointer.y+pointer.r);
    glass.addColorStop(0,"rgba(255,255,255,.16)");glass.addColorStop(.18,"rgba(255,255,255,.025)");glass.addColorStop(.62,"rgba(255,255,255,0)");glass.addColorStop(1,"rgba(255,188,135,.04)");
    ctx.fillStyle=glass;ctx.fillRect(pointer.x-pointer.r,pointer.y-pointer.r,pointer.r*2,pointer.r*2);
    ctx.restore();

    /* subtle bezel + shadow, like a precision inspection viewport */
    ctx.save();
    ctx.beginPath();ctx.arc(pointer.x,pointer.y,pointer.r,0,Math.PI*2);
    ctx.strokeStyle="rgba(132,92,65,.16)";ctx.lineWidth=10;ctx.shadowColor="rgba(98,63,41,.12)";ctx.shadowBlur=22;ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle="rgba(255,255,255,.88)";ctx.lineWidth=3;ctx.stroke();
    ctx.strokeStyle="rgba(194,124,78,.24)";ctx.lineWidth=1;ctx.stroke();
    ctx.restore();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();