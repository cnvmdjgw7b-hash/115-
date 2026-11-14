import { db } from 'hatchable';

export const access = 'member';
export const methods = ['GET', 'POST'];

const validKey = key => key === 'A' || key === 'B';
const recordKeys = ['condition', 'service', 'response', 'action'];
const columns = `id, case_key, visit_date::text AS date, visit_type AS type,
  interviewee AS who, source_note AS source, facts, extra_note AS extra,
  action_note AS actions, record_body AS record, pending_items AS pending,
  status, revision, created_at, updated_at`;

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function (req, res) {
  const member = req.member?.id;
  if (!member) return res.status(401).json({ error: 'login_required' });

  if (req.method === 'GET') {
    const key = String(req.query?.case_key || '');
    if (!validKey(key)) return res.status(400).json({ error: 'invalid_case_key' });

    const { rows } = await db.query(
      `SELECT ${columns}
       FROM yhn_demo_visits
       WHERE member_id = $1 AND case_key = $2
       ORDER BY created_at DESC LIMIT 100`,
      [member, key]
    );
    return res.json({ visits: rows, scope: 'member', formal: false });
  }

  const input = req.body || {};
  const key = String(input.case_key || '');
  if (!validKey(key)) return res.status(400).json({ error: 'invalid_case_key' });
  if (!validDate(input.date) || !['家訪', '電訪'].includes(input.type)) {
    return res.status(400).json({ error: 'invalid_visit_date_or_type' });
  }
  if (!input.record || typeof input.record !== 'object' || Array.isArray(input.record)) {
    return res.status(400).json({ error: 'missing_record' });
  }

  const record = {};
  for (const keyName of recordKeys) {
    const value = input.record[keyName] ?? '';
    if (typeof value !== 'string' || value.length > 6000) {
      return res.status(400).json({ error: 'invalid_record' });
    }
    record[keyName] = value;
  }
  if (!Object.values(record).some(value => value.trim())) {
    return res.status(400).json({ error: 'empty_record' });
  }
  if (typeof input.who !== 'string' || !input.who.trim() || input.who.length > 50) {
    return res.status(400).json({ error: 'invalid_interviewee' });
  }

  const facts = Array.isArray(input.facts) ? input.facts : [];
  const pending = Array.isArray(input.pending) ? input.pending : [];
  if (facts.length > 60 || pending.length > 20 ||
      [...facts, ...pending].some(value => typeof value !== 'string' || value.length > 300)) {
    return res.status(400).json({ error: 'invalid_arrays' });
  }
  for (const keyName of ['source', 'extra', 'actions']) {
    const value = input[keyName] ?? '';
    if (typeof value !== 'string' || value.length > 5000) {
      return res.status(400).json({ error: 'invalid_detail' });
    }
  }

  const { rows } = await db.query(
    `INSERT INTO yhn_demo_visits
      (member_id, case_key, visit_date, visit_type, interviewee,
       source_note, facts, extra_note, action_note, record_body, pending_items)
     VALUES ($1, $2, $3::date, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, $11::jsonb)
     RETURNING ${columns}`,
    [
      member, key, input.date, input.type, input.who, input.source ?? '',
      JSON.stringify(facts), input.extra ?? '', input.actions ?? '',
      JSON.stringify(record), JSON.stringify(pending)
    ]
  );

  if (rows.length !== 1) return res.status(500).json({ error: 'not_saved' });
  return res.status(201).json({ saved: true, visit: rows[0], formal: false });
}
