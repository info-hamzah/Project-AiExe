-- 0010_vouchers_user_status.sql — voucher discount instrument (PA-19) + user lifecycle status (PA-18).

ALTER TABLE users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Vouchers as the first *discount instrument* (PA-19 scaling rule): explicit product
-- scope (fixes the AE-261 "voucher on unrelated products" class), fee-component-only value.
CREATE TABLE vouchers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  name             text NOT NULL,
  scope_item_keys  text[] NOT NULL,          -- catalog item keys this voucher may apply to
  fee_discount_pct numeric(5,2) NOT NULL CHECK (fee_discount_pct BETWEEN 0 AND 100),
  max_redemptions  int NOT NULL DEFAULT 1,
  redeemed         int NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'active',
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);
