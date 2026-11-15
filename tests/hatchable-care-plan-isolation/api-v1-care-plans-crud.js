import {db} from "hatchable";
export const access="member";export const methods=["GET","POST","PUT"];
const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export default async function(req,res){
 const actor=String(req.member?.id||"");if(!actor)return res.status(401).json({error:"unauthorized"});
 const b=req.body||{},id=req.method==="GET"?req.query?.case_id:b.case_id;
 if(!uuid(id))return res.status(400).json({error:"invalid_case_id"});
 const owned=await db.query("SELECT id FROM care_cases WHERE id=$1 AND updated_by=$2",[id,actor]);
 if(!owned.rows.length)return res.status(404).json({error:"case_not_found"});
 if(req.method==="GET"){const q=await db.query("SELECT id,case_id,content,revision,updated_at FROM yhn_test_care_plans WHERE case_id=$1 AND owner_id=$2",[id,actor]);return res.status(200).json({care_plan:q.rows[0]||null});}
 if(!b.content||typeof b.content!=="object"||Array.isArray(b.content))return res.status(400).json({error:"invalid_content"});
 if(req.method==="POST"){const q=await db.query("INSERT INTO yhn_test_care_plans(case_id,owner_id,content) VALUES($1,$2,$3::jsonb) ON CONFLICT(case_id) DO NOTHING RETURNING id,case_id,content,revision,updated_at",[id,actor,JSON.stringify(b.content)]);return q.rows.length?res.status(201).json({saved:true,care_plan:q.rows[0]}):res.status(409).json({error:"plan_exists"});}
 if(!Number.isInteger(b.expected_revision)||b.expected_revision<1)return res.status(400).json({error:"invalid_revision"});
 const q=await db.query("UPDATE yhn_test_care_plans SET content=$1::jsonb,revision=revision+1,updated_at=now() WHERE case_id=$2 AND owner_id=$3 AND revision=$4 RETURNING id,case_id,content,revision,updated_at",[JSON.stringify(b.content),id,actor,b.expected_revision]);
 return q.rows.length?res.status(200).json({saved:true,care_plan:q.rows[0]}):res.status(409).json({error:"revision_conflict_or_not_found"});
}