
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
async function api(url,opt={}){const r=await fetch(url,{credentials:"same-origin",...opt});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.message||d.error||`Request failed (${r.status})`);return d}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fmt(n){return Number(n||0).toFixed(1)}
async function me(){return api("/api/account/me")}
async function bootNav(){
  const m=await me(); $("#who")&&($("#who").textContent=`${m.display_name} · ${m.role}`);
  const links=[
    ["/","Dashboard","all"],["/teacher/","Teacher Portal","teacher"],["/results/","Results","results"],
    ["/reports/","Reports","all"],["/attendance/","Attendance","teacher"],["/timetable/","Timetable","all"],
    ["/parent/","Parent Portal","parent"],["/admin/","Administration","admin"],
    ["/assessments/","Assessments","admin"],["/approval/","Approval","admin"],["/import-export/","Import / Export","admin"]
  ];
  const nav=$("#nav"); if(!nav)return;
  nav.innerHTML=links.filter(x=>{
    if(x[2]==="all")return true;
    if(x[2]==="teacher")return ["teacher","admin","hod"].includes(m.role);
    if(x[2]==="parent")return m.role==="parent";
    return ["admin","hod","exam_officer"].includes(m.role);
  }).map(x=>`<a href="${x[0]}" class="${location.pathname===x[0]?"active":""}">${x[1]}</a>`).join("");
  $("#logout")?.addEventListener("click",async()=>{await api("/api/logout",{method:"POST"});location="/login.html"});
  return m;
}
async function requirePage(){
  try{return await bootNav()}catch(e){location="/login.html";throw e}
}
function show(id,msg,type=""){const el=$(id);if(el)el.innerHTML=`<div class="alert ${type}">${esc(msg)}</div>`}
function fillSelect(el,items,valueKey,labelFn,placeholder){
  if(!el)return;el.innerHTML=(placeholder?`<option value="">${esc(placeholder)}</option>`:"")+items.map(x=>`<option value="${esc(x[valueKey])}">${esc(labelFn(x))}</option>`).join("");
}
