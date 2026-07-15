-- Bond Book schema — run once in the Supabase SQL editor.

create table public.holdings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,                                   -- bond short name
  isin          text,                                            -- lookup key for a future price feed
  currency      text not null default 'USD',
  maturity_date date,
  face_value    numeric not null check (face_value >= 0),        -- par per unit
  quantity      numeric not null check (quantity >= 0),
  cost_price    numeric check (cost_price >= 0),                 -- purchase price, % of par (null = unknown, no P&L)
  clean_price   numeric not null check (clean_price >= 0),       -- current price, % of par
  coupon_rate   numeric check (coupon_rate >= 0),                -- annual coupon, % of par (null/0 = no income)
  coupon_freq   int not null default 2 check (coupon_freq in (1,2,4,12)), -- payments per year
  start_date    date,                                            -- issue/purchase date; anchors the maturity progress bar
  priced_at     timestamptz not null default now(),              -- when clean_price was last set
  created_at    timestamptz not null default now()
);

alter table public.holdings enable row level security;

-- Each signed-in user sees and edits only their own rows.
create policy "Users manage their own holdings"
  on public.holdings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Daily portfolio value, one row per user/day/currency. Written client-side on load;
-- feeds the historical value chart on the landing page.
create table public.snapshots (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day      date not null default current_date,
  currency text not null default 'USD',
  total    numeric not null,
  primary key (user_id, day, currency)
);
alter table public.snapshots enable row level security;
create policy "own snapshots" on public.snapshots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Portfolio news is a Supabase Edge Function (supabase/functions/news) that fetches
-- Google News server-side, filtered to the user's issuers. Deploy: supabase functions deploy news --no-verify-jwt
