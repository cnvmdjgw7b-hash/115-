import {db} from "hatchable";
import {uuid,actorOf,audit,permit,mayCreateCase,visibleCases,roleOf} from "lib/yhn-access.js";
export const access="member";export const methods=["GET","POST","PUT"];
const fields="c.id,c.case_key AS case_code,c.patient_name AS display_name,c.revision,c.updated_at";
const out=(res,status,body)=>{res.setHeader("Cache-Control","no-store");return res.status(status).json(body)};
export default async function(req,res){
 const actor=actorOf(req),b=req.body||{};if(!actor)return out(res,401,{error:"unauthorized"});
 if(!await roleOf(actor))return out(res,403,{error:"role_not_authorized"});
 if(req.method==="GET"){
  const id=req.query?.id;
  if(id){if(!uuid(id))return out(res,400,{error:"invalid_id"});if(!await permit(actor,id,"read","cases.get"))return out(res,404,{error:"not_found"});
   const q=await db.query("SELECT "+fields+" FROM care_cases c WHERE c.id=$1 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$2 AND r.role='機構主管' AND r.enabled=true) OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$2 AND g.case_id=c.id AND g.role='居督' AND g.permission='read' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now())))",[id,actor]);return q.rows.length?out(res,200,{case:q.rows[0]}):out(res,404,{error:"not_found"});}
  const rows=await visibleCases(actor,fields);await audit(actor,null,"cases.list",true,null,{count:rows.length});return out(res,200,{cases:rows});
 }
 const code=String(b.case_code||"").trim(),name=String(b.display_name||"").trim();
 if(!/^[A-Za-z0-9_-]{2,100}$/.test(code)||!name||name.length>100)return out(res,400,{error:"invalid_case_input"});
 if(!Number.isInteger(b.expected_revision)||b.expected_revision<0)return out(res,400,{error:"invalid_revision"});
 if(req.method==="POST"){
  if(b.expected_revision!==0)return out(res,400,{error:"create_revision_must_be_zero"});
  if(!await mayCreateCase(actor)){await audit(actor,null,"cases.create",false);return out(res,403,{error:"not_authorized"});}
  const q=await db.query("WITH actor_role AS (SELECT role FROM yhn_member_roles WHERE actor_id=$3 AND enabled=true AND role IN ('居督','機構主管')), created AS (INSERT INTO care_cases(case_key,patient_name,source_name,source_date,effective_date,content,status,updated_by,revision) SELECT $1,$2,'isolated_v1_test','2026-11-15','2026-11-15','{}'::jsonb,'草稿',$3,1 FROM actor_role ON CONFLICT(case_key) DO NOTHING RETURNING id,case_key,patient_name,revision,updated_at), owner AS (INSERT INTO yhn_isolated_access_grants(actor_id,role,case_id,permission,effective_at,approved_by,reason,grant_type) SELECT $3,'居督',created.id,p.permission,now(),'role-case-creation','新建個案主責','assignment' FROM created CROSS JOIN (VALUES('read'),('write')) p(permission) WHERE EXISTS(SELECT 1 FROM actor_role WHERE role='居督') RETURNING case_id) SELECT created.id,created.case_key AS case_code,created.patient_name AS display_name,created.revision,created.updated_at FROM created LEFT JOIN (SELECT DISTINCT case_id FROM owner) o ON o.case_id=created.id",[code,name,actor]);
  if(!q.rows.length)return out(res,409,{error:"duplicate_case_code"});await audit(actor,q.rows[0].id,"cases.create",true);return out(res,201,{saved:true,case:q.rows[0]});
 }
 if(!uuid(b.id))return out(res,400,{error:"invalid_id"});
 if(!await permit(actor,b.id,"write","cases.update"))return out(res,404,{error:"not_found"});
 const q=await db.query("UPDATE care_cases c SET patient_name=$1,revision=c.revision+1,updated_at=now(),updated_by=$5 WHERE c.id=$2 AND c.case_key=$3 AND c.revision=$4 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$5 AND r.role='機構主管' AND r.enabled=true) OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$5 AND g.case_id=c.id AND g.role='居督' AND g.permission='write' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()))) RETURNING c.id,c.case_key AS case_code,c.patient_name AS display_name,c.revision,c.updated_at",[name,b.id,code,b.expected_revision,actor]);
 if(!q.rows.length){await audit(actor,b.id,"cases.update.conflict",false);return out(res,409,{error:"revision_conflict_or_not_authorized"});}
 return out(res,200,{saved:true,case:q.rows[0]});
}
