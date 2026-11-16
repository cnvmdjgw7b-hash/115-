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
 if(!grant){await audit(actor,id,"visit_"+action,"denied",null);return res.status(404).json({error:"case_not_found"});}
 const exists=await db.query("SELECT id FROM care_cases WHERE id=$1",[id]);
 if(!exists.rows.length){await audit(actor,id,"visit_"+action,"denied",grant,{reason:"case_missing"});return res.status(404).json({error:"case_not_found"});}
 if(req.method==="GET"){const q=await db.query("SELECT id,case_id,visit_type,visit_date,note,revision FROM yhn_test_visits WHERE case_id=$1 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$2 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$2 AND g.case_id=$1 AND g.role='居督' AND g.permission='read' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()))) ORDER BY visit_date,id",[id,actor]);await audit(actor,id,"visit_read","allowed",grant);return res.status(200).json({visits:q.rows});}
 if(!["home","phone"].includes(b.visit_type)||typeof b.note!=="string"||!b.note.trim()||b.note.length>1000||!/^\d{4}-\d{2}-\d{2}$/.test(String(b.visit_date||"")))return res.status(400).json({error:"invalid_visit"});
 if(req.method==="POST"){const q=await db.query("INSERT INTO yhn_test_visits(case_id,owner_id,visit_type,visit_date,note) VALUES($1,$2,$3,$4,$5) RETURNING id,case_id,visit_type,visit_date,note,revision",[id,actor,b.visit_type,b.visit_date,b.note]);await audit(actor,id,"visit_create","allowed",grant,{record_id:q.rows[0].id,visit_type:b.visit_type});return res.status(201).json({saved:true,visit:q.rows[0]});}
 if(!uuid(b.id))return res.status(400).json({error:"invalid_visit_id"});
 if(!Number.isInteger(b.expected_revision)||b.expected_revision<1)return res.status(400).json({error:"invalid_revision"});
 const q=await db.query("UPDATE yhn_test_visits SET visit_date=$1,note=$2,revision=revision+1 WHERE id=$3 AND case_id=$4 AND visit_type=$5 AND revision=$6 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$7 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$7 AND g.case_id=$4 AND g.role='居督' AND g.permission='write' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()))) RETURNING id,case_id,visit_type,visit_date,note,revision",[b.visit_date,b.note,b.id,id,b.visit_type,b.expected_revision,actor]);
 await audit(actor,id,"visit_update",q.rows.length?"allowed":"conflict",grant,{record_id:b.id,expected_revision:b.expected_revision});
 return q.rows.length?res.status(200).json({saved:true,visit:q.rows[0]}):res.status(409).json({error:"revision_conflict_or_not_found"});
}