/* PLQNX ECLIPSE: concrete, browser-local contextual tools. No simulated AI or fake autonomous results. */
(()=>{"use strict";
const $=id=>document.getElementById(id),input=$("commandInput"),host=$("intentWorkbench"),body=$("workbenchBody");
if(!input||!host||!body)return;
const state={kind:"",source:""};
const mk=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
const btn=(label,fn,cls="eclipse-pillbtn")=>{const x=mk("button",cls,label);x.type="button";x.addEventListener("click",fn);return x};
function field(label,placeholder,rows=4){const wrap=mk("label","studio-field"),heading=mk("span","",label),area=mk("textarea","",undefined);area.rows=rows;area.placeholder=placeholder;area.maxLength=20000;wrap.append(heading,area);return [wrap,area]}
function sectionTitle(title,desc){const wrap=mk("div","studio-results"),heading=mk("h3","",title),p=mk("p","",desc);wrap.append(heading,p);return wrap}
function copy(text){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>announce("Copied to clipboard.")).catch(()=>announce("Clipboard unavailable. Select the text to copy."));else announce("Clipboard unavailable.")}
function announce(text){const s=$("eclipseToast");if(s){s.textContent=text;s.classList.add("show");clearTimeout(announce.t);announce.t=setTimeout(()=>s.classList.remove("show"),3500)}}
const nl=String.fromCharCode(10);
function csvRows(text){
 const rows=[],line=[];let word="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i],next=text[i+1];
 if(c==='"'){if(quoted&&next==='"'){word+='"';i++}else quoted=!quoted}
 else if(c===","&&!quoted){line.push(word.trim());word=""}
 else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&next==="\n")i++;line.push(word.trim());word="";if(line.some(x=>x!==""))rows.push(line.splice(0))}
 else word+=c;
 }if(quoted)throw Error("Unclosed quoted CSV field.");line.push(word.trim());if(line.some(x=>x!==""))rows.push(line);
 if(rows.length<2)throw Error("Paste a header row and at least one data row.");
 if(rows.length>1501)throw Error("Limit 1,500 rows. Analyze a smaller sample.");
 const width=rows[0].length;if(width>30)throw Error("Limit 30 columns.");
 if(rows.some(row=>row.length!==width))throw Error("Rows contain different numbers of columns. Check commas and quotes.");
 return rows;
}
function analysisTool(){
 const [wrap,area]=field("CSV data","metric,month\n12,Jan\n18,Feb\n23,Mar",7);area.value=state.source.includes(",")?state.source:"";
 const go=btn("Analyze pasted CSV",()=>{out.replaceChildren();try{
 const rows=csvRows(area.value),heads=rows[0],vals=rows.slice(1),summary=mk("div","studio-summary");
 summary.append(mk("p","","Parsed "+vals.length+" rows across "+heads.length+" columns. This calculation runs locally."));
 heads.forEach((h,j)=>{const numbers=vals.map(r=>r[j].trim()).filter(s=>s!=="").map(Number);
 const numeric=numbers.length&&numbers.length>=Math.ceil(vals.length*.75)&&numbers.every(Number.isFinite);
 const stat=mk("div","studio-stat");stat.append(mk("strong","",h||"Column "+(j+1)));
 if(numeric){const sorted=numbers.slice().sort((a,b)=>a-b),sum=numbers.reduce((a,b)=>a+b,0),avg=sum/numbers.length;
 stat.append(mk("span","","Count "+numbers.length+" · Mean "+Number(avg.toFixed(3))+" · Min "+sorted[0]+" · Max "+sorted.at(-1)))}
 else{const counts=new Map();vals.forEach(r=>{const v=r[j]||"(blank)";counts.set(v,(counts.get(v)||0)+1)});const popular=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,3);stat.append(mk("span","",popular.map(([v,n])=>v+": "+n).join(" · ")))}summary.append(stat)});
 out.append(summary);state.source="Analyze these CSV summary statistics and suggest how to visualize them: "+summary.textContent.slice(0,1450);
 }catch(e){out.append(mk("p","studio-error",e.message))}});
 const out=mk("div","studio-output");body.append(wrap,go,out);
}
function templateTool(kind){
 const opts={
 build:{label:"PROJECT BRIEF",title:"Shape your next build.",fields:[["What are you building?","An AI study planner for students"],["Who is it for?","First-year diploma students"],["Constraints and tools","Free hosting, accessible mobile UI, browser-first"]],out:([a,b,c])=>"Build a practical technical plan for: "+a+". Intended users: "+b+". Requirements and constraints: "+c+". Provide a minimum viable product, architecture, milestones, risks and first implementation step."},
 create:{label:"CREATIVE CANVAS",title:"Turn a spark into a brief.",fields:[["What will you create?","A cinematic launch video for PLQNX"],["Mood and audience","Sophisticated, futuristic, new AI builders"],["Style and constraints","OLED black, violet light, no copyrighted imagery"]],out:([a,b,c])=>"Develop a creative concept for: "+a+". Mood and audience: "+b+". Style and constraints: "+c+". Offer three distinct directions, then a detailed execution brief."},
 learn:{label:"LEARNING STUDIO",title:"Create your study route.",fields:[["Topic","Neural networks"],["What do you already know?","Basic Python and high-school mathematics"],["How do you want to learn?","Simple explanations, examples and a self-test"]],out:([a,b,c])=>"Teach me "+a+". My background: "+b+". Preferred method: "+c+". Start with an intuitive analogy, build step by step and finish with five recall questions."},
 focus:{label:"FOCUS CANVAS",title:"One task. Clear next step.",fields:[["What are you trying to finish?","Finish a landing-page redesign"],["What's blocking progress?","Too many ideas and no first action"],["Time available","45 minutes"]],out:([a,b,c])=>"Help me focus on: "+a+". Blockers: "+b+". Time available: "+c+". Give me the single best next action, a short task sequence, and a practical done criterion."}};
 const config=opts[kind]||opts.focus;const inputs=[];const result=mk("div","studio-output");
 config.fields.forEach(([label,placeholder])=>{const [wrap,input]=field(label,placeholder,2);inputs.push(input);body.append(wrap)});
 if(state.source){inputs[0].value=state.source}
 const b=btn("Generate structured brief",()=>{const parts=inputs.map(x=>x.value.trim()||x.placeholder),prompt=config.out(parts);result.replaceChildren();const pre=mk("p","studio-generated",prompt),copyBtn=btn("Copy brief",()=>copy(prompt));result.append(pre,copyBtn);state.source=prompt;});
 body.append(b,result);
}
function open(kind,source){
 state.kind=kind;state.source=source||"";
 const config={build:["BUILD","Project brief builder","Structure a build request before sending it to the live AI."],create:["CREATE","Creative brief canvas","Turn your vision into a detailed brief."],analyze:["ANALYZE","CSV analyzer","Paste a CSV sample and calculate real summary statistics without uploading it."],learn:["LEARN","Guided learning planner","Generate a structured learning request for CORE."],focus:["FOCUS","Minimal task canvas","Reduce a complex goal to your next actionable step."]};
 const [name,title,desc]=config[kind]||config.focus;
 $("workbenchLabel").textContent=name+" · LOCAL WORKSPACE";$("workbenchTitle").textContent=title;$("workbenchDescription").textContent=desc;
 body.replaceChildren();host.hidden=false;if(kind==="analyze")analysisTool();else templateTool(kind);host.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"center"});
}
function classify(text){const t=text.toLowerCase();if(/csv|data|analy|report|metric|spreadsheet|trend|statistics/.test(t))return"analyze";if(/code|build|debug|app|website|python|model|api|project/.test(t))return"build";if(/write|story|creative|design|script|logo|video|idea|art/.test(t))return"create";if(/learn|explain|teach|study|understand|quiz/.test(t))return"learn";return"focus"}
const trigger=btn("Open smart tool ↗",()=>open(classify(input.value),input.value.trim()),"command-send studio-trigger");trigger.title="Create a contextual tool in this page";trigger.setAttribute("aria-label","Open a tool for your command");const actions=document.querySelector(".command-actions");if(actions)actions.prepend(trigger);
$("workbenchClose")?.addEventListener("click",()=>{host.hidden=true});
$("workbenchCore")?.addEventListener("click",()=>{const text=state.source||input.value.trim();if(!text){announce("Enter an idea or create a brief first.");return}location.href="./core.html?prompt="+encodeURIComponent(text.slice(0,1000))});
$("historyClear")?.addEventListener("click",()=>{if(!confirm("Forget recent command intents saved on this browser?"))return;localStorage.removeItem("plqnx_intent_history");localStorage.removeItem("plqnx_last_seen");location.reload()});
})();
