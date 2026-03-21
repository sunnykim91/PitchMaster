-- Add file attachment support to rules
alter table rules add column if not exists file_url text;
alter table rules add column if not exists file_name text;
