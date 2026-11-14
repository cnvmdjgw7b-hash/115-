import {db} from 'hatchable';
export const access='member';
export const methods=['GET','POST'];
export default async function(req,res){
 const member=req.member.id;
 if(req.method==='GET'){
  const {rows}=await db.query("SELECT id::text AS key,case_code AS code,display_name AS label,status,supervisor,service_status,service_type,monthly_plan,official_code_matched,source_version FROM yhn_visit_cases WHERE member_id=$1 ORDER BY display_name LIMIT 500",[member]);
  return res.json({cases:rows,scope:'member',formal:false});
 }
 const x=req.body||{},code=String(x.case_code||'').trim(),name=String(x.display_name||'').trim();
 if(!/^[A-Za-z0-9_-]{2,40}$/.test(code)||name.length<1||name.length>80)return res.status(400).json({error:'invalid_case_input'});
 try{
  const {rows}=await db.query("INSERT INTO yhn_visit_cases(member_id,case_code,display_name) VALUES($1,$2,$3) ON CONFLICT(member_id,case_code) DO NOTHING RETURNING id::text AS key,case_code AS code,display_name AS label,status",[member,code,name]);
  if(!rows.length)return res.status(409).json({error:'duplicate_case_code'});
  return res.status(201).json({saved:true,case:rows[0],formal:false});
 }catch(e){return res.status(500).json({error:'case_save_failed'});}
}