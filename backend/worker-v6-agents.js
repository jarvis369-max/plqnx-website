// PLQNX CORE 5.1: invite-only, D1-backed persistent conversations.
// Deploy manually to Cloudflare. Requires existing D1 binding DB and secrets
// GEMINI_API_KEY, BETA_ACCESS_CODE. Do not place any secrets in this file.
// Keep this private beta: public registration needs WAF, verification and recovery.
const SITE = "https://jarvis369-max.github.io";
const DAILY_LIMIT = 25;
const SESSION_SECONDS = 7 * 86400;
const encoder = new TextEncoder();
const cors = origin => ({
  "Access-Control-Allow-Origin": origin === SITE ? SITE : "null",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Beta-Code, Authorization",
  "Vary": "Origin", "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8"
});
const reply = (data,status,origin) =>
  new Response(JSON.stringify(data), {status,headers:cors(origin)});
const hex = data => [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,"0")).join("");
const sha = async text => hex(await crypto.subtle.digest("SHA-256",encoder.encode(text)));
const random = () => crypto.randomUUID();
const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
// Cloudflare production Workers cap a single PBKDF2 call at 100,000 iterations.
// This is an invite-only compatibility setting, not strong production authentication.
// Before a public launch migrate to a vetted managed auth provider or audited KDF.
async function passwordHash(password,salt) {
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({
    name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations:100000
  },key,256);
  return hex(bits);
}
async function payload(request,max=3500) {
  const raw=await request.text();
  if(raw.length>max) throw new Error("Request is too large.");
  let data;try{data=JSON.parse(raw)}catch{throw new Error("Invalid JSON.")}
  if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Invalid request.");
  return data;
}
async function sessionUser(request,db) {
  const bearer=request.headers.get("Authorization")||"";
  if(!/^Bearer [a-f0-9]{64}$/.test(bearer))return null;
  const tokenHash=await sha(bearer.slice(7));
  return db.prepare(
    "SELECT users.id, users.username, sessions.token_hash FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?"
  ).bind(tokenHash,Math.floor(Date.now()/1000)).first();
}
async function createSession(db,userId) {
  const value=token(),tokenHash=await sha(value),expires=Math.floor(Date.now()/1000)+SESSION_SECONDS;
  await db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").bind(tokenHash,userId,expires).run();
  return {token:value,expiresAt:expires};
}
const cleanTitle=s=>s.replace(/\s+/g," ").trim().slice(0,68)||"New chat";
async function gemini(env,contents) {
  const model=env.GEMINI_MODEL||"gemini-3.5-flash-lite";
  if(!/^gemini-[a-z0-9.-]+$/.test(model))throw new Error("Invalid model configuration.");
  // One shared deadline prevents repeated short-lived 503 errors from stacking
  // into a very long request. Retry only if the upstream rejects promptly.
  const deadline=Date.now()+45000;
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+
    encodeURIComponent(model)+":generateContent";
  const requestBody=JSON.stringify({
    systemInstruction:{parts:[{text:
      "You are PLQNX CORE, a helpful early-stage AI assistant for learning and coding. "+
      "Use Telugu when the user writes Telugu. Do not claim PLQNX is incorporated or invent actions."
    }]},
    contents,generationConfig:{maxOutputTokens:450}
  });
  for(let attempt=0;attempt<2;attempt++){
    const remaining=deadline-Date.now();
    if(remaining<2000)throw new DOMException("Upstream AI timed out.","TimeoutError");
    const response=await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
      body:requestBody,signal:AbortSignal.timeout(remaining)
    });
    // 503 usually indicates upstream unavailability/overload. Only retry once
    // when the first failure is fast, leaving time for the second call.
    if(response.status===503){
      if(attempt===0&&deadline-Date.now()>32000){
        await new Promise(resolve=>setTimeout(resolve,700));
        continue;
      }
      throw new Error("Gemini is temporarily unavailable (HTTP 503). Wait a minute and restore your message to retry.");
    }
    if(response.status===429)throw new Error("Gemini quota or rate limit reached (HTTP 429). Wait before retrying.");
    if(response.status===404)throw new Error("Gemini model not found (HTTP 404). Check your configured GEMINI_MODEL.");
    if(response.status===403)throw new Error("Gemini access denied (HTTP 403). Check the API project and key access.");
    if(!response.ok)throw new Error("Gemini request failed (HTTP "+response.status+"). Check AI project and Worker logs.");
    const data=await response.json();
    const answer=(data.candidates?.[0]?.content?.parts||[])
      .filter(p=>typeof p.text==="string").map(p=>p.text).join("").trim();
    if(!answer)throw new Error("Gemini returned no text.");
    return answer.slice(0,8000);
  }
  throw new Error("Gemini is temporarily unavailable. Retry later.");
}

