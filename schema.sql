create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  provider text not null default 'google',
  email_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  auctioneer_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  image_url text,
  start_price_paise bigint not null check (start_price_paise > 0),
  min_increment_paise bigint not null default 500 check (min_increment_paise > 0),
  current_price_paise bigint not null check (current_price_paise > 0),
  current_leader_id uuid references public.profiles(id),
  status text not null default 'countdown' check (status in ('countdown', 'live', 'ended', 'cancelled')),
  countdown_seconds integer not null default 10 check (countdown_seconds > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  winner_id uuid references public.profiles(id),
  final_price_paise bigint,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id),
  amount_paise bigint not null check (amount_paise > 0),
  status text not null default 'accepted' check (status in ('accepted', 'rejected')),
  rejection_reason text,
  client_bid_id uuid unique,
  created_at timestamptz not null default now()
);

create table if not exists public.auction_participants (
  auction_id uuid not null references public.auctions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (auction_id, user_id)
);

create index if not exists bids_auction_amount_idx on public.bids (auction_id, amount_paise desc, created_at asc);
create index if not exists auctions_status_idx on public.auctions (status, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider, email_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    'google',
    coalesce((new.email_confirmed_at is not null), false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;
alter table public.auction_participants enable row level security;

create policy "profiles readable by authenticated users" on public.profiles for select to authenticated using (true);
create policy "auctions readable by authenticated users" on public.auctions for select to authenticated using (true);
create policy "bids readable by authenticated users" on public.bids for select to authenticated using (true);
create policy "participants readable by authenticated users" on public.auction_participants for select to authenticated using (true);
