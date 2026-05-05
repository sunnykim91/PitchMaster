-- Notifications: add url column for in-app deep-linking on click.
-- Push payload already carried `url` (see src/lib/server/sendPush.ts), but the
-- DB row didn't persist it, so the notifications panel had no destination
-- when a user tapped a card. ClientLayout falls back to title-keyword routing
-- for legacy rows where url is null.
alter table notifications
  add column if not exists url text;

comment on column notifications.url is
  'Deep link url shown when user taps the in-app notification card.';
