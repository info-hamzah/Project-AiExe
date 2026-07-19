-- 0009_partner_reps.sql — link a representative user to each partner org (Module 2).
-- One rep per org for MVP; a partner_staff table generalizes this in V2.

ALTER TABLE partner_orgs
  ADD COLUMN IF NOT EXISTS rep_user_id uuid REFERENCES users(id);

-- Partner-portal permission is data (seeded), not schema — nothing else needed here.
