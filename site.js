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

/* Universal machine layer styles so CORE can use the same system without importing site.css */
const style=document.createElement("style");
style.id="plqnx-machine-style";
style.textContent=`
.plqnx-machine-layer{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.plqnx-machine-layer canvas{display:block;width:100%;height:100%;opacity:.44;filter:saturate(.9) contrast(1.03)}
.plqnx-loader{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:radial-gradient(circle at 50% 48%,rgba(255,149,82,.13),transparent 31%),#0c0907;transition:opacity .65s cubic-bezier(.16,1,.3,1),visibility .65s}
.plqnx-loader.hide{opacity:0;visibility:hidden;pointer-events:none}
.plqnx-loader-core{position:relative;width:220px;height:220px;display:grid;place-items:center}
.plqnx-loader-ring{position:absolute;width:168px;height:168px;border-radius:50%;border:1px solid rgba(255,182,127,.17);border-top-color:#ff9b5e;box-shadow:0 0 45px rgba(255,137,67,.18);animation:plqnxSpin 3.2s linear infinite}
.plqnx-loader-gear{position:absolute;border:2px solid rgba(255,181,126,.72);border-radius:50%;box-shadow:inset 0 0 0 7px rgba(255,146,75,.045),0 0 20px rgba(255,129,55,.13)}
.plqnx-loader-gear:after{content:"";position:absolute;inset:22%;border:2px solid rgba(255,191,146,.45);border-radius:50%}
.plqnx-loader-gear.a{width:78px;height:78px;left:34px;top:72px;animation:plqnxSpin 4s linear infinite}
.plqnx-loader-gear.b{width:55px;height:55px;left:103px;top:48px;animation:plqnxSpinR 3s linear infinite}
.plqnx-loader-gear.c{width:89px;height:89px;right:24px;top:93px;animation:plqnxSpin 5s linear infinite}
.plqnx-loader-copy{position:absolute;top:185px;width:280px;text-align:center;color:#d6af94;font:700 10px/1.5 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}
.plqnx-loader-copy b{display:block;color:#ffc39b;font-size:12px;margin-bottom:4px}
.plqnx-progress{position:absolute;top:226px;width:180px;height:2px;background:rgba(255,179,123,.12);overflow:hidden;border-radius:4px}
.plqnx-progress:after{content:"";display:block;height:100%;width:42%;background:linear-gradient(90deg,transparent,#ff9b5e,#ffd0ad,transparent);animation:plqnxLoad 1.25s ease-in-out infinite}
@keyframes plqnxSpin{to{transform:rotate(360deg)}}@keyframes plqnxSpinR{to{transform:rotate(-360deg)}}@keyframes plqnxLoad{from{transform:translateX(-130%)}to{transform:translateX(330%)}}
@media(max-width:720px){.plqnx-machine-layer canvas{opacity:.24}.plqnx-loader-core{transform:scale(.9)}}
@media(prefers-reduced-motion:reduce){.plqnx-loader-ring,.plqnx-loader-gear,.plqnx-progress:after{animation:none!important}.plqnx-machine-layer{display:none}}
`;
document.head.appendChild(style);

/* Loading choreography */
const loader=document.createElement("div");
loader.className="plqnx-loader";
loader.setAttribute("aria-hidden","true");
loader.innerHTML='<div class="plqnx-loader-core"><div class="plqnx-loader-ring"></div><div class="plqnx-loader-gear a"></div><div class="plqnx-loader-gear b"></div><div class="plqnx-loader-gear c"></div><div class="plqnx-loader-copy"><b>PLQNX CORE</b>Synchronising receivables workspace</div><div class="plqnx-progress"></div></div>';
document.body.appendChild(loader);
const dismiss=()=>setTimeout(()=>loader.classList.add("hide"),420);
if(document.readyState==="complete")dismiss();else addEventListener("load",dismiss,{once:true});
setTimeout(()=>loader.classList.add("hide"),1800);

if(reduce)return;

/* Pointer-reactive internal machine animation */
const layer=document.createElement("div");
layer.className="plqnx-machine-layer";
const canvas=document.createElement("canvas");
layer.appendChild(canvas);
document.body.prepend(layer);
const ctx=canvas.getContext("2d",{alpha:true});
let W=innerWidth,H=innerHeight,D=Math.min(devicePixelRatio||1,1.6);
let pointer={x:W*.72,y:H*.3,tx:W*.72,ty:H*.3,active:false};
function resize(){W=innerWidth;H=innerHeight;D=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.floor(W*D);canvas.height=Math.floor(H*D);canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(D,0,0,D,0,0)}
resize();addEventListener("resize",resize,{passive:true});
addEventListener("pointermove",e=>{pointer.tx=e.clientX;pointer.ty=e.clientY;pointer.active=true},{passive:true});
addEventListener("pointerleave",()=>pointer.active=false,{passive:true});

