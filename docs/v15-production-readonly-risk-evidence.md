# v15 正式資料唯讀安全查核（2026-11-15）
範圍：正式家電訪專案 proj_7cmf46XaBYvx；正式照顧計畫 proj_NiEVlJnMSo9O；隔離測試 proj_GpYIsaOvPkKd。未修改正式資料／網站。
## 可重現 SQL
```sql
SELECT count(*) AS total,
 count(*) FILTER (WHERE c.id IS NOT NULL) AS uuid_matches,
 count(*) FILTER (WHERE c.id IS NULL) AS invalid_keys
FROM yhn_demo_visits v LEFT JOIN yhn_visit_cases c ON v.case_key=c.id::text;
-- total=7, uuid_matches=5, invalid_keys=2
SELECT count(*) AS total,
 count(*) FILTER(WHERE supervisor IS NULL OR trim(supervisor)='') AS no_supervisor,
 count(DISTINCT supervisor) AS supervisor_names,
 count(DISTINCT member_id) AS member_ids FROM yhn_visit_cases;
-- total=140, no_supervisor=0, supervisor_names=3, member_ids=1
```
## 結論及限制
- 訪視與個案目前採字串 `case_key` 對照 UUID `id::text`；2筆無法關聯（既有異常 A/B），不得自動改寫或猜配對。
- `supervisor` 為個案屬性，不是已驗證的登入角色授權；140筆有督導名稱但僅1種 `member_id`，不足以證明不同督導的行級隔離。
- 正式照顧計畫庫目前 `care_cases=0`，兩正式庫無可驗證的共同 UUID 對照紀錄。跨庫關聯須先有核准的主索引／來源對照規則；不可依姓名直接合併。
- Hatchable 現有連接器支援 SQL、無受控正式庫快照匯出／完整匯入還原操作。已完成的單筆虛構還原不能替代正式完整備份。需擁有者提供經核准的備份匯出／隔離還原機制或平台管理員支援；**不得將正式個資匯入公開儲存庫**。
- 上線阻礙：機構身分與督導授權尚未實作驗證、正式完整備份還原未驗證、跨庫2筆異常鍵值與照顧計畫庫映射未解。所有項目未通過。

## v15 主管核准後隔離環境執行規格（待實作與驗證）
### 角色與授權（預設拒絕）
- 機構主管：以機構身分識別、明確核准範圍管理個案分派與授權；主管權限不可僅憑 Hatchable collaborator/member 判定。
- 居督：以唯一且可驗證的登入身分對應督導編碼，僅能讀寫有效授權個案 UUID 的家訪、電訪、照顧計畫。禁止以客戶端提交的 supervisor、owner_id 或姓名自行擴權。
- 建議授權資料欄位：actor_id、institution_id、role、case_id、permission(read/write)、effective_at、expires_at、revoked_at、approved_by、approval_at、reason、handover_id；以資料庫端授權檢查及拒絕優先，記錄拒絕事件。
### 督導交接
1. 主管核准交接單（原督導、新督導、個案 UUID、交接原因、生效時間）；預先建立待生效授權，不提前開放。
2. 生效時間到達時新督導權限生效，原督導同一交易中撤權；生效前後均須檢查讀取、寫入、舊工作階段及快取，不得出現雙方無限期並行權限。
3. 交接完成後保留原操作稽核及歷史紀錄，不移轉作者身分、不修改既有服務內容。撤權不等於刪除紀錄。
### 緊急代理
- 限主管核准、指定代理人、指定個案 UUID、最小必要操作、原因、開始與到期時間；短效且自動失效，禁止永久代理。
- 緊急情況如採事後補核准，須明確機構制度與時限，未核准前不預設開放；每次存取標記代理授權識別碼。
### 稽核及驗收門檻
- 不可任意修改的稽核資訊：actor_id、case_id、action、decision(allow/deny)、role、grant_id、timestamp、request_id、before/after revision（避免紀錄個案全文及敏感憑證）。
- 隔離驗收：主管、原督導、新督導、未授權督導、緊急代理各以獨立身分實測讀寫；交接前後、撤權後、代理到期後均驗證拒絕；拒絕不能只靠前端隱藏按鈕。測試結果留 HTTP 狀態、匿名化紀錄與時間證據。
- 目前狀態：**規格準備完成，角色機制未實作／未驗收**。不修改正式網站或資料。
### 平台管理員授權申請（可直接轉交）
請平台管理員提供以下**受控操作能力**，不需向 AI 提供帳密或金鑰：
1. 專案 `proj_7cmf46XaBYvx`（正式家電訪）與 `proj_NiEVlJnMSo9O`（正式照顧計畫）的唯讀完整一致性快照：資料表、結構、索引、約束、必要版本資訊；含加密匯出與受控儲存位置，禁止公開 GitHub。
2. 提供快照產生時間、表筆數、檔案雜湊 SHA-256、備份作業識別碼、保留／刪除政策及誰可存取；必要時以資料庫原生一致性備份。
3. 授權建立**全新且與正式庫隔離**的私有還原目標、執行完整還原、讀取還原日誌與查核結果；不得授予覆寫正式庫的操作權。
4. 還原驗收：逐表筆數、結構、UUID、外鍵／孤兒紀錄、關鍵欄位雜湊與資料版本核對；保留異常 A/B 原貌，不能將其視為備份失敗後自動更正。
5. 由平台管理員回覆是否支援上述備份／還原、可執行者角色、授權核准者、隔離庫建置方式及預計時段；權限確認前不操作正式庫匯出。
### A/B 資料保全
- 兩筆 `member_id=preview:member`、`status=draft`、`revision=1`，僅為預覽測試**線索**，非證明。請平台管理員查核建立來源、環境、請求追蹤及稽核日誌（如有）；未取得證據前不得刪除、改鍵、配對或轉為正式個案。
