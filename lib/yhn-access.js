import {db} from "hatchable";
export const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export const actorOf=req=>String(req.member?.id||"");
export async function authorize(actor,caseId,permission){
 const q=await db.query("SELECT id FROM yhn_isolated_access_grants WHERE actor_id=$1 AND case_id=$2 AND permission=$3 AND role IN ('居督','機構主管') AND effective_at<=now() AND (expires_at IS NULL OR expires_at>now()) AND revoked_at IS NULL ORDER BY effective_at DESC LIMIT 1",[actor,caseId,permission]);
 return q.rows[0]?.id||null;
}
export async function audit(actor,caseId,action,decision,grantId=null,detail={}){
 const normalized=(decision===true||decision==="allowed"||decision==="allow")?"allow":"deny";
 await db.query("INSERT INTO yhn_isolated_access_audit(actor_id,case_id,action,decision,grant_id,detail) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[actor||"anonymous",uuid(caseId)?caseId:null,action,normalized,grantId,JSON.stringify(detail)]);
}
export async function permit(actor,caseId,permission,action){const grant=await authorize(actor,caseId,permission);await audit(actor,caseId,action,!!grant,grant);return !!grant;}
export async function mayCreateCase(actor){const q=await db.query("SELECT id FROM yhn_isolated_access_grants WHERE actor_id=$1 AND effective_at<=now() AND (expires_at IS NULL OR expires_at>now()) AND revoked_at IS NULL LIMIT 1",[actor]);return !!q.rows.length;}
export async function grantOwnCase(actor,caseId){await db.query("INSERT INTO yhn_isolated_access_grants(actor_id,role,case_id,permission,effective_at,approved_by,reason,grant_type) VALUES($1,'居督',$2,'read',now(),'isolated-case-creation','新建隔離個案','assignment'),($1,'居督',$2,'write',now(),'isolated-case-creation','新建隔離個案','assignment')",[actor,caseId]);}