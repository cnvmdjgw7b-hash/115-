# 永護寧第六階段｜隔離測試 API v1 契約與實測證據（2026-11-15）

## 已實作測試端點（不是正式環境）
- 測試環境：Hatchable `proj_GpYIsaOvPkKd`，`https://nddw2e.hatchable.site` v4；由照顧計畫原專案 fork，**原始資料不複製**。正式 `ai-pgby` 未修改。
- 程式：`tests/hatchable-care-plan-isolation/api-v1-cases.js`。路由 `/api/v1/cases`，GET/POST/PUT。因 Hatchable 單一路由機制，**PUT 更新以 body.id 傳 UUID，非 PATCH /cases/{id}**；前端僅可在測試環境依實際契約接線，不得假定 PATCH 已存在。
- 個案 UUID：`case.id`（伺服器產生且不可變）；`case_code` 業務代碼、`display_name` 姓名、`revision` 版本、`updated_at` 時間。列表 GET 回 `{cases:[...]}`；單筆 GET `?id=<uuid>` 回 `{case:{...}}`；新增 POST body `{case_code,display_name,expected_revision:0}` 回 201 `{saved:true,case:{...}}`；更新 PUT body `{id,case_code,display_name,expected_revision}` 回200同形狀。
- 錯誤：400 `invalid_case_input|invalid_revision|invalid_id|create_revision_must_be_zero`；401 `unauthorized`；404 `not_found`；409 `duplicate_case_code|revision_conflict_or_not_authorized`。**權限不足與版本衝突暫共用409，尚未達最終403/404契約要求，不能稱全 API 已凍結**。
- 權限：Hatchable `access='member'` + SQL `updated_by=req.member.id` 行級隔離。這是**協作者身分**，不是居督/主管 RBAC；管理者測試身分不能讀取另一 member 的資料（404），不具主管全案能力。正式角色模型待完成。

## 實際 HTTP 證據
| 測項 | HTTP | 驗證 |
|---|---|---|
| 匿名 GET | 401 | 拒絕 |
| member POST 虛構 TEST-V1-20261115-03 | 201 | 新增成功，revision=1 |
| member GET?id=UUID | 200 | 重讀原內容，revision=1 |
| member PUT 修改 | 200 | revision=2 |
| member GET?id=UUID 再讀 | 200 | 修改後內容及 revision=2 |
| member PUT expected_revision=1 | 409 | 過期版本拒絕 |
| member POST 重複 case_code | 409 | 重複拒絕 |
| admin 測試身分 GET member 個案 | 404 | 行級隔離拒絕；尚非主管全案 |

## 還原驗證（**僅虛構測試資料**）
- 從測試環境 SELECT 匯出虛構個案 TEST-V1-20261115-03 的 UUID、case_key、patient_name、revision、content、owner 等欄位；在第二個獨立 fork `proj_CEaZ0Oc0RyS5` / `fp3cga` 中以 SQL INSERT 還原，結果 `changes=1`。
- 在還原 fork SELECT 重新核對，UUID、案號、姓名、revision=2、content、owner 完全一致。
- **範圍限制**：這證明測試資料單筆還原可行，**不是原始兩套 PostgreSQL 的完整受控備份或正式資料還原**。正式兩庫尚無完整備份／還原驗收，不可進行正式寫入或切換。

## 前端 AI 交接
- 已驗證測試端點可開始在前端獨立分支接入 **測試站**：`https://nddw2e.hatchable.site/api/v1/cases`，僅虛構資料；使用上述 GET/POST/PUT body 與回傳格式。不同 origin 的瀏覽器 cookie/CORS 尚未驗證，建議同源測試 adapter。
- **不得連接正式個案**：主管/督導 RBAC、跨裝置登入、跨模組 UUID 關聯、完整備份還原、403/404權限語意及正式主庫核准仍待完成。
- 訪視異常 `A`/`B` 原始鍵值保留，不做映射或刪除。
