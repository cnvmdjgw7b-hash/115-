# 隔離 API v9 主管手機驗收｜後台唯讀交叉驗證（2026-11-15）
- 測試環境 `proj_GpYIsaOvPkKd`，**未修改正式資料庫或網站**。
- 主管手機驗收 UUID `37cc2c7e-18ff-4db9-8629-eb5ef2a685ac`：後台 SELECT 確認 `care_cases.id` 同 UUID、`revision=3`、案號 `TEST-MOBILE-MWHXI8CC-656E8544`；符合主管手機新增／修改／重讀回報。
- `yhn_test_visits` 此 UUID 家訪0、電訪0，與手機回報一致；`information_schema.key_column_usage` 確認 `yhn_test_visits_case_id_fkey` 對 `case_id` 的外鍵約束存在，**這不等於該 UUID 已有訪視紀錄**。
- 實際 GET `/api/v1/cases?id=<UUID>`：匿名 HTTP401；模擬 member（不同擁有者）HTTP404；模擬 admin（與手機資料 owner 相符）HTTP200，回傳相同 UUID、revision3、測試姓名。注意此測試代表不同 Hatchable collaborator 身分隔離，**不是正式主管／督導 RBAC 驗收**。
- `GET /api/v1/care-plans?case_id=<UUID>` 的手機 UUID 一致由主管提供；後台尚未獨立核對該 UUID 的 content 及實際寫入。家訪／電訪 POST、PUT 及照顧計畫獨立新增修改的端到端驗收交第一位 AI。
- 不重複執行手機已通過的新增／修改／重讀；未執行正式庫寫入。正式140個案、7訪視、A/B鍵值未修改。
- **待辦**：原正式資料庫完整受控備份及隔離還原、真正機構主管／不同督導角色權限、跨庫資料來源一致性；本次無工具可證明正式庫完整備份。
