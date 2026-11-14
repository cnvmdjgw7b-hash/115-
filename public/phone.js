// 永護寧電訪固定表單：使用原 Word 範本的表格與勾選格，不重建版面。
(function(){
const $=id=>document.getElementById(id), NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const get=(root,t)=>Array.from(root.getElementsByTagNameNS(NS,t));
const direct=(root,t)=>Array.from(root.childNodes||[]).filter(x=>x.nodeType===1&&x.localName===t);
const CHOICES={
pServices:['居家服務','喘息服務'],
pContact:['個案在家','個案不在','其他地點','親自接聽','他人接聽','未接聽'],
pBehavior:['無不恰當行為','推銷產品','額外收費','口出惡言','暴力行為','偷竊行為','過度使用案家物品','持續講電話','在案家充手機電','長時間滑手機','占據服務時間吃飯']
};const picks={};let template=null;
const status=(s,e=false)=>{ $('pStatus').textContent=s;$('pStatus').className=e?'alert':'ok'};
Object.entries(CHOICES).forEach(([key,values])=>{
 picks[key]=new Set();let host=$(key);
 values.forEach(v=>{let l=document.createElement('label');l.style.cssText='display:inline-flex;align-items:center;border:1px solid #c5d7c9;padding:7px;border-radius:8px;font-size:13px;font-weight:400;margin:2px';
 const c=document.createElement('input');c.type='checkbox';c.style.cssText='width:18px;height:18px;margin-right:5px';
 c.onchange=()=>c.checked?picks[key].add(v):picks[key].delete(v);l.append(c,document.createTextNode(v));host.append(l) });
});
function selected(id){return $(id).value}
function roc(iso){let m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(iso);return m?(Number(m[1])-1911)+'.'+Number(m[2])+'.'+Number(m[3]):''}
function put(doc,cell,s){const ps=direct(cell,'p'),p=ps[0]||doc.createElementNS(NS,'w:p');if(!ps.length)cell.append(p);
 for(const ch of [...cell.childNodes])if(ch!==p&&ch.localName!=='tcPr')ch.remove();
 let r=get(p,'r')[0]?.cloneNode(true)||doc.createElementNS(NS,'w:r');
 for(const ch of [...r.childNodes])if(ch.localName!=='rPr')ch.remove();
 for(const ch of [...p.childNodes])if(ch.localName!=='pPr')ch.remove();
 String(s||'').split('\n').forEach((line,i)=>{if(i)r.append(doc.createElementNS(NS,'w:br'));let t=doc.createElementNS(NS,'w:t');t.setAttribute('xml:space','preserve');t.textContent=line;r.append(t)});
 p.append(r);
}
// 就地變更每個勾選符號，不合併原始 Word 段落及 run，避免量表欄位跑版。
function mark(cell,active){
 for(const p of get(cell,'p')){
  const ts=get(p,'t');if(!ts.length)continue;
  const full=ts.map(t=>t.textContent).join('');let change={};
  const rx=/[□■]([^□■]*)/g;let match;
  while((match=rx.exec(full))){
   const label=match[1].replace(/\s+/g,'').trim();
   const chosen=[...active].some(x=>label.startsWith(x.replace(/\s+/g,'')));
   change[match.index]=chosen?'■':'□';
  }
  let start=0;for(const t of ts){let chars=t.textContent.split('');for(let i=0;i<chars.length;i++){if(change[start+i])chars[i]=change[start+i]}t.textContent=chars.join('');start+=chars.length}
 }
}
$('phoneTemplate').onchange=async e=>{
 template=null;const f=e.target.files?.[0];if(!f)return;
 try{
 if(!/\.docx$/i.test(f.name))throw Error('必須為 DOCX');
 const a=await f.arrayBuffer(),zip=await JSZip.loadAsync(a),raw=await zip.file('word/document.xml')?.async('string');
 if(!raw)throw Error('Word 文件結構不完整');
 const doc=new DOMParser().parseFromString(raw,'application/xml');
 if(doc.querySelector('parsererror'))throw Error('Word XML 格式不正確');
 const tbl=get(doc,'tbl')[0],rows=direct(tbl,'tr'),cell=(r,c)=>direct(rows[r],'tc')[c];
 if(rows.length!==10||!cell(7,0)||!get(cell(6,0),'t').some(x=>x.textContent.includes('特殊紀錄')))throw Error('不符合永護寧電訪記錄表 001(3)-112.06 架構');
 const ptext=get(doc,'t').map(x=>x.textContent).join('');
 if(ptext.includes('■'))throw Error('這份表單已有勾選內容，請使用未填寫的空白電訪範本，避免前個案評估內容殘留');
 if(!get(cell(7,0),'p').length)throw Error('缺少特殊紀錄欄位');
 // 空白範本應沒有已填個案資料，仍要求使用者自行確認。
 template=a;$('phoneTemplateState').textContent='已載入：'+f.name+'（只在瀏覽器記憶體處理）';
 status('已辨識電訪範本，請核對固定欄位與內容。');
 }catch(err){status(err.message,true)}
};
$('pImportAI').onclick=()=>{
 const arr=[record.condition,record.service,record.response,record.action].filter(x=>String(x||'').trim());
 $('pNotes').value=arr.join('\n');status('已帶入本次紀錄供編修；電訪須再確認實際聯絡與服務調查內容。');
};
function stamp(doc){
 const rows=direct(get(doc,'tbl')[0],'tr'),cell=(r,c)=>direct(rows[r],'tc')[c];
 put(doc,cell(0,1),selected('pCaseId')||'');
 put(doc,cell(0,3),roc(selected('pDate')));
 put(doc,cell(1,1),(selected('pInterviewee')==='案主'?'■案主　□家屬':'□案主　■家屬（'+selected('pInterviewee')+'）'));
 put(doc,cell(1,3),selected('pChannel'));
 mark(cell(2,1),picks.pServices);
 mark(cell(2,3),new Set(selected('pLanguage')==='未確認'?[]:[selected('pLanguage')]));
 mark(cell(5,0),picks.pContact);
 const mental=get(cell(5,1),'p');
 // 「尚可」同時存在意識表達與健康情形，分段勾選避免兩項互相影響。
 function markParagraphRange(start,end,selectedValue){
  for(let i=start;i<=end;i++)if(mental[i]){
   const tmp=doc.createElementNS(NS,'w:tc');tmp.appendChild(mental[i].cloneNode(true));
   mark(tmp,new Set(selectedValue?[selectedValue]:[]));
   const newPara=direct(tmp,'p')[0];mental[i].parentNode.replaceChild(newPara,mental[i]);
  }
 }
 markParagraphRange(1,3,selected('pAwareness'));
 markParagraphRange(5,8,selected('pHealth'));
 mark(cell(5,2),new Set([selected('pArrival'),selected('pExecution'),selected('pAttitude'),...picks.pBehavior].filter(Boolean)));
 put(doc,cell(7,0),selected('pNotes'));
 if(direct(rows[9],'tc').length>=2){put(doc,cell(9,0),selected('pVisitor'));put(doc,cell(9,1),selected('pSupervisor'));}
}
$('pExport').onclick=async()=>{
 if(!template)return status('請先上傳已核對的空白電訪 DOCX 範本。',true);
 if(!$('pNotes').value.trim())return status('請填寫特殊紀錄或建議說明。',true);
 if(!selected('pDate'))return status('請填寫電訪日期。',true);
 try{
  let zip=await JSZip.loadAsync(template),str=await zip.file('word/document.xml').async('string'),doc=new DOMParser().parseFromString(str,'application/xml');
  stamp(doc);zip.file('word/document.xml',new XMLSerializer().serializeToString(doc));
  let b=await zip.generateAsync({type:'blob',compression:'DEFLATE'}),url=URL.createObjectURL(b),a=document.createElement('a');
  a.href=url;a.download='永護寧_電訪固定欄位_測試.docx';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
  status('已下載電訪 Word 測試檔。請以 Word 檢查版面與原表單一致後再使用。');
 }catch(err){status('匯出失敗：'+err.message,true)}
};
$('pPreview').onclick=()=>{let rows=[['案號',selected('pCaseId')],['電訪日期',roc(selected('pDate'))],['對象',selected('pInterviewee')],['聯繫方式',selected('pChannel')],['服務項目',[...picks.pServices].join('、')],['聯繫情形',[...picks.pContact].join('、')],['健康情形',selected('pHealth')],['服務情況',selected('pArrival')+' '+selected('pExecution')+' '+selected('pAttitude')]];
 const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let html='<h2>永護寧電訪紀錄｜欄位核對預覽（非原 Word 排版）</h2><table border="1" cellspacing="0" cellpadding="8">'+rows.map(([a,b])=>'<tr><th>'+esc(a)+'</th><td>'+esc(b)+'</td></tr>').join('')+'</table><h3>特殊紀錄或建議說明</h3><p style="white-space:pre-wrap">'+esc($('pNotes').value)+'</p>';
 let w=window.open('','_blank');if(!w)return status('預覽視窗被瀏覽器封鎖',true);w.document.write('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>電訪欄位核對</title>'+html);w.document.close();
};
$('pDate').value=$('date').value;
})();