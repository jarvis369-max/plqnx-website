/* Shared PLQNX informational-page interactions. */
(()=>{"use strict";
const toggle=document.querySelector(".v7-menu"),links=document.querySelector(".v7-links");
if(toggle&&links){
 toggle.addEventListener("click",()=>{const open=links.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));toggle.textContent=open?"✕":"☰"});
 links.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{links.classList.remove("open");toggle.setAttribute("aria-expanded","false");toggle.textContent="☰"}));
 document.addEventListener("keydown",e=>{if(e.key==="Escape"){links.classList.remove("open");toggle.setAttribute("aria-expanded","false");toggle.textContent="☰"}});
}
document.querySelectorAll("[data-year]").forEach(n=>n.textContent=new Date().getFullYear());
if(!window.matchMedia("(prefers-reduced-motion:reduce)").matches&&"IntersectionObserver" in window){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target)}},{rootMargin:"0px 0px -30px 0px",threshold:.07});
 document.querySelectorAll(".v7-card,.v7-step,.v7-panel,.v7-heading,.v7-preview").forEach(n=>{n.classList.add("v7-reveal");observer.observe(n)});
}
})();

/* PLQNX 8 · shared fluid motion layer */
(()=>{
  "use strict";
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root=document.documentElement;
  const header=document.querySelector(".v7-header");
  const updateHeader=()=>header&&header.classList.toggle("v8-scrolled",window.scrollY>22);
  updateHeader();window.addEventListener("scroll",updateHeader,{passive:true});

  if(!reduce){
    window.addEventListener("pointermove",e=>{
      root.style.setProperty("--mx",(e.clientX/window.innerWidth*100).toFixed(2)+"%");
      root.style.setProperty("--my",(e.clientY/window.innerHeight*100).toFixed(2)+"%");
    },{passive:true});

    document.querySelectorAll(".v7-button").forEach(btn=>{
      btn.addEventListener("pointermove",e=>{
        const r=btn.getBoundingClientRect();
        btn.style.setProperty("--mag-x",((e.clientX-r.left-r.width/2)*.11).toFixed(2)+"px");
        btn.style.setProperty("--mag-y",((e.clientY-r.top-r.height/2)*.11).toFixed(2)+"px");
      });
      btn.addEventListener("pointerleave",()=>{btn.style.setProperty("--mag-x","0px");btn.style.setProperty("--mag-y","0px")});
    });

    document.querySelectorAll(".v7-card,.v7-panel,.v7-step").forEach(card=>{
      card.addEventListener("pointermove",e=>{
        const r=card.getBoundingClientRect();
        card.style.setProperty("--card-x",((e.clientX-r.left)/r.width*100).toFixed(1)+"%");
        card.style.setProperty("--card-y",((e.clientY-r.top)/r.height*100).toFixed(1)+"%");
      });
    });

    if("IntersectionObserver" in window){
      const els=document.querySelectorAll(".v7-pagehero>*:not(script),.v7-section .v7-container>*:not(script),.v7-footer-grid>*");
      els.forEach(el=>el.classList.add("v8-reveal"));
      const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add("v8-in");io.unobserve(entry.target)}
      }),{threshold:.1,rootMargin:"0px 0px -6% 0px"});
      els.forEach(el=>io.observe(el));
    }
  }
})();
