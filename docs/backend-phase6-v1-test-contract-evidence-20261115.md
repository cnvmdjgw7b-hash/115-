# 永護寧後台第六階段：隔離測試 API v1 契約與證據（2026-11-15）
狀態：**隔離測試版契約凍結 v1-test**，非正式資料庫／非正式使用者授權凍結；正式前端不得直接接正式站。

## 測試環境
- API：`https://nddw2e.hatchable.site/api/v1/cases`（Hatchable private/personal 隔離分叉 proj_GpYIsaOvPkKd，版本4）
- 原照顧計畫專案 `ai-pgby` 與家電訪 `b-bf67` **未修改、未部署、未寫入**。
- 原始碼：`tests/hatchable-care-plan-isolation/api-v1-cases.js`。
- 唯一鍵：`case.id` UUID；`case.case_code` 為外部代碼；`display_name` 為名稱；`revision` 整數；`updated_at` ISO 時間。
- 實測路徑：`GET /api/v1/cases`、`GET /api/v1/cases?id=<uuid>`、`POST /api/v1/cases`、`PUT /api/v1/cases`。注意：Hatchable 現行路由並非 `PATCH /cases/{id}`；第一位 AI 接線請以實際路由為準。
- POST body `{case_code,display_name,expected_revision:0}`；成功201 `{saved:true,case:{id,case_code,display_name,revision,updated_at}}`。
- PUT body `{id,case_code,display_name,expected_revision}`；成功200 同格式，版本遞增。GET 單筆200 `{case:{...}}`；GET 列表200 `{cases:[...]}`。
- 失敗：401 anonymous；400 無效輸入／UUID／版本；404 不可見／不存在單筆；409 重複代碼或舊版本；`{error:"..."}`。
- **限制**：目前是 Hatchable `member` 協作者擁有者隔離，尚未實作機構主管／督導的正式 RBAC；管理者與不同協作者的資料分離是安全預設，但非主管全案授權。另測試 PUT 回409 合併版本衝突與無權存取，尚須區分403/404以供正式接線。

## 真實 API 測試（隔離資料庫，全部虛構個案）
| 項目 | HTTP | 實際結果 |
|---|---|---|
| POST 新增 TEST-V1-20261115-03 | 201 | UUID `7e475ade-c95a-4e9f-94ad-34bc291db9a2`，revision=1 |
| GET 依 UUID 重讀 | 200 | 讀回原姓名、revision=1 |
| PUT 修改姓名 expected_revision=1 | 200 | revision=2 |
| GET 再重讀 | 200 | 讀回修改後姓名、revision=2 |
| PUT 舊版 expected_revision=1 | 409 | `revision_conflict_or_not_authorized` |
| POST 重複 case_code | 409 | `duplicate_case_code` |
| 匿名 GET | 401 | 平台閘道拒絕 |
| 不同模擬 admin 身分 GET 此 UUID | 404 | `not_found`，無法跨擁有者讀取 |
| member GET | 200 | 可讀本人測試資料 |

## 備份與還原證據（範圍明確）
- 在隔離測試庫 `proj_GpYIsaOvPkKd` 以唯讀 SQL 取出虛構個案 TEST-V1-20261115-03 完整欄位；另 fork 原空 schema 成還原演練庫 `proj_CEaZ0Oc0RyS5`（fp3cga）。
- 在還原演練庫插入相同 UUID、代碼、名稱、來源、日期、content、revision=2、updated_by；SELECT 驗證回讀欄位一致、筆數1。**僅完成單筆虛構資料還原演練，非兩套正式 PostgreSQL 完整備份／還原**。
- 原家電訪140個案、7訪視與原照顧計畫0筆，均未複製至公開 GitHub；尚缺正式庫完整受控備份及還原權限／證據，因此正式庫寫入仍阻擋。

## 前端接線限制
可在前端分支使用模擬資料或隔離 API 驗證新增→GET→PUT→GET，必須使用相同已授權 Hatchable 協作者登入；跨裝置登入、正式督導／主管 RBAC、訪視及照顧計畫跨模組關聯均未驗收。**不得合併四份 HTML 或部署正式網站。**
