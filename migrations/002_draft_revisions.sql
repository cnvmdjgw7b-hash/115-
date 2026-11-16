ALTER TABLE care_cases ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS care_case_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES care_cases(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  snapshot jsonb NOT NULL,
  actor_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, revision)
);
CREATE TABLE IF NOT EXISTS care_case_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL,
  action text NOT NULL,
  case_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO care_case_versions (case_id, revision, snapshot, actor_id, created_at)
SELECT id, revision,
       jsonb_build_object('case_key', case_key, 'patient_name', patient_name,
         'source_name', source_name, 'source_date', source_date,
         'effective_date', effective_date, 'content', content, 'status', status),
       updated_by, updated_at
FROM care_cases
ON CONFLICT (case_id, revision) DO NOTHING;