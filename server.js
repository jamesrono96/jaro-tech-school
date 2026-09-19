
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
  current_term:"Term 2", academic_year:"2026", email_domain:"demo.school", logoDataUrl:""
};

const gradingRules = [
  {id:"gA", grade:"A", min:80, max:100, remark:"Excellent"},
  {id:"gB", grade:"B", min:70, max:79.99, remark:"Very Good"},
  {id:"gC", grade:"C", min:60, max:69.99, remark:"Good"},
  {id:"gD", grade:"D", min:50, max:59.99, remark:"Needs Improvement"},
  {id:"gE", grade:"E", min:0, max:49.99, remark:"Below Standard"}
];

const subjects = [
  {id:"s0",name:"Mathematics",code:"MAT"},
  {id:"s1",name:"English Language",code:"ENG"},
  {id:"s2",name:"Integrated Science",code:"SCI"},
  {id:"s3",name:"ICT",code:"ICT"},
  {id:"s4",name:"Kiswahili",code:"KIS"}
];

const classes=[];
for(let g=7;g<=12;g++) for(const stream of ["A","B","C"])
  classes.push({id:`c${g}${stream}`,class_name:`Grade ${g}`,stream});

const teacherNames=["Alice Chebet","Brian Kiptoo","Caroline Wanjiku","Daniel Mwangi","Esther Jepchirchir","Felix Otieno","Grace Naliaka","Henry Kibet"];
const teachers=teacherNames.map((name,i)=>{
  const username=name.toLowerCase().replace(/[^a-z0-9]+/g,".").replace(/^\.|\.$/g,"");
  const a1={subject_id:subjects[i%5].id,class_name:`Grade ${7+i%6}`,stream:i%3===0?"A":i%3===1?"B":"C"};
  const a2=i%3===0?{subject_id:subjects[(i+2)%5].id,class_name:`Grade ${8+i%5}`,stream:i%2?"B":"A"}:null;
  const assignments=a2?[a1,a2]:[a1];
  return {id:`t${i}`,full_name:name,username,email:username+"@demo.school",active:true,subject_id:a1.subject_id,class_name:a1.class_name,stream:a1.stream,assignments};
});

const students=[];
for(let i=0;i<120;i++){
  const c=classes[i%classes.length];
  students.push({
    id:`st${i}`, admission_no:`DEMO-${String(i+1).padStart(3,"0")}`,
    full_name:`Student ${String(i+1).padStart(3,"0")}`,
    class_name:c.class_name,stream:c.stream,
    parent_name:`Parent ${String(i+1).padStart(3,"0")}`,
    parent_username:`parent${String(i+1).padStart(3,"0")}`,
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
const weekendDays=["Saturday","Sunday"];
const timetableConfig={
  lessonRequirements:{"Mathematics":5,"Integrated Science":5,"English Language":4,"ICT":2,"Kiswahili":3},
  periodsPerDay:6,
  remedialEnabled:true,
  remedialSlots:{early:"06:30-07:15",evening:"16:30-17:15",weekend:"08:00-09:00"},
  remedialDays:["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
};
const classTeachers=new Map();
for(let i=0;i<classes.length;i++) for(let p=1;p<=5;p++){
  timetable.push({
    id:`tt${i}-${p}`,class_name:classes[i].class_name,stream:classes[i].stream,
    day_of_week:days[(i+p)%5],period_no:p,start_time:`${String(7+p).padStart(2,"0")}:30`,
    end_time:`${String(8+p).padStart(2,"0")}:20`,subject_id:subjects[(i+p)%5].id,subject_name:subjects[(i+p)%5].name,
    teacher_id:teachers[(i+p)%teachers.length].id,teacher_name:teachers[(i+p)%teachers.length].full_name,room:`Room ${(i%8)+1}`
  });
}

const users=new Map(), sessions=new Map();
function addUser(email,pw,role,name,extra={}) {
  const username=extra.username||email.split("@")[0];
  const user={id:crypto.randomUUID(),email,username,passwordHash:bcrypt.hashSync(pw,10),role,display_name:name,...extra};
  users.set(email.toLowerCase(),user);
  users.set(username.toLowerCase(),user);
  return user;
}
function generatedParentCredentials(parentName, admissionNo){
  let base=String(parentName||"parent").toLowerCase().replace(/[^a-z0-9]+/g,".").replace(/^\.|\.$/g,"")||"parent";
  const suffix=String(admissionNo||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(-6);
  const root=base+(suffix?"."+suffix:"");
  let username=root,n=2;
  while(users.has(username)) username=root+n++;
  const email=username+"@"+school.email_domain;
  const password=crypto.randomBytes(9).toString("base64url").slice(0,12)+"A1!";
  return {username,email,password};
}
addUser("admin@demo.school","Admin123!","admin","Jaro-Tech Administrator");
teachers.forEach(t=>addUser(t.email,"Teacher123!","teacher",t.full_name,{teacher_id:t.id,username:t.username}));
for(let i=0;i<10;i++) addUser(`parent${String(i+1).padStart(3,"0")}@demo.school`,"Parent123!","parent",`Parent ${String(i+1).padStart(3,"0")}`,{username:`parent${String(i+1).padStart(3,"0")}`,student_ids:[students[i].id]});

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
function gradingFor(p){
  const n=Number(p)||0;
  return gradingRules.find(r=>n>=Number(r.min)&&n<=Number(r.max)) || gradingRules[gradingRules.length-1];
}
function grade(p){return gradingFor(p).grade;}
function remark(g){return gradingRules.find(r=>r.grade===g)?.remark || "";}
function streamKey(s){return `${s.class_name} ${s.stream}`;}
function studentAverage(sid, approvedOnly=false){
  const vals=[];
  for(const m of marks.values()){
    if(m.student_id!==sid || (approvedOnly&&!m.approved)) continue;
    const a=assessments.find(x=>x.id===m.assessment_id);
    if(a) vals.push(m.score/a.max_score*100);
  }
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
}
function visibleStudents(u){
  if(u.role==="parent") return students.filter(s=>(u.student_ids||[]).includes(s.id));
  if(u.role==="teacher"){
    const t=teachers.find(x=>x.id===u.teacher_id);
    const as=t?teacherAssignments(t):[]; const ct=teacherClassTeacherClasses(u.teacher_id);
    return t?students.filter(s=>as.some(a=>a.class_name===s.class_name&&a.stream===s.stream)||ct.some(c=>c.class_name===s.class_name&&c.stream===s.stream)):[];
  }
  return students;
}
function nextId(prefix, arr){let n=arr.length;return `${prefix}${n}`;}
function teacherAssignments(t){
  if(Array.isArray(t?.assignments) && t.assignments.length) return t.assignments;
  if(t?.subject_id && t?.class_name) return [{subject_id:t.subject_id,class_name:t.class_name,stream:t.stream||"A"}];
  return [];
}
function teacherHasAssignment(t, subjectId, className, stream){
  return teacherAssignments(t).some(a=>a.subject_id===subjectId && a.class_name===className && a.stream===stream);
}
function teacherSubjects(t){ return [...new Set(teacherAssignments(t).map(a=>a.subject_id))]; }
function teacherLessonCounts(teacherId){
  const byDay={Monday:0,Tuesday:0,Wednesday:0,Thursday:0,Friday:0}; let week=0;
  for(const x of timetable){ if(x.teacher_id!==teacherId || x.remedial) continue; week++; if(byDay[x.day_of_week]!==undefined) byDay[x.day_of_week]++; }
  return {byDay,week};
}
function isClassTeacher(teacherId,className,stream){ return classTeachers.get(`${className}|${stream}`)===teacherId; }
function teacherClassTeacherClasses(teacherId){ return [...classTeachers.entries()].filter(([k,v])=>v===teacherId).map(([k])=>{const [class_name,stream]=k.split("|");return {class_name,stream};}); }
function classTeacherFor(className,stream){ const id=classTeachers.get(`${className}|${stream}`); return teachers.find(t=>t.id===id)||null; }
function subjectRequirement(subjectId){ const sub=subjects.find(s=>s.id===subjectId); return timetableConfig.lessonRequirements[sub?.name] || 2; }
function slotTime(period){ const start=7+period; return {start_time:`${String(start).padStart(2,"0")}:30`,end_time:`${String(start).padStart(2,"0")}:?`}; }

app.get("/health",(req,res)=>res.json({ok:true,service:"Jaro-Tech School Management System",version:"7.0"}));

app.post("/api/login",async(req,res)=>{
  const login=String(req.body.email||req.body.username||"").trim().toLowerCase(), password=String(req.body.password||"");
  const u=users.get(login);
  if(!u || !(await bcrypt.compare(password,u.passwordHash)))
    return res.status(401).json({error:"invalid_login",message:"Invalid email or password."});
  const token=crypto.randomBytes(32).toString("hex");
  sessions.set(token,u);
  res.cookie("jarotech_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60*1000});
  res.json({ok:true,user:{email:u.email,role:u.role,display_name:u.display_name}});
});
app.post("/api/logout",(req,res)=>{sessions.delete(req.cookies.jarotech_session);res.clearCookie("jarotech_session");res.json({ok:true});});
app.get("/api/account/me",auth,(req,res)=>res.json({email:req.user.email,username:req.user.username,role:req.user.role,display_name:req.user.display_name,school}));
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
  const assigned=teacherAssignments(t); const subjectIds=teacherSubjects(t);
  const assignedStudents=t?students.filter(s=>assigned.some(a=>a.class_name===s.class_name&&a.stream===s.stream)):[];
  const ctClasses=t?teacherClassTeacherClasses(t.id):[];
  res.json({teacher:{...t,assignments:assigned,subject_ids:subjectIds,class_teacher_classes:ctClasses},school,role:req.user.role,assignments:assigned,subjects,
    assessments:assessments.filter(a=>subjectIds.includes(a.subject_id)), students:assignedStudents,
    classTeacherClasses:ctClasses.map(c=>({...c,teacher_id:t.id})),
    today:new Date().toLocaleDateString("en-US",{weekday:"long"}),
    dailyClasses:t? timetable.filter(x=>x.teacher_id===t.id).sort((a,b)=>days.indexOf(a.day_of_week)-days.indexOf(b.day_of_week)||a.period_no-b.period_no):[]
  });
});

app.get("/api/marks/list",auth,(req,res)=>{
  let list=[...marks.values()];
  if(req.query.assessment_id) list=list.filter(m=>m.assessment_id===req.query.assessment_id);
  if(req.user.role==="parent") list=list.filter(m=>studentForParent(req.user,m.student_id)&&m.approved);
  if(req.user.role==="teacher"){const t=teachers.find(x=>x.id===req.user.teacher_id);if(t)list=list.filter(m=>{
    const a=assessments.find(x=>x.id===m.assessment_id),s=students.find(x=>x.id===m.student_id);
    return a&&s&&teacherHasAssignment(t,a.subject_id,s.class_name,s.stream);
  });}
  res.json(list);
});

app.get("/api/teacher/performance",auth,roles("teacher","admin","hod"),(req,res)=>{
  const a=assessments.find(x=>x.id===req.query.assessment_id);
  if(!a)return res.status(404).json({error:"assessment_not_found"});
  const t=req.user.role==="teacher"?teachers.find(x=>x.id===req.user.teacher_id):teachers[0];
  if(!t || (req.user.role==="teacher" && !teacherSubjects(t).includes(a.subject_id)))return res.status(403).json({error:"wrong_subject"});
  const classStudents=students.filter(s=>teacherAssignments(t).some(x=>x.class_name===s.class_name&&x.stream===s.stream&&x.subject_id===a.subject_id));
  const rows=classStudents.map(s=>{const m=marks.get(`${a.id}:${s.id}`);const percentage=m?m.score/a.max_score*100:null;return {student_id:s.id,score:m?.score??null,percentage};}).filter(x=>x.percentage!==null).sort((x,y)=>y.percentage-x.percentage);
  let last=null,rank=0; rows.forEach((r,i)=>{if(r.percentage!==last)rank=i+1;r.rank=rank;last=r.percentage;});
  res.json({assessment:a,class_name:t.class_name,stream:t.stream,total_students:classStudents.length,entered:rows.length,rows});
});

app.post("/api/marks/bulk-save",auth,roles("teacher","admin","hod"),(req,res)=>{
  const a=assessments.find(x=>x.id===req.body.assessment_id);
  if(!a)return res.status(404).json({error:"assessment_not_found"});
  if(a.status==="locked")return res.status(400).json({error:"assessment_locked",message:"This assessment is locked."});
  if(req.user.role==="teacher"){
    const t=teachers.find(x=>x.id===req.user.teacher_id);
    if(!t||!teacherSubjects(t).includes(a.subject_id))return res.status(403).json({error:"wrong_subject"});
  }
  let saved=0;
  for(const row of req.body.rows||[]){
    const s=students.find(x=>x.id===row.student_id); const v=Number(row.score);
    if(!s||!Number.isFinite(v)||v<0||v>a.max_score)continue;
    if(req.user.role==="teacher"){
      const t=teachers.find(x=>x.id===req.user.teacher_id);
      if(!teacherHasAssignment(t,a.subject_id,s.class_name,s.stream))continue;
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
  const parentName=String(b.parent_name||"").trim();
  if(!parentName)return res.status(400).json({error:"parent_name_required",message:"Parent/guardian name is required."});
  const suppliedEmail=String(b.parent_email||"").trim().toLowerCase();
  let parentUser=suppliedEmail?users.get(suppliedEmail):null;
  if(parentUser && parentUser.role!=="parent")return res.status(409).json({error:"parent_email_in_use",message:"That email already belongs to another account."});
  let credentials=null;
  if(!parentUser){
    credentials=generatedParentCredentials(parentName,b.admission_no);
    parentUser=addUser(credentials.email,credentials.password,"parent",parentName,{username:credentials.username,student_ids:[]});
  }
  const st={id:crypto.randomUUID(),admission_no:String(b.admission_no),full_name:String(b.full_name),class_name:b.class_name||"Grade 7",stream:b.stream||"A",parent_name:parentName,parent_username:parentUser.username,parent_email:parentUser.email,active:true};
  students.push(st);
  parentUser.student_ids=Array.from(new Set([...(parentUser.student_ids||[]),st.id]));
  res.json({ok:true,student:st,parent:{name:parentUser.display_name,username:parentUser.username,email:parentUser.email,newAccount:!!credentials,credentials}});
});
app.patch("/api/admin/students/:id",auth,roles("admin","hod"),(req,res)=>{
  const s=students.find(x=>x.id===req.params.id);if(!s)return res.status(404).json({error:"student_not_found"});
  Object.assign(s,{full_name:req.body.full_name??s.full_name, class_name:req.body.class_name??s.class_name, stream:req.body.stream??s.stream, parent_name:req.body.parent_name??s.parent_name, parent_email:req.body.parent_email??s.parent_email, active:req.body.active??s.active});
  res.json({ok:true,student:s});
});

app.get("/api/admin/parents",auth,roles("admin","hod"),(req,res)=>{
  const seen=new Set();
  const parents=[...users.values()].filter(u=>u.role==="parent"&&u.email&&!seen.has(u.id)).map(u=>{seen.add(u.id);return {id:u.id,name:u.display_name,username:u.username,email:u.email,student_ids:u.student_ids||[]};});
  res.json({parents});
});
app.post("/api/admin/parents/:id/reset-password",auth,roles("admin","hod"),(req,res)=>{
  const u=[...users.values()].find(x=>x.id===req.params.id&&x.role==="parent");
  if(!u)return res.status(404).json({error:"parent_not_found"});
  const password=crypto.randomBytes(9).toString("base64url").slice(0,12)+"A1!";
  u.passwordHash=bcrypt.hashSync(password,10);
  res.json({ok:true,credentials:{username:u.username,email:u.email,password}});
});
app.get("/api/admin/teachers",auth,roles("admin","hod"),(req,res)=>res.json({teachers:teachers.map(t=>({...t,class_teacher_classes:teacherClassTeacherClasses(t.id)}))}));
app.post("/api/admin/teachers",auth,roles("admin","hod"),(req,res)=>{
  const b=req.body||{}, fullName=String(b.full_name||"").trim();
  const raw=Array.isArray(b.assignments)?b.assignments:[];
  if(!fullName||!raw.length)return res.status(400).json({error:"teacher_details_required",message:"Name and at least one teaching assignment are required."});
  const assignments=[]; const seen=new Set();
  for(const x of raw){const a={subject_id:String(x.subject_id||""),class_name:String(x.class_name||""),stream:String(x.stream||"A")};const key=`${a.subject_id}|${a.class_name}|${a.stream}`;if(!a.subject_id||!a.class_name||seen.has(key))continue;if(!subjects.some(s=>s.id===a.subject_id))return res.status(400).json({error:"subject_not_found"});if(!classes.some(c=>c.class_name===a.class_name&&c.stream===a.stream))return res.status(400).json({error:"class_not_found"});seen.add(key);assignments.push(a);}
  if(!assignments.length)return res.status(400).json({error:"teacher_details_required"});
  if(new Set(assignments.map(a=>a.subject_id)).size>2)return res.status(400).json({error:"max_two_subjects",message:"A teacher can teach a maximum of two subjects."});
  let base=fullName.toLowerCase().replace(/[^a-z0-9]+/g,".").replace(/^\.|\.$/g,"")||"teacher", username=base,n=2; while(teachers.some(t=>t.username===username))username=`${base}${n++}`;
  const email=`${username}@${school.email_domain}`,password=crypto.randomBytes(6).toString("base64url").slice(0,10)+"A1!";
  const first=assignments[0],t={id:crypto.randomUUID(),full_name:fullName,username,email,active:true,subject_id:first.subject_id,class_name:first.class_name,stream:first.stream,assignments};
  teachers.push(t); addUser(email,password,"teacher",fullName,{teacher_id:t.id,username});
  res.json({ok:true,teacher:t,credentials:{username,password,email}});
});
app.patch("/api/admin/teachers/:id",auth,roles("admin","hod"),(req,res)=>{
  const t=teachers.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:"teacher_not_found"});
  if(req.body.assignments){const as=req.body.assignments.map(a=>({subject_id:String(a.subject_id),class_name:String(a.class_name),stream:String(a.stream||"A")}));if(new Set(as.map(a=>a.subject_id)).size>2)return res.status(400).json({error:"max_two_subjects",message:"A teacher can teach a maximum of two subjects."});if(as.some(a=>!subjects.some(s=>s.id===a.subject_id)||!classes.some(c=>c.class_name===a.class_name&&c.stream===a.stream)))return res.status(400).json({error:"invalid_assignment"});t.assignments=as;if(as[0])Object.assign(t,{subject_id:as[0].subject_id,class_name:as[0].class_name,stream:as[0].stream});}
  if(req.body.active!==undefined)t.active=!!req.body.active; res.json({ok:true,teacher:t});
});
app.get("/api/admin/class-teachers",auth,roles("admin","hod"),(req,res)=>{
  res.json({assignments:classes.map(c=>({class_name:c.class_name,stream:c.stream,teacher:classTeacherFor(c.class_name,c.stream)?{id:classTeacherFor(c.class_name,c.stream).id,name:classTeacherFor(c.class_name,c.stream).full_name}:null})),teachers});
});
app.post("/api/admin/class-teachers",auth,roles("admin","hod"),(req,res)=>{
  const {class_name,stream,teacher_id}=req.body||{};
  if(!classes.some(c=>c.class_name===class_name&&c.stream===stream)) return res.status(400).json({error:"class_not_found"});
  if(teacher_id && !teachers.some(t=>t.id===teacher_id)) return res.status(400).json({error:"teacher_not_found"});
  const key=`${class_name}|${stream}`;
  if(teacher_id) classTeachers.set(key,teacher_id); else classTeachers.delete(key);
  res.json({ok:true,assignment:{class_name,stream,teacher:teacher_id?teachers.find(t=>t.id===teacher_id):null}});
});
app.get("/api/admin/timetable-config",auth,roles("admin","hod"),(req,res)=>res.json({config:timetableConfig}));
app.patch("/api/admin/timetable-config",auth,roles("admin","hod"),(req,res)=>{
  const b=req.body||{};
  if(b.lessonRequirements) for(const [name,val] of Object.entries(b.lessonRequirements)){ if(subjects.some(s=>s.name===name)) timetableConfig.lessonRequirements[name]=Math.max(1,Math.min(10,Number(val)||1)); }
  if(b.periodsPerDay!==undefined) timetableConfig.periodsPerDay=Math.max(1,Math.min(8,Number(b.periodsPerDay)||6));
  if(b.remedialEnabled!==undefined) timetableConfig.remedialEnabled=!!b.remedialEnabled;
  if(b.remedialSlots) timetableConfig.remedialSlots={...timetableConfig.remedialSlots,...b.remedialSlots};
  if(Array.isArray(b.remedialDays)) timetableConfig.remedialDays=b.remedialDays.filter(d=>[...days,...weekendDays].includes(d));
  res.json({ok:true,config:timetableConfig});
});
app.post("/api/admin/timetable/generate",auth,roles("admin","hod"),(req,res)=>{
  const includeRemedial=!!req.body?.include_remedial;
  const core=timetable.filter(x=>!x.remedial); timetable.splice(0,timetable.length,...core);
  const generated=[]; const teacherBusy=new Set(), classBusy=new Set(); const load=new Map();
  for(const t of teachers) load.set(t.id,{byDay:{Monday:0,Tuesday:0,Wednesday:0,Thursday:0,Friday:0},week:0});
  const periods=Math.max(1,timetableConfig.periodsPerDay);
  const classesWithAssignments=classes.map(c=>({c,as:teachers.flatMap(t=>teacherAssignments(t).filter(a=>a.class_name===c.class_name&&a.stream===c.stream).map(a=>({...a,teacher:t})))}));
  for(const {c,as} of classesWithAssignments){
    const grouped=[...new Map(as.map(a=>[a.subject_id,a])).values()];
    for(const a of grouped){
      let needed=subjectRequirement(a.subject_id), placed=0;
      const shuffled=[...days].sort((x,y)=>x.localeCompare(y));
      for(const day of shuffled){ for(let p=1;p<=periods && placed<needed;p++){
        const keyC=`${c.class_name}|${c.stream}|${day}|${p}`, keyT=`${a.teacher.id}|${day}|${p}`; const L=load.get(a.teacher.id);
        if(classBusy.has(keyC)||teacherBusy.has(keyT)||L.byDay[day]>=6||L.week>=24) continue;
        const sub=subjects.find(s=>s.id===a.subject_id); const start=7+p, row={id:crypto.randomUUID(),class_name:c.class_name,stream:c.stream,day_of_week:day,period_no:p,start_time:`${String(start).padStart(2,"0")}:30`,end_time:`${String(start+0).padStart(2,"0")}:?`,subject_id:a.subject_id,subject_name:sub.name,teacher_id:a.teacher.id,teacher_name:a.teacher.full_name,room:"",remedial:false};
        timetable.push(row); generated.push(row); classBusy.add(keyC);teacherBusy.add(keyT);L.byDay[day]++;L.week++;placed++;
      }}
      if(placed<needed) return res.status(409).json({error:"timetable_capacity",message:`Could not place all ${sub.name} lessons for ${c.class_name} ${c.stream}. Check teacher assignments/workload limits.`});
    }
  }
  if(includeRemedial && timetableConfig.remedialEnabled){
    const remedialTeachers=teachers.slice(); let ri=0;
    for(const {c} of classesWithAssignments){ const t=remedialTeachers[ri++%remedialTeachers.length]; if(!t) continue; const day=timetableConfig.remedialDays[ri%timetableConfig.remedialDays.length]; const period=day==="Saturday"||day==="Sunday"?1:0; const slot=day==="Saturday"||day==="Sunday"?timetableConfig.remedialSlots.weekend:(ri%2?timetableConfig.remedialSlots.early:timetableConfig.remedialSlots.evening); const [st,en]=slot.split("-"); const sub=subjects[0]; timetable.push({id:crypto.randomUUID(),class_name:c.class_name,stream:c.stream,day_of_week:day,period_no:period,start_time:st,end_time:en,subject_id:sub.id,subject_name:sub.name,teacher_id:t.id,teacher_name:t.full_name,room:"",remedial:true}); }
  }
  res.json({ok:true,generated:generated.length,total:timetable.length,remedial:includeRemedial});
});
app.get("/api/admin/school-settings",auth,roles("admin","hod"),(req,res)=>res.json({school}));
app.patch("/api/admin/school-settings",auth,roles("admin","hod"),(req,res)=>{
  const b=req.body||{};
  if(b.name!==undefined) school.name=String(b.name).trim()||school.name;
  if(b.curriculum!==undefined) school.curriculum=String(b.curriculum).trim()||school.curriculum;
  if(b.logoDataUrl!==undefined){
    const logo=String(b.logoDataUrl||"");
    if(logo && !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(logo))return res.status(400).json({error:"invalid_logo",message:"Upload a PNG, JPG or WebP image."});
    if(logo.length>2_000_000)return res.status(400).json({error:"logo_too_large",message:"Logo is too large. Please use an image below about 1.5 MB."});
    school.logoDataUrl=logo;
  }
  res.json({ok:true,school});
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
  if(req.body.status&&["open","submitted","locked"].includes(req.body.status)){
    a.status=req.body.status;
    if(a.status==="locked") for(const m of marks.values()) if(m.assessment_id===a.id) m.locked=true;
  }
  res.json({ok:true,assessment:a});
});

app.get("/api/results/overview",auth,roles("admin","hod","exam_officer"),(req,res)=>{
  let list=students;
  if(req.query.class_name)list=list.filter(s=>s.class_name===req.query.class_name);
  if(req.query.stream)list=list.filter(s=>s.stream===req.query.stream);
  const rows=list.map(s=>({...s,average:studentAverage(s.id),grade:grade(studentAverage(s.id)),entries:[...marks.values()].filter(m=>m.student_id===s.id).length}));
  const groups=new Map();
  for(const s of rows){const k=streamKey(s);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);}
  const streams=[...groups.entries()].map(([key,arr])=>({
    stream:key,class_name:arr[0].class_name,stream_code:arr[0].stream,students:arr.length,
    stream_mean:arr.length?arr.reduce((a,s)=>a+s.average,0)/arr.length:0,
    leading_student:arr.slice().sort((a,b)=>b.average-a.average)[0]?.full_name||""
  })).sort((a,b)=>b.stream_mean-a.stream_mean).map((x,i)=>({...x,rank:i+1}));
  const streamRank=new Map(streams.map(x=>[x.stream,x.rank]));
  const studentRanks=new Map();
  for(const arr of groups.values()){arr.slice().sort((a,b)=>b.average-a.average).forEach((s,i)=>studentRanks.set(s.id,i+1));}
  rows.forEach(s=>{s.stream_mean=streams.find(x=>x.stream===streamKey(s))?.stream_mean||0;s.stream_rank=streamRank.get(streamKey(s));s.stream_student_rank=studentRanks.get(s.id);});
  res.json({students:rows.sort((a,b)=>{const sr=(a.stream_rank||999)-(b.stream_rank||999);return sr||((a.stream_student_rank||999)-(b.stream_student_rank||999));}),streams,grades:gradingRules});
});

app.get("/api/admin/grading",auth,roles("admin","hod"),(req,res)=>res.json({rules:gradingRules}));
app.patch("/api/admin/grading",auth,roles("admin","hod"),(req,res)=>{
  const incoming=Array.isArray(req.body.rules)?req.body.rules:[];
  if(!incoming.length)return res.status(400).json({error:"grading_rules_required"});
  const cleaned=incoming.map((r,i)=>({id:r.id||`g${i}`,grade:String(r.grade||"").trim().toUpperCase(),min:Number(r.min),max:Number(r.max),remark:String(r.remark||"").trim()}));
  if(cleaned.some(r=>!r.grade||!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.min<0||r.max>100||r.min>r.max))return res.status(400).json({error:"invalid_grading_rules"});
  cleaned.sort((a,b)=>b.min-a.min);
  for(let i=0;i<cleaned.length-1;i++) if(cleaned[i].min<=cleaned[i+1].max) return res.status(400).json({error:"grading_ranges_overlap"});
  gradingRules.splice(0,gradingRules.length,...cleaned);
  res.json({ok:true,rules:gradingRules});
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
  res.json({student:{...s,school_name:school.name,current_term:school.current_term,logoDataUrl:school.logoDataUrl},results:rs,average:rs.length?rs.reduce((a,x)=>a+x.percentage,0)/rs.length:0});
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

app.get("/api/class-teacher/dashboard",auth,roles("teacher","admin","hod"),(req,res)=>{
  const tid=req.user.role==="teacher"?req.user.teacher_id:req.query.teacher_id;
  const assigned=teacherClassTeacherClasses(tid); if(!assigned.length)return res.json({classes:[],students:[],subjects:[]});
  const rows=assigned.map(c=>{
    const ss=students.filter(s=>s.class_name===c.class_name&&s.stream===c.stream);
    const subjectStats=subjects.map(sub=>{
      const scored=ss.map(st=>{const ms=[...marks.values()].filter(m=>m.student_id===st.id&&m.approved); const subj=ms.filter(m=>assessments.find(a=>a.id===m.assessment_id)?.subject_id===sub.id); return subj.length?{student:st,percentage:subj.reduce((z,m)=>{const a=assessments.find(a=>a.id===m.assessment_id);return z+m.score/a.max_score*100},0)/subj.length}:null}).filter(Boolean).sort((a,b)=>b.percentage-a.percentage);
      return {subject:sub.name,mean:scored.length?scored.reduce((a,b)=>a+b.percentage,0)/scored.length:0,ranks:scored.map((x,i)=>({student_id:x.student.id,student:x.student.full_name,percentage:x.percentage,rank:i+1}))};
    });
    const av=ss.map(st=>({student:st,average:studentAverage(st.id,true)})).sort((a,b)=>b.average-a.average);
    return {...c,students:ss.length,stream_mean:av.length?av.reduce((a,b)=>a+b.average,0)/av.length:0,subject_means:subjectStats,student_ranks:av.map((x,i)=>({...x.student,average:x.average,rank:i+1}))};
  });
  const classTeacherStudents=assigned.flatMap(c=>students.filter(s=>s.class_name===c.class_name&&s.stream===c.stream));
  res.json({classes:rows,students:classTeacherStudents});
});
app.post("/api/class-teacher/students",auth,roles("teacher"),(req,res)=>{
  const {full_name,admission_no,class_name,stream,parent_name,parent_email}=req.body||{};
  if(!full_name||!admission_no||!class_name||!stream||!parent_name)return res.status(400).json({error:"student_and_parent_details_required"});
  if(!isClassTeacher(req.user.teacher_id,class_name,stream))return res.status(403).json({error:"not_class_teacher"});
  if(students.some(s=>s.admission_no===admission_no))return res.status(409).json({error:"admission_exists"});
  const student={id:crypto.randomUUID(),admission_no:String(admission_no),full_name:String(full_name),class_name:String(class_name),stream:String(stream),parent_name:String(parent_name),parent_email:String(parent_email||""),active:true};
  students.push(student);
  const creds=generatedParentCredentials(parent_name,student.admission_no); const pu=addUser(creds.email,creds.password,"parent",parent_name,{username:creds.username,student_ids:[student.id]}); student.parent_username=pu.username; student.parent_email=pu.email;
  res.json({ok:true,student,credentials:creds});
});
app.get("/api/attendance/list",auth,(req,res)=>{
  const date=req.query.date||new Date().toISOString().slice(0,10), session=req.query.session||"morning";
  let list=visibleStudents(req.user);
  if(req.user.role==="teacher") list=list.filter(s=>isClassTeacher(req.user.teacher_id,s.class_name,s.stream));
  res.json(list.map(s=>({...s,status:attendance.get(`${s.id}:${date}:${session}`)?.status||"Present",note:attendance.get(`${s.id}:${date}:${session}`)?.note||"",session})));
});
app.post("/api/attendance/save",auth,roles("teacher","admin","hod"),(req,res)=>{
  const s=students.find(x=>x.id===req.body.student_id);if(!s)return res.status(404).json({error:"student_not_found"});
  if(req.user.role==="teacher"&&!isClassTeacher(req.user.teacher_id,s.class_name,s.stream))return res.status(403).json({error:"not_class_teacher",message:"Only the assigned class teacher can record attendance for this class."});
  const date=req.body.attendance_date||new Date().toISOString().slice(0,10), session=req.body.session||"morning";
  if(!["morning","evening"].includes(session))return res.status(400).json({error:"invalid_session"});
  attendance.set(`${s.id}:${date}:${session}`,{status:req.body.status||"Present",note:req.body.note||""});res.json({ok:true});
});

app.get("/api/timetable/list",auth,(req,res)=>{
  if(req.user.role==="parent")return res.status(403).json({error:"parent_timetable_hidden",message:"Parents only have access to student results."});
  let rows=timetable; if(req.query.class_name)rows=rows.filter(x=>x.class_name===req.query.class_name); if(req.query.stream)rows=rows.filter(x=>x.stream===req.query.stream); if(req.query.day)rows=rows.filter(x=>x.day_of_week===req.query.day); if(req.user.role==="teacher")rows=rows.filter(x=>x.teacher_id===req.user.teacher_id);
  res.json(rows.slice().sort((a,b)=>days.indexOf(a.day_of_week)-days.indexOf(b.day_of_week)||a.period_no-b.period_no));
});
app.get("/api/admin/teacher-load/:id",auth,roles("admin","hod"),(req,res)=>{const t=teachers.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:"teacher_not_found"});res.json({teacher:t,assignments:teacherAssignments(t),subjects:teacherSubjects(t),load:teacherLessonCounts(t.id)});});
app.get("/api/admin/timetable",auth,roles("admin","hod"),(req,res)=>res.json({rows:timetable,teachers:teachers.map(t=>({...t,assignments:teacherAssignments(t),subject_ids:teacherSubjects(t)})),subjects,classes}));
app.post("/api/admin/timetable",auth,roles("admin","hod"),(req,res)=>{
  const b=req.body||{},t=teachers.find(x=>x.id===b.teacher_id),sub=subjects.find(x=>x.id===b.subject_id); if(!t||!sub||!b.class_name||!b.stream||!b.day_of_week||!b.period_no)return res.status(400).json({error:"timetable_details_required"});
  const day=String(b.day_of_week),period=Number(b.period_no),className=String(b.class_name),stream=String(b.stream); if(!days.includes(day)||!Number.isInteger(period)||period<1)return res.status(400).json({error:"invalid_schedule"});
  if(!teacherHasAssignment(t,sub.id,className,stream))return res.status(400).json({error:"teacher_assignment_required",message:"This subject and class are not assigned to the teacher."});
  const remedial=!!b.remedial;
  if(!remedial){ const load=teacherLessonCounts(t.id); if(load.byDay[day]>=6)return res.status(400).json({error:"daily_limit",message:"A teacher can teach a maximum of 6 regular lessons per day."}); if(load.week>=24)return res.status(400).json({error:"weekly_limit",message:"A teacher can teach a maximum of 24 regular lessons per week."}); }
  if(!remedial && timetable.some(x=>!x.remedial&&x.teacher_id===t.id&&x.day_of_week===day&&x.period_no===period))return res.status(409).json({error:"teacher_period_conflict",message:"Teacher already has a regular lesson in this period."});
  if(!remedial && timetable.some(x=>!x.remedial&&x.class_name===className&&x.stream===stream&&x.day_of_week===day&&x.period_no===period))return res.status(409).json({error:"class_period_conflict",message:"This class already has a regular lesson in this period."});
  const row={id:crypto.randomUUID(),class_name:className,stream,day_of_week:day,period_no:period,start_time:String(b.start_time||"08:00"),end_time:String(b.end_time||"08:40"),subject_id:sub.id,subject_name:sub.name,teacher_id:t.id,teacher_name:t.full_name,room:String(b.room||""),remedial}; timetable.push(row); res.json({ok:true,row,teacherLoad:teacherLessonCounts(t.id)});
});
app.delete("/api/admin/timetable/:id",auth,roles("admin","hod"),(req,res)=>{const i=timetable.findIndex(x=>x.id===req.params.id);if(i<0)return res.status(404).json({error:"timetable_entry_not_found"});timetable.splice(i,1);res.json({ok:true});});

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
