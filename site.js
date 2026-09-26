(()=>{"use strict";
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;

/* Reference-style loading: calm evergreen field, then staggered page entrance */
const loaderStyle=document.createElement("style");
loaderStyle.textContent=`
.plqnx-preloader{position:fixed;inset:0;z-index:99999;background:
radial-gradient(620px 360px at 72% 18%,rgba(70,181,140,.22),transparent 65%),
linear-gradient(180deg,#174c3c 0%,#0c2f27 52%,#061513 100%);
transition:opacity .58s cubic-bezier(.16,1,.3,1),visibility .58s}
.plqnx-preloader.hide{opacity:0;visibility:hidden;pointer-events:none}
.plqnx-preloader:after{content:"";position:absolute;inset:0;opacity:.18;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:54px 54px}
.plqnx-loadmark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:10px;color:#e9fff6;font:750 13px Inter,system-ui,sans-serif;letter-spacing:.01em;z-index:2}
.plqnx-loadmark i{width:25px;height:25px;border-radius:7px;background:#fff;display:grid;place-items:center;color:#166047;font-style:normal;font-weight:900;box-shadow:0 8px 26px rgba(0,0,0,.18)}
.plqnx-loadline{position:absolute;left:50%;top:calc(50% + 35px);transform:translateX(-50%);width:120px;height:1px;background:rgba(255,255,255,.13);overflow:hidden;z-index:2}
.plqnx-loadline:after{content:"";display:block;width:42%;height:100%;background:linear-gradient(90deg,transparent,#78d7b4,transparent);animation:plqnxSweep .9s ease-in-out infinite}
@keyframes plqnxSweep{from{transform:translateX(-130%)}to{transform:translateX(340%)}}
@media(prefers-reduced-motion:reduce){.plqnx-loadline:after{animation:none}}
`;
document.head.appendChild(loaderStyle);

const loader=document.createElement("div");
loader.className="plqnx-preloader";
loader.setAttribute("aria-hidden","true");
loader.innerHTML='<div class="plqnx-loadmark"><i>P</i><span>PLQNX</span></div><div class="plqnx-loadline"></div>';
document.body.appendChild(loader);

const ready=()=>{
  document.body.classList.add("is-ready");
  setTimeout(()=>loader.classList.add("hide"),180);
};
if(document.readyState==="complete")ready();else addEventListener("load",ready,{once:true});
setTimeout(()=>{document.body.classList.add("is-ready");loader.classList.add("hide")},1500);

/* navigation */
const menu=document.querySelector(".menu"),links=document.querySelector(".links");
if(menu&&links){
  menu.addEventListener("click",()=>{const o=links.classList.toggle("open");menu.setAttribute("aria-expanded",String(o));menu.textContent=o?"✕":"☰"});
  links.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{links.classList.remove("open");menu.setAttribute("aria-expanded","false");menu.textContent="☰"}));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){links.classList.remove("open");menu.setAttribute("aria-expanded","false");menu.textContent="☰"}});
}
document.querySelectorAll("[data-year]").forEach(n=>n.textContent=new Date().getFullYear());

/* hero entrance classes applied automatically across pages */
const hero=document.querySelector(".hero");
if(hero){
  const left=hero.children[0],right=hero.children[1];
  if(left){
    [...left.children].forEach((el,i)=>{el.classList.add("hero-enter","d"+Math.min(i+1,4))});
  }
  if(right)right.classList.add("dashboard-enter");
}
const pagehero=document.querySelector(".pagehero");
if(pagehero){
  [...pagehero.children].forEach((el,i)=>el.classList.add("hero-enter","d"+Math.min(i+1,4)));
}

/* staggered scroll reveals, matching the supplied reference's restrained motion */
if(!reduce&&"IntersectionObserver"in window){
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){
      const group=entry.target.closest(".grid3,.grid4,.steps");
      if(group){
        [...group.children].forEach((child,i)=>setTimeout(()=>child.classList.add("in"),i*65));
      }else entry.target.classList.add("in");
      io.unobserve(entry.target);
    }
  }),{threshold:.08,rootMargin:"0px 0px -7% 0px"});
  document.querySelectorAll(".card,.panel,.step,.section h2,.section-intro,.table-wrap,.callout").forEach(el=>{
    el.classList.add("reveal");io.observe(el);
  });
}

/* reference-like subtle dashboard parallax, only on pointer-capable devices */
if(!reduce&&matchMedia("(pointer:fine)").matches){
  document.querySelectorAll(".hero-dashboard,.panel").forEach(el=>{
    el.addEventListener("pointermove",e=>{
      const r=el.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      el.style.transform=`perspective(900px) rotateX(${(-y*2.4).toFixed(2)}deg) rotateY(${(x*2.8).toFixed(2)}deg) translateY(-1px)`;
    });
    el.addEventListener("pointerleave",()=>{el.style.transform=""});
  });
}
})();