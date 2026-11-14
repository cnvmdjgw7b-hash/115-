// 永護寧家電訪：一份輸入、一份紀錄、一個輸出入口。
(function(){
 const $=id=>document.getElementById(id);
 const draft=$('draft').querySelector('article');
 const panel=document.createElement('div');
 panel.className='onepage-output';
 panel.innerHTML=[
 '<h2>⑤ 匯出家訪／電訪 Word</h2>',
 '<p class="hint">上方四段紀錄是唯一文字來源。下方只補表單專有勾選，不再重寫四段文字。</p>',
 '<div id="onepageHome"><label>空白家訪 Word 範本（.docx）</label></div>',
 '<div id="onepagePhone" hidden><label>空白電訪 Word 範本（.docx）</label></div>',
 '<div id="onepageExtra"></div>',
 '<button class="primary" id="oneClickWord">⬇ 產出家訪 Word</button>',
 '<div id="onepageStatus" aria-live="polite" class="hint"></div>'
 ].join('');
 draft.append(panel);
 $('onepageHome').append($('templateFile'));
 $('onepagePhone').append($('phoneTemplate'));

 // 進階欄位直接搬移到統一輸出區，刪除原頁面重複區塊。
 const optionalHome=document.createElement('details');
 optionalHome.id='extraHome';optionalHome.className='advanced';
 optionalHome.innerHTML='<summary>家訪表單補充：BA 碼、環境、量表（需要時展開）</summary>';
 const optionalPhone=document.createElement('details');
 optionalPhone.id='extraPhone';optionalPhone.className='advanced';
 optionalPhone.innerHTML='<summary>電訪表單補充：聯繫及服務調查（需要時展開）</summary>';
 $('onepageExtra').append(optionalHome,optionalPhone);
 optionalHome.append($('form'));optionalPhone.append($('phone'));
 const hide=(id)=>{const el=$(id);if(el)el.hidden=true};
 const removeCopyLabel=(id)=>{let input=$(id);const labels=[...input?.closest('article')?.querySelectorAll('label')||[]];for(const label of labels)if(label.nextElementSibling===input)label.hidden=true;};
 // 模組的原始控制項保留供 Word 套印程式使用，但避免督導重複填寫。
 for(const id of ['formNarratives','copyNarratives','previewForm','downloadWord','wordStatus','templateStatus',
                   'fCaseId','fName','fDate','fWho','pCaseId','pDate','pInterviewee','pImportAI','pPreview','pExport','pNotes','pStatus','phoneTemplateState']){
   removeCopyLabel(id);hide(id);
 }
 // 個案名稱／案號及日期以主流程為唯一來源；出生日期僅於進階欄補充。
 $('form').querySelectorAll('h2,.notice,.hint').forEach(e=>e.hidden=true);
 $('form').querySelectorAll('label').forEach(e=>{if(e.textContent.includes('家訪 Word 範本')||e.textContent.includes('家訪 Word 空白範本'))e.hidden=true;});
 $('phone').querySelectorAll('label').forEach(e=>{if(e.textContent.includes('電訪 Word 範本'))e.hidden=true;});
 $('phone').querySelectorAll('h2,.hint').forEach(e=>e.hidden=true);
 // 移走舊版輸入列避免有空白大框。
 const firstHome=$('fName')?.closest('.row');if(firstHome)firstHome.hidden=true;
 const firstPhone=$('pCaseId')?.closest('.row');if(firstPhone)firstPhone.hidden=true;
 // Word 簽核欄由督導補充，不能憑空套入。
 const oldDetails=document.createElement('details');
 oldDetails.className='advanced';oldDetails.innerHTML='<summary>查看歷史家電訪</summary>';
 $('onepageExtra').append(oldDetails);oldDetails.append($('history'));
 $('history').querySelectorAll('h2,.hint').forEach(e=>e.hidden=true);
 
 const message=$('onepageStatus');
 function selectedCaseAvailable(){return !!(caseRows||[]).find(x=>x.key===$('case').value)}
 function sync(){
   const c=(caseRows||[]).find(x=>x.key===$('case').value);
   if(c){
    $('fName').value=c.label||'';
    $('fCaseId').value=c.official_code_matched?c.code:'';
    $('pCaseId').value=c.official_code_matched?c.code:'';
   }
   $('fDate').value=$('date').value;
   $('pDate').value=$('date').value;
   $('fWho').value=$('who').value;
   if([...$('pInterviewee').options].some(o=>o.value===$('who').value))$('pInterviewee').value=$('who').value;
 }
 function switchType(){
   const phone=type==='電訪';
   $('onepageHome').hidden=phone;
   $('onepagePhone').hidden=!phone;
   optionalHome.hidden=phone;
   optionalPhone.hidden=!phone;
   $('form').style.display='block';
   $('phone').style.display='block';
   $('oneClickWord').textContent=phone?'⬇ 產出電訪 Word':'⬇ 產出家訪 Word';
   message.textContent='';
 }
 document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',switchType));
 $('oneClickWord').onclick=()=>{
   if(!selectedCaseAvailable())return show('請先在最上方選擇個案，才能產出訪視紀錄。',true);
   sync();
   const phone=type==='電訪';
   if(phone){
      if(!$('phoneTemplate').files?.length)return show('請先選擇空白電訪 Word 範本。',true);
      if(!Object.values(record).some(v=>String(v||'').trim()))return show('請在上方④完成本次訪視文字。',true);
      $('pImportAI').click();
      $('pExport').click();
   }else{
      if(!$('templateFile').files?.length)return show('請先選擇空白家訪 Word 範本。已填個案的範例不能當範本。',true);
      if(!Object.values(record).some(v=>String(v||'').trim()))return show('請在上方④完成本次家訪文字。',true);
      $('copyNarratives').click();
      $('downloadWord').click();
   }
 };
 function show(s,err=false){message.className=err?'alert':'hint';message.textContent=s;}
 for(const id of ['wordStatus','pStatus']){
   new MutationObserver(()=>{
     if((type==='家訪')===(id==='wordStatus')){
       message.className=$(id).className||'hint';
       message.textContent=$(id).textContent;
     }
   }).observe($(id),{childList:true,characterData:true,subtree:true});
 }
 switchType();
})();