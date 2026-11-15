# 永護寧第二階段｜資料庫盤點與共用 API 契約（草案）
盤點日期：2026-11-15。狀態：待雙 AI 核對，**不得視為正式資料來源核准**。

## 既有資料庫
- Hatchable 家電訪助手 `proj_7cmf46XaBYvx` / `https://b-bf67.hatchable.site`：`yhn_visit_cases` 140筆；`yhn_demo_visits` 7筆。個案表欄位：`id uuid`, `member_id`, `case_code`, `display_name`, `status`, `supervisor`, `service_type`, `service_status`, `monthly_plan`, `official_code_matched`, `source_version`, timestamps。訪視表以 `case_key text` 保存個案 UUID 文字，另有 `member_id`、日期、類型、內容、revision。
- Hatchable 照顧計畫 `proj_NiEVlJnMSo9O` / `https://ai-pgby.hatchable.site`：`care_cases` 0筆；`care_case_versions` 0筆；`care_case_audit` 0筆。個案表 `id uuid`, `case_key text UNIQUE`, `patient_name`, `content jsonb`, `revision`, `updated_by` 等。
- 兩庫同庫姓名重複群組各0；跨庫重複目前因第二庫0筆無法形成現存重複。姓名非可靠唯一鍵。
- GitHub `database/001_schema.sql` 標示為尚未套用的 Supabase 設計稿；不得誤認為 Hatchable 現行正式 schema。

## 附件四 HTML 稽核
- 四份 HTML 都含 `localStorage`（出現次數分別8、2、4、4）；三份完全沒有 `fetch()`；`index.html` 的兩個 fetch 呼叫是 JEV API，未發現 `/api/cases` 或 `/api/visits` 呼叫。前端個案持久化未接通上述後端。

## 既有 API 與測試
- 家電訪 `GET /api/cases`：member 權限，回傳 `{cases:[{key,code,label,status,supervisor,service_status,service_type,monthly_plan,official_code_matched,source_version}],scope:'member',formal:false}`；目前以 `member_id` 篩選。
- `POST /api/cases`：`{case_code,display_name}`；成功201 `{saved:true,case:{key,code,label,status},formal:false}`；重複409；輸入不合法400。
- `GET /api/visits?case_key=<uuid>`、`POST /api/visits`：與會員及個案 UUID 綁定。
- 實測匿名 `GET /api/cases` 回401；模擬 member GET 回200、空清單；資料庫總筆數140，**兩者不矛盾**，因為查詢受 member_id 篩選。
- 現有 `/api/cases` 僅 GET/POST，缺 PATCH/PUT 更新；不可宣稱新增、修改、跨裝置已驗收。

## 待共同核准的共用契約 v0.1
- 採不可變 UUID `case_id` 作跨模組主鍵，`case_code` 為外部業務代碼；**不得以姓名或兩庫現有 ID 直接推斷同一個案**。
- 暫以家電訪 `yhn_visit_cases.id` 為候選 canonical ID，須先核對正式清冊、來源、資料權限與備份後才可正式採用。
- 建議 API：`GET /api/cases`、`POST /api/cases`、`GET /api/cases/:id`、`PATCH /api/cases/:id`；回傳固定 `{saved,case:{id,case_code,display_name,revision,updated_at}}`，衝突409，驗證錯誤400，未登入401，無權403，找不到404，系統錯誤500。
- 更新須有 optimistic concurrency（`revision` / `If-Match`），後端驗證角色、個案存取範圍；只有寫入交易成功且可重新 GET 才顯示成功。失敗保留前端草稿。
- **現有回傳格式仍以現行程式為準；以上新版回傳是設計提案，前端不可提前假定已部署。**

## 修復前關卡
1. 匯出並校驗兩套資料庫備份；確認資料筆數與還原演練；保留既有表與欄位。
2. 核對140筆資料的來源、member_id 分布、是否正式清冊及個案編碼映射；敏感個資不得進公開 GitHub。
3. 在隔離測試環境完成新增→GET→修改→GET→重新登入→跨授權帳號／裝置；同時測未授權401及衝突409。
4. 第一位 AI 僅在契約核准且 API 測試通過後接線；不合併四份 HTML，不動正式部署。

## 2026-11-15 雙 AI 核對結果（對照前端提交 5a5fc4b）
- 一致：家電訪140個案／7訪視；照顧計畫三表均0；家電訪現行 API 僅 GET/POST；正式主庫資格未核准。
- 家電訪140個案：`id`、`case_code`、`display_name` 各140個不同值，`member_id` 一種；117筆 `verified/official_code_matched=true`，23筆 `pending_verification/false`；全數 `source_version` 為「（玉）115 家電訪清冊最新一版(3).xlsm」。這是來源欄位宣稱，尚未與原始檔核對真實性、截止日及正式核准。
- 7訪視中5筆能以 `case_key + member_id` 對上個案；2筆無法關聯的 `case_key` 為字面值 `A`、`B`，均屬 `preview:member`，皆非 UUID；原因是測試／預覽格式鍵值不符，**不能推斷原始個案已刪除**。原資料保留，暫不建立映射。
- 照顧計畫三表0筆；已部署 `/api/cases`，支援 GET/POST 及 `case_key` upsert + expected_revision、版本與稽核。無法由現有筆數判斷過往是否曾寫入、寫到其他環境或被清空；須查部署紀錄／原始備份／匯入路徑，不能宣稱資料遺失或無資料遺失。
- **新增風險：** 照顧計畫 `GET /api/cases` 以 member 身分開放，但 SQL 未以 actor 限制資料列；不同 collaborator 可能讀到全部草稿。正式資料接入前必須修復權限隔離。家電訪 `member_id` 只有一種值不代表跨裝置或不同帳號能共用。
- **設計差異待決：** 前端草案採 `/api/v1/cases/{id}` + `legacy_case_map`，後端原草案採 `/api/cases/:id`；建議統一以版本化 `/api/v1` 作新契約，保留舊 API 相容；不得在未實作前讓前端接線。
- **驗收阻擋：** 尚無兩庫可驗證的受控備份及還原測試；未建立隔離測試 DB。依不得修改正式資料規定，未對現有專案執行 INSERT/UPDATE/DELETE，也未部署。新增／修改／重新讀取／跨裝置及跨模組寫入測試皆未通過，不能標示完成。

## 第三階段契約對照表（核對提交 5a5fc4b 與 8897d74）
| 面向 | 前端 5a5fc4b | 後端 8897d74 | 結論 |
|---|---|---|---|
| 個案主鍵 | 不可變伺服器 UUID `case_id` | 不可變 UUID `case_id` | 原則一致；現存家電訪 `id` 可作候選，但未核准權威主鍵 |
| 舊 ID | `legacy_case_map` | 禁止用姓名或不同庫 ID 直接推斷 | 需補充 mapping 驗證與審核，不可自動建立 |
| 欄位 | 含 supervisor_id、approved_services、verification_status、revision | 現有 supervisor、monthly_plan、status 等 | **未一致**；需定義欄位映射、缺欄位 migration、來源優先序 |
| API 路徑 | `/api/v1/cases/{id}` | `/api/cases/:id` | **未一致**；以新 `/api/v1` 為提案，舊路徑保留，不得宣稱已實作 |
| 回傳 | 未明訂完整 response envelope | `{saved,case:{id,case_code,display_name,revision,updated_at}}` | **未一致**；建議列表 `{cases:[...]}`、單筆 `{case:{...}}`、寫入 `{saved:true,case:{...}}`、錯誤 `{error,details?}` |
| 權限 | 主管全案、督導授權個案 | 目前 Hatchable member 隔離 | **未一致**；member 是 collaborator 而非機構督導，必須建立實際終端使用者身分與角色 |
| 版本衝突 | `expected_revision`、409 | `revision/If-Match`、409 | 原則一致；建議 JSON `expected_revision` 作必填，先完成後端原子條件更新 |

**暫定前端不得接線的新 API 合約（待雙方核准及實作）**：`GET /api/v1/cases`→`{cases:[{id,case_code,display_name,revision,updated_at}]}`；`POST /api/v1/cases` body `{case_code,display_name}`→201 `{saved:true,case:{...}}`；`GET /api/v1/cases/{uuid}`→200 `{case:{...}}`；`PATCH /api/v1/cases/{uuid}` body `{display_name,expected_revision}`→200 `{saved:true,case:{...}}`。HTTP 400/401/403/404/409/500 必須以實測確認。所有端點須同源、使用者身分授權及服務端行級授權。

**備份現況**：未取得可驗證之兩套 PostgreSQL 完整匯出、還原權限或還原演練證據；唯讀 SQL 統計不是備份。依主管「先備份、不得修改正式資料」限制，阻擋對現有兩庫做任何測試寫入。隔離測試環境也尚未建立；不得把草案當已通過測試。
