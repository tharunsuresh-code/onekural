-- Allow anonymous push subscriptions
-- Adds device_id (localStorage UUID), makes user_id optional

ALTER TABLE push_subscriptions
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS device_id text;

-- Drop old user_id unique constraint (replaced by device_id)
ALTER TABLE push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_unique;

-- Unique per device
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_device_id_unique
  ON push_subscriptions (device_id)
  WHERE device_id IS NOT NULL;

-- Allow anon inserts via the API route (service role bypasses RLS anyway)
-- but update policy so logged-in users can still manage their own rows
DROP POLICY IF EXISTS "users manage own push subscriptions" ON push_subscriptions;

CREATE POLICY "users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (
    auth.uid() = user_id          -- logged-in: own row
    OR user_id IS NULL            -- anonymous: any anon row (API route uses service role)
  );
