# 第三階段｜前後端 API 契約差異核對（2026-11-15）
狀態：**供後台 AI 核對，未核准正式資料庫、未實作**。
依據：前端 commit 5a5fc4b、後端 commit 8897d74（均位於 cnvmdjgw7b-hash/115-）；原始文件分別 docs/shared-database-api-audit-20261115.md 與 docs/backend-database-audit-api-contract-20261115.md。

## 一致項目
- 家電訪資料庫 140 個案、7 訪視；照顧計畫資料庫三表皆 0。
- 不可變 UUID 識別個案，業務案號獨立於 UUID；姓名不能作唯一鍵。
- 先備份、授權、版本衝突 409、重讀驗證；不得自行切換主庫、刪除或覆蓋既有資料。
- 家電訪既有 API 只有 GET/POST /api/cases、GET/POST /api/visits，沒有 PATCH 個案。

## 尚未一致／必須定案
| 項目 | 前端 5a5fc4b | 後端 8897d74 | 建議 |
|---|---|---|---|
| API 前綴 | /api/v1 | /api | 優先保留既有 /api/cases 作相容入口，新增版本化 API 時另訂明確路由 |
| ID 回傳 | case_id（schema） | case.id（API） | 對外統一 case.id，跨模組 case_id 外鍵；舊 key 只作相容別名 |
| API 回傳 | 只指定成功須含 ID、revision、updated_at | {saved,case:{id,case_code,display_name,revision,updated_at}} | 以後端提案作候選，待測試後凍結 |
| 既有欄位 | supervisor_id,approved_services,verification_status | 既有 supervisor,monthly_plan,status | 不覆蓋舊欄位；先訂欄位映射及 nullable/來源規則 |
| 主庫 | 尚未選定 | yhn_visit_cases.id 為候選 | 仍須正式清冊及權限核准 |
| 訪視/計畫 API | 已提出完整路由 | 尚未詳細定義 | 後台補齊讀寫與授權契約 |
| 更新版本 | expected_revision | revision / If-Match | 明訂唯一提交方式，建議 JSON expected_revision，避免前後端混用 |

## 兩筆無法對應訪視｜唯讀追查
執行不輸出個資的彙總 SQL：
- 7 筆訪視：5 筆以 UUID case_key 對上同 member 的個案；2 筆未對上。
- 2 筆未對上的 case_key **均不符合 UUID 格式**；也都不是現有個案表的 case_code；不存在其他 member 的 UUID 對應。
- 因此可排除「只是會員不同」或「直接把 case_code 當 key」兩個單純原因；仍無法確認其原始寫入來源，不能刪除、猜測配對或改寫。
- 後台需在受控環境核對原始寫入程式、時間與歷史版本，必要時另建人工待確認對照表；不得把識別資訊提交到公開 GitHub。

## 前端接線前的阻擋條件
1. 後台提供兩庫備份完成及還原演練證據、正式來源核准狀態。
2. 後台凍結共用 API 規格：路由、method、request/response、狀態碼、驗證與授權、跨站登入策略。
3. 後台在隔離測試環境以虛構資料實測 POST→GET→PATCH→GET、409、401/403/404，提供 HTTP 與 DB 證據。
4. 前端才可在自己的分支實作 API adapter、保存錯誤提示與重讀流程；重新整理、重新登入、跨裝置需真實登入環境驗證，不能用 localStorage 假裝。
5. 四份 HTML 整合與正式部署繼續暫停。

本文件僅提交核對結果；未執行資料庫寫入、備份或端到端測試。