const base=[
 {x:.10,y:.21,r:72,t:18,s:.0034,d:.35},{x:.22,y:.14,r:45,t:14,s:-.0054,d:.55},
 {x:.34,y:.28,r:94,t:22,s:.0026,d:.28},{x:.51,y:.16,r:58,t:16,s:-.0043,d:.48},
 {x:.66,y:.31,r:112,t:24,s:.0021,d:.24},{x:.82,y:.18,r:53,t:15,s:-.0051,d:.58},
 {x:.93,y:.39,r:81,t:19,s:.0031,d:.34},{x:.18,y:.73,r:102,t:22,s:-.0022,d:.22},
 {x:.43,y:.79,r:61,t:16,s:.0042,d:.47},{x:.72,y:.72,r:89,t:20,s:-.0028,d:.32},
 {x:.90,y:.78,r:48,t:14,s:.0054,d:.62}
].map((g,i)=>({...g,a:i*.37}));
const linksG=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[7,8],[8,9],[9,10],[2,8],[4,9]];
function pos(g){const px=(pointer.x-W/2)*g.d*.045,py=(pointer.y-H/2)*g.d*.035;return{x:g.x*W+px,y:g.y*H+py}}
function gear(g,p){
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(g.a);
 const r=Math.min(g.r,Math.max(32,W*.075));
 const near=Math.max(0,1-Math.hypot(pointer.x-p.x,pointer.y-p.y)/260);
 ctx.strokeStyle=`rgba(255,170,110,${.10+near*.30})`;ctx.lineWidth=1.25+near*.7;
 for(let i=0;i<g.t;i++){const a=i*Math.PI*2/g.t;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(r*.91,0);ctx.lineTo(r*1.09,0);ctx.stroke();ctx.restore()}
 ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,r*.67,0,Math.PI*2);ctx.strokeStyle=`rgba(255,194,151,${.075+near*.18})`;ctx.stroke();
 for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(r*.22,0);ctx.lineTo(r*.60,0);ctx.stroke()}
 ctx.beginPath();ctx.arc(0,0,r*.17,0,Math.PI*2);ctx.fillStyle=`rgba(223,115,53,${.10+near*.22})`;ctx.fill();
 ctx.beginPath();ctx.arc(0,0,r*.07,0,Math.PI*2);ctx.fillStyle=`rgba(255,211,178,${.16+near*.30})`;ctx.fill();
 ctx.restore();
}
function rod(a,b){const p1=pos(base[a]),p2=pos(base[b]);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle="rgba(203,111,58,.055)";ctx.lineWidth=7;ctx.stroke();ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle="rgba(255,183,126,.105)";ctx.lineWidth=1.1;ctx.stroke()}
function piston(x,y,len,phase,t){
 const ox=Math.sin(t*.0025+phase)*22,oy=Math.cos(t*.0017+phase)*4;
 ctx.save();ctx.translate(x,y+oy);ctx.strokeStyle="rgba(255,176,115,.095)";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(len/2,0);ctx.stroke();
 ctx.strokeStyle="rgba(255,202,162,.12)";ctx.lineWidth=1;ctx.strokeRect(-len/2-10,-17,len+20,34);
 ctx.fillStyle="rgba(217,108,48,.10)";ctx.fillRect(ox-27,-14,54,28);ctx.strokeStyle="rgba(255,187,133,.17)";ctx.strokeRect(ox-27,-14,54,28);ctx.restore();
}
function crank(x,y,r,t){
 ctx.save();ctx.translate(x,y);ctx.rotate(t*.0017);ctx.strokeStyle="rgba(255,180,121,.12)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<3;i++){ctx.rotate(Math.PI*2/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*.78,0);ctx.stroke();ctx.beginPath();ctx.arc(r*.78,0,5,0,Math.PI*2);ctx.fillStyle="rgba(255,155,94,.18)";ctx.fill()}ctx.restore();
}
function frame(t){
 pointer.x+=(pointer.tx-pointer.x)*.065;pointer.y+=(pointer.ty-pointer.y)*.065;
 ctx.clearRect(0,0,W,H);
 const gx=pointer.active?pointer.x:W*.78,gy=pointer.active?pointer.y:H*.28;
 const glow=ctx.createRadialGradient(gx,gy,0,gx,gy,300);glow.addColorStop(0,"rgba(255,133,64,.105)");glow.addColorStop(.45,"rgba(255,133,64,.035)");glow.addColorStop(1,"rgba(255,133,64,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 linksG.forEach(v=>rod(v[0],v[1]));
 piston(W*.28,H*.52,Math.min(220,W*.22),0,t);piston(W*.66,H*.57,Math.min(260,W*.24),1.9,t);piston(W*.86,H*.52,Math.min(170,W*.18),3.3,t);
 crank(W*.55,H*.48,44,t);crank(W*.12,H*.56,31,t*1.1);
 base.forEach(g=>{g.a+=g.s;gear(g,pos(g))});
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();