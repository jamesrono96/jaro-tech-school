
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

const school = {
  id:"school1", name:"Jaro-Tech Demonstration School", curriculum:"IGCSE / CBC",
  current_term:"Term 2", academic_year:"2026", email_domain:"demo.school"
};

const subjects = [
  {id:"s0",name:"Mathematics",code:"MAT"},
  {id:"s1",name:"English Language",code:"ENG"},
  {id:"s2",name:"Integrated Science",code:"SCI"},
  {id:"s3",name:"ICT",code:"ICT"},
  {id:"s4",name:"Kiswahili",code:"KIS"}
];

const classes=[];
for(let g=7;g<=12;g++) for(const stream of ["A","B"])
  classes.push({id:`c${g}${stream}`,class_name:`Grade ${g}`,stream});

const teacherNames=["Alice Chebet","Brian Kiptoo","Caroline Wanjiku","Daniel Mwangi","Esther Jepchirchir","Felix Otieno","Grace Naliaka","Henry Kibet"];
const teachers=teacherNames.map((name,i)=>({
  id:`t${i}`,full_name:name,email:name.toLowerCase().replace(/ /g,".")+"@demo.school",
  active:true,subject_id:subjects[i%5].id,class_name:`Grade ${7+i%6}`,stream:i%2?"B":"A"
}));

const students=[];
for(let i=0;i<120;i++){
  const c=classes[i%classes.length];
  students.push({
    id:`st${i}`, admission_no:`DEMO-${String(i+1).padStart(3,"0")}`,
    full_name:`Student ${String(i+1).padStart(3,"0")}`,
    class_name:c.class_name,stream:c.stream,
    parent_name:`Parent ${String(i+1).padStart(3,"0")}`,
    parent_email:`parent${String(i+1).padStart(3,"0")}@demo.school`,active:true
  });
}

const assessments=[];
for(let s=0;s<5;s++) for(let j=0;j<3;j++)
  assessments.push({
    id:`a${s*3+j}`,name:["CAT 1","Mid Term","End Term"][j],term:"Term 2",
    max_score:100,subject_id:subjects[s].id,status:"open"
  });

const marks=new Map();
for(const a of assessments) for(const st of students){
  const score=40+((iHash(st.id)*7+iHash(a.id)*11)%61);
  marks.set(`${a.id}:${st.id}`,{
    assessment_id:a.id,student_id:st.id,score,approved:true,locked:true,submitted_by:"demo"
  });
}
function iHash(x){let n=0;for(const c of String(x))n=(n*31+c.charCodeAt(0))>>>0;return n;}

const attendance=new Map();
const timetable=[];
const days=["Monday","Tuesday","Wednesday","Thursday","Friday"];
for(let i=0;i<classes.length;i++) for(let p=1;p<=5;p++){
  timetable.push({
    id:`tt${i}-${p}`,class_name:classes[i].class_name,stream:classes[i].stream,
    day_of_week:days[(i+p)%5],period_no:p,start_time:`${String(7+p).padStart(2,"0")}:30`,
    end_time:`${String(8+p).padStart(2,"0")}:20`,subject_name:subjects[(i+p)%5].name,
    teacher_name:teachers[(i+p)%teachers.length].full_name,room:`Room ${(i%8)+1}`
  });
}

const users=new Map(), sessions=new Map();
function addUser(email,pw,role,name,extra={}) {
  users.set(email,{id:crypto.randomUUID(),email,passwordHash:bcrypt.hashSync(pw,10),role,display_name:name,...extra});
}
addUser("admin@demo.school","Admin123!","admin","Jaro-Tech Administrator");
teachers.forEach(t=>addUser(t.email,"Teacher123!","teacher",t.full_name,{teacher_id:t.id}));
for(let i=0;i<10;i++) addUser(`parent${String(i+1).padStart(3,"0")}@demo.school`,"Parent123!","parent",`Parent ${String(i+1).padStart(3,"0")}`,{student_ids:[students[i].id]});

