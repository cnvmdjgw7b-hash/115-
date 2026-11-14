# B test-site visit API (Hatchable)

This change adds the Hatchable-specific `api/visits.js` route and a demo-only PostgreSQL migration. It is not a general Node.js route: `import { db } from 'hatchable'` and `access = 'member'` require the Hatchable runtime.

## Scope and safeguards

- Only simulated case keys `A` and `B` are accepted.
- The authenticated `req.member.id` is used as the owner for inserts and reads; the caller cannot supply a member ID.
- Reads are scoped to the current member and selected demo case.
- Writes create draft-only records; this version has no update, delete, revision-history, or formal-case workflow.
- The route returns `formal: false`. Do not use it for real client records.
- Existing browser `localStorage` behavior is not replaced until the actual `app.js` source and UI payload mapping are integrated and tested.

## Routes

`GET /api/visits?case_key=A|B` returns up to 100 records belonging to the signed-in member and case.

`POST /api/visits` accepts `case_key`, `date` (`YYYY-MM-DD`), `type` (`家訪` or `電訪`), `who`, optional `source`, `facts`, `extra`, `actions`, `pending`, and a four-section `record` object. Missing record sections become empty strings; all sections cannot be empty. Success is HTTP 201 and includes the inserted record.

## Migration and verification

Apply `database/002_visit_demo.sql` only to the isolated Hatchable test database. Verify GET/POST behavior with fictional data, including unauthenticated 401, own-member scoping, invalid case-key rejection, invalid calendar-date rejection, and empty-record rejection. Never import the sample CSV into production or use it as proof of de-identification.

This repository does not contain the deployed Hatchable project source or its `app.js`; consequently the frontend connection and live Hatchable database tests must be completed in that project before considering the integration finished.
