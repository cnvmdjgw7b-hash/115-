import {db} from "hatchable";
export const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export const actorOf=req=>String(req.member?.id||"");
export async function roleOf(actor){if(!actor)return null;const q=await db.query("SELECT role FROM yhn_member_roles WHERE actor_id=$1 AND enabled=true AND role IN ('機構主管','居督')",[actor]);return q.rows[0]?.role||null;}
export async function authorize(actor,caseId,permission){
 const role=await roleOf(actor);if(role==="機構主管")return "supervisor";if(role!=="居督"||!uuid(caseId))return null;
 const q=await db.query("SELECT id FROM yhn_isolated_access_grants WHERE actor_id=$1 AND case_id=$2 AND permission=$3 AND role='居督' AND effective_at<=now() AND (expires_at IS NULL OR expires_at>now()) AND revoked_at IS NULL ORDER BY effective_at DESC LIMIT 1",[actor,caseId,permission]);return q.rows[0]?.id||null;
}
export async function audit(actor,caseId,action,decision,grantId=null,detail={}){
 const normalized=(decision===true||decision==="allowed"||decision==="allow")?"allow":"deny";
 await db.query("INSERT INTO yhn_isolated_access_audit(actor_id,case_id,action,decision,grant_id,detail) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[actor||"anonymous",uuid(caseId)?caseId:null,action,normalized,uuid(grantId)?grantId:null,JSON.stringify(detail)]);
}
export async function permit(actor,caseId,permission,action){const grant=await authorize(actor,caseId,permission);await audit(actor,caseId,action,!!grant,grant);return !!grant;}
export async function mayCreateCase(actor){return !!(await roleOf(actor));}
export async function visibleCases(actor,fields,limit=100){
 const role=await roleOf(actor);if(!role)return [];
 const sql=role==="機構主管"?"SELECT "+fields+" FROM care_cases c ORDER BY c.updated_at DESC LIMIT $1":"SELECT "+fields+" FROM care_cases c WHERE EXISTS(SELECT 1 FROM yhn_isolated_access_grants g WHERE g.case_id=c.id AND g.actor_id=$1 AND g.role='居督' AND g.permission='read' AND g.effective_at<=now() AND (g.expires_at IS NULL OR g.expires_at>now()) AND g.revoked_at IS NULL) ORDER BY c.updated_at DESC LIMIT $2";
 const q=await db.query(sql,role==="機構主管"?[limit]:[actor,limit]);return q.rows;
}
export async function grantOwnCase(actor,caseId){await db.query("INSERT INTO yhn_isolated_access_grants(actor_id,role,case_id,permission,effective_at,approved_by,reason,grant_type) VALUES($1,'居督',$2,'read',now(),'role-case-creation','新建個案主責','assignment'),($1,'居督',$2,'write',now(),'role-case-creation','新建個案主責','assignment')",[actor,caseId]);}
