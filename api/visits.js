import {db} from 'hatchable';
export const access='member';
export const methods=['GET','POST'];
const validKey=k=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k);
const cols='id,case_key,visit_date::text AS date,visit_type AS type,interviewee AS who,source_note AS source,facts,extra_note AS extra,action_note AS actions,record_body AS record,pending_items AS pending,status,revision,created_at,updated_at';
export default async function(req,res){
 const member=req.member.id;
 if(req.method==='GET'){
  const key=String(req.query?.case_key||'');
  if(!validKey(key))return res.status(400).json({error:'invalid_case_key'});
  const {rows}=await db.query(`SELECT ${cols} FROM yhn_demo_visits WHERE member_id=$1 AND case_key=$2 AND EXISTS (SELECT 1 FROM yhn_visit_cases WHERE id::text=$2 AND member_id=$1) ORDER BY created_at DESC LIMIT 100`,[member,key]);
  return res.json({visits:rows,scope:'member',formal:false});
 }
 const x=req.body||{},key=String(x.case_key||'');
 if(!validKey(key))return res.status(400).json({error:'invalid_case_key'});
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))||!['家訪','電訪'].includes(x.type))return res.status(400).json({error:'invalid_visit_date_or_type'});
 if(!x.record||typeof x.record!=='object'||Array.isArray(x.record))return res.status(400).json({error:'missing_record'});
 const record={};for(const k of ['condition','service','response','action']){const v=x.record[k]??'';if(typeof v!=='string'||v.length>6000)return res.status(400).json({error:'invalid_record'});record[k]=v;}
 if(!Object.values(record).some(s=>s.trim()))return res.status(400).json({error:'empty_record'});
 if(typeof x.who!=='string'||!x.who.trim()||x.who.length>50)return res.status(400).json({error:'invalid_interviewee'});
 const facts=Array.isArray(x.facts)?x.facts:[],pending=Array.isArray(x.pending)?x.pending:[];
 if(facts.length>60||pending.length>20||[...facts,...pending].some(s=>typeof s!=='string'||s.length>300))return res.status(400).json({error:'invalid_arrays'});
 for(const k of ['source','extra','actions'])if(typeof (x[k]??'')!=='string'||String(x[k]??'').length>5000)return res.status(400).json({error:'invalid_detail'});
 const allowed=await db.query('SELECT id FROM yhn_visit_cases WHERE id::text=$1 AND member_id=$2',[key,member]);
 if(!allowed.rows.length)return res.status(404).json({error:'case_not_found'});
 const {rows}=await db.query(`INSERT INTO yhn_demo_visits(member_id,case_key,visit_date,visit_type,interviewee,source_note,facts,extra_note,action_note,record_body,pending_items)
 VALUES($1,$2,$3::date,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb,$11::jsonb) RETURNING ${cols}`,
 [member,key,x.date,x.type,x.who,x.source||'',JSON.stringify(facts),x.extra||'',x.actions||'',JSON.stringify(record),JSON.stringify(pending)]);
 if(rows.length!==1)return res.status(500).json({error:'not_saved'});
 return res.status(201).json({saved:true,visit:rows[0],formal:false});
}