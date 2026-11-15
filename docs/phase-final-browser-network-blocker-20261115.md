# 隔離 API 前端真實瀏覽器驗收阻擋證據｜2026-11-15
## 已確認的程式與部署
- 現有前端：prototype/mock-case-crud-flow.html → isolated-v1-client.js（GET/POST/PUT）→ isolated-v1-ui-binding.js（個案、家訪、電訪、照顧計畫 GET），沿用 case-field-compat.js；沒有新增模擬頁或診斷頁。
- 後台同源診斷頁原始碼已從 Hatchable proj_GpYIsaOvPkKd 的 public/isolated-connection-check.html 直接讀取，確實呼叫相對路徑 /api/v1/cases，credentials:same-origin。該檔存在不代表目前執行環境可開啟網頁。
## 本執行環境的真實網路及瀏覽器結果
- Python requests GET https://nddw2e.hatchable.site/isolated-connection-check.html → **DNS NameResolutionError**，未建立 HTTP 連線，故沒有 HTTP 狀態碼。
- Python requests GET https://nddw2e.hatchable.site/api/v1/cases → **DNS NameResolutionError**，未建立 HTTP 連線，故沒有 HTTP 狀態碼。
- Playwright Chromium (/usr/bin/chromium) page.goto 診斷頁 → **net::ERR_BLOCKED_BY_ADMINISTRATOR**。
- Playwright Chromium page.goto API → **net::ERR_BLOCKED_BY_ADMINISTRATOR**。
- Web fetch 同站兩 URL → cache miss / URL inaccessible。以上是執行環境網路政策阻擋，**不是 401/404/409、CORS、Cookie 或後台 API 故障證據**。
## 尚無法完成
- 在此執行環境未取得 Hatchable 已授權 session，也無法以瀏覽器導航至站點；無法實際測試新增→修改→重新整理→登出登入→重新讀取，亦無法對三模組 UUID 及錯誤提示作真實 HTTP 驗收。不可將後台 SQL/API 成功當成本次前端實測。
## 交後台 AI／測試環境管理者處理
1. 提供**能存取 nddw2e.hatchable.site 的受控瀏覽器執行環境**（或讓已授權測試協作者在同源測試站執行），避免目前 ERR_BLOCKED_BY_ADMINISTRATOR；不應公開密碼、Token、Session。
2. 在同源網頁確認 Hatchable 協作者登入 Session，GET /api/v1/cases 的 HTTP 狀態、回傳 JSON，並記錄 401/404/409 與離線 Network Error。
3. 如要從 GitHub 前端預覽跨來源直連，需提供已核准的 Origin/CORS、credentials/Set-Cookie SameSite 設定；**優先同源，不要開放 private API 為 public**。
4. 照顧計畫 GET 目前只有讀取規格；家訪／電訪 POST 雖有提案，但需確認實測及正式測試權限，不能宣稱寫入驗收完成。
原始兩套 PostgreSQL 與正式網站未動；本次僅紀錄真實阻擋結果。