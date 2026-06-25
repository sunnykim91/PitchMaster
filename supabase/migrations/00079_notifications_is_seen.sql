-- Notifications: add `is_seen` for the "seen vs read" split.
--
-- Badge/count is driven by `is_seen` (unseen), NOT `is_read`. Opening the
-- notification panel marks every row seen → the red count clears immediately,
-- but each item keeps its unread highlight (`is_read`) until the user taps it.
-- This matches the common social-app pattern (Instagram/Facebook/X): "open =
-- count cleared, but you can still tell which ones are new".
--
-- Invariant: read implies seen. Tapping an item (is_read=true) also sets
-- is_seen=true; the panel-open path sets only is_seen.
alter table notifications
  add column if not exists is_seen boolean not null default false;

-- Backfill so the badge count is unchanged at rollout: already-read rows are
-- implicitly seen (won't show in the count); unread rows stay unseen (still
-- counted, exactly as before). New inserts default to false → unseen → counted.
update notifications set is_seen = true where is_read = true and is_seen = false;

comment on column notifications.is_seen is
  'True once the user opened the notification panel (clears the badge/count). Distinct from is_read, which is per-item and set when the user taps the notification.';
