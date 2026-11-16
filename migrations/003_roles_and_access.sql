CREATE TABLE IF NOT EXISTS yhn_member_roles (
 actor_id text PRIMARY KEY,
 role text NOT NULL CHECK(role IN ('機構主管','居督')),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS yhn_access_valid_lookup ON yhn_isolated_access_grants(actor_id,case_id,permission,effective_at,expires_at) WHERE revoked_at IS NULL;
-- Deliberately do not infer formal roles from prior test grants or updated_by.
-- Formal actor-role enrollment and existing case ownership must be approved separately.
