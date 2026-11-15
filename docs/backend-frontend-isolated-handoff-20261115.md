# 前端 AI 隔離接線交接（2026-11-15）
僅使用虛構資料。測試專案 `proj_GpYIsaOvPkKd`、`https://nddw2e.hatchable.site` v6；正式兩庫不動。

## 測試端點與格式（實際驗證）
- `GET /api/v1/cases` →200 `{cases:[{id,case_code,display_name,revision,updated_at}]}`
- `GET /api/v1/cases?id=<UUID>` →200 `{case:{...}}`
- `POST /api/v1/cases` body `{case_code,display_name,expected_revision:0}` →201 `{saved:true,case:{...}}`
- `PUT /api/v1/cases` body `{id,case_code,display_name,expected_revision}` →200 `{saved:true,case:{...}}`
- `GET /api/v1/visits?case_id=<UUID>` →200 `{visits:[{id,case_id,visit_type,visit_date,note}]}`，visit_type home=家訪、phone=電訪。
- `GET /api/v1/care-plans?case_id=<UUID>` →200 `{care_plan:{case_id,content,revision,status,updated_at}}`。
- 共用 UUID 測試值 `7e475ade-c95a-4e9f-94ad-34bc291db9a2`；隔離 DB SQL JOIN 顯示家訪1、電訪1、個案1，照顧計畫 GET 的 case_id 相同。
- 權限實測：匿名401；不同模擬 admin 身分 GET UUID 為404；測試 member 為200。POST 重複案號409、PUT 舊版本409。這些是 Hatchable 協作者身分，**不是機構主管／督導角色驗收**。

## 授權與瀏覽器設定
- 測試站為 Hatchable personal/private，須由具該專案權限的測試協作者透過平台正常登入，使用瀏覽器同源 session/cookie；不在 GitHub、前端程式、URL 或對話分享密碼、token、session。
- 優先在 `https://nddw2e.hatchable.site` 同源測試。若第一位 AI 的前端在不同 origin，需實測 CORS、cookie SameSite/credentials 與 session 維持；目前**未驗證跨網域可用**。不要自行將私有 API 改成 public 或將憑證寫死。
- 前端錯誤處理：400 顯示欄位錯誤；401 提示重新登入；404 顯示無權或不存在；409 版本衝突須重新 GET，保留未儲存草稿；網路失敗不可顯示「儲存成功」。
- 僅可在第一位 AI 的獨立分支接通測試環境；尚不可接正式資料庫、合併四 HTML 或部署正式站。

## 資料與未解事項
- 再次唯讀查詢原家電訪：140個案／7訪視；原照顧計畫：0個案／0版本／0稽核。A、B 鍵值保留，未修改。
- 虛構資料已完成單筆備份還原演練（詳 phase6 證據）；**原始正式資料完整備份／還原尚未完成**：Hatchable 現有工具沒有完整受控 DB 匯出與還原介面；不可用公開 GitHub 保存個資或以 fork 空資料庫充當正式備份。
- 正式管理者全案、不同督導授權與跨資料庫真實 ID 映射仍未完成；跨模組目前僅同一隔離庫虛構 UUID 關聯驗證，不能推定正式兩庫已打通。
