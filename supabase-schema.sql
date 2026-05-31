create table if not exists public.album_stickers (
  album_id text not null,
  sticker_code text not null,
  quantity integer not null check (quantity >= 1 and quantity <= 99),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (album_id, sticker_code)
);

alter table public.album_stickers enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.album_stickers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

drop policy if exists "album_stickers_select_authenticated" on public.album_stickers;
create policy "album_stickers_select_authenticated"
on public.album_stickers
for select
to authenticated
using (true);

drop policy if exists "album_stickers_insert_authenticated" on public.album_stickers;
create policy "album_stickers_insert_authenticated"
on public.album_stickers
for insert
to authenticated
with check (true);

drop policy if exists "album_stickers_update_authenticated" on public.album_stickers;
create policy "album_stickers_update_authenticated"
on public.album_stickers
for update
to authenticated
using (true)
with check (true);

drop policy if exists "album_stickers_delete_authenticated" on public.album_stickers;
create policy "album_stickers_delete_authenticated"
on public.album_stickers
for delete
to authenticated
using (true);
