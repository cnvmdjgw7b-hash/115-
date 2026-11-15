# 第四階段隔離測試證據（2026-11-15）

## 環境及安全邊界
- 原照顧計畫：`proj_NiEVlJnMSo9O` / `ai-pgby`；**未修改、未部署、未寫入**。
- 測試分叉：`proj_GpYIsaOvPkKd` / `https://nddw2e.hatchable.site`，Hatchable fork 複製程式碼及資料表結構，**不複製任何原始資料**；僅此測試分叉部署至 v3。分叉不是正式資料庫，也不能充當原資料庫備份。
- 測試 API 原始碼：`tests/hatchable-care-plan-isolation/api-cases.js`。修正 GET 列表與單筆的 `updated_by` 行級限制，更新衝突時亦要求原 owner 相同。

## 實際 API 呼叫結果
| 測試 | HTTP | 結果 |
|---|---|---|
| 匿名 GET /api/cases | 401 | 平台拒絕未登入 |
| 模擬 member GET /api/cases（建立測試資料前） | 200 | cases=[] |
| 模擬 admin GET /api/cases（測試資料建立後） | 200 | cases=[]，不同身分無法讀取測試 member 草稿 |
| member POST 虛構個案 TEST-ISOLATION-20261115-01（原始 CTE） | 409 | **假失敗**：實際資料庫已新增 1 筆／版本1／稽核1筆；原因為原 CTE 最後以第二次讀取表 JOIN，無法在同一 statement 看見新寫入，導致回傳空列。 |
| 修正 CTE 改由 saved RETURNING 後，member POST 同個案 expected_revision=1 | 200 | 成功更新至 revision=2 |
| member POST 虛構個案 TEST-ISOLATION-20261115-02 expected_revision=0 | 200 | 成功新增 revision=1 |
| member GET /api/cases?id=<測試 UUID> | 200 | 可重新讀到新個案與 revision=1 |
| member POST 既有個案 expected_revision=0 | 409 | 版本衝突正確拒絕 |

## 未通過／未執行
- 尚未以兩個真正督導帳號測試角色／個案授權；`member` 是 Hatchable 專案協作者，不等於機構督導。現行修補只隔離 `updated_by`，**不是正式主管全案／督導授權角色系統**。
- 尚未做登出登入、跨裝置、家電訪與照顧計畫跨庫聯動；前端不得宣稱通過。
- 原始兩套 PostgreSQL 未取得受控完整備份、還原演練；分叉空資料庫不是原資料備份，因此正式修復及切換仍受阻。
- 家電訪7訪視中2筆 `case_key='A'/'B'`，member_id 為 `preview:member`；現行 POST /api/visits 已檢查 UUID，來源可能是舊版預覽／手動測試資料；需以歷史版本與寫入日誌證實，**不修改原關聯**。
- 照顧計畫原三表均0筆，原專案部署歷史 v1（11/05）、v2-v4（11/11）；單靠現有表與部署紀錄不能判定是未寫入、環境分離或歷史清除，須取得備份與其他來源核對。

## 前端協作契約提醒
- 本次實測的是照顧計畫既有 `POST /api/cases`（upsert）及 `GET /api/cases?id=<uuid>`，成功回傳 `{saved:{id,case_key,revision,status,updated_at}}`，不是共同規劃的 `/api/v1`。前端 AI **不得直接接正式網站**；等共同 `/api/v1` 契約、使用者角色及跨庫關聯完成。
