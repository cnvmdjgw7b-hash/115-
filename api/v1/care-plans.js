import {db} from "hatchable";
import {authorize,audit} from "lib/yhn-access.js";
export const access="member";export const methods=["GET","POST","PUT"];
const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export default async function(req,res){
 const actor=String(req.member?.id||"");if(!actor)return res.status(401).json({error:"unauthorized"});
 const b=req.body||{},id=req.method==="GET"?req.query?.case_id:b.case_id;
 if(!uuid(id))return res.status(400).json({error:"invalid_case_id"});
 const action=req.method==="GET"?"read":req.method==="POST"?"create":"update";
 const grant=await authorize(actor,id,req.method==="GET"?"read":"write");
 if(!grant){await audit(actor,id,"plan_"+action,"denied",null);return res.status(404).json({error:"case_not_found"});}
 const exists=await db.query("SELECT id FROM care_cases WHERE id=$1",[id]);
 if(!exists.rows.length){await audit(actor,id,"plan_"+action,"denied",grant,{reason:"case_missing"});return res.status(404).json({error:"case_not_found"});}
 if(req.method==="GET"){const q=await db.query("SELECT id,case_id,content,revision,updated_at FROM yhn_test_care_plans WHERE case_id=$1 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$2 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$2 AND g.case_id=$1 AND g.role='居督' AND g.permission='read' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now())))",[id,actor]);await audit(actor,id,"plan_read","allowed",grant);return res.status(200).json({care_plan:q.rows[0]||null});}
 if(!b.content||typeof b.content!=="object"||Array.isArray(b.content))return res.status(400).json({error:"invalid_content"});
 if(req.method==="POST"){const q=await db.query("INSERT INTO yhn_test_care_plans(case_id,owner_id,content) SELECT $1,$2,$3::jsonb WHERE (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$2 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$2 AND g.case_id=$1 AND g.role='居督' AND g.permission='write' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()))) ON CONFLICT(case_id) DO NOTHING RETURNING id,case_id,content,revision,updated_at",[id,actor,JSON.stringify(b.content)]);await audit(actor,id,"plan_create",q.rows.length?"allowed":"conflict",grant);return q.rows.length?res.status(201).json({saved:true,care_plan:q.rows[0]}):res.status(409).json({error:"plan_exists"});}
 if(!Number.isInteger(b.expected_revision)||b.expected_revision<1)return res.status(400).json({error:"invalid_revision"});
 const q=await db.query("UPDATE yhn_test_care_plans SET content=$1::jsonb,revision=revision+1,updated_at=now() WHERE case_id=$2 AND revision=$3 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$4 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$4 AND g.case_id=$2 AND g.role='居督' AND g.permission='write' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()))) RETURNING id,case_id,content,revision,updated_at",[JSON.stringify(b.content),id,b.expected_revision,actor]);
 await audit(actor,id,"plan_update",q.rows.length?"allowed":"conflict",grant,{expected_revision:b.expected_revision});
 return q.rows.length?res.status(200).json({saved:true,care_plan:q.rows[0]}):res.status(409).json({error:"revision_conflict_or_not_found"});
}