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
document.getElementById("visitDate").value=new Date().toLocaleDateString("en-CA");
const $=id=>document.getElementById(id),client=YHNIsolatedV1.makeClient({baseUrl:"https://nddw2e.hatchable.site"});
let remote=[],active=null,revision=null;
const ACTIVE_KEY="yhn_isolated_active_uuid";
function freshCode(){return "TEST-MOBILE-"+Date.now().toString(36).toUpperCase()+"-"+crypto.randomUUID().slice(0,8).toUpperCase()}
function prepareNew(){active=null;revision=null;$("code").value=freshCode();$("name").value="手機驗收虛構個案";status("已產生全新虛構代碼，請按「新增至隔離庫」")}
function restoreSelection(){try{return sessionStorage.getItem(ACTIVE_KEY)}catch{return null}}
function rememberSelection(id){try{sessionStorage.setItem(ACTIVE_KEY,id)}catch{}}
function status(t){$("apiStatus").textContent=t}
function choose(c){active=c.id;revision=c.revision;rememberSelection(c.id);$("code").value=c.case_code;$("name").value=c.display_name;status("隔離個案："+c.display_name+"｜UUID："+c.id+"｜revision："+revision)}
async function run(fn){try{await fn()}catch(e){status(e.message+(e.code?"（"+e.code+"）":"")+"；請保留未儲存草稿")}}
$("apiLoad").onclick=()=>run(async()=>{remote=await client.list();if(!remote.length)return prepareNew();choose(remote.find(c=>c.id===restoreSelection())||remote[0]);status("隔離 API 清單 "+remote.length+" 筆；"+remote[0].id)});
$("apiCreate").onclick=()=>run(async()=>{if(!/^TEST-MOBILE-/.test($("code").value.trim()))return prepareNew();const c=await client.create({case_code:$("code").value.trim(),display_name:$("name").value.trim()});const verified=await client.get(c.id);choose(verified);status("隔離 API 新增並重新 GET 成功："+verified.id)});
$("apiUpdate").onclick=()=>run(async()=>{if(!active)return status("請先讀取或新增隔離個案");const c=await client.update({id:active,case_code:$("code").value.trim(),display_name:$("name").value.trim(),expected_revision:revision});const verified=await client.get(c.id);choose(verified);status("隔離 API 修改並重新 GET 成功：revision "+verified.revision)});
$("apiRefresh").onclick=()=>run(async()=>{if(!active)active=restoreSelection();if(!active)return status("尚未選取隔離個案");const c=await client.get(active);choose(c);status("已從隔離 API 重新讀取："+c.display_name)});
async function visits(type){if(!active)return status("尚未選取隔離個案");const url="https://nddw2e.hatchable.site/api/v1/visits?case_id="+encodeURIComponent(active);let r;try{r=await fetch(url,{credentials:"include",headers:{Accept:"application/json"}})}catch{throw new YHNIsolatedV1.ApiError(0,"network_error")}let data={};try{data=await r.json()}catch{}if(!r.ok)throw new YHNIsolatedV1.ApiError(r.status,data.error);if(!Array.isArray(data.visits))throw new Error("訪視回傳格式不符");const matched=data.visits.filter(v=>v.case_id===active&&v.visit_type===type);status((type==="home"?"家訪":"電訪")+"："+matched.length+" 筆｜共用 UUID："+active)}
async function saveVisit(type){
 const out=$("visitStatus");const note=$("visitNote").value.trim(),visit_date=$("visitDate").value;
 if(!active)return out.textContent="請先選擇隔離個案";
 if(!note||!/^\\d{4}-\\d{2}-\\d{2}$/.test(visit_date))return out.textContent="請輸入虛構訪視日期與內容";
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
$("apiHome").onclick=()=>run(()=>visits("home"));
$("apiPhone").onclick=()=>run(()=>visits("phone"));
$("apiPlan").onclick=()=>run(async()=>{if(!active)return status("尚未選取隔離個案");let r;try{r=await fetch("https://nddw2e.hatchable.site/api/v1/care-plans?case_id="+encodeURIComponent(active),{credentials:"include",headers:{Accept:"application/json"}})}catch{throw new YHNIsolatedV1.ApiError(0,"network_error")}let d={};try{d=await r.json()}catch{}if(!r.ok)throw new YHNIsolatedV1.ApiError(r.status,d.error);if(d.care_plan?.case_id!==active)throw new Error("照顧計畫 UUID 不一致");status("照顧計畫 UUID 一致："+active)});document.querySelector("#isolatedPanel h3").insertAdjacentHTML("afterend",'<button id="apiNew" type="button">產生全新虛構個案代碼</button>');$("apiNew").onclick=prepareNew;const saved=restoreSelection();if(saved)run(async()=>{const c=await client.get(saved);choose(c);status("重新整理後從隔離 API 讀取成功："+c.id)});else prepareNew();})();