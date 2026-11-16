/* v1-test adapter only. Never include credentials in source. No automatic calls. */
(function(root){
"use strict";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class ApiError extends Error{constructor(status,code){super(({401:"登入已失效，請重新登入",404:"找不到個案或無權查看",409:"資料已異動或案號重複，請重新讀取後確認",0:"網路連線中斷，草稿未清除"})[status]||"儲存失敗，請稍後重試");this.status=status;this.code=code||"unknown";}}
function makeClient({baseUrl,fetchImpl=fetch,credentials="include"}={}){
 if(typeof baseUrl!=="string"||!/^https:\/\/nddw2e\.hatchable\.site(?:\/)?$/.test(baseUrl))throw new Error("僅允許後台指定隔離測試站，禁止正式站");
 const endpoint=baseUrl.replace(/\/$/,"")+"/api/v1/cases";
 async function request(method,body,id){
  const url=endpoint+(id?"?id="+encodeURIComponent(id):"");
  let response;
  try{response=await fetchImpl(url,{method,credentials,headers:{"Accept":"application/json",...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});}
  catch{throw new ApiError(0,"network_error")}
  let data={};try{data=await response.json()}catch{}
  if(!response.ok)throw new ApiError(response.status,data.error);
  return data;
 }
 return Object.freeze({
  list:async()=>{const r=await request("GET");if(!Array.isArray(r.cases))throw new Error("API 清單格式不符");return r.cases},
  get:async id=>{if(!UUID.test(id))throw new Error("UUID 無效");const r=await request("GET",null,id);if(!r.case)throw new Error("API 個案格式不符");return r.case},
  create:async ({case_code,display_name})=>{const r=await request("POST",{case_code,display_name,expected_revision:0});if(r.saved!==true||!r.case?.id)throw new Error("API 未確認儲存成功");return r.case},
  update:async ({id,case_code,display_name,expected_revision})=>{if(!UUID.test(id)||!Number.isInteger(expected_revision))throw new Error("ID/版本無效");const r=await request("PUT",{id,case_code,display_name,expected_revision});if(r.saved!==true||!r.case?.id)throw new Error("API 未確認儲存成功");return r.case}
 });
}
const api=Object.freeze({makeClient,ApiError});if(typeof module!=="undefined"&&module.exports)module.exports=api;root.YHNIsolatedV1=api;
})(typeof globalThis!=="undefined"?globalThis:this);