// V4 D1 throttle: requires backend/security-v4.sql before deploying this file.
// A keyed hash prevents storing raw IP addresses in the database.
async function throttle(db,env,kind,identifier,windowSeconds,limit){
  const windowStart=Math.floor(Date.now()/1000/windowSeconds)*windowSeconds;
  const key=await sha(env.BETA_ACCESS_CODE+"|"+kind+"|"+identifier);
  const row=await db.prepare(
    "INSERT INTO auth_limits(key,window_start,requests) VALUES(?,?,1) "+
    "ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,"+
    "requests=CASE WHEN auth_limits.window_start=excluded.window_start THEN auth_limits.requests+1 ELSE 1 END "+
    "WHERE auth_limits.window_start!=excluded.window_start OR auth_limits.requests<? "+
    "RETURNING requests"
  ).bind(key,windowStart,limit).first();
  return Boolean(row);
}
function requestIP(request){
  return request.headers.get("CF-Connecting-IP")||"unidentified";
}

export default {
  async fetch(request,env) {
    const origin=request.headers.get("Origin")||"";
    if(request.method==="OPTIONS")return new Response(null,{
      status:origin===SITE?204:403,headers:cors(origin)
    });
    if(origin!==SITE)return reply({error:"Only the PLQNX website is allowed."},403,origin);
    const path=new URL(request.url).pathname,method=request.method;
    if(!env.DB||!env.GEMINI_API_KEY||!env.BETA_ACCESS_CODE)
      return reply({error:"Backend missing DB binding or secrets."},503,origin);
    let diagnosticStage="request";
    try {
      if(path==="/v1/status"&&method==="GET")
        return reply({version:"persistent-v1",accounts:true,permanentMemory:true,securityVersion:"v6",renameConversation:true,agentBriefs:env.ENABLE_AGENT_SCHEDULE==="true"},200,origin);
      if(path==="/v1/register"&&method==="POST"){
        if(!await throttle(env.DB,env,"register-ip",requestIP(request),3600,4))
          return reply({error:"Too many registration attempts. Try later."},429,origin);
        diagnosticStage="registration_invitation";
        if((request.headers.get("X-Beta-Code")||"")!==env.BETA_ACCESS_CODE)
          return reply({error:"Private beta invitation code required."},403,origin);
        diagnosticStage="registration_parse";
        const {username,password}=await payload(request);
        if(typeof username!=="string"||! /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(username)||
           typeof password!=="string"||password.length<12||password.length>128)
          return reply({error:"Username: 3–20 letters/numbers/underscores. Password: 12–128 characters."},400,origin);
        diagnosticStage="registration_user_count";
        const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
        if(count.n>=5)return reply({error:"Private beta registration is full."},403,origin);
        diagnosticStage="registration_password_hash";
        let salt,hashed,id;
        try {
          diagnosticStage="registration_generate_salt";
          salt=token();
          diagnosticStage="registration_derive_password_hash";
          hashed=await passwordHash(password,salt);
          diagnosticStage="registration_generate_user_id";
          id=random();
        } catch (error) {
          const kind=String(error?.name||"Unknown");
          // Only return a short error category. Never reveal the password, salt, or derived hash.
          const safeKind=/^(TypeError|NotSupportedError|OperationError|QuotaExceededError|InvalidAccessError|DataError|AbortError|UnknownError|Error)$/.test(kind)?kind:"OtherError";
          console.error("PLQNX registration crypto failure",diagnosticStage,safeKind);
          return reply({error:"Registration failed during "+diagnosticStage+" ("+safeKind+").",code:diagnosticStage,errorType:safeKind},500,origin);
        }
        diagnosticStage="registration_insert_user";
        try{
          await env.DB.prepare("INSERT INTO users(id,username,password_salt,password_hash) VALUES(?,?,?,?)")
            .bind(id,username,salt,hashed).run();
        }catch(error){
          if(/UNIQUE constraint failed/i.test(String(error?.message||"")))
            return reply({error:"Username is unavailable."},409,origin);
          console.error("PLQNX registration database insert failed:",error?.name||"Error");
          return reply({error:"Registration database insert failed.",code:"registration_insert_user"},500,origin);
        }
        diagnosticStage="registration_create_session";
        const s=await createSession(env.DB,id);
        return reply({username, ...s},201,origin);
      }
      if(path==="/v1/login"&&method==="POST"){
        diagnosticStage="login";
        const {username,password}=await payload(request);
        // Two separate limits make broad IP attacks and focused username attacks harder.
        if(!await throttle(env.DB,env,"login-ip",requestIP(request),900,12))
          return reply({error:"Too many sign-in attempts. Try again in 15 minutes."},429,origin);
        if(typeof username==="string"&&
           !await throttle(env.DB,env,"login-user",username.toLowerCase(),900,7))
          return reply({error:"Too many sign-in attempts for this account. Try again in 15 minutes."},429,origin);
        if(typeof username!=="string"||typeof password!=="string"||
           username.length>20||password.length>128)
          return reply({error:"Invalid username or password."},401,origin);
        const user=await env.DB.prepare(
          "SELECT id,username,password_salt,password_hash FROM users WHERE username=? COLLATE NOCASE"
        ).bind(username).first();
        // A fixed dummy computation reduces obvious username enumeration via timing.
        const salt=user?.password_salt||"0".repeat(64);
        const hash=await passwordHash(password,salt);
        if(!user||hash!==user.password_hash)
          return reply({error:"Invalid username or password."},401,origin);
        const s=await createSession(env.DB,user.id);
        return reply({username:user.username,...s},200,origin);
      }
      // Keep original chat endpoint for the existing website during migration.
      // Beta-code holders only. This route does not save persistent conversations.
      if(path==="/chat"&&method==="POST"){
        if(!await throttle(env.DB,env,"legacy-ip",requestIP(request),86400,25))
          return reply({error:"Daily beta demo limit reached. Try tomorrow."},429,origin);
        if((request.headers.get("X-Beta-Code")||"")!==env.BETA_ACCESS_CODE)
          return reply({error:"Invalid private beta access code."},401,origin);
        const {message,history=[]}=await payload(request,16000);
        if(typeof message!=="string"||!message.trim()||message.length>1000||
          !Array.isArray(history)||history.length>12||
          history.some(t=>!t||!["user","model"].includes(t.role)||
            typeof t.text!=="string"||t.text.length>1000))
          return reply({error:"Invalid message or history."},400,origin);
        const contents=history.map(t=>({role:t.role,parts:[{text:t.text}]}));
        contents.push({role:"user",parts:[{text:message.trim()}]});
        const answer=await gemini(env,contents);
        return reply({answer,diagnostic:{version:"memory-v2",priorTurnsReceived:history.length,
          priorExchangesReceived:history.length/2}},200,origin);
      }

      // All following API routes require a stored, unexpired login session.
      const user=await sessionUser(request,env.DB);
      if(!user)return reply({error:"Please sign in again."},401,origin);
      if(path==="/v1/me"&&method==="GET")
        return reply({username:user.username},200,origin);
      // Authenticated one-shot diagnostic: single small Gemini request, with no chat
      // history, no conversation writes, and one invocation per user / 5 minutes.
      if(path==="/v1/ai-test"&&method==="POST"){
        if(!await throttle(env.DB,env,"ai-test",user.id,300,1))
          return reply({ok:false,code:"TEST_RATE_LIMIT",error:"One diagnostic test every five minutes."},429,origin);
        const started=Date.now();
        try{
          const result=await gemini(env,[{role:"user",parts:[{text:"Reply with exactly OK."}]}]);
          return reply({ok:true,model:env.GEMINI_MODEL||"gemini-3.5-flash-lite",durationMs:Date.now()-started,responded:Boolean(result),resultMatches:result.trim().toUpperCase()==="OK"},200,origin);
        }catch(error){
          const timedOut=error?.name==="TimeoutError"||error?.name==="AbortError"||/timeout|aborted/i.test(error?.message||"");
          // Do not return upstream error bodies, authentication values or raw traces.
          const category=timedOut?"AI_TIMEOUT":/quota|429/i.test(error?.message||"")?"AI_QUOTA":/HTTP 404/.test(error?.message||"")?"AI_MODEL_NOT_FOUND":/HTTP 403/.test(error?.message||"")?"AI_ACCESS":/HTTP 400/.test(error?.message||"")?"AI_BAD_REQUEST":"AI_UPSTREAM";
          return reply({ok:false,model:env.GEMINI_MODEL||"gemini-3.5-flash-lite",durationMs:Date.now()-started,code:category,error:timedOut?"Gemini did not return within the diagnostic timeout.":"Gemini returned an error. Check model access, project quota and the Worker logs."},timedOut?504:502,origin);
        }
      }

      // Explicit opt-in only. Briefs and preferences are account-scoped.
      if(path==="/v1/agent"&&method==="GET"){
        if(env.ENABLE_AGENT_SCHEDULE!=="true")
          return reply({available:false,enabled:false,briefs:[]},200,origin);
        const preferences=await env.DB.prepare("SELECT enabled,topic FROM agent_preferences WHERE user_id=?").bind(user.id).first();
        const stored=await env.DB.prepare(
          "SELECT id,day,slot,topic,content,created_at FROM agent_briefs WHERE user_id=? ORDER BY created_at DESC LIMIT 9"
        ).bind(user.id).all();
        return reply({available:true,enabled:preferences?.enabled===1,topic:preferences?.topic||"",briefs:stored.results||[]},200,origin);
      }
      if(path==="/v1/agent/preferences"&&method==="POST"){
        if(env.ENABLE_AGENT_SCHEDULE!=="true")return reply({error:"Scheduled briefs are not enabled."},503,origin);
        const data=await payload(request,900);
        if(typeof data.enabled!=="boolean"||typeof data.topic!=="string"||data.topic.length>180)
          return reply({error:"Choose a topic up to 180 characters."},400,origin);
        const topic=data.topic.replace(/\s+/g," ").trim();
        if(data.enabled&&topic.length<6)return reply({error:"Enter a topic with at least six characters."},400,origin);
        await env.DB.prepare("INSERT INTO agent_preferences(user_id,enabled,topic) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,topic=excluded.topic,updated_at=unixepoch()")
          .bind(user.id,data.enabled?1:0,topic).run();
        return reply({ok:true,enabled:data.enabled,topic},200,origin);
      }
      if(path==="/v1/logout"&&method==="POST"){
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(user.token_hash).run();
        return reply({ok:true},200,origin);
      }
      if(path==="/v1/conversations"&&method==="GET"){
        const rows=await env.DB.prepare(
          "SELECT id,title,created_at,updated_at FROM conversations WHERE user_id=? ORDER BY updated_at DESC LIMIT 50"
        ).bind(user.id).all();
        return reply({conversations:rows.results||[]},200,origin);
      }
      if(path==="/v1/conversations"&&method==="POST"){
        const {title="New chat"}=await payload(request,1200);
        if(typeof title!=="string"||title.length>100)
          return reply({error:"Invalid conversation title."},400,origin);
        const id=random();
        await env.DB.prepare("INSERT INTO conversations(id,user_id,title) VALUES(?,?,?)")
          .bind(id,user.id,cleanTitle(title)).run();
        return reply({id,title:cleanTitle(title)},201,origin);
      }
      const match=path.match(/^\/v1\/conversations\/([a-f0-9-]{36})$/);
      if(match&&method==="PATCH"){
        const {title}=await payload(request,1200);
        if(typeof title!=="string"||!title.trim()||title.trim().length>68)
          return reply({error:"Title must be between 1 and 68 characters."},400,origin);
        const normalized=cleanTitle(title);
        const result=await env.DB.prepare(
          "UPDATE conversations SET title=? WHERE id=? AND user_id=? RETURNING id,title"
        ).bind(normalized,match[1],user.id).first();
        if(!result)return reply({error:"Conversation not found."},404,origin);
        return reply({conversation:result},200,origin);
      }
      if(match&&method==="GET"){
        const convo=await env.DB.prepare(
          "SELECT id,title FROM conversations WHERE id=? AND user_id=?"
        ).bind(match[1],user.id).first();
        if(!convo)return reply({error:"Conversation not found."},404,origin);
        const result=await env.DB.prepare(
          "SELECT role,content,created_at FROM messages WHERE conversation_id=? ORDER BY rowid ASC LIMIT 150"
        ).bind(match[1]).all();
        return reply({conversation:convo,messages:result.results||[]},200,origin);
      }
      if(match&&method==="DELETE"){
        await env.DB.prepare("DELETE FROM conversations WHERE id=? AND user_id=?")
          .bind(match[1],user.id).run();
        return reply({ok:true},200,origin);
      }
      if(path==="/v1/chat"&&method==="POST"){
        const {conversationId,message}=await payload(request,4000);
        if(typeof conversationId!=="string"||
           !/^[a-f0-9-]{36}$/.test(conversationId)||
           typeof message!=="string"||!message.trim()||message.length>1000)
          return reply({error:"Invalid conversation or message (max 1,000 characters)."},400,origin);
        const convo=await env.DB.prepare(
          "SELECT id,title FROM conversations WHERE id=? AND user_id=?"
        ).bind(conversationId,user.id).first();
        if(!convo)return reply({error:"Conversation not found."},404,origin);
        const day=new Date().toISOString().slice(0,10);
        const quota=await env.DB.prepare(
          "INSERT INTO daily_usage(user_id,day,requests) VALUES(?,?,1) "+
          "ON CONFLICT(user_id,day) DO UPDATE SET requests=requests+1 WHERE requests<? "+
          "RETURNING requests"
        ).bind(user.id,day,DAILY_LIMIT).first();
        if(!quota)return reply({error:"Daily beta limit reached (25 requests). Try tomorrow."},429,origin);
        const prev=await env.DB.prepare(
          "SELECT role,content FROM messages WHERE conversation_id=? ORDER BY rowid DESC LIMIT 12"
        ).bind(conversationId).all();
        const contents=(prev.results||[]).reverse().map(m=>({
          role:m.role,parts:[{text:m.content}]
        }));
        // Drop an unmatched leading model reply when only the last 12 rows are loaded.
        if(contents[0]?.role==="model")contents.shift();
        contents.push({role:"user",parts:[{text:message.trim()}]});
        let answer;
        try{answer=await gemini(env,contents)}
        catch(error){
          // Failed AI calls never save a user message or model reply. Restore their
          // daily request allowance so a manual retry isn't penalized.
          await env.DB.prepare("UPDATE daily_usage SET requests=CASE WHEN requests>0 THEN requests-1 ELSE 0 END WHERE user_id=? AND day=?")
            .bind(user.id,day).run();
          const timedOut=error?.name==="TimeoutError"||error?.name==="AbortError"||/timeout|aborted/i.test(error?.message||"");
          if(timedOut)return reply({error:"The AI service did not respond within 45 seconds. Your message was not saved. Use Restore my message and try again.",code:"AI_TIMEOUT",retryable:true},504,origin);
          return reply({error:error.message||"AI unavailable.",code:"AI_UPSTREAM",retryable:true},502,origin);
        }
        const title=convo.title==="New chat"?cleanTitle(message):convo.title;
        await env.DB.batch([
          env.DB.prepare("INSERT INTO messages(id,conversation_id,role,content) VALUES(?,?,?,?)")
            .bind(random(),conversationId,"user",message.trim()),
          env.DB.prepare("INSERT INTO messages(id,conversation_id,role,content) VALUES(?,?,?,?)")
            .bind(random(),conversationId,"model",answer),
          env.DB.prepare("UPDATE conversations SET title=?,updated_at=unixepoch() WHERE id=? AND user_id=?")
            .bind(title,conversationId,user.id)
        ]);
        return reply({answer,title,remainingToday:DAILY_LIMIT-quota.requests},200,origin);
      }
      return reply({error:"Not found."},404,origin);
    }catch(error){
      if(/Invalid JSON|Request is too large|Invalid request/.test(error.message))
        return reply({error:error.message},400,origin);
      console.error("PLQNX backend failure at",diagnosticStage,error?.name||"Error");
      return reply({error:"Server error at "+diagnosticStage+". Share this stage name, not any credentials.",code:diagnosticStage},500,origin);
    }
  },
  // Configure Cron Trigger to "30 2,8,14 * * *" (UTC, 08:00/14:00/20:00 IST).
  // This handler cannot run from GitHub Pages and stays inactive until manually deployed.
  async scheduled(event,env,ctx){
    if(env.ENABLE_AGENT_SCHEDULE!=="true"||!env.DB||!env.GEMINI_API_KEY)return;
    const timestamp=event.scheduledTime||Date.now();
    const date=new Date(timestamp),hour=date.getUTCHours(),minute=date.getUTCMinutes();
    if(minute!==30||![2,8,14].includes(hour))return;
    const slot=hour===2?"morning":hour===8?"afternoon":"evening",day=date.toISOString().slice(0,10);
    const records=await env.DB.prepare("SELECT user_id,topic FROM agent_preferences WHERE enabled=1 ORDER BY updated_at ASC LIMIT 5").all();
    for(const row of records.results||[]){
      const existing=await env.DB.prepare("SELECT id FROM agent_briefs WHERE user_id=? AND day=? AND slot=?")
        .bind(row.user_id,day,slot).first();
      if(existing)continue;
      // Explicitly scoped topic only, never retrieve all chat messages in a background task.
      const prompt="Produce one concise and practical PLQNX opt-in update for this subject: "+row.topic.slice(0,180)+
        ". Include: one useful new angle, two concrete next steps, one question worth exploring. "+
        "Do not pretend to have browsed live news, run code, tested a model, generated an external asset, "+
        "or completed a task. No unverifiable facts or promises. 160 words maximum.";
      try{
        const content=await gemini(env,[{role:"user",parts:[{text:prompt}]}]);
        await env.DB.prepare("INSERT OR IGNORE INTO agent_briefs(id,user_id,day,slot,topic,content) VALUES(?,?,?,?,?,?)")
          .bind(random(),row.user_id,day,slot,row.topic,content).run();
      }catch(error){
        console.error("PLQNX scheduled brief failed",slot,String(error?.name||"Error"));
      }
    }
  }
};
