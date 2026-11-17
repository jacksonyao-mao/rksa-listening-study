"use strict";
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
let state, participant, busy=false, persistent=true;
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
    $("submission").textContent=state.receipt ? "Ratings received. Confirmation "+state.receipt+"." : "Your answers are complete and ready to submit.";
    $("retry").hidden=Boolean(state.receipt);$("review").hidden=Boolean(state.receipt)||busy;return;
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
  const copy={version:data.version,participant,order:state.order,answers:state.answers,finished:state.finished,receipt:state.receipt||null};
  const url=URL.createObjectURL(new Blob([JSON.stringify(copy,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="ratings-"+data.version+"-"+participant+".json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function submit(){
  if(busy||state.receipt)return;
  busy=true;$("retry").disabled=true;$("review").hidden=true;$("submission").textContent="Sending your ratings…";
  try{
    const response=await fetch(endpoint,{method:"POST",credentials:"omit",
      headers:{"Content-Type":"text/plain;charset=UTF-8"},signal:AbortSignal.timeout(25000),
      body:JSON.stringify({version:data.version,secret:state.secret,order:state.order,answers:state.answers})});
    if(!response.ok)throw Error("submission");
    const result=await response.json();
    if(result.version!==data.version||result.participant!==participant||!result.receipt)throw Error("confirmation");
    state.receipt=result.receipt;save();update();
  }catch{
    $("submission").textContent="Submission has not been confirmed. Retry when connected, or download a copy of your ratings.";
    $("retry").hidden=false;$("review").hidden=false;
  }finally{busy=false;$("retry").disabled=false;}
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
  update();if(state.finished&&!state.receipt)submit();
}
init().catch(()=>{$("identity").textContent="Please open this study in a browser with HTTPS and audio playback enabled.";});
