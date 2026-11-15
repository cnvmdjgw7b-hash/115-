# 前端瀏覽器測試與相容層｜2026-11-15
## 實測方式
使用 Chromium headless + Playwright，透過 page.set_content 載入現有 `mock-case-selector.html` 原始碼；環境禁止 file:// 與 localhost 導航，因此不宣稱測試站部署或 URL 開啟成功。
## 實測結果
- 390×844、375×667 手機與 768×1024 平板：**3/3 視窗通過**。
- 每個視窗逐一選取三筆虛構個案，逐一點擊四個模組入口並核對選取個案與模組名稱：**每視窗 12/12、總計 36/36 通過**。
- 搜尋 DEMO-002 僅保留乙、查無結果顯示空狀態、清除搜尋恢復三筆：**3/3 視窗通過**。
- 橫向溢出 0、JavaScript 例外 0、外部網路請求 0。
## 相容層
`prototype/case-field-compat.js` 提供 canonical(row)、legacy(row)、list(rows)：保留原始欄位並新增對應別名；key/code/label ↔ id/case_code/display_name；嚴格檢查 UUID，不用姓名生成主鍵、不呼叫 API、不修改原始物件。注意後台尚未凍結 /api/v1 契約；此層只處理三個已知對應，不推測 supervisor/monthly_plan 等欄位。
## 四份 HTML 保護
本次**未修改** ZIP 內四份原始 HTML，也未修改既有 GitHub 網站程式；因此原始背景、配色與功能程式未被此次變更覆蓋。但**尚未對四份原 HTML 逐一完成完整瀏覽器回歸測試**，不可宣稱其所有功能均已驗收。
