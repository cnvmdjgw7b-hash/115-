// 永護寧 Word 固定欄位套印：所有 Word 文件處理均在使用者瀏覽器執行。
(function(){
const $=id=>document.getElementById(id),NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const codes=['BA01','BA02','BA03','BA04','BA05','BA06','BA07','BA08','BA09','BA10','BA11','BA12','BA13','BA14','BA15','BA16','BA17','BA18','BA20','BA21','BA22','BA23','BA24','GA09'];
const KEY=['condition','service','response','action'],LABEL=['個案狀況','服務情形','個案及家屬回應','處遇計畫'];
let template=null,templateName='',formText={condition:'',service:'',response:'',action:''},checked=new Set();
const q=(root,tag)=>Array.from(root.childNodes||[]).filter(x=>x.nodeType===1&&x.localName===tag);
const sub=(root,tag)=>Array.from(root.getElementsByTagNameNS(NS,tag));
const safe=s=>String(s||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const state=(text,err=false)=>{ $('wordStatus').className=err?'alert':'ok';$('wordStatus').textContent=text;};
function dateROC(iso){let m=String(iso||'').match(/^(\d{4})-(\d\d)-(\d\d)$/);return m?(+m[1]-1911)+'年'+(+m[2])+'月'+(+m[3])+'日':''}
function renderCodes(){const d=$('baOptions');d.replaceChildren();codes.forEach(c=>{let lab=document.createElement('label');lab.style.cssText='display:inline-flex;align-items:center;gap:4px;border:1px solid #b6ceb9;border-radius:8px;margin:0;padding:6px;font-weight:400;font-size:13px';let cb=document.createElement('input');cb.type='checkbox';cb.style.cssText='width:16px;height:16px';cb.checked=checked.has(c);cb.onchange=()=>cb.checked?checked.add(c):checked.delete(c);lab.append(cb,document.createTextNode(c));d.append(lab)})}
function renderFormText(){const d=$('formNarratives');d.replaceChildren();KEY.forEach((k,i)=>{let box=document.createElement('div');box.className='edit';let h=document.createElement('h3');h.textContent=(i+1)+'、'+LABEL[i];let t=document.createElement('textarea');t.rows=4;t.placeholder='尚未提供本段事實，留白即可';t.value=formText[k]||'';t.addEventListener('input',()=>formText[k]=t.value);box.append(h,t);d.append(box)})}
function inherit(){KEY.forEach(k=>formText[k]=record[k]||'');renderFormText();$('fDate').value=$('date').value;$('fWho').value=$('who').value;const selected=caseRows.find(x=>x.key===$('case').value);if(selected?.label)$('fName').value=selected.label;if(selected?.official_code_matched)$('fCaseId').value=selected.code;state('已帶入四段紀錄；請確認資料後再套印。')}
$('copyNarratives').onclick=inherit;
$('templateFile').onchange=async e=>{template=null;const f=e.target.files?.[0];if(!f)return;if(!/\.docx$/i.test(f.name)){state('僅接受 Word .docx 範本',true);return}try{
  const buf=await f.arrayBuffer();const zip=await JSZip.loadAsync(buf);
  const xml=await zip.file('word/document.xml')?.async('string');
  if(!xml||!xml.includes('家訪')||!xml.includes('處遇計畫'))throw Error('不是可辨識的永護寧家訪範本');
  // 已填寫的真實家訪紀錄不可用來當空白模板，避免舊個案資料與量表勾選殘留。
  if(xml.includes('■'))throw Error('這份表單已有已勾選的選項，請改用空白家訪範本，避免前個案量表殘留。');
  const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('Word XML 格式無效');
  const root=sub(doc,'tbl')[0],rows=q(root,'tr');if(rows.length<11||q(rows[10],'tc').length<2)throw Error('表格結構不符合已核對範本');
  template=buf;templateName=f.name;
  $('templateStatus').textContent='已載入 '+f.name+'（僅於目前瀏覽器記憶體使用，不上傳伺服器）';
  state('已辨識空白家訪範本。勾選與文字將寫回原表格，不會改造量表或套用其他個案評分。');
 }catch(e){state('無法使用範本：'+e.message,true)}};
function setCell(doc,tc,text){
 const paras=q(tc,'p'),p=paras[0]||doc.createElementNS(NS,'w:p');
 if(!paras.length)tc.appendChild(p);
 // 清除舊範本的內嵌表格與所有舊內容，避免另一位個案的量表、姓名或標記殘留。
 for(const node of [...tc.childNodes])if(node!==p&&node.localName!=='tcPr')node.remove();
 let base=sub(p,'r')[0]?.cloneNode(true);
 if(!base)base=doc.createElementNS(NS,'w:r');
 for(const node of [...base.childNodes])if(node.localName!=='rPr')base.removeChild(node);
 for(const ch of [...p.childNodes])if(ch.localName!=='pPr')p.removeChild(ch);
 const lines=String(text||'').split('\n');
 lines.forEach((line,i)=>{if(i){let br=doc.createElementNS(NS,'w:br');base.appendChild(br)}
  let t=doc.createElementNS(NS,'w:t');t.setAttribute('xml:space','preserve');t.textContent=line;base.appendChild(t);
 });
 p.appendChild(base);
}
// 在既有 Word 的文字 run 中只切換 □／■，不重建原有每一列的段落與欄寬。
function toggleChecks(tc,active){
 for(const p of sub(tc,'p')){
  const runs=sub(p,'t');if(!runs.length)continue;
  let all=runs.map(x=>x.textContent).join(''),map={};
  const rx=/[■□]([^■□]*)/g;let m;
  while((m=rx.exec(all))){const label=m[1].replace(/\s+/g,'');map[m.index]=[...active].some(x=>label.startsWith(x.replace(/\s+/g,'')))?'■':'□'}
  let off=0;for(const t of runs){let s=t.textContent.split('');for(let i=0;i<s.length;i++)if(map[off+i])s[i]=map[off+i];t.textContent=s.join('');off+=s.length}
 }
}
function stamp(doc){
 const root=sub(doc,'tbl')[0],rows=q(root,'tr'),cell=(r,c)=>q(rows[r],'tc')[c];
 // 以原 Word 的實體儲存格順序套印，不另外重建表格。
 setCell(doc,cell(0,1),$('fCaseId').value||'');
 setCell(doc,cell(0,3),dateROC($('fDate').value));
 setCell(doc,cell(1,1),$('fName').value||'');
 setCell(doc,cell(1,3),$('fWho').value||'');
 setCell(doc,cell(2,1),$('fDob').value||'');
 setCell(doc,cell(2,3),''); // 測試站不收身分證字號
 toggleChecks(cell(6,0),checked);
 toggleChecks(cell(6,1),checked);
 toggleChecks(cell(6,2),new Set([$('fServiceFit').value]));
 const hyg=['環境整潔乾淨','空氣流通','孳生蚊蠅','雜亂骯髒昏暗','潮濕有異味'],safeNames=['行走動線通暢明亮','通道狹窄或有阻礙','光源不足','雜物多且亂','地面不平','有跌倒風險'];
 toggleChecks(cell(6,3),new Set([$('fHygiene').value]));
 toggleChecks(cell(6,4),new Set([$('fSafety').value]));
 // 社會資源欄保留原表列項；未逐項評估時不自動勾選。
 toggleChecks(cell(6,5),new Set([$('fSupport').value]));
 // 身心狀況表頭與量表維持正式表單原始內容。
 // 示範範本可能有已評分內容：不繼承任何前位個案量表分數。
 // 不覆寫正式簡式健康量表的題目、選項與計分格。
 // 不覆寫家庭照顧者負荷量表的題目、選項與計分格。
 const paragraphs=KEY.map((k,i)=>(['一','二','三','四'][i])+'、'+LABEL[i]+'\n'+(formText[k]||'')).join('\n\n');
 const target=cell(10,1),ps=q(target,'p');
 // 正式範本的四個標題與四個內容段落各自有原生字級與行距。
 if(ps.length<8)throw Error('缺少正式家訪四段處遇欄位');
 function putP(p,value){let r=sub(p,'r')[0]?.cloneNode(true)||doc.createElementNS(NS,'w:r');for(const n of [...r.childNodes])if(n.localName!=='rPr')n.remove();for(const n of [...p.childNodes])if(n.localName!=='pPr')n.remove();let t=doc.createElementNS(NS,'w:t');t.setAttribute('xml:space','preserve');t.textContent=value||'';r.appendChild(t);p.appendChild(r);}
 KEY.forEach((key,i)=>putP(ps[i*2+1],formText[key]||''));
 // 只在督導簽核欄下方填入代稱，不覆蓋標籤及主管欄。\n if(q(rows[12],'tc')[0])setCell(doc,cell(12,0),$('fSupervisor').value||'');
 // 全文件進一步清除來源範例中的可識別資料（使用者提供的示例姓名與證號）。
 // 禁止已填紀錄作為範本；不以特定個案姓名做不完整的去識別處理。
}
$('downloadWord').onclick=async()=>{if(!template){state('請先選擇「空白家訪 Word 範本」，不能使用已填寫個案的家訪檔案。',true);$('templateFile').focus();return}
 if(!Object.values(formText).some(v=>v.trim())&&Object.values(record).some(v=>String(v||'').trim()))inherit();
 if(!Object.values(formText).some(v=>v.trim())){state('請先在上方「④ AI 整理與修正」填寫文字，或從 AI 紀錄帶入。',true);return}
 try{
 const zip=await JSZip.loadAsync(template);
 const xml=await zip.file('word/document.xml').async('string');
 const doc=new DOMParser().parseFromString(xml,'application/xml');stamp(doc);
 zip.file('word/document.xml',new XMLSerializer().serializeToString(doc));
 // 移除可能包含舊個案姓名的附加個人資訊 metadata。
 // 保留 docProps/core.xml；移除會造成 DOCX 結構不完整。
 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='永護寧_家訪固定欄位套印_測試版.docx';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
 state('已下載 Word 測試檔。原表格、量表與四段文字格式保留；請檢查量表是否已實際評估及列印有無跑版。');
 }catch(e){state('套印失敗：'+e.message,true)}};
function preview(){
 const info=[['案號',$('fCaseId').value],['姓名',$('fName').value],['訪視日期',dateROC($('fDate').value)],['受訪身分',$('fWho').value],['核定碼別',[...checked].join('、')],['服務需求',$('fServiceFit').value],['環境衛生',$('fHygiene').value],['居家安全',$('fSafety').value],['社會資源',$('fSupport').value]];
 let content='<h2 style="text-align:center">花蓮縣私立永護寧居家長照機構<br>家訪紀錄表｜測試預覽</h2><table style="border-collapse:collapse;width:100%">'+info.map(([a,b])=>'<tr><th style="border:1px solid #333;padding:8px;text-align:left;width:32%">'+safe(a)+'</th><td style="border:1px solid #333;padding:8px">'+safe(b)+'</td></tr>').join('')+'</table>';
 content+='<h3>處遇計畫</h3>'+KEY.map((k,i)=>'<h4>'+['一','二','三','四'][i]+'、'+LABEL[i]+'</h4><p style="white-space:pre-wrap">'+safe(formText[k])+'</p>').join('');
 content+='<p>督導：'+safe($('fSupervisor').value)+'</p><p style="font-size:12px">本頁僅供核對欄位，不代表正式 Word 表單之列印版面。</p>';
 const w=window.open('','_blank');if(!w){state('瀏覽器封鎖預覽視窗，請允許彈出視窗。',true);return}
 w.document.write('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>家訪預覽</title><style>body{font-family:serif;padding:25px;line-height:1.65;color:#111}@media print{body{padding:0}}</style></head><body>'+content+'<p><button onclick="window.print()">列印此預覽</button></p></body></html>');w.document.close();
}
$('previewForm').onclick=preview;
renderCodes();renderFormText();$('fDate').value=$('date').value;$('fName').value='';
})();