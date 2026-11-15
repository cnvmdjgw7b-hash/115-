/* Isolated API binding for existing mock-case-crud-flow.html. No token storage. */
(function(){
"use strict";
const root=document.querySelector("main"),box=document.createElement("section");
box.id="isolatedPanel";
box.innerHTML='<h3>隔離測試 API v1｜需 Hatchable 協作者登入</h3><p>僅允許 nddw2e 隔離站。若跨來源 Cookie/CORS 未授權，顯示錯誤，不回退至假儲存。</p><div class="grid"><button id="apiLoad">讀取測試個案</button><button id="apiCreate">新增至隔離庫</button><button id="apiUpdate">修改至隔離庫</button><button id="apiRefresh">重新讀取個案</button><button id="apiHome">讀取家訪</button><button id="apiPhone">讀取電訪</button><button id="apiPlan">讀取照顧計畫</button></div><output id="apiStatus" aria-live="polite"></output>';
root.append(box);
const visitForm=document.createElement("section");
visitForm.innerHTML='<h3>家訪／電訪｜隔離測試新增</h3><label for="visitDate">訪視日期</label><input type="date" id="visitDate"><label for="visitNote">虛構訪視內容</label><textarea id="visitNote" rows="3" maxlength="1000" style="box-sizing:border-box;width:100%;font-size:16px;padding:12px" placeholder="僅輸入虛構資料"></textarea><div class="grid"><button id="saveHome" type="button">儲存家訪</button><button id="savePhone" type="button">儲存電訪</button></div><output id="visitStatus" aria-live="polite"></output>';
root.append(visitForm);
visitForm.insertAdjacentHTML("beforeend",'<label for="visitRecord">既有訪視紀錄（同 UUID）</label><select id="visitRecord"><option value="">新增紀錄</option></select><button id="updateVisit" type="button">修改選取的訪視</button><output id="visitEditStatus" aria-live="polite"></output>');
const planForm=document.createElement("section");
planForm.innerHTML='<h3>照顧計畫｜隔離測試儲存</h3><label for="planText">計畫內容（僅虛構資料）</label><textarea id="planText" rows="4" style="width:100%;box-sizing:border-box;font-size:16px;padding:12px"></textarea><div class="grid"><button id="planLoad">讀取計畫</button><button id="planSave">新增／修改計畫</button></div><output id="planStatus" aria-live="polite"></output>';
root.append(planForm);
document.getElementById("visitDate").value=new Date().toLocaleDateString("en-CA");
const $=id=>document.getElementById(id),client=YHNIsolatedV1.makeClient({baseUrl:"https://nddw2e.hatchable.site"});
let remote=[],active=null,revision=null;
const ACTIVE_KEY="yhn_isolated_active_uuid";
function freshCode(){return "TEST-MOBILE-"+Date.now().toString(36).toUpperCase()+"-"+crypto.randomUUID().slice(0,8).toUpperCase()}
function prepareNew(){active=null;revision=null;$("code").value=freshCode();$("name").value="手機驗收虛構個案";status("已產生全新虛構代碼，請按「新增至隔離庫」")}
function restoreSelection(){try{return sessionStorage.getItem(ACTIVE_KEY)}catch{return null}}
function rememberSelection(id){try{sessionStorage.setItem(ACTIVE_KEY,id)}catch{}}
function status(t){$("apiStatus").textContent=t}
function choose(c){active=c.id;revision=c.revision;planRevision=null;$("planText").value="";$("visitRecord").replaceChildren(new Option("請先讀取訪視紀錄",""));rememberSelection(c.id);$("code").value=c.case_code;$("name").value=c.display_name;status("隔離個案："+c.display_name+"｜UUID："+c.id+"｜revision："+revision)}
async function run(fn){try{await fn()}catch(e){status(e.message+(e.code?"（"+e.code+"）":"")+"；請保留未儲存草稿")}}
$("apiLoad").onclick=()=>run(async()=>{remote=await client.list();if(!remote.length)return prepareNew();choose(remote.find(c=>c.id===restoreSelection())||remote[0]);status("隔離 API 清單 "+remote.length+" 筆；"+remote[0].id)});
$("apiCreate").onclick=()=>run(async()=>{if(!/^TEST-MOBILE-/.test($("code").value.trim()))return prepareNew();const c=await client.create({case_code:$("code").value.trim(),display_name:$("name").value.trim()});const verified=await client.get(c.id);choose(verified);status("隔離 API 新增並重新 GET 成功："+verified.id)});
$("apiUpdate").onclick=()=>run(async()=>{if(!active)return status("請先讀取或新增隔離個案");const c=await client.update({id:active,case_code:$("code").value.trim(),display_name:$("name").value.trim(),expected_revision:revision});const verified=await client.get(c.id);choose(verified);status("隔離 API 修改並重新 GET 成功：revision "+verified.revision)});
$("apiRefresh").onclick=()=>run(async()=>{if(!active)active=restoreSelection();if(!active)return status("尚未選取隔離個案");const c=await client.get(active);choose(c);status("已從隔離 API 重新讀取："+c.display_name)});
async function visits(type){if(!active)return status("尚未選取隔離個案");const url="https://nddw2e.hatchable.site/api/v1/visits?case_id="+encodeURIComponent(active);let r;try{r=await fetch(url,{credentials:"include",headers:{Accept:"application/json"}})}catch{throw new YHNIsolatedV1.ApiError(0,"network_error")}let data={};try{data=await r.json()}catch{}if(!r.ok)throw new YHNIsolatedV1.ApiError(r.status,data.error);if(!Array.isArray(data.visits))throw new Error("訪視回傳格式不符");const matched=data.visits.filter(v=>v.case_id===active&&v.visit_type===type);status((type==="home"?"家訪":"電訪")+"："+matched.length+" 筆｜共用 UUID："+active)}
async function saveVisit(type){
 const out=$("visitStatus");const note=$("visitNote").value.trim(),visit_date=$("visitDate").value;
 if(!active)return out.textContent="請先選擇隔離個案";
 if(!note||!/^\d{4}-\d{2}-\d{2}$/.test(visit_date))return out.textContent="請輸入虛構訪視日期與內容";
 out.textContent="儲存中…";
 try{
  const response=await fetch("https://nddw2e.hatchable.site/api/v1/visits",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({case_id:active,visit_type:type,visit_date,note})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new YHNIsolatedV1.ApiError(response.status,data.error);
  if(response.status!==201||data.saved!==true||data.visit?.case_id!==active||data.visit?.visit_type!==type)throw new Error("寫入回傳與 UUID 不符，停止");
  const verify=await fetch("https://nddw2e.hatchable.site/api/v1/visits?case_id="+encodeURIComponent(active),{credentials:"include",headers:{Accept:"application/json"}});
  const rows=await verify.json().catch(()=>({}));
  if(!verify.ok||!Array.isArray(rows.visits)||!rows.visits.some(v=>v.id===data.visit.id&&v.case_id===active))throw new Error("已新增但重新讀取未確認，請勿重複送出");
  out.textContent=(type==="home"?"家訪":"電訪")+" 新增201、重新讀取200；UUID："+active+"｜紀錄："+data.visit.id;
 }catch(e){out.textContent=e.message+"；請保留草稿，不要直接重送"}
}
$("saveHome").onclick=()=>saveVisit("home");
$("savePhone").onclick=()=>saveVisit("phone");
$("apiHome").onclick=()=>run(async()=>{await visits("home");await loadVisits()});
$("apiPhone").onclick=()=>run(async()=>{await visits("phone");await loadVisits()});
$("apiPlan").onclick=()=>run(async()=>{if(!active)return status("尚未選取隔離個案");let r;try{r=await fetch("https://nddw2e.hatchable.site/api/v1/care-plans?case_id="+encodeURIComponent(active),{credentials:"include",headers:{Accept:"application/json"}})}catch{throw new YHNIsolatedV1.ApiError(0,"network_error")}let d={};try{d=await r.json()}catch{}if(!r.ok)throw new YHNIsolatedV1.ApiError(r.status,d.error);if(d.care_plan?.case_id!==active)throw new Error("照顧計畫 UUID 不一致");status("照顧計畫 UUID 一致："+active)});document.querySelector("#isolatedPanel h3").insertAdjacentHTML("afterend",'<button id="apiNew" type="button">產生全新虛構個案代碼</button>');$("apiNew").onclick=prepareNew;const saved=restoreSelection();if(saved)run(async()=>{const c=await client.get(saved);choose(c);status("重新整理後從隔離 API 讀取成功："+c.id)});else prepareNew();
let planRevision=null;
async function requestIsolated(route,method,body,query){
 const url="https://nddw2e.hatchable.site/api/v1/"+route+(query?"?case_id="+encodeURIComponent(query):"");
 let r;try{r=await fetch(url,{method,credentials:"include",headers:{"Accept":"application/json",...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})})}catch{throw new YHNIsolatedV1.ApiError(0,"network_error")}
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new YHNIsolatedV1.ApiError(r.status,d.error);
 return {status:r.status,data:d};
}
async function loadVisits(){
 if(!active)throw new Error("請先選擇個案");
 const {data}=await requestIsolated("visits","GET",null,active);
 const select=$("visitRecord");select.replaceChildren(new Option("新增紀錄",""));
 for(const v of data.visits||[])if(v.case_id===active)select.add(new Option((v.visit_type==="home"?"家訪":"電訪")+"｜"+v.visit_date+"｜"+v.id.slice(0,8),v.id));
 return data.visits||[];
}
$("visitRecord").onchange=()=>run(async()=>{const chosen=$("visitRecord").value;const row=(await loadVisits()).find(v=>v.id===chosen);$("visitRecord").value=chosen;if(row){$("visitDate").value=String(row.visit_date).slice(0,10);$("visitNote").value=row.note}});
$("updateVisit").onclick=()=>run(async()=>{
 const visitId=$("visitRecord").value;if(!visitId)return $("visitEditStatus").textContent="請先選取既有訪視";
 const rows=await loadVisits(),original=rows.find(v=>v.id===visitId);
 if(!original)throw new Error("訪視不存在，請重新讀取");
 const body={id:visitId,case_id:active,visit_type:original.visit_type,visit_date:$("visitDate").value,note:$("visitNote").value.trim()};
 const saved=await requestIsolated("visits","PUT",body);
 if(saved.status!==200||saved.data.visit?.case_id!==active)throw new Error("修改回傳 UUID 不符");
 const check=(await loadVisits()).find(v=>v.id===visitId);
 if(!check||check.note!==body.note)throw new Error("修改後 GET 未一致");
 $("visitRecord").value=visitId;$("visitEditStatus").textContent="訪視修改200、重新GET200；UUID："+active;
});
$("planLoad").onclick=()=>run(async()=>{
 if(!active)throw new Error("請先選擇個案");
 const {data}=await requestIsolated("care-plans","GET",null,active);
 const p=data.care_plan;if(p&&p.case_id!==active)throw new Error("計畫 UUID 不一致");
 planRevision=p?.revision??null;$("planText").value=p?.content?.test_note??"";
 $("planStatus").textContent=p?"計畫GET200｜revision "+planRevision:"計畫GET200｜尚未建立";
});
$("planSave").onclick=()=>run(async()=>{
 if(!active)throw new Error("請先選擇個案");
 const note=$("planText").value.trim();if(!note)throw new Error("請輸入虛構計畫內容");
 const method=planRevision===null?"POST":"PUT";
 const body={case_id:active,content:{test_note:note},...(method==="PUT"?{expected_revision:planRevision}:{})};
 const result=await requestIsolated("care-plans",method,body);
 if(result.data.saved!==true||result.data.care_plan?.case_id!==active)throw new Error("計畫儲存回傳 UUID 不符");
 const verify=await requestIsolated("care-plans","GET",null,active);
 if(verify.data.care_plan?.content?.test_note!==note)throw new Error("計畫儲存後 GET 未一致");
 planRevision=verify.data.care_plan.revision;
 $("planStatus").textContent="計畫"+method+" "+result.status+"、GET200｜UUID："+active+"｜revision "+planRevision;
});
})();