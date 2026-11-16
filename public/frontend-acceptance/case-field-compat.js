/* 永護寧前端相容層：純資料轉換；不呼叫 API、不改動舊物件。 */
(function(root){
  "use strict";
  function canonical(row){
    if(!row||typeof row!=="object")throw new TypeError("個案資料必須是物件");
    const id=row.id??row.key;
    const case_code=row.case_code??row.code;
    const display_name=row.display_name??row.label;
    if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new TypeError("缺少有效 UUID，禁止用姓名推導 ID");
    if(typeof case_code!=="string"||!case_code.trim()||typeof display_name!=="string"||!display_name.trim())throw new TypeError("缺少案號或姓名");
    return {...row,id,case_code,display_name};
  }
  function legacy(row){
    const c=canonical(row);
    return {...c,key:c.id,code:c.case_code,label:c.display_name};
  }
  function list(rows){if(!Array.isArray(rows))throw new TypeError("預期個案陣列");return rows.map(canonical)}
  const api=Object.freeze({canonical,legacy,list});
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.YHNCaseCompat=api;
})(typeof globalThis!=="undefined"?globalThis:this);