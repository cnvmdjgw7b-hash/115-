import { ai } from "hatchable";
export const access = "member";
export const methods = ["POST"];
const send=(res,status,body)=>{res.setHeader("Cache-Control","no-store, max-age=0");return res.status(status).json(body);};
export default async function(req,res){
  const b=req.body||{}, source=b.source||"";
  if(b.consent!==true || b.deidentified!==true) return send(res,403,{error:"ai_consent_and_deidentification_required"});
  if(typeof source!=="string" || source.trim().length<50 || source.length>45000) return send(res,400,{error:"source_text_length_invalid"});
  if(!b.source_date || !b.effective_date) return send(res,400,{error:"source_and_effective_dates_required"});
  try{
    const result=await ai.generateText({
      model:"gpt",purpose:"renbao-careplan-draft",userId:String(req.member?.id||""),
      system:"你是台灣居家長照居督文書助理。只根據已提供的去識別化來源文字撰寫草稿，不得編造姓名、疾病、核定項目、服務量、評值、成效、法規或日期。資料不足要明確標示「原始資料未載明」。使用自然、精確的台灣居督紀錄口吻，避免官腔和贅詞。僅回傳 JSON，格式為 {\"sections\":[\"個案基本資料\",\"疾病與身心狀況\",\"家庭與支持系統\",\"照顧需求與問題\",\"核定服務項目\",\"照顧計畫與評值\"]}。未經督導審核皆為草稿。",
      prompt:JSON.stringify({source_date:b.source_date,effective_date:b.effective_date,source:source.slice(0,26000)})
    });
    const raw=result.text||"";let j;
    try{j=JSON.parse(raw.replace(/^\x60\x60\x60(?:json)?/i,"").replace(/\x60\x60\x60$/,"").trim());}
    catch{return send(res,422,{error:"ai_response_invalid_json"});}
    if(!Array.isArray(j.sections)||j.sections.length!==6) return send(res,422,{error:"ai_response_missing_six_sections"});
    return send(res,200,{sections:j.sections.map(v=>String(v||"")),review_required:true});
  }catch(e){return send(res,e?.code==="SetupRequired"?412:503,{error:e?.code==="SetupRequired"?"ai_setup_required":"ai_generation_unavailable"});}
}