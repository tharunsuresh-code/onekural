-- Store the subscriber's IANA timezone so we can send notifications at 4 AM local time
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS timezone text;
