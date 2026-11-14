// 永護寧家電訪：單頁完成，仍沿用既有資料庫及原 Word 套印功能。
(function(){
 const $=id=>document.getElementById(id);
 const draft=$('draft').querySelector('article');
 const panel=document.createElement('div');panel.className='onepage-output';
 panel.innerHTML='<h2>⑤ 下載正式格式 Word</h2><p class="hint">首次選空白 Word 範本；之後於同頁直接產出。家訪與電訪使用不同版型，保留各自表格。</p><div id="onepageHome"><label>空白家訪 Word（.docx）</label></div><div id="onepagePhone" hidden><label>空白電訪 Word（.docx）</label></div><button class="primary" id="oneClickWord">⬇ 產出家訪 Word</button><div id="onepageStatus" aria-live="polite" class="hint"></div>';
 draft.append(panel);
 $('onepageHome').append($('templateFile'));
 $('onepagePhone').append($('phoneTemplate'));
 const oldHomeLabel=[...document.querySelectorAll('#form label')].find(l=>l.textContent.includes('空白範本')||l.textContent.includes('家訪 Word 空白範本'));
 if(oldHomeLabel)oldHomeLabel.hidden=true;
 const oldPhoneLabel=[...document.querySelectorAll('#phone label')].find(l=>l.textContent.includes('電訪 Word 範本'));
 if(oldPhoneLabel)oldPhoneLabel.hidden=true;
 function collapse(section,label){
  let contents=[...section.children];let details=document.createElement('details');details.className='advanced';
  const summary=document.createElement('summary');summary.textContent=label;
  details.append(summary);contents.forEach(c=>details.append(c));section.append(details);
 }
 collapse($('form'),'家訪欄位／BA碼別／四段內容（需要修改時展開）');
 collapse($('phone'),'電訪調查勾選／特殊紀錄（需要修改時展開）');
 collapse($('history'),'查看個案歷史紀錄');
 function update(){
  const phone=type==='電訪';
  $('onepageHome').hidden=phone;
  $('onepagePhone').hidden=!phone;
  $('form').style.display=phone?'none':'block';
  $('phone').style.display=phone?'block':'none';
  $('oneClickWord').textContent=phone?'⬇ 產出電訪 Word':'⬇ 產出家訪 Word';
 }
 document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',update));
 function selectedCase(){return (caseRows||[]).find(x=>x.key===$('case').value)}
 function putIfEmpty(id,value){if(!$(id).value&&value)$(id).value=value}
 function syncBasic(){
  const c=selectedCase(),name=c?.label||'';
  const code=c?.official_code_matched?c.code:'';
  putIfEmpty('fName',name);
  putIfEmpty('fCaseId',code);
  putIfEmpty('pCaseId',code);
  putIfEmpty('fWho',$('who').value);
  if(!$('fDate').value)$('fDate').value=$('date').value;
  if(!$('pDate').value)$('pDate').value=$('date').value;
  if([...$('pInterviewee').options].some(o=>o.value===$('who').value))$('pInterviewee').value=$('who').value;
 }
 const one=$('oneClickWord'),message=$('onepageStatus');
 one.onclick=()=>{
  syncBasic();
  const phone=type==='電訪';
  if(phone){
   if(!$('phoneTemplate').files?.length){
    message.className='alert';message.textContent='請先選擇空白電訪 Word 範本（不可使用已填寫的電訪紀錄）。';$('phoneTemplate').focus();return;
   }
   if(!$('pNotes').value.trim()&&Object.values(record).some(s=>String(s||'').trim()))$('pImportAI').click();
   if(!$('pNotes').value.trim()){
    message.className='alert';message.textContent='請先在④填寫／產生本次紀錄，或展開電訪欄位填寫特殊紀錄。';return;
   }
   $('pExport').click();
   message.className='hint';message.textContent='電訪套印結果：'+$('pStatus').textContent;
  }else{
   if(!$('templateFile').files?.length){
    message.className='alert';message.textContent='請先選擇空白家訪 Word 範本（已填寫的家訪紀錄不能當範本）。';$('templateFile').focus();return;
   }
   if(Object.values(record).some(s=>String(s||'').trim()))$('copyNarratives').click();
   if(!Object.values(record).some(s=>String(s||'').trim())){
    message.className='alert';message.textContent='請先在④填寫／產生四段家訪紀錄。';return;
   }
   $('downloadWord').click();
   message.className='hint';message.textContent='家訪套印結果：'+$('wordStatus').textContent;
  }
 };
 for(const id of ['wordStatus','pStatus']){
  new MutationObserver(()=>{if((type==='家訪')===(id==='wordStatus')){message.textContent=$(id).textContent;message.className=$(id).className||'hint';}}).observe($(id),{childList:true,characterData:true,subtree:true});
 }
 update();
})();