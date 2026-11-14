// 永護寧家電訪名冊更新：只在使用者瀏覽器讀取指定的兩份 Excel，確認後傳送必要欄位。
(function(){
const $=id=>document.getElementById(id);
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
let pending=null;
const set=(text,error=false)=>{$('importSummary').className=error?'alert':'hint';$('importSummary').textContent=text;};
function child(e,name){return e?.getElementsByTagNameNS(NS,name)[0]||null;}
function all(e,name){return [...(e?.getElementsByTagNameNS(NS,name)||[])];}
function colIndex(s){let n=0;for(let ch of s){n=n*26+ch.charCodeAt(0)-64}return n-1}
async function excelRows(file){
 if(!file)throw Error('請上傳兩份指定的 Excel 檔');
 if(!/\.xlsm?$|\.xlsx$/i.test(file.name))throw Error('僅接受 Excel xlsm／xlsx');
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const part=zip.file('xl/worksheets/sheet1.xml');
 if(!part)throw Error('Excel 缺少第一工作表');
 const sharedPart=zip.file('xl/sharedStrings.xml');
 const shared=sharedPart?all(new DOMParser().parseFromString(await sharedPart.async('string'),'application/xml'),'si').map(si=>all(si,'t').map(t=>t.textContent).join('')):[];
 const xml=new DOMParser().parseFromString(await part.async('string'),'application/xml');
 if(xml.querySelector('parsererror'))throw Error('Excel 資料格式錯誤');
 const data=[];
 for(const row of all(xml,'row')){
  const index=Number(row.getAttribute('r'))||1,values=[];
  for(const cell of all(row,'c')){
   const ref=cell.getAttribute('r'),match=/^([A-Z]+)\d+$/.exec(ref||'');if(!match)continue;
   const col=colIndex(match[1]),kind=cell.getAttribute('t'),v=child(cell,'v');
   let val=v?.textContent??'';
   if(kind==='s')val=shared[Number(val)]??'';
   if(kind==='inlineStr')val=all(cell,'t').map(t=>t.textContent).join('');
   values[col]=val;
  }
  data[index-1]=values;
 }
 return data;
}
function trim(v){return String(v??'').trim()}
$('rosterFile').addEventListener('change',()=>{pending=null;$('submitImport').disabled=true;});
$('caseBaseFile').addEventListener('change',()=>{pending=null;$('submitImport').disabled=true;});
$('checkImport').onclick=async()=>{
 $('submitImport').disabled=true;pending=null;
 const rosterFile=$('rosterFile').files?.[0],baseFile=$('caseBaseFile').files?.[0];
 if(!rosterFile||!baseFile)return set('需選擇兩份 Excel：最新家電訪清冊 .xlsm ＋ 10月個案總表 .xlsx。V2 JSON 備份不能代替清冊。',true);
 $('checkImport').disabled=true;set('正在本機核對兩份個案名冊…');
 try{
  const [roster,base]=await Promise.all([excelRows(rosterFile),excelRows(baseFile)]);
  if(trim(roster?.[1]?.[1])!=='主責督導'||trim(roster?.[1]?.[2])!=='個案姓名'||trim(base?.[2]?.[4])!=='衛福案號'||trim(base?.[2]?.[6])!=='姓名')throw Error('上傳表格欄位與核定來源不符');
  const official=new Map(),dupBase=new Set();
  for(let i=3;i<base.length;i++){
   const row=base[i]||[],name=trim(row[6]),code=trim(row[4]);
   if(!name||!code)continue;
   if(official.has(name))dupBase.add(name);
   else official.set(name,code);
  }
  if(dupBase.size)throw Error('個案總表存在同名個案，已停止自動配對。');
  let all=[],seenCode=new Set(),seenName=new Set(),matched=0,pendingCount=0,month10=0;
  for(let i=2;i<roster.length;i++){
   const r=roster[i]||[],seq=Number(r[0]),name=trim(r[2]);if(!name||!Number.isInteger(seq))continue;
   if(seenName.has(name))throw Error('家電訪清冊出現同名個案，請先核對。');
   seenName.add(name);
   const code=official.get(name)||('PENDING-115-'+String(seq).padStart(4,'0'));
   if(seenCode.has(code))throw Error('不同個案共用衛福案號，已停止匯入。');
   seenCode.add(code);
   const plan={};for(let m=1;m<=10;m++){const v=trim(r[5+m]);if(['家訪','電訪','—'].includes(v))plan[m+'月']=v;}
   if(plan['10月']&&plan['10月']!=='—')month10++;
   const isMatched=official.has(name);if(isMatched)matched++;else pendingCount++;
   all.push({code,label:name,supervisor:trim(r[1]),service_type:trim(r[3]),service_status:trim(r[4]),
       official_code_matched:isMatched,monthly_plan:plan});
  }
  if(all.length!==140||matched!==117||pendingCount!==23)throw Error('目前讀到清冊 '+all.length+' 人、衛福案號配對 '+matched+' 人、待核對 '+pendingCount+' 人；本次確認主檔應為 140／117／23，請確認檔案是否為最新版。');
  pending={cases:all,source_version:'（玉）115 家電訪清冊最新一版(3).xlsm'};
  $('submitImport').disabled=false;
  set('核對完成：家電訪清冊 140 位；已對上衛福案號 117 位；案號待核對 23 位。10月已排訪視 '+month10+' 位；11、12月來源未提供，不補填。點「確認後寫入」才會更新資料庫。');
 }catch(e){set('核對失敗，資料庫沒有更動：'+e.message,true)}
 finally{$('checkImport').disabled=false}
};
$('submitImport').onclick=async()=>{
 if(!pending)return set('請先核對兩份資料。',true);
 if(!confirm('確認以最新家電訪清冊更新目前登入帳號下的個案名冊？不刪除既有訪視紀錄，23位未對上案號者標示待核對。'))return;
 $('submitImport').disabled=true;set('正在匯入名冊至資料庫…');
 try{
  const res=await fetch('/api/import-cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.saved!==true||data.total!==pending.cases.length)throw Error(res.status===401?'沒有資料庫登入權限：需用 Hatchable 專案成員帳號登入，網站開啟成功不代表能儲存。':(data.error||'資料庫未確認完整寫入'));
  set('✅ 資料庫已核實寫入 '+data.total+' 位；衛福案號對照 '+data.official_match+' 位、待核對 '+data.provisional+' 位。既有訪視資料保留。');
  await refreshCases();
 }catch(e){set('匯入失敗，不顯示成功：'+e.message,true)}
 finally{$('submitImport').disabled=false}
};
})();