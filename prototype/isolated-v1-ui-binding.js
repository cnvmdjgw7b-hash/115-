/* Isolated API binding for existing mock-case-crud-flow.html. No token storage. */
(function(){
"use strict";
const root=document.querySelector("main"),box=document.createElement("section");
box.id="isolatedPanel";
box.innerHTML='<h3>隔離測試 API v1｜需 Hatchable 協作者登入</h3><p>僅允許 nddw2e 隔離站。若跨來源 Cookie/CORS 未授權，顯示錯誤，不回退至假儲存。</p><div class="grid"><button id="apiLoad">讀取測試個案</button><button id="apiCreate">新增至隔離庫</button><button id="apiUpdate">修改至隔離庫</button><button id="apiRefresh">重新讀取個案</button><button id="apiHome">讀取家訪</button><button id="apiPhone">讀取電訪</button><button id="apiPlan">讀取照顧計畫</button></div><output id="apiStatus" aria-live="polite"></output>';
root.append(box);
const $=id=>document.getElementById(id),client=YHNIsolatedV1.makeClient({baseUrl:"https://nddw2e.hatchable.site"});
let remote=[],active=null,revision=null;
function status(t){$("apiStatus").textContent=t}
function choose(c){active=c.id;revision=c.revision;$("code").value=c.case_code;$("name").value=c.display_name;status("隔離個案："+c.display_name+"｜UUID："+c.id+"｜revision："+revision)}
async function run(fn){try{await fn()}catch(e){status(e.message+(e.code?"（"+e.code+"）":"")+"；請保留未儲存草稿")}}
$("apiLoad").onclick=()=>run(async()=>{remote=await client.list();if(!remote.length)return status("隔離帳號無可見測試個案");choose(remote[0]);status("隔離 API 清單 "+remote.length+" 筆；"+remote[0].id)});
$("apiCreate").onclick=()=>run(async()=>{const c=await client.create({case_code:$("code").value.trim(),display_name:$("name").value.trim()});const verified=await client.get(c.id);choose(verified);status("隔離 API 新增並重新 GET 成功："+verified.id)});
$("apiUpdate").onclick=()=>run(async()=>{if(!active)return status("請先讀取或新增隔離個案");const c=await client.update({id:active,case_code:$("code").value.trim(),display_name:$("name").value.trim(),expected_revision:revision});const verified=await client.get(c.id);choose(verified);status("隔離 API 修改並重新 GET 成功：revision "+verified.revision)});
$("apiRefresh").onclick=()=>run(async()=>{if(!active)return status("尚未選取隔離個案");const c=await client.get(active);choose(c);status("已從隔離 API 重新讀取："+c.display_name)});
async function visits(type){if(!active)return status("尚未選取隔離個案");const url="https://nddw2e.hatchable.site/api/v1/visits?case_id="+encodeURIComponent(active);let r;try{r=await fetch(url,{credentials:"include",headers:{Accept:"application/json"}})}catch{throw new YHNIsolatedV1.ApiError(0,"network_error")}let data={};try{data=await r.json()}catch{}if(!r.ok)throw new YHNIsolatedV1.ApiError(r.status,data.error);if(!Array.isArray(data.visits))throw new Error("訪視回傳格式不符");const matched=data.visits.filter(v=>v.case_id===active&&v.visit_type===type);status((type==="home"?"家訪":"電訪")+"："+matched.length+" 筆｜共用 UUID："+active)}
$("apiHome").onclick=()=>run(()=>visits("home"));
$("apiPhone").onclick=()=>run(()=>visits("phone"));
$("apiPlan").onclick=()=>run(async()=>{if(!active)return status("尚未選取隔離個案");let r;try{r=await fetch("https://nddw2e.hatchable.site/api/v1/care-plans?case_id="+encodeURIComponent(active),{credentials:"include",headers:{Accept:"application/json"}})}catch{throw new YHNIsolatedV1.ApiError(0,"network_error")}let d={};try{d=await r.json()}catch{}if(!r.ok)throw new YHNIsolatedV1.ApiError(r.status,d.error);if(d.care_plan?.case_id!==active)throw new Error("照顧計畫 UUID 不一致");status("照顧計畫 UUID 一致："+active)});})();