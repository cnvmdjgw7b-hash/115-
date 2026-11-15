# 隔離 API 前端連線阻礙與安全測試流程（2026-11-15）
對照前端 939f5a2 與後端 4e86a23；**不修改正式網站或正式資料庫**。

## 已查明
- 前端 `prototype/isolated-v1-client.js` 與 `isolated-v1-ui-binding.js` 使用 `https://nddw2e.hatchable.site/api/v1/cases`、GET/POST/PUT、`credentials:'include'`；與後端隔離站 API 路徑、方法及回傳契約一致。
- 但前端頁面位於 GitHub Pages／另一來源時，跨來源 `fetch` 需伺服器正確回傳 CORS `Access-Control-Allow-Origin`（不可為 * 搭配 credentials）與 `Access-Control-Allow-Credentials:true`，並支援 JSON POST/PUT 的 OPTIONS 預檢；同時第三方 Cookie 可能被瀏覽器阻擋。**目前未取得實際瀏覽器 Network 證據，不能斷言只有 CORS。**
- Hatchable 隔離專案 `proj_GpYIsaOvPkKd` 為 **personal/private**；外部未受邀瀏覽器先遇平台登入／協作者限制。API 宣告 `access='member'`，Hatchable 會員協作者的 session 與一般訪客／機構督導帳號不是同一套權限。不得把 API 改 public 或分享 session/token。
- 已部署 **隔離站 v7** 同源診斷頁：`https://nddw2e.hatchable.site/isolated-connection-check.html`。頁面只執行 `fetch('/api/v1/cases',{credentials:'same-origin'})`，不記錄或顯示密碼、token、cookie；這是可控制的 CORS 規避方案，**不代表跨來源 CORS 已修好**。
- 後台工具直接執行 API：member GET200、public GET401、admin 模擬不同身分 GET404（測試資料 owner 隔離）；**不等於外部瀏覽器端到端成功**。此執行環境的外部 HTTP 探測因 DNS 失敗，無法證明外部站點可達。

## 給第一位 AI／測試人員的安全驗收流程
1. 由 Hatchable 測試專案**擁有者 yuciuwen702** 在 Hatchable 專案管理介面邀請指定測試人員為 collaborator（member），或由擁有者本人登入。只邀請需要的人；不在 GitHub 提供憑證。
2. 受邀人員以**同一瀏覽器**登入 Hatchable 並接受協作邀請，開啟 `https://nddw2e.hatchable.site/isolated-connection-check.html`，按「測試同源授權 GET」。成功應顯示 HTTP200；401表示未取得 collaborator session；平台登入牆表示未登入／未獲專案權限；網路錯誤先查 DNS/TLS/代理。
3. 若同源 GET200，第一位 AI 應將隔離 CRUD 測試頁**部署在同一測試站來源**，使用相對路徑 `/api/v1/cases`、`/api/v1/visits`、`/api/v1/care-plans`，並用 `credentials:'same-origin'`。前端程式目前限制 `makeClient` 必須傳固定隔離網址；可由第一位 AI 在自己分支將隔離站相對路徑支援加入 allowlist，但不可加入正式站。
4. 同源瀏覽器依序虛構資料 POST→GET→PUT→重新整理→GET；記錄 Network HTTP 狀態與 UI 文字（遮蔽 Cookie、Authorization、個資）。跨裝置、跨來源及主管/督導角色尚未驗證，不可回報通過。
5. 若外部頁面仍需跨來源呼叫，先在 DevTools Network 觀察 OPTIONS、Access-Control-Allow-*、Cookie SameSite/第三方 Cookie、redirect/login wall，再由平台管理者確認可否安全設定 CORS。**未經核准不得調整公開可見性或降低 API 權限。**

## 未解決阻礙
- Hatchable personal/private 專案協作者邀請與瀏覽器登入需要**擁有者／受邀人員操作**；後台工具無 collaborator 邀請、平台可見性或實際外部瀏覽器操作權限。
- 未取得實際瀏覽器測試結果；不能聲稱已完成登入、Cookie、CORS 或跨裝置驗收。
- 隔離站仍有舊 `api/cases.js` lint 提示 `saved` CTE（不影響已測 `/api/v1/cases`）；本次未更改舊 API。
