import {db} from "hatchable";
export const access="member";
export const methods=["GET"];
const valid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export default async function(req,res){
 const actor=String(req.member?.id||"");
 if(!actor)return res.status(401).json({error:"unauthorized"});
 const id=req.query?.case_id;
 if(!valid(id))return res.status(400).json({error:"invalid_case_id"});
 const q=await db.query("SELECT id AS case_id,content,revision,status,updated_at FROM care_cases WHERE id=$1 AND updated_by=$2",[id,actor]);
 if(!q.rows.length)return res.status(404).json({error:"case_not_found"});
 return res.status(200).json({care_plan:q.rows[0]});
}