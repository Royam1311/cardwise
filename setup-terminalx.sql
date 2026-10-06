-- BENEFY multi-merchant catalog upgrade. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

alter table public.stores add column if not exists store_code text;
update public.stores set store_code = lower(regexp_replace(coalesce(store_name, id::text), '[^a-zA-Z0-9]+', '-', 'g')) where store_code is null;
create unique index if not exists stores_store_code_unique on public.stores(store_code);

alter table public.products add column if not exists merchant_id text;
alter table public.products add column if not exists merchant_product_id text;
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists model text;
alter table public.products add column if not exists category_paths jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists attributes jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists product_url text;
alter table public.products add column if not exists last_synced_at timestamptz;
update public.products set merchant_id='shekem-electric' where merchant_id is null;
update public.products set merchant_product_id=coalesce(nullif(sku,''),id::text) where merchant_product_id is null;
create unique index if not exists products_merchant_product_unique on public.products(merchant_id,merchant_product_id);
create index if not exists products_merchant_active_idx on public.products(merchant_id,active);
create index if not exists products_name_trgm_idx on public.products using gin (product_name gin_trgm_ops);
create index if not exists products_attributes_gin_idx on public.products using gin (attributes);

alter table public.prices add column if not exists compare_price numeric;
alter table public.prices add column if not exists discount_percent numeric;
alter table public.prices add column if not exists currency text not null default 'ILS';
create unique index if not exists prices_product_store_unique on public.prices(product_id,store_id);

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.prices enable row level security;
drop policy if exists "Public read stores" on public.stores;
drop policy if exists "Public read products" on public.products;
drop policy if exists "Public read prices" on public.prices;
create policy "Public read stores" on public.stores for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Public read prices" on public.prices for select using (true);
