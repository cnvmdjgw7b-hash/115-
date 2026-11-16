import { ai } from 'hatchable';
export const access = 'member';
export const methods = ['POST'];
const SYSTEM = `你是台灣居家長照機構的資深居家服務督導紀錄編輯員。僅整理去識別化、已明確提供的事實。要產生符合台灣居督實務的訪視紀錄，不是關鍵字拼貼。使用自然、簡短、精確的繁體中文、台灣長照用語。參考永護寧實際紀錄口吻：例如「個案右膝術後仍有疼痛，平時使用助行器或單拐行走，無法久站及走遠。生活大部分可自行處理，但洗澡較吃力，備餐及外出需要協助。」這段僅為文風示範，絕不可將其事實移植到其他個案。
輸出格式必須是純 JSON 物件，且只有 keys: condition, service, response, action, warnings；四段各為一個字串，warnings 是字串陣列。
condition = 一、個案狀況：整合本次身體、活動、自理、居家環境等事實。service = 二、服務情形：只有本次明確知悉的實際服務、調整或說明。response = 三、個案及家屬回應：保留是誰說的，例如「案女表示」；家屬轉述不可變成案主親述。action = 四、處遇計畫：只有使用者實際完成、確定安排、或明確要求追蹤的處置；未處理不得寫「已聯繫」「已安排」「已通報」。每段沒有事實便留空字串。避免在不同段落重複同一個事實：例如案女說膝蓋痛是個案狀況中的來源註記，不可在家屬回應整段再重述一次；家屬回應優先寫真正的期待、意見及照顧負擔，如無則留白。
禁止虛構病史、時間、核定碼別、已完成行動、服務成效；不要預設狀況正常；不要使用「持續關懷」「實際成效待追蹤」等空泛語氣；不要每句重複個案。清楚區分已完成／預計／待確認。發現矛盾或關鍵資訊不全，放在 warnings，不自行決定。不得把姓名、身分證、聯絡方式寫入輸出。不要輸出 markdown 或多餘說明。`;
export default async function(req,res){
 const x=req.body||{};
 const s=JSON.stringify({visitType:x.visitType,who:x.who,source:x.source,facts:x.facts,extra:x.extra,actions:x.actions,tracking:x.tracking});
 if(!Array.isArray(x.facts)||x.facts.length>60||s.length>9500) return res.status(400).json({error:'資料格式或長度不符合限制'});
 if(!x.facts.length&&!String(x.extra||'').trim())return res.status(400).json({error:'請先輸入訪視事實'});
 try{
 const out=await ai.generateText({model:'sonnet',purpose:'yhn-deidentified-homevisit',userId:req.member.id,maxTokens:1600,messages:[{role:'system',content:SYSTEM},{role:'user',content:'請只依以下去識別化事實生成訪視紀錄 JSON：\n'+s}]});
 if(['length','max_tokens'].includes(out.finishReason))return res.status(502).json({error:'生成內容被截斷，請縮短資料後再試'});
 let raw=out.text.trim().replace(/^\x60\x60\x60(?:json)?\s*/,'').replace(/\s*\x60\x60\x60$/,'');
 let obj=JSON.parse(raw);
 if(!obj||!['condition','service','response','action'].every(k=>typeof obj[k]==='string'))throw Error('模型格式不符');
 return res.json({record:{condition:obj.condition,service:obj.service,response:obj.response,action:obj.action},warnings:Array.isArray(obj.warnings)?obj.warnings:[],mode:'ai',review_required:true});
 }catch(e){return res.status(503).json({error:'AI 尚未可用或回傳格式不正確，請檢查 Hatchable AI Setup；原始內容未覆寫。'});}
}