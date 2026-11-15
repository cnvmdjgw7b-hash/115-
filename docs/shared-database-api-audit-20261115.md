# 永護寧｜資料庫唯讀盤點與共用 API 契約（待後台 AI 核對）
盤點日期：2026-11-15；狀態：**設計草案／未核准正式主檔**。此文件不包含任何真實個案資料；不執行資料搬遷、刪除、覆寫、部署。

## 現況與資料來源
| 專案 | 網站 | PostgreSQL 資料表 | 唯讀筆數 |
|---|---|---|---|
| Hatchable proj_7cmf46XaBYvx | https://b-bf67.hatchable.site | yhn_visit_cases, yhn_demo_visits | 140 個案、7 訪視 |
| Hatchable proj_NiEVlJnMSo9O | https://ai-pgby.hatchable.site | care_cases, care_case_versions, care_case_audit | 0、0、0 |

- 家電訪個案 140 筆：verified 117、pending_verification 23；official_code_matched=true 117。140 個案代碼與姓名各自皆無重複，單一 member scope。
- 訪視 7 筆：家訪 6、電訪 1，均為 draft。**2 筆訪視無法以 case_key + member_id 對上 yhn_visit_cases**；需先釐清是否為歷史資料、異動或遺失關聯，嚴禁刪除。
- 照顧計畫資料庫目前 0 筆，故跨這兩套資料庫尚無已儲存個案的交集；不能據此認定其他系統或匯入檔沒有重複。
- 家電訪 API: GET/POST /api/cases（目前 POST 只支援新增、沒有修改）；GET/POST /api/visits（POST 只新增訪視）；member 隔離、formal:false。
- 照顧計畫 API: GET/POST /api/cases；按 case_key 更新，帶 expected_revision，維護版本與稽核；但目前獨立資料庫，且讀取查詢未依 actor 限制個案。
- GitHub main: cb49f742e25469343c1764846c9bc9380d245a41；既有 database/001_schema.sql 為 **Supabase 設計稿**，不是上述兩個 Hatchable PostgreSQL 的已套用正式 schema。
- **目前無法指定任一套為正式個案資料來源**：家電訪雖有實際資料，但網站標示私人驗證環境、formal:false；須先由後台 AI 及管理者確認正式來源、權限、清冊截止日。

## 待核對的共用資料契約 v0.1（不代表已實作）
- `case_id`：伺服器產生、不可變 UUID；所有模組只以此識別個案。另存 `case_code`（經正式清冊驗證的業務案號），不得以姓名作主鍵。舊表 ID 保留於 `legacy_case_map(source_system, legacy_id, case_id)`，經比對核准才建立對應。
- 個案：`id, case_code, display_name, supervisor_id, service_status, service_type, approved_services, source_name, source_version, effective_date, verification_status, revision, created_at, updated_at`。
- 訪視：`id, case_id, visit_type(home|phone), visit_date, interviewee, information_source, facts, selections, narrative, pending_items, status, revision, created_at, updated_at`。
- 照顧計畫：`id, case_id, content(jsonb), source_name, source_date, effective_date, status, revision, created_at, updated_at`；另保留歷史版本、稽核紀錄。
- API（建議 `/api/v1`，同源、授權）：`GET /cases?query=`、`POST /cases`、`GET /cases/{id}`、`PATCH /cases/{id}`、`GET /cases/{id}/visits`、`POST /cases/{id}/visits`、`PATCH /visits/{id}`、`GET /cases/{id}/care-plans`、`POST /cases/{id}/care-plans`、`PATCH /care-plans/{id}`。
- 寫入須驗證使用者角色/個案授權、欄位、來源、預期版本 `expected_revision`；衝突回 409；儲存成功回資料庫已提交的 ID、revision、updated_at；失敗回可辨識錯誤，禁止假成功。GET 必須從後端重新查詢，不以 localStorage 當正式資料來源。
- 權限建議：主管全案；督導僅授權個案；伺服器端強制執行。正式個資不得上傳公開 GitHub 或放進測試紀錄。

## 資料保留與切換門檻
1. 兩套原資料庫均維持唯讀、不刪除不覆寫；先產生受控備份與可還原演練（由後台 AI 負責）。
2. 以正式個案清冊及來源版本核對，產出不含敏感資料的差異統計；對 2 筆孤兒訪視人工確認映射。
3. 後台 AI 決定唯一權威資料庫與 API，建立版本化 migration、舊 ID 映射、交易式搬遷及回滾方案；不得直接覆寫既有個案。
4. 使用**虛構測試個案**進行新增→GET→PATCH→GET、重新整理／登出再登入／授權跨裝置、409 版本衝突、未授權 403/404、訪視與計畫跨模組讀取驗證。每項記錄 HTTP 狀態與資料庫結果。
5. 以上未驗收前，禁止四份 HTML 合併與正式網站部署；測試站部署亦須清楚標示非正式資料。

## 待第二位 AI 確認
- 是否以家電訪既有 PostgreSQL 作唯一權威資料庫，或採新建共用資料庫後保留雙邊原庫？需說明選擇與資料移轉風險。
- `case_code` 是否跨服務來源唯一、不同 member 的授權範圍、`legacy_case_map` 規則、正式清冊來源及截止日。
- 兩筆孤兒訪視的無個資處置方式；備份、角色授權、跨專案 API 存取、日誌及還原驗收。
- 本次僅完成唯讀 SQL 盤點，**尚未進行新增/修改/重新讀取端到端測試**；不得宣稱功能已通過。
