import { db } from "hatchable";
import {roleOf,authorize,visibleCases} from "lib/yhn-access.js";
export const access = "member";
export const methods = ["GET", "POST"];
const send = (res, status, body) => { res.setHeader("Cache-Control","no-store, max-age=0"); return res.status(status).json(body); };
const uuid = v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export default async function(req,res){
  const actor = String(req.member?.id || "");
  if (!actor) return send(res,403,{error:"identity_unavailable"});
  if(!await roleOf(actor))return send(res,403,{error:"role_not_authorized"});
  if (req.method === "GET") {
    const id = req.query?.id;
    if (id) {
      if (!uuid(id)) return send(res,400,{error:"invalid_case_id"});
      const one = await db.query("SELECT id, case_key, patient_name, source_name, source_date, effective_date, content, status, updated_at, revision FROM care_cases WHERE id=$1 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$2 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$2 AND g.case_id=care_cases.id AND g.role='居督' AND g.permission='read' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()))) LIMIT 1",[id,actor]);
      return one.rows.length ? send(res,200,{case:one.rows[0]}) : send(res,404,{error:"draft_not_found"});
    }
    const rows=await visibleCases(actor,"c.id,c.case_key,c.patient_name,c.source_name,c.source_date,c.effective_date,c.status,c.updated_at,c.revision");
    return send(res,200,{cases:rows});
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
  if(expected===0){
    try{
      const q=await db.query(
        "WITH actor_role AS (SELECT role FROM yhn_member_roles WHERE actor_id=$7 AND enabled=true AND role IN ('居督','機構主管')),"+
        " created AS (INSERT INTO care_cases(case_key,patient_name,source_name,source_date,effective_date,content,status,updated_by,revision)"+
        " SELECT $1,$2,$3,$4,$5,$6::jsonb,'草稿',$7,1 FROM actor_role ON CONFLICT(case_key) DO NOTHING"+
        " RETURNING id,case_key,patient_name,source_name,source_date,effective_date,content,status,revision,updated_at),"+
        " owner AS (INSERT INTO yhn_isolated_access_grants(actor_id,role,case_id,permission,effective_at,approved_by,reason,grant_type)"+
        " SELECT $7,'居督',created.id,p.permission,now(),'role-case-creation','新建個案主責','assignment'"+
        " FROM created CROSS JOIN (VALUES('read'),('write')) p(permission)"+
        " WHERE EXISTS(SELECT 1 FROM actor_role WHERE role='居督') RETURNING case_id),"+
        " versioned AS (INSERT INTO care_case_versions(case_id,revision,snapshot,actor_id)"+
        " SELECT id,revision,jsonb_build_object('case_key',case_key,'patient_name',patient_name,'source_name',source_name,"+
        " 'source_date',source_date,'effective_date',effective_date,'content',content,'status',status),$7 FROM created RETURNING id),"+
        " logged AS (INSERT INTO care_case_audit(actor_id,action,case_id,details)"+
        " SELECT $7,'draft.created',id,jsonb_build_object('revision',revision,'source_name',source_name) FROM created RETURNING id)"+
        " SELECT created.id,created.case_key,created.revision,created.status,created.updated_at FROM created"+
        " LEFT JOIN (SELECT DISTINCT case_id FROM owner) o ON o.case_id=created.id",
        [case_key.trim(),patient_name.trim(),source_name.trim(),source_date,effective_date,packed,actor]
      );
      if(!q.rows.length)return send(res,409,{error:"duplicate_case_code"});
      return send(res,200,{saved:q.rows[0]});
    }catch(e){return send(res,500,{error:"draft_save_failed"});}
  }
  try{
    const q=await db.query(
      "WITH saved AS ("+
      " INSERT INTO care_cases(case_key,patient_name,source_name,source_date,effective_date,content,status,updated_by,revision)"+
      " VALUES($1,$2,$3,$4,$5,$6::jsonb,'草稿',$7,1)"+
      " ON CONFLICT(case_key) DO UPDATE SET patient_name=EXCLUDED.patient_name,source_name=EXCLUDED.source_name,"+
      " source_date=EXCLUDED.source_date,effective_date=EXCLUDED.effective_date,content=EXCLUDED.content,status='草稿',"+
      " updated_by=EXCLUDED.updated_by,updated_at=now(),revision=care_cases.revision+1"+
      " WHERE care_cases.revision=$8 AND (EXISTS(SELECT 1 FROM yhn_member_roles r WHERE r.actor_id=$7 AND r.enabled=true AND r.role='機構主管') OR EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.actor_id=$7 AND g.case_id=care_cases.id AND g.role='居督' AND g.permission='write' AND g.revoked_at IS NULL AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now())))"+
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