function currentUser(req){ return sessions.get(req.cookies.jarotech_session); }
function auth(req,res,next){
  req.user=currentUser(req);
  if(!req.user) return res.status(401).json({error:"unauthorized",message:"Please sign in."});
  next();
}
function roles(...allowed){return (req,res,next)=>{
  if(!allowed.includes(req.user.role)) return res.status(403).json({error:"forbidden",message:"You do not have permission for this action."});
  next();
};}
function studentForParent(u,id){return u.role==="parent" && (u.student_ids||[]).includes(id);}
function avg(studentId, approvedOnly=false){
  const vals=[];
  for(const m of marks.values()){
    if(m.student_id!==studentId || (approvedOnly&&!m.approved)) continue;
    const a=assessments.find(x=>x.id===m.assessment_id); if(a) vals.push(m.score/a.max_score*100);
  }
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
}
function grade(p){return p>=80?"A":p>=70?"B":p>=60?"C":p>=50?"D":"E";}
function remark(g){return ({A:"Excellent",B:"Very Good",C:"Good",D:"Needs Improvement",E:"Below Standard"})[g];}
function visibleStudents(u){
  if(u.role==="parent") return students.filter(s=>(u.student_ids||[]).includes(s.id));
  if(u.role==="teacher"){
    const t=teachers.find(x=>x.id===u.teacher_id);
    return t?students.filter(s=>s.class_name===t.class_name&&s.stream===t.stream):[];
  }
  return students;
}
function nextId(prefix, arr){let n=arr.length;return `${prefix}${n}`;}

app.get("/health",(req,res)=>res.json({ok:true,service:"Jaro-Tech School Management System",version:"2.0"}));

app.post("/api/login",async(req,res)=>{
  const email=String(req.body.email||"").trim().toLowerCase(), password=String(req.body.password||"");
  const u=users.get(email);
  if(!u || !(await bcrypt.compare(password,u.passwordHash)))
    return res.status(401).json({error:"invalid_login",message:"Invalid email or password."});
  const token=crypto.randomBytes(32).toString("hex");
  sessions.set(token,u);
  res.cookie("jarotech_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60*1000});
  res.json({ok:true,user:{email:u.email,role:u.role,display_name:u.display_name}});
});
app.post("/api/logout",(req,res)=>{sessions.delete(req.cookies.jarotech_session);res.clearCookie("jarotech_session");res.json({ok:true});});
app.get("/api/account/me",auth,(req,res)=>res.json({email:req.user.email,role:req.user.role,display_name:req.user.display_name,school}));
app.get("/api/dashboard/summary",auth,(req,res)=>res.json({
  students:visibleStudents(req.user).length, teachers:teachers.length, subjects:subjects.length,
  assessments:assessments.length, marks:marks.size, role:req.user.role, school
}));

app.get("/api/students/list",auth,(req,res)=>{
  let list=visibleStudents(req.user);
  if(req.query.class_name) list=list.filter(s=>s.class_name===req.query.class_name);
  if(req.query.search){const q=String(req.query.search).toLowerCase();list=list.filter(s=>(s.full_name+" "+s.admission_no).toLowerCase().includes(q));}
  res.json({students:list});
});
app.get("/api/subjects/list",auth,(req,res)=>res.json(subjects));
app.get("/api/classes/list",auth,(req,res)=>res.json(classes));

app.get("/api/teacher/workspace",auth,roles("teacher","admin","hod"),(req,res)=>{
  const t=req.user.role==="teacher"?teachers.find(x=>x.id===req.user.teacher_id):teachers[0];
  const assigned=teachers.filter(x=>x.id===t.id).map(x=>({subject_id:x.subject_id,class_name:x.class_name,stream:x.stream}));
  res.json({teacher:t,school,role:req.user.role,assignments:assigned,subjects,
    assessments:assessments.filter(a=>a.subject_id===t.subject_id),
    students:students.filter(s=>s.class_name===t.class_name&&s.stream===t.stream)});
});

app.get("/api/marks/list",auth,(req,res)=>{
  let list=[...marks.values()];
  if(req.query.assessment_id) list=list.filter(m=>m.assessment_id===req.query.assessment_id);
  if(req.user.role==="parent") list=list.filter(m=>studentForParent(req.user,m.student_id)&&m.approved);
  if(req.user.role==="teacher"){const t=teachers.find(x=>x.id===req.user.teacher_id);if(t)list=list.filter(m=>{
    const a=assessments.find(x=>x.id===m.assessment_id),s=students.find(x=>x.id===m.student_id);
    return a&&a.subject_id===t.subject_id&&s&&s.class_name===t.class_name&&s.stream===t.stream;
  });}
  res.json(list);
});

app.post("/api/marks/bulk-save",auth,roles("teacher","admin","hod"),(req,res)=>{
  const a=assessments.find(x=>x.id===req.body.assessment_id);
  if(!a)return res.status(404).json({error:"assessment_not_found"});
  if(a.status==="locked")return res.status(400).json({error:"assessment_locked",message:"This assessment is locked."});
  if(req.user.role==="teacher"){
    const t=teachers.find(x=>x.id===req.user.teacher_id);
    if(!t||t.subject_id!==a.subject_id)return res.status(403).json({error:"wrong_subject"});
  }
  let saved=0;
  for(const row of req.body.rows||[]){
    const s=students.find(x=>x.id===row.student_id); const v=Number(row.score);
    if(!s||!Number.isFinite(v)||v<0||v>a.max_score)continue;
    if(req.user.role==="teacher"){
      const t=teachers.find(x=>x.id===req.user.teacher_id);
      if(s.class_name!==t.class_name||s.stream!==t.stream)continue;
    }
    const key=`${a.id}:${s.id}`,old=marks.get(key);
    if(old?.locked)continue;
    marks.set(key,{assessment_id:a.id,student_id:s.id,score:v,approved:false,locked:false,submitted_by:req.user.email});
    saved++;
  }
  res.json({ok:true,saved});
});

app.get("/api/admin/students",auth,roles("admin","hod"),(req,res)=>res.json({students}));
app.post("/api/admin/students",auth,roles("admin","hod"),(req,res)=>{
  const b=req.body||{};
  if(!b.full_name||!b.admission_no)return res.status(400).json({error:"name_and_admission_required"});
  if(students.some(s=>s.admission_no.toLowerCase()===String(b.admission_no).toLowerCase()))return res.status(409).json({error:"admission_exists"});
  const st={id:crypto.randomUUID(),admission_no:String(b.admission_no),full_name:String(b.full_name),class_name:b.class_name||"Grade 7",stream:b.stream||"A",parent_name:b.parent_name||"",parent_email:b.parent_email||"",active:true};
  students.push(st);res.json({ok:true,student:st});
});
app.patch("/api/admin/students/:id",auth,roles("admin","hod"),(req,res)=>{
  const s=students.find(x=>x.id===req.params.id);if(!s)return res.status(404).json({error:"student_not_found"});
  Object.assign(s,{full_name:req.body.full_name??s.full_name, class_name:req.body.class_name??s.class_name, stream:req.body.stream??s.stream, parent_name:req.body.parent_name??s.parent_name, parent_email:req.body.parent_email??s.parent_email, active:req.body.active??s.active});
  res.json({ok:true,student:s});
});

app.get("/api/admin/teachers",auth,roles("admin","hod"),(req,res)=>res.json({teachers}));
app.patch("/api/admin/teachers/:id",auth,roles("admin","hod"),(req,res)=>{
  const t=teachers.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:"teacher_not_found"});
  Object.assign(t,{active:req.body.active??t.active,subject_id:req.body.subject_id??t.subject_id,class_name:req.body.class_name??t.class_name,stream:req.body.stream??t.stream});
  res.json({ok:true,teacher:t});
});
app.get("/api/admin/structure",auth,roles("admin","hod"),(req,res)=>res.json({school,classes,subjects,teachers}));
app.get("/api/admin/demo-school",auth,roles("admin","hod"),(req,res)=>res.json({students:students.length,teachers:teachers.length,assessments:assessments.length,marks:marks.size}));

app.get("/api/admin/assessments",auth,roles("admin","hod","exam_officer"),(req,res)=>res.json({assessments}));
app.post("/api/admin/assessments",auth,roles("admin","hod","exam_officer"),(req,res)=>{
  const b=req.body||{}, sub=subjects.find(s=>s.id===b.subject_id);
  if(!sub||!b.name)return res.status(400).json({error:"subject_and_name_required"});
  const a={id:crypto.randomUUID(),name:String(b.name),term:b.term||school.current_term,max_score:Number(b.max_score)||100,subject_id:sub.id,status:"open"};
  assessments.push(a);res.json({ok:true,assessment:a});
});
app.patch("/api/admin/assessments/:id",auth,roles("admin","hod","exam_officer"),(req,res)=>{
  const a=assessments.find(x=>x.id===req.params.id);if(!a)return res.status(404).json({error:"assessment_not_found"});
  if(req.body.status&&["open","submitted","locked"].includes(req.body.status))a.status=req.body.status;
  res.json({ok:true,assessment:a});
});

app.get("/api/results/overview",auth,roles("admin","hod","exam_officer"),(req,res)=>{
  let list=students;
  if(req.query.class_name)list=list.filter(s=>s.class_name===req.query.class_name);
  const rows=list.map(s=>({...s,average:avg(s.id),grade:grade(avg(s.id)),entries:[...marks.values()].filter(m=>m.student_id===s.id).length}));
  res.json({students:rows.sort((a,b)=>b.average-a.average),classes:classes.map(c=>{const x=rows.filter(s=>s.class_name===c.class_name&&s.stream===c.stream);return {...c,students:x.length,class_average:x.length?x.reduce((a,s)=>a+s.average,0)/x.length:0};}),grades:[{grade:"A",min_score:80,max_score:100},{grade:"B",min_score:70,max_score:79.99},{grade:"C",min_score:60,max_score:69.99},{grade:"D",min_score:50,max_score:59.99},{grade:"E",min_score:0,max_score:49.99}]});
});
app.get("/api/results/student",auth,(req,res)=>{
  const s=students.find(x=>x.id===req.query.student_id);
  if(!s)return res.status(404).json({error:"student_not_found"});
  if(req.user.role==="parent"&&!studentForParent(req.user,s.id))return res.status(403).json({error:"child_not_linked"});
  if(req.user.role==="teacher"&&!visibleStudents(req.user).some(x=>x.id===s.id))return res.status(403).json({error:"student_not_assigned"});
  const rs=[...marks.values()].filter(m=>m.student_id===s.id&&(req.user.role!=="parent"||m.approved)).map(m=>{
    const a=assessments.find(x=>x.id===m.assessment_id),sub=subjects.find(x=>x.id===a.subject_id),p=m.score/a.max_score*100,g=grade(p);
    return {subject_id:sub.id,subject_name:sub.name,assessment_id:a.id,assessment_name:a.name,score:m.score,max_score:a.max_score,percentage:p,grade:g,remark:remark(g),approved:m.approved,locked:m.locked};
  });
  res.json({student:{...s,school_name:school.name,current_term:school.current_term},results:rs,average:rs.length?rs.reduce((a,x)=>a+x.percentage,0)/rs.length:0});
});
app.get("/api/results/approval",auth,roles("admin","hod","exam_officer"),(req,res)=>{
  const rows=[...marks.values()].filter(m=>!req.query.assessment_id||m.assessment_id===req.query.assessment_id);
  res.json({submitted:rows.length,approved:rows.filter(m=>m.approved).length,locked:rows.filter(m=>m.locked).length,rows});
});
app.post("/api/results/approve",auth,roles("admin","hod","exam_officer"),(req,res)=>{
  const a=assessments.find(x=>x.id===req.body.assessment_id);if(!a)return res.status(404).json({error:"assessment_not_found"});
  let n=0;for(const m of marks.values())if(m.assessment_id===a.id){m.approved=true;m.locked=true;n++;}
  a.status="locked";res.json({ok:true,approved:n});
});

