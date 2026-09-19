
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
async function api(url,opt={}){const r=await fetch(url,{credentials:"same-origin",...opt});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.message||d.error||`Request failed (${r.status})`);return d}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fmt(n){return Number(n||0).toFixed(1)}
async function me(){return api("/api/account/me")}
async function bootNav(){
  const m=await me(); $("#who")&&($("#who").textContent=`${m.display_name} · ${m.role}`);
  const linksByRole={
    teacher:[["/","My Dashboard"],["/teacher/","Teacher Portal"],["/attendance/","My Attendance"],["/timetable/","My Timetable"],["/reports/","My Reports"]],
    admin:[["/","Admin Dashboard"],["/admin/","Administration"],["/assessments/","Assessments"],["/approval/","Results Approval"],["/results/","Results Analysis"],["/reports/","Reports"],["/attendance/","Attendance"],["/timetable/","Timetable"],["/import-export/","Import / Export"]],
    hod:[["/","HOD Dashboard"],["/admin/","Administration"],["/assessments/","Assessments"],["/approval/","Results Approval"],["/results/","Results Analysis"],["/reports/","Reports"],["/attendance/","Attendance"],["/timetable/","Timetable"]],
    exam_officer:[["/","Exam Dashboard"],["/assessments/","Assessments"],["/approval/","Results Approval"],["/results/","Results Analysis"],["/reports/","Reports"]],
    parent:[["/","Parent Dashboard"],["/parent/","My Children & Results"],["/reports/","Report Forms"]],
    platform_admin:[["/","Platform Dashboard"]]
  };
  const links=linksByRole[m.role]||[]; const nav=$("#nav"); if(!nav)return m;
  nav.innerHTML=links.map(x=>`<a href="${x[0]}" class="${location.pathname===x[0]?"active":""}">${x[1]}</a>`).join("");
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
