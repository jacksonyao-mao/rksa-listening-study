"use strict";
const similarityGuidance="If the voices sound like different genders, select <strong>1</strong>. If they sound like the same gender but are only slightly or moderately similar, select <strong>2–3</strong>. If the voices sound very similar, select <strong>4–5</strong>.";
const metrics=[
 ["similarity","Speaker similarity","How similar is the voice in the test clip to the voice in the reference clip?",["Not at all similar","Slightly similar","Moderately similar","Very similar","Extremely similar"]],
 ["naturalness","Naturalness","How natural does the speech in the test clip sound?",["Very unnatural","Somewhat unnatural","Neither natural nor unnatural","Somewhat natural","Very natural"]],
 ["intelligibility","Intelligibility","How much of the speech in the test clip could you understand?",["None of the words","A few words","Some of the words","Most of the words","All of the words easily"]]
];
const data=window.LISTENING;
const trials=new Map(data.trials.map(t=>[t.id,t]));
const $=id=>document.getElementById(id);
const preview=new URLSearchParams(location.search).get("preview")==="1";
const storeKey="rksa-online:"+data.version+(preview?"/preview":"");
const endpoint="https://rksa-meanvc2-listening-responses.jacksonmaomao.chatgpt.site/api/submit"+(preview?"?qa=1":"");
let state, participant, busy=false, persistent=true, submissionError=null, lastAttempt=0;
try { state=JSON.parse(localStorage.getItem(storeKey)); } catch {}
if (!state || !/^[a-f0-9]{64}$/.test(state.secret) || !Array.isArray(state.order) ||
    state.order.length!==trials.size || new Set(state.order).size!==trials.size ||
    !state.order.every(id=>trials.has(id))) {
  const random=crypto.getRandomValues(new Uint8Array(32));
  const secret=Array.from(random,b=>b.toString(16).padStart(2,"0")).join("");
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  state={secret,order:StudyCore.shuffle([...trials.keys()],StudyCore.rng(seed)),answers:{},index:0,started:false,finished:false};
}
function save(){
  try { localStorage.setItem(storeKey,JSON.stringify(state)); } catch {persistent=false;}
  $("save-status").textContent=persistent ? "Progress saved in this browser" : "Keep this tab open to retain your answers";
}
function show(page){for(const id of ["intro","trial","done"]) $(id).hidden=id!==page;}
function stopAudio(){for(const el of document.querySelectorAll("audio")) el.pause();}
function update(){
  stopAudio();
  if(state.finished){
    show("done");$("counter").textContent=trials.size+" / "+trials.size;
    const received=Boolean(state.receipt);
    $("done").dataset.status=received?"received":busy?"sending":"pending";
    $("completion-mark").textContent=received?"✓":busy?"…":"!";
    $("completion-label").textContent=received?"Submission confirmed":busy?"Sending your answers":"Submission not confirmed";
    $("completion-title").textContent=received?"Thank you for listening.":busy?"Saving your ratings…":"Your ratings still need to be sent.";
    $("submission").textContent=received ? "Ratings received. Confirmation "+state.receipt+"." : submissionError || "You have answered all questions. Download a backup while we send your ratings.";
    $("backup-note").hidden=received;
    $("backup-note").textContent=persistent?"Your answers are saved in this browser. Keep this browser's data until you receive a confirmation. You can send the downloaded ratings file to the organizer if submission keeps failing.":"Browser storage is unavailable. Download your ratings now and keep this tab open until you receive a confirmation.";
    $("retry").hidden=received;$("retry").disabled=busy;$("review").hidden=received||busy;return;
  }
  if(!state.started){show("intro");return;}
  show("trial");
  const id=state.order[state.index],trial=trials.get(id);
  $("counter").textContent="Question "+(state.index+1)+" of "+trials.size;
  $("progress").max=trials.size;$("progress").value=state.index+1;
  $("reference").src=trial.reference;$("test").src=trial.test;$("form").reset();
  for(const [name,value] of Object.entries(state.answers[id]||{})){
    const el=$("form").elements.namedItem(name);if(el)el.value=String(value);
  }
  $("prev").disabled=state.index===0;
  $("next").textContent=state.index===trials.size-1?"Finish and submit":"Next";
}
function backup(){
  const copy={version:data.version,participant,order:state.order,answers:state.answers,finished:state.finished,receipt:state.receipt||null,submission_error:submissionError,exported_at:new Date().toISOString()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(copy,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="ratings-"+data.version+"-"+participant+".json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function submit(){
  if(busy||state.receipt)return;
  busy=true;submissionError=null;lastAttempt=Date.now();update();
  try{
    const result=await StudySubmission.send(endpoint,
      {version:data.version,secret:state.secret,order:state.order,answers:state.answers},
      {version:data.version,participant},
      (attempt,total)=>{$("submission").textContent="Sending your ratings (attempt "+attempt+" of "+total+")… You can download a backup below.";});
    state.receipt=result.receipt;save();
  }catch(error){
    submissionError=(error.message||"Submission could not be confirmed. Download your ratings and retry.")+" ("+(error.code||"UNKNOWN")+")";
  }finally{busy=false;update();}
}
async function checkConnection(){
  $("connection").dataset.status="checking";
  $("connection").textContent="Checking the connection to the response server…";
  try{
    const result=await StudySubmission.requestJSON(endpoint.split("/api/")[0]+"/health",{},10000);
    if(result.ready!==true)throw Error("not ready");
    $("connection").dataset.status="ready";
    $("connection").textContent="Response server reachable. Your ratings will be submitted when you finish.";
  }catch{
    $("connection").dataset.status="unavailable";
    $("connection").textContent="The response server could not be reached from this browser. If you continue, download your ratings at the end and send the file to the organizer if submission fails. You can also try another connection before starting.";
  }
}
async function init(){
  save();
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(state.secret)));
  participant="RK-"+Array.from(digest.slice(0,10),b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
  $("identity").textContent=(preview?"Preview · ":"")+"Participant "+participant+(persistent?"":" · Browser storage is unavailable. Keep this tab open.");
  $("size").textContent=trials.size+" pairs · 3 ratings per pair";
  $("counter").textContent=trials.size+" questions";
  for(const [name,title,question,options] of metrics){
    const field=document.createElement("fieldset");
    field.innerHTML="<legend>"+title+"</legend><p>"+question+"</p><div class='scale'>"+options.map((v,i)=>'<label><input required type="radio" name="'+name+'" value="'+(i+1)+'"><b>'+(i+1)+'</b><span>'+v+'</span></label>').join("")+"</div>";
    if(name==="similarity"){
      const guide=document.createElement("p");
      guide.className="rating-guidance";
      guide.innerHTML=similarityGuidance;
      field.querySelector(".scale").before(guide);
    }
    $("ratings").append(field);
  }
  $("start").onclick=()=>{state.started=true;save();update();};
  $("prev").onclick=()=>{if(state.index>0){state.index--;save();update();}};
  $("ratings").onchange=()=>{
    state.answers[state.order[state.index]]=Object.fromEntries([...new FormData($("form"))].map(([k,v])=>[k,Number(v)]));
    save();
  };
  $("form").onsubmit=e=>{
    e.preventDefault();if(!$("form").reportValidity())return;
    if(state.index===trials.size-1){stopAudio();state.finished=true;}else{state.index++;}
    save();update();window.scrollTo(0,0);if(state.finished)submit();
  };
  $("retry").onclick=submit;$("download").onclick=backup;
  $("review").onclick=()=>{if(!busy&&!state.receipt){state.finished=false;state.index=0;save();update();}};
  document.addEventListener("play",e=>{if(e.target instanceof HTMLAudioElement){for(const a of document.querySelectorAll("audio"))if(a!==e.target)a.pause();}},true);
  window.addEventListener("online",()=>{checkConnection();if(state.finished&&!state.receipt&&Date.now()-lastAttempt>30000)submit();});
  update();checkConnection();if(state.finished&&!state.receipt)submit();
}
init().catch(()=>{$("identity").textContent="Please open this study in a browser with HTTPS and audio playback enabled.";});
