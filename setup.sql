-- CardWise MVP database upgrade. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

alter table public.cards add column if not exists card_code text;
update public.cards set card_code=card_type where card_code is null;
alter table public.cards alter column user_id set data type uuid using user_id::uuid;
create unique index if not exists cards_user_type_unique on public.cards(user_id,card_type);
create index if not exists cards_user_id_idx on public.cards(user_id);

alter table public.cards enable row level security;
drop policy if exists "Users read own cards" on public.cards;
drop policy if exists "Users add own cards" on public.cards;
drop policy if exists "Users delete own cards" on public.cards;
create policy "Users read own cards" on public.cards for select to authenticated using (auth.uid()=user_id);
create policy "Users add own cards" on public.cards for insert to authenticated with check (auth.uid()=user_id);
create policy "Users delete own cards" on public.cards for delete to authenticated using (auth.uid()=user_id);

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.prices enable row level security;
alter table public.benefits enable row level security;
drop policy if exists "Public read stores" on public.stores;
drop policy if exists "Public read products" on public.products;
drop policy if exists "Public read prices" on public.prices;
drop policy if exists "Public read benefits" on public.benefits;
create policy "Public read stores" on public.stores for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Public read prices" on public.prices for select using (true);
create policy "Public read benefits" on public.benefits for select using (true);
