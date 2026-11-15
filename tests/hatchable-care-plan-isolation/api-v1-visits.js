import {db} from "hatchable";
export const access="member";
export const methods=["GET","POST"];
const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export default async function(req,res){
 const actor=String(req.member?.id||"");if(!actor)return res.status(401).json({error:"unauthorized"});
 const id=req.method==="GET"?req.query?.case_id:req.body?.case_id;
 if(!uuid(id))return res.status(400).json({error:"invalid_case_id"});
 const owned=await db.query("SELECT id FROM care_cases WHERE id=$1 AND updated_by=$2",[id,actor]);
 if(!owned.rows.length)return res.status(404).json({error:"case_not_found"});
 if(req.method==="GET"){
  const q=await db.query("SELECT id,case_id,visit_type,visit_date,note FROM yhn_test_visits WHERE case_id=$1 AND owner_id=$2 ORDER BY visit_date,id",[id,actor]);
  return res.status(200).json({visits:q.rows});
 }
 const b=req.body||{};
 if(!["home","phone"].includes(b.visit_type)||typeof b.note!=="string"||!b.note.trim()||b.note.length>1000||!/^\d{4}-\d{2}-\d{2}$/.test(String(b.visit_date||"")))return res.status(400).json({error:"invalid_visit"});
 const q=await db.query("INSERT INTO yhn_test_visits(case_id,owner_id,visit_type,visit_date,note) VALUES($1,$2,$3,$4,$5) RETURNING id,case_id,visit_type,visit_date,note",[id,actor,b.visit_type,b.visit_date,b.note]);
 return res.status(201).json({saved:true,visit:q.rows[0]});
}