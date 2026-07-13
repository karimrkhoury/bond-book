-- Bond Book schema — run once in the Supabase SQL editor.

create table public.holdings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  isin        text,                                          -- lookup key for a future price feed
  currency    text not null default 'USD',
  face_value  numeric not null check (face_value >= 0),      -- par per unit
  quantity    numeric not null check (quantity >= 0),
  clean_price numeric not null check (clean_price >= 0),     -- % of par
  accrued     numeric not null default 0,                    -- total accrued interest, optional
  priced_at   timestamptz not null default now(),            -- when clean_price was last set
  created_at  timestamptz not null default now()
);

alter table public.holdings enable row level security;

-- Each signed-in user sees and edits only their own rows.
create policy "Users manage their own holdings"
  on public.holdings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
