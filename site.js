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