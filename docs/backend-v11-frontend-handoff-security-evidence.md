# v11 前端接線與安全驗證交接（隔離環境）
測試站：https://nddw2e.hatchable.site（僅隔離環境，需 Hatchable member session）。原 HTML、正式資料庫及正式網站不得改動。
## API 契約
- `GET /api/v1/cases?id=<uuid>` →200 `{case:{id,case_code,display_name,revision,updated_at}}`。
- `GET /api/v1/visits?case_id=<uuid>` →200 `{visits:[{id,case_id,visit_type,visit_date,note}]}`。
- `POST /api/v1/visits` →201 `{saved:true,visit:{...}}`，body `{case_id,visit_type:'home'|'phone',visit_date:'YYYY-MM-DD',note}`。
- `PUT /api/v1/visits` →200 `{saved:true,visit:{...}}`，body 同上再加 `id`（訪視 UUID）；**此端點沒有 revision 機制**。
- `GET /api/v1/care-plans?case_id=<uuid>` →200 `{care_plan:null|{id,case_id,content,revision,updated_at}}`。
- `POST /api/v1/care-plans` →201 `{saved:true,care_plan:{...}}`，body `{case_id,content:{...}}`；已存在回409 `plan_exists`。
- `PUT /api/v1/care-plans` →200 `{saved:true,care_plan:{...}}`，body `{case_id,content:{...},expected_revision:<整數>}`；舊版本回409 `revision_conflict_or_not_found`。
- 所有模組使用 `care_cases.id` 作為 `case_id`，不是案號、姓名或訪視 UUID。前端選取個案後只儲存該 UUID，重新整理後須從 API 重新讀取。
## 實測
- 隔離資料：UUID `b900e34c-3f40-4d02-a32f-98fcf6171cea` 下家訪1、電訪1、照顧計畫1；訪視修改 HTTP200，GET200；照顧計畫新增201、修改200、GET200、舊版409。
- 安全：匿名 GET 家電訪及照顧計畫皆401；不同模擬 collaborator 身分皆404；測試庫 SQL 檢查所有家電訪／照顧計畫外鍵與 owner 一致，`visit_bad_links=0`、`plan_bad_links=0`。
- 上述為後台 API 測試，**不是現有 HTML 的手機端到端驗收**。第一位 AI 須完成手機操作、重整、重新登入、UI版本衝突提示。
## 風險／未完成
- `access='member'` 是 Hatchable 專案協作者，**不是機構督導／主管角色**；真實角色測試未完成。
- 正式140筆個案、7筆訪視、A/B 鍵值不動；正式資料完整備份／隔離還原及跨兩正式庫關聯未完成。
- 測試 API 同源登入，勿將 Cookie、Token、密碼放進前端程式或 GitHub；勿部署正式站。
