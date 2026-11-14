const CATS={
'服務回饋':['服務滿意','服務不滿意','服務態度良好','進班準時','無調整需求','希望增加服務','希望減少服務','備餐不合需求'],
'身體狀況':['身體狀況無明顯變化','近期較虛弱','頭暈','疼痛','食慾下降','體重下降','近期跌倒'],
'行動能力':['行走不穩','需攙扶行走','使用拐杖','使用助行器','使用輪椅','無法久站','移位需協助','上下樓梯困難'],
'認知與溝通':['健忘','重複詢問','疑似認知變化','對話反應較慢','表達需求困難'],
'情緒與互動':['情緒不穩','焦慮','情緒低落','感到孤單','抗拒他人協助','與家屬有口角'],
'日常自理':['洗澡需協助','可自行洗澡','穿衣需協助','如廁需協助','進食需協助','服藥需提醒'],
'飲食與備餐':['飲食正常','食慾不佳','咀嚼困難','吞嚥困難','備餐困難','代購餐食需求'],
'睡眠與作息':['睡眠正常','入睡困難','夜間頻繁起床','日夜顛倒','白天嗜睡'],
'就醫與轉銜':['近期回診','陪同就醫需求','住院','出院恢復','拒絕就醫','返家後需重新評估服務'],
'家庭支持':['家屬支持有限','家屬照顧壓力','主要照顧者疲憊','獨居','家屬願意協助'],
'居家環境':['家中動線不佳','浴室濕滑','雜物較多','照明不足','缺乏扶手','環境整潔'],
'服務執行':['備餐服務','沐浴服務','家務協助','代購服務','陪伴服務','陪同外出','陪同就醫','服務未到班','臨時取消服務'],
'服務配合':['拒絕沐浴','拒絕外出','不願接受代班','希望固定服務人員','對服務時間有意見'],
'人員與排班':['居服員請假','臨時代班','服務遲到','人員異動','排班與需求不符'],
'紀錄與費用':['服務紀錄爭議','服務項目不符','服務時數爭議','費用疑問','簽名問題'],
'安全與風險':['跌倒風險','疑似受虐','疑似走失風險','居家安全疑慮','其他異常'],
'處遇與追蹤':['已提醒安全','已與家屬討論','已聯繫個管師','已完成異動通報','已安排後續追蹤','待確認服務調整']
};
const $=id=>document.getElementById(id),titles=['個案狀況','服務情形','個案及家屬回應','處遇計畫'],keys=['condition','service','response','action'];let category='身體狀況',chosen=new Set(),type='家訪',record={condition:'',service:'',response:'',action:''};const STORE='yhn_b_hatch_demo_v1';let active='basic';
function getAll(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
const remoteVisits={A:[],B:[]},loaded={A:false,B:false};
function getVisits(){return remoteVisits[$('case').value]||[]}
async function loadVisits(){
 const key=$('case').value;
 try{
  const r=await fetch('/api/visits?case_key='+encodeURIComponent(key),{cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!Array.isArray(data.visits))throw Error(data.error||'伺服器讀取失敗');
  remoteVisits[key]=data.visits;loaded[key]=true;
  if($('case').value===key){if(active==='history')history();if(active==='facts')tracking()}
 }catch(e){loaded[key]=false;if(active==='history')$('historyList').textContent='伺服器讀取失敗：'+e.message;if(active==='facts')$('track').textContent='無法載入前次追蹤：'+e.message}
}
function nav(p){active=p;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));if(p==='history'){history();loadVisits()}if(p==='facts'){tracking();loadVisits()}if(p==='draft')drawRecord();window.scrollTo(0,0)}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>nav(b.dataset.page));document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>nav(b.dataset.next));document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type;document.querySelectorAll('[data-type]').forEach(x=>x.classList.toggle('chosen',x===b))});
function renderCats(){let q=$('filter').value.trim();$('categories').innerHTML='';Object.keys(CATS).filter(k=>!q||k.includes(q)||CATS[k].some(s=>s.includes(q))).forEach(k=>{let b=document.createElement('button');b.className='chip'+(k===category?' active':'');b.textContent=k;b.onclick=()=>{category=k;renderCats();renderOptions()};$('categories').append(b)})}
function renderOptions(){let q=$('filter').value.trim();$('options').innerHTML='';(CATS[category]||[]).filter(v=>!q||v.includes(q)||category.includes(q)).forEach(v=>{let l=document.createElement('label');l.className='opt';let c=document.createElement('input');c.type='checkbox';c.checked=chosen.has(v);c.onchange=()=>{c.checked?chosen.add(v):chosen.delete(v);$('picked').textContent='已選 '+chosen.size+' 項：'+[...chosen].join('、')};l.append(c,document.createTextNode(v));$('options').append(l)});$('picked').textContent='已選 '+chosen.size+' 項：'+[...chosen].join('、')}
$('filter').oninput=()=>{const q=$('filter').value.trim();if(q){let found=Object.keys(CATS).find(k=>k.includes(q)||CATS[k].some(s=>s.includes(q)));if(found)category=found}renderCats();renderOptions()};
function tracking(){let history=getVisits();let t=history.flatMap(v=>v.pending||[]);$('track').replaceChildren();if(!t.length){$('track').textContent='目前沒有已儲存的待追蹤事項。';return}let u=[...new Set(t)];for(const val of u){let d=document.createElement('div');d.className='card';d.textContent='待追蹤：'+val;$('track').append(d)}}
function drawRecord(){$('fields').replaceChildren();keys.forEach((key,i)=>{let d=document.createElement('div');d.className='edit';let h=document.createElement('h3');h.textContent=(i+1)+'、'+titles[i];let t=document.createElement('textarea');t.value=record[key];t.placeholder='尚未提供本段事實；留白即可';t.oninput=()=>record[key]=t.value;d.append(h,t);$('fields').append(d)})}
function status(s,err=false){$('status').className=err?'alert':'ok';$('status').textContent=s}
function check(){let list=[];if(chosen.has('服務滿意')&&chosen.has('服務不滿意'))list.push('服務滿意與不滿意同時勾選，請確認時間及來源');if(chosen.has('可自行洗澡')&&chosen.has('洗澡需協助'))list.push('洗澡能力描述可能矛盾');if(chosen.has('住院')&&chosen.has('出院恢復'))list.push('請確認住院／出院日期及服務是否實際恢復');return list}
$('generate').onclick=async()=>{let facts=[...chosen],extra=$('extra').value.trim(),actions=$('actions').value.trim();if(!facts.length&&!extra){status('請先提供本次訪視事實。',true);return}if(Object.values(record).some(v=>v.trim())&&!confirm('重新生成會取代目前四段文字，確定嗎？'))return;const warn=check();$('warnings').replaceChildren();warn.forEach(w=>{let d=document.createElement('div');d.className='alert';d.textContent='⚠ '+w;$('warnings').append(d)});status('AI 正在整理去識別化草稿…');$('generate').disabled=true;try{const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitType:type,who:$('who').value,source:$('source').value,facts,extra,actions,tracking:getVisits().flatMap(v=>v.pending||[]).slice(-6)})});const x=await res.json();if(!res.ok)throw Error(x.error||'生成失敗');record=x.record;drawRecord();(x.warnings||[]).forEach(w=>{let d=document.createElement('div');d.className='alert';d.textContent='⚠ '+w;$('warnings').append(d)});status('AI 草稿已產生，請逐段核對；尚非正式訪視紀錄。')}catch(e){status(e.message,true)}finally{$('generate').disabled=false}};
async function save(){
 if(!Object.values(record).some(x=>x.trim()))return status('尚無可儲存的紀錄',true);
 let pending=$('actions').value.split(/[\n；]/).map(x=>x.trim()).filter(x=>/待|後續|追蹤|確認/.test(x)).slice(0,8);
 const payload={case_key:$('case').value,date:$('date').value,type,who:$('who').value,source:$('source').value,facts:[...chosen],extra:$('extra').value,actions:$('actions').value,record:{...record},pending};
 $('save').disabled=true;status('正在儲存至測試資料庫…');
 try{
  const res=await fetch('/api/visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.saved!==true||!data.visit?.id)throw Error(data.error||'伺服器未確認儲存');
  await loadVisits();
  status('已儲存至私人測試資料庫；紀錄編號：'+data.visit.id.slice(0,8)+'（非正式主檔）');
 }catch(e){status('儲存失敗，未寫入資料庫：'+e.message,true)}
 finally{$('save').disabled=false}
}
$('save').onclick=save;
function history(){$('historyList').replaceChildren();let h=[...getVisits()].reverse();if(!h.length){$('historyList').textContent='沒有已儲存的歷史紀錄';return}h.forEach((v,i)=>{let d=document.createElement('div');d.className='card';let title=document.createElement('strong');title.textContent=v.date+'｜'+v.type;let b=document.createElement('button');b.className='secondary';b.style.marginLeft='12px';b.textContent='開啟參考';b.onclick=()=>{record={...v.record};drawRecord();nav('draft');status('已開啟歷史紀錄供參考；不會自動視為本次事實。')};d.append(title,b);$('historyList').append(d)})}
$('export').onclick=()=>{let s='永護寧｜家電訪去識別化測試草稿\n'+$('date').value+' '+type+'\n'+keys.map((k,i)=>(i+1)+'、'+titles[i]+'\n'+record[k]).join('\n\n')+'\n\n草稿僅供督導覆核，不是正式紀錄。';let a=document.createElement('a'),url=URL.createObjectURL(new Blob([s],{type:'text/plain;charset=utf-8'}));a.href=url;a.download='永護寧_家電訪測試草稿.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)};
function reset(){chosen=new Set();record={condition:'',service:'',response:'',action:''};$('extra').value='';$('actions').value='';$('source').value='';$('filter').value='';$('warnings').replaceChildren();$('status').textContent='';renderCats();renderOptions();drawRecord()}
$('case').onchange=()=>{reset();if($('case').value)loadVisits()};$('date').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);renderCats();renderOptions();drawRecord();
let caseRows=[];
function showCases(search=''){
 const current=$('case').value;
 const rows=caseRows.filter(c=>(c.label+' '+c.code).includes(search.trim()));
 $('case').replaceChildren();
 if(!rows.length){let o=new Option(search?'找不到符合個案':'尚未建立個案','');$('case').add(o);}
 else rows.forEach(c=>$('case').add(new Option(c.label+'（'+(c.official_code_matched?c.code:'案號待核對')+'）',c.key)));
 if(rows.some(c=>c.key===current))$('case').value=current;
 else if(rows.length){$('case').value=rows[0].key;reset();loadVisits();}
 else $('case').value='';
 const selected=rows.find(c=>c.key===$('case').value);$('caseInfo').textContent=selected?'名冊 '+rows.length+' 位｜主責督導：'+(selected.supervisor||'未核對')+'｜狀態：'+(selected.service_status||'未核對')+'｜案號：'+(selected.official_code_matched?'已對照':'待核對')+'｜1至10月訪視規劃已存檔。':(rows.length?'名冊 '+rows.length+' 位。':'尚無個案資料，可新增個案。');
}
async function refreshCases(){
 try{
  const r=await fetch('/api/cases',{cache:'no-store'}),data=await r.json();
  if(!r.ok||!Array.isArray(data.cases))throw Error(data.error||'讀取失敗');
  caseRows=data.cases;showCases($('caseSearch').value);
 }catch(e){$('caseInfo').textContent='個案名冊讀取失敗：'+e.message;}
}
$('caseSearch').oninput=()=>showCases($('caseSearch').value);
$('createCase').onclick=async()=>{
 const code=$('caseCode').value.trim(),name=$('caseName').value.trim(),out=$('caseCreateStatus');
 if(!/^[A-Za-z0-9_-]{2,40}$/.test(code)||!name)return out.textContent='請填寫有效案號與姓名';
 $('createCase').disabled=true;out.textContent='正在新增個案…';
 try{
  const res=await fetch('/api/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({case_code:code,display_name:name})});
  const data=await res.json();
  if(!res.ok||data.saved!==true)throw Error(data.error||'新增失敗');
  $('caseSearch').value='';await refreshCases();$('case').value=data.case.key;reset();await loadVisits();
  out.textContent='個案已建檔（待核對），可開始建立家電訪紀錄。';
 }catch(e){out.textContent='新增失敗：'+e.message}
 finally{$('createCase').disabled=false}
};
refreshCases();