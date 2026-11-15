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
