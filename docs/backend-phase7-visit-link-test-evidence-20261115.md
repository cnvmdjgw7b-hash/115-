# 永護寧｜隔離 API v1 跨模組測試增補（2026-11-15）
**僅隔離測試站**：https://nddw2e.hatchable.site；Hatchable proj_GpYIsaOvPkKd v5。正式資料庫未修改。

## 已實測
- 個案 UUID `7e475ade-c95a-4e9f-94ad-34bc291db9a2`，虛構個案 TEST-V1-20261115-03，revision=2。
- 隔離資料表 `yhn_test_visits` 以 `case_id uuid REFERENCES care_cases(id)` 建立外鍵；插入家訪 home 1筆、電訪 phone 1筆，SQL JOIN 結果：個案1、家訪1、電訪1。
- `GET /api/v1/visits?case_id=<uuid>`：member HTTP200，回傳 `{visits:[{id,case_id,visit_type,visit_date,note},...]}`，家訪、電訪均帶相同 UUID；不同模擬 admin 身分 HTTP404；匿名 HTTP401。
- 個案 `/api/v1/cases`：POST201、GET200、PUT200、重讀200、版本衝突409、匿名401、不同身分404；完整既有證據見 `docs/backend-phase6-v1-test-contract-evidence-20261115.md`。
- 隔離虛構資料單筆備份／還原：從測試庫 SELECT，向獨立還原演練庫 proj_CEaZ0Oc0RyS5 INSERT changes=1，SELECT 比對 UUID、代碼、姓名、revision=2、content、owner 一致。

## API v1 測試契約（已實測的部分）
- `GET /api/v1/cases` →200 `{cases:[{id,case_code,display_name,revision,updated_at}]}`。
- `GET /api/v1/cases?id=<uuid>` →200 `{case:{id,case_code,display_name,revision,updated_at}}`。
- `POST /api/v1/cases` body `{case_code,display_name,expected_revision:0}` →201 `{saved:true,case:{...}}`。
- `PUT /api/v1/cases` body `{id,case_code,display_name,expected_revision}` →200 `{saved:true,case:{...}}`；409 版本衝突。
- `GET /api/v1/visits?case_id=<uuid>` →200 `{visits:[{id,case_id,visit_type,visit_date,note}]}`。
- `POST /api/v1/visits` body `{case_id,visit_type:'home'|'phone',visit_date:'YYYY-MM-DD',note}` →201 `{saved:true,visit:{...}}`（**尚未實際呼叫 POST 驗證**）。
- 權限：Hatchable `access='member'` + `updated_by`/owner SQL 篩選。匿名401、不同協作者404；**尚未實測機構主管全案、不同督導授權個案角色**。管理者模擬身分與機構主管不同。
- 錯誤：400 invalid input；401 anonymous；404 invisible/missing；409 stale/duplicate。現行 PUT 權限不足與衝突共用409，**尚非最終正式錯誤契約**。

## 未完成／限制
1. 正式家電訪 140筆個案、7筆訪視及照顧計畫三表0筆的**完整受控備份及正式資料還原演練尚未完成**；工具僅有 SQL 查詢及測試 fork（fork 不含正式資料），不能把單筆虛構還原冒充正式備份。
2. 照顧計畫與家訪／電訪在同一隔離 PostgreSQL 的 UUID 外鍵已實測；**尚未驗證兩個原始 PostgreSQL 跨庫的正式關聯**。原異常 A、B 保留未修改。
3. 主管／督導 RBAC、實際不同督導帳號、跨裝置登入與 CORS、完整訪視寫入與照顧計畫內容 API 均待測；**測試契約僅對已實測端點凍結，正式契約不得宣稱全面驗收**。
4. 第一位 AI 可依已實測 GET/POST/PUT 個案與 GET 訪視規格，僅在其開發分支接入**隔離測試環境的虛構資料**，不得接正式資料庫或部署正式網站。
