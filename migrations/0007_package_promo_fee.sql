-- 0007_package_promo_fee.sql — promo fee as a first-class column on package versions
-- (wiki: Pro standard RM1,288 / promo RM1,000; reseller price handled by partner_terms).

ALTER TABLE package_versions
  ADD COLUMN IF NOT EXISTS promo_fee_cents bigint;
