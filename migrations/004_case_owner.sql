-- v20: preserve existing case IDs and grants; no formal-data backfill without approval.
ALTER TABLE care_cases ADD COLUMN IF NOT EXISTS supervisor_id text;
CREATE INDEX IF NOT EXISTS yhn_cases_supervisor_id_idx ON care_cases(supervisor_id);
-- Existing test grants remain subject to role enrollment, effective time, and revocation.
-- Do not infer existing case ownership from updated_by.
