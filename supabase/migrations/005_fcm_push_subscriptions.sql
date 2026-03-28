-- Add FCM (Firebase Cloud Messaging) support to push_subscriptions.
-- FCM rows have no WebPush subscription JSON, so subscription must be nullable.
-- subscription_type distinguishes FCM (Android app) from webpush (browser).

ALTER TABLE push_subscriptions
  ALTER COLUMN subscription DROP NOT NULL;

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS subscription_type TEXT NOT NULL DEFAULT 'webpush'
    CHECK (subscription_type IN ('webpush', 'fcm'));

-- Partial unique index: one FCM token per registration (excludes null tokens)
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_fcm_token_unique
  ON push_subscriptions (fcm_token)
  WHERE fcm_token IS NOT NULL;

COMMENT ON COLUMN push_subscriptions.subscription_type IS
  'webpush = browser Web Push (existing), fcm = Android native FCM';
COMMENT ON COLUMN push_subscriptions.fcm_token IS
  'FCM registration token from FirebaseMessagingService.onNewToken()';