app.get("/api/parent/dashboard",auth,roles("parent"),(req,res)=>res.json({
  children:students.filter(s=>studentForParent(req.user,s.id)).map(s=>({id:s.id,full_name:s.full_name,admission_no:s.admission_no,class_name:s.class_name,stream:s.stream,average:avg(s.id,true),entries:[...marks.values()].filter(m=>m.student_id===s.id&&m.approved).length}))
}));

app.get("/api/attendance/list",auth,(req,res)=>{
  const date=req.query.date||new Date().toISOString().slice(0,10);
  res.json(visibleStudents(req.user).map(s=>({...s,status:attendance.get(`${s.id}:${date}`)?.status||"Present",note:attendance.get(`${s.id}:${date}`)?.note||""})));
});
app.post("/api/attendance/save",auth,roles("teacher","admin","hod"),(req,res)=>{
  const s=students.find(x=>x.id===req.body.student_id);if(!s)return res.status(404).json({error:"student_not_found"});
  if(req.user.role==="teacher"&&!visibleStudents(req.user).some(x=>x.id===s.id))return res.status(403).json({error:"student_not_assigned"});
  const date=req.body.attendance_date||new Date().toISOString().slice(0,10);
  attendance.set(`${s.id}:${date}`,{status:req.body.status||"Present",note:req.body.note||""});res.json({ok:true});
});

app.get("/api/timetable/list",auth,(req,res)=>{
  let rows=timetable;
  if(req.query.class_name)rows=rows.filter(x=>x.class_name===req.query.class_name);
  if(req.query.stream)rows=rows.filter(x=>x.stream===req.query.stream);
  if(req.query.day)rows=rows.filter(x=>x.day_of_week===req.query.day);
  if(req.user.role==="teacher")rows=rows.filter(x=>x.teacher_name===req.user.display_name);
  res.json(rows);
});

app.get("/api/export/students.csv",auth,roles("admin","hod"),(req,res)=>{
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv=["Admission No,Name,Class,Stream,Parent Name,Parent Email,Active",...students.map(s=>[s.admission_no,s.full_name,s.class_name,s.stream,s.parent_name,s.parent_email,s.active].map(esc).join(","))].join("\n");
  res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition",'attachment; filename="students.csv"');res.send(csv);
});
app.post("/api/import/students",auth,roles("admin","hod"),(req,res)=>{
  const lines=String(req.body.csv||"").trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<2)return res.status(400).json({error:"csv_empty"});
  let added=0,skipped=0;
  for(const line of lines.slice(1)){
    const p=line.split(",").map(x=>x.trim().replace(/^"|"$/g,""));
    if(p.length<4||!p[0]||students.some(s=>s.admission_no===p[0])){skipped++;continue;}
    students.push({id:crypto.randomUUID(),admission_no:p[0],full_name:p[1],class_name:p[2],stream:p[3],parent_name:p[4]||"",parent_email:p[5]||"",active:(p[6]||"true").toLowerCase()!=="false"});
    added++;
  }
  res.json({ok:true,added,skipped,total:students.length});
});

app.use(express.static(path.join(__dirname,"public")));
app.get("*",(req,res)=>req.path.startsWith("/api/")?res.status(404).json({error:"route_not_found"}):res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Jaro-Tech running on ${PORT}`));
