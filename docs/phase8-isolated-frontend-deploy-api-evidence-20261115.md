# 隔離前端入口與 API 實測（2026-11-15）
- 已將 GitHub 分支既有 `prototype/mock-case-crud-flow.html`、`isolated-v1-client.js`、`isolated-v1-ui-binding.js`、`case-field-compat.js` 複製到隔離 Hatchable `proj_GpYIsaOvPkKd` 的 `public/frontend-acceptance/`；v8 已部署。未改原首頁、診斷頁、原正式兩庫或正式網站。
- **前端測試入口**：https://nddw2e.hatchable.site/frontend-acceptance/mock-case-crud-flow.html （personal/private，需同專案協作者登入）。
- 使用 Hatchable 已授權 member 執行真實隔離 API：POST `/api/v1/cases` 201，測試 UUID `b900e34c-3f40-4d02-a32f-98fcf6171cea` revision1；GET 200；PUT 200 revision2；再次 GET 200 讀回修改後名稱；舊 revision PUT 409；不存在 UUID GET 404；匿名 GET 401。
- 這些是**真實 API 呼叫**，不是前端瀏覽器操作。主管手機診斷頁 GET 200、清單0筆與工具 member GET 200、清單3筆的差異，可能是登入身分 owner/updated_by 不同；需同一協作者登入核對，不能直接推定資料遺失。
- 現有前端具備個案 CRUD 與家訪、電訪、照顧計畫同 UUID GET 接線；**尚未取得手機瀏覽器實際操作／重新整理／重新登入的驗收紀錄**。隔離訪視寫入未於本次驗證。
- 隔離 v8 部署警告：舊 `api/cases.js` 的 `saved` 參照可能失敗；本次測試的 `api/v1/cases` 正常。此問題應由後台評估，不可擅改正式端點。
