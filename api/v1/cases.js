import {db} from "hatchable";
import {uuid,actorOf,audit,permit,mayCreateCase,grantOwnCase} from "lib/yhn-access.js";
export const access="member";export const methods=["GET","POST","PUT"];
const fields="id,case_key AS case_code,patient_name AS display_name,revision,updated_at";
const out=(res,status,body)=>{res.setHeader("Cache-Control","no-store");return res.status(status).json(body)};
export default async function(req,res){
 const actor=actorOf(req),b=req.body||{};if(!actor)return out(res,401,{error:"unauthorized"});
 if(req.method==="GET"){
  const id=req.query?.id;
  if(id){if(!uuid(id))return out(res,400,{error:"invalid_id"});if(!await permit(actor,id,"read","cases.get"))return out(res,404,{error:"not_found"});
   const q=await db.query("SELECT "+fields+" FROM care_cases WHERE id=$1",[id]);return q.rows.length?out(res,200,{case:q.rows[0]}):out(res,404,{error:"not_found"});}
  const q=await db.query("SELECT "+fields+" FROM care_cases c WHERE EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.case_id=c.id AND g.actor_id=$1 AND g.permission='read' AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()) AND g.revoked_at IS NULL) ORDER BY updated_at DESC LIMIT 100",[actor]);
  await audit(actor,null,"cases.list",true,null,{count:q.rows.length});return out(res,200,{cases:q.rows});
 }
 const code=String(b.case_code||"").trim(),name=String(b.display_name||"").trim();
 if(!/^[A-Za-z0-9_-]{2,100}$/.test(code)||!name||name.length>100)return out(res,400,{error:"invalid_case_input"});
 if(!Number.isInteger(b.expected_revision)||b.expected_revision<0)return out(res,400,{error:"invalid_revision"});
 if(req.method==="POST"){
  if(b.expected_revision!==0)return out(res,400,{error:"create_revision_must_be_zero"});
  if(!await mayCreateCase(actor)){await audit(actor,null,"cases.create",false);return out(res,403,{error:"not_authorized"});}
  const q=await db.query("INSERT INTO care_cases(case_key,patient_name,source_name,source_date,effective_date,content,status,updated_by,revision) VALUES($1,$2,'isolated_v1_test','2026-11-15','2026-11-15','{}'::jsonb,'草稿',$3,1) ON CONFLICT(case_key) DO NOTHING RETURNING "+fields,[code,name,actor]);
  if(!q.rows.length){await audit(actor,null,"cases.create",false,null,{reason:"duplicate"});return out(res,409,{error:"duplicate_case_code"});}
  await grantOwnCase(actor,q.rows[0].id);await audit(actor,q.rows[0].id,"cases.create",true);return out(res,201,{saved:true,case:q.rows[0]});
 }
 if(!uuid(b.id))return out(res,400,{error:"invalid_id"});
 if(!await permit(actor,b.id,"write","cases.update"))return out(res,404,{error:"not_found"});
 const q=await db.query("UPDATE care_cases SET patient_name=$1,revision=revision+1,updated_at=now() WHERE id=$2 AND case_key=$3 AND revision=$4 RETURNING "+fields,[name,b.id,code,b.expected_revision]);
 if(!q.rows.length){await audit(actor,b.id,"cases.update.conflict",false);return out(res,409,{error:"revision_conflict_or_not_authorized"});}
 return out(res,200,{saved:true,case:q.rows[0]});
}