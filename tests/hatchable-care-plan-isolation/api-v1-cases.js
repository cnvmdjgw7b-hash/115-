import { db } from "hatchable";
export const access = "member";
export const methods = ["GET","POST","PUT"];
const respond=(res,status,body)=>{res.setHeader("Cache-Control","no-store");return res.status(status).json(body)};
const validUuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const fields="id,case_key AS case_code,patient_name AS display_name,revision,updated_at";
export default async function(req,res){
 const actor=String(req.member?.id||"");
 if(!actor)return respond(res,401,{error:"unauthorized"});
 if(req.method==="GET"){
  const id=req.query?.id;
  if(id){
   if(!validUuid(id))return respond(res,400,{error:"invalid_id"});
   const q=await db.query("SELECT "+fields+" FROM care_cases WHERE id=$1 AND updated_by=$2",[id,actor]);
   return q.rows.length?respond(res,200,{case:q.rows[0]}):respond(res,404,{error:"not_found"});
  }
  const q=await db.query("SELECT "+fields+" FROM care_cases WHERE updated_by=$1 ORDER BY updated_at DESC LIMIT 100",[actor]);
  return respond(res,200,{cases:q.rows});
 }
 const b=req.body||{},code=String(b.case_code||"").trim(),name=String(b.display_name||"").trim();
 if(!/^[A-Za-z0-9_-]{2,100}$/.test(code)||!name||name.length>100)return respond(res,400,{error:"invalid_case_input"});
 const revision=b.expected_revision;
 if(!Number.isInteger(revision)||revision<0)return respond(res,400,{error:"invalid_revision"});
 if(req.method==="POST"){
  if(revision!==0)return respond(res,400,{error:"create_revision_must_be_zero"});
  const q=await db.query("INSERT INTO care_cases(case_key,patient_name,source_name,source_date,effective_date,content,status,updated_by,revision) VALUES($1,$2,'isolated_v1_test','2026-11-15','2026-11-15','{}'::jsonb,'草稿',$3,1) ON CONFLICT(case_key) DO NOTHING RETURNING "+fields,[code,name,actor]);
  return q.rows.length?respond(res,201,{saved:true,case:q.rows[0]}):respond(res,409,{error:"duplicate_case_code"});
 }
 const id=b.id;
 if(!validUuid(id))return respond(res,400,{error:"invalid_id"});
 const q=await db.query("UPDATE care_cases SET patient_name=$1,revision=revision+1,updated_at=now() WHERE id=$2 AND case_key=$3 AND updated_by=$4 AND revision=$5 RETURNING "+fields,[name,id,code,actor,revision]);
 return q.rows.length?respond(res,200,{saved:true,case:q.rows[0]}):respond(res,409,{error:"revision_conflict_or_not_authorized"});
}