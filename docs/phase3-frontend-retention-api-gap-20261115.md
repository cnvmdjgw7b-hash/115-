# 第三階段｜四 HTML 保留清單及 API 差異（2026-11-15）
依據後台 c8cae76；**/api/v1 是提案，不是已上線 API**。未接資料庫、未合併正式 HTML、未部署。
| 原始 HTML | 保留功能 | 與後台 /api/v1 契約不一致 |
|---|---|---|
| V12 手機工作台 | 個案、照顧計畫、居服員、匯入、家訪、電訪、異動、歷史 | localStorage 8 處、fetch 0；缺 UUID、GET/POST/PATCH、revision、權限 |
| 登入後主畫面 | 首頁、待辦、個案、排班、工具 | localStorage 2 處、fetch 0；登入非後端終端使用者身分、無共用 case.id |
| index.html GPT Sites | 首頁、待辦、個案、家電訪、異動、稽核、報表、BA 規劃 | localStorage 4 處；fetch 2 次屬 JEV 而非個案；caseStatusFilter、caseSupervisorFilter 是畫面篩選，不是 case_code/display_name |
| 家電訪智慧模組 | 個案匯入、17 大項、情境、三版本四欄、評值 | localStorage 4 處、fetch 0；visit/scenario 是訪視情境選項，不是 UUID 個案主鍵 |
## 後台 c8cae76 提案（僅供核對）
GET /api/v1/cases -> {cases:[{id,case_code,display_name,revision,updated_at}]}
POST /api/v1/cases {case_code,display_name} -> 201 {saved:true,case:{...}}
GET /api/v1/cases/{uuid} -> {case:{...}}
PATCH /api/v1/cases/{uuid} {display_name,expected_revision} -> {saved:true,case:{...}}
錯誤 400/401/403/404/409/500；伺服器端角色及行級授權。
## 未解決欄位／呼叫差異
現有家電訪回傳 key/code/label，候選新契約 id/case_code/display_name；舊 supervisor/monthly_plan/status 與 supervisor_id/approved_services/verification_status 未有映射；舊 /api/cases 與提案 /api/v1/cases 不同；localStorage 不等於 DB；member_id 不等於督導身分。不得自行推斷姓名→UUID、版本衝突、授權、回傳格式。
## 模擬元件
同目錄 mock-case-selector.html：三筆虛構個案 UUID、搜尋、共用單選、四模組切換、手機版；純記憶體、不呼叫 API、不儲存。原 HTML 版面與背景保留不動。
## 接線阻擋
後台須提供 API 凍結、隔離環境、備份還原證據、POST→GET→PATCH→GET 及 401/403/409 測試；前端再驗證重新整理、重新登入、跨裝置。
