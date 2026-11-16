import { db } from "hatchable";
import {roleOf} from "lib/yhn-access.js";
export const access = "member";
export const methods = ["GET", "POST"];
const send = (res, status, body) => { res.setHeader("Cache-Control","no-store, max-age=0"); return res.status(status).json(body); };
const uuid = v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export default async function(req,res){
  const actor = String(req.member?.id || "");
  if (!actor || !await roleOf(actor)) return send(res,403,{error:"identity_unavailable"});
  if (req.method === "GET") {
    const id = req.query?.id;
    if (id) {
      if (!uuid(id)) return send(res,400,{error:"invalid_case_id"});
      const one = await db.query("SELECT id, case_key, patient_name, source_name, source_date, effective_date, content, status, updated_at, revision FROM care_cases WHERE id=$1 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$2 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$2 AND g.case_id=care_cases.id AND g.role='居督' AND g.permission='read' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()))) LIMIT 1",[id,actor]);
      return one.rows.length ? send(res,200,{case:one.rows[0]}) : send(res,404,{error:"draft_not_found"});
    }
    const result = await db.query("SELECT id,case_key,patient_name,source_name,source_date,effective_date,status,updated_at,revision FROM care_cases WHERE (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$1 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$1 AND g.case_id=care_cases.id AND g.role='居督' AND g.permission='read' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()))) ORDER BY updated_at DESC LIMIT 100",[actor]);
    return send(res,200,{cases:result.rows});
  }
  const b=req.body||{}, {case_key,patient_name,source_name,source_date,effective_date,content}=b;
  if (typeof case_key!=="string" || !case_key.trim() || case_key.length>100 ||
      typeof patient_name!=="string" || !patient_name.trim() || patient_name.length>100 ||
      typeof source_name!=="string" || !source_name.trim() || source_name.length>255 ||
      typeof source_date!=="string" || !source_date.trim() || source_date.length>30 ||
      typeof effective_date!=="string" || !effective_date.trim() || effective_date.length>30 ||
      !content || typeof content!=="object" || Array.isArray(content) ||
      JSON.stringify(content).length>180000) return send(res,400,{error:"required_fields_or_content_invalid"});
  const expected=Number.isInteger(b.expected_revision)?b.expected_revision:0;
  if(expected<0 || expected>100000) return send(res,400,{error:"invalid_revision"});
  const packed=JSON.stringify(content);
  // New cases must use /api/v1/cases, which atomically assigns the creating supervisor.
  if(expected===0)return send(res,403,{error:"use_v1_case_creation"});
  try{
    const q=await db.query(
      "WITH saved AS ("+
      " UPDATE care_cases SET patient_name=$2,source_name=$3,"+
      " source_date=$4,effective_date=$5,content=$6::jsonb,status='草稿',"+
      " updated_by=$7,updated_at=now(),revision=care_cases.revision+1"+
      " WHERE care_cases.case_key=$1 AND care_cases.revision=$8 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$7 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$7 AND g.case_id=care_cases.id AND g.role='居督' AND g.permission='write' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now())))"+
      " RETURNING id,case_key,revision,status,updated_at,patient_name,source_name,source_date,effective_date,content"+
      "), versioned AS ("+
      " INSERT INTO care_case_versions(case_id,revision,snapshot,actor_id)"+
      " SELECT id,revision,jsonb_build_object('case_key',case_key,'patient_name',patient_name,'source_name',source_name,"+
      " 'source_date',source_date,'effective_date',effective_date,'content',content,'status',status),$7 FROM saved RETURNING id"+
      "), logged AS ("+
      " INSERT INTO care_case_audit(actor_id,action,case_id,details)"+
      " SELECT $7,CASE WHEN revision=1 THEN 'draft.created' ELSE 'draft.updated' END,id,"+
      " jsonb_build_object('revision',revision,'source_name',source_name) FROM saved RETURNING id"+
      ") SELECT id,case_key,revision,status,updated_at FROM saved",
      [case_key.trim(),patient_name.trim(),source_name.trim(),source_date,effective_date,packed,actor,expected]
    );
    if(!q.rows.length) return send(res,409,{error:"revision_conflict",message:"草稿版本已變更，請重新載入後再編輯。"});
    return send(res,200,{saved:q.rows[0]});
  }catch(e){return send(res,500,{error:"draft_save_failed"});}
}