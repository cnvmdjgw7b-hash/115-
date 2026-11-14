import {db} from 'hatchable';
export const access='member';
export const methods=['POST'];
const codeRx=/^[A-Za-z0-9_-]{2,40}$/;
const kinds=new Set(['居家','喘息','短照']);
const statuses=new Set(['服務中','暫停','暫停中','結案']);
const supervisors=new Set(['李芯維','廖若秀','鄒映婕','陽慶安','温玉秀']);
export default async function(req,res){
 const member=req.member?.id;
 if(!member)return res.status(401).json({error:'member_required'});
 const payload=req.body||{},items=payload.cases;
 if(!Array.isArray(items)||items.length<1||items.length>250)return res.status(400).json({error:'invalid_batch'});
 if(payload.source_version!=='（玉）115 家電訪清冊最新一版(3).xlsm')return res.status(400).json({error:'wrong_master_version'});
 const seenCode=new Set(),seenName=new Set(),clean=[];
 for(const raw of items){
  if(!raw||typeof raw!=='object')return res.status(400).json({error:'invalid_case_row'});
  const code=String(raw.code||'').trim(),label=String(raw.label||'').trim(),supervisor=String(raw.supervisor||'').trim(),
   category=String(raw.service_type||'').trim(),status=String(raw.service_status||'').trim(),matched=raw.official_code_matched===true,
   plan=raw.monthly_plan;
  if(!codeRx.test(code)||!label||label.length>80||!supervisors.has(supervisor)||!kinds.has(category)||!statuses.has(status)||
   !plan||typeof plan!=='object'||Array.isArray(plan)||Object.keys(plan).some(m=>!/^([1-9]|10)月$/.test(m)||!['家訪','電訪','—',null].includes(plan[m]))){
   return res.status(400).json({error:'invalid_case_row'});
  }
  if(!matched&&!code.startsWith('PENDING-115-'))return res.status(400).json({error:'provisional_code_required'});
  if(seenCode.has(code)||seenName.has(label))return res.status(400).json({error:'duplicate_in_batch'});
  seenCode.add(code);seenName.add(label);clean.push({code,label,supervisor,service_type:category,service_status:status,official_code_matched:matched,monthly_plan:plan});
 }
 // 後端檢查既有案號是否對應不同姓名，避免匯入時覆寫錯案。
 const existing=await db.query('SELECT case_code,display_name FROM yhn_visit_cases WHERE member_id=$1',[member]);
 for(const row of existing.rows||[]){
  const incoming=clean.find(x=>x.code===row.case_code);
  if(incoming&&incoming.label!==row.display_name)return res.status(409).json({error:'existing_code_name_conflict',case_code:row.case_code});
 }
 const {rows}=await db.query(`
 INSERT INTO yhn_visit_cases(member_id,case_code,display_name,supervisor,service_type,service_status,monthly_plan,official_code_matched,source_version,status)
 SELECT $1,t.code,t.label,t.supervisor,t.service_type,t.service_status,t.monthly_plan,t.official_code_matched,$3,
 CASE WHEN t.official_code_matched THEN 'verified' ELSE 'pending_verification' END
 FROM jsonb_to_recordset($2::jsonb) AS t(code text,label text,supervisor text,service_type text,service_status text,monthly_plan jsonb,official_code_matched boolean)
 ON CONFLICT(member_id,case_code) DO UPDATE SET
 supervisor=EXCLUDED.supervisor,service_type=EXCLUDED.service_type,service_status=EXCLUDED.service_status,monthly_plan=EXCLUDED.monthly_plan,
 official_code_matched=EXCLUDED.official_code_matched,source_version=EXCLUDED.source_version,
 status=EXCLUDED.status,updated_at=now()
 RETURNING id`,[member,JSON.stringify(clean),payload.source_version]);
 if(rows.length!==clean.length)return res.status(500).json({error:'write_count_mismatch'});
 return res.status(200).json({saved:true,total:rows.length,official_match:clean.filter(x=>x.official_code_matched).length,
 provisional:clean.filter(x=>!x.official_code_matched).length,master:payload.source_version});
}