-- v20 role registry; populated only after separately approved identity mapping.
CREATE TABLE IF NOT EXISTS yhn_member_roles (
 actor_id text PRIMARY KEY,
 role text NOT NULL CHECK (role IN ('機構主管','居督')),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS yhn_access_grants_effective_lookup ON yhn_isolated_access_grants(actor_id,case_id,permission,effective_at,expires_at) WHERE revoked_at IS NULL;
