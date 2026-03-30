-- SCF/HQ Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TEAMS
-- ============================================================
create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  owner_email text unique,
  owner_google_id text unique,
  created_at timestamptz default now()
);

-- ============================================================
-- USER ROLES
-- ============================================================
create table user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid references teams(id),
  role text not null default 'owner' check (role in ('owner', 'commissioner')),
  created_at timestamptz default now(),
  unique(user_id)
);

-- ============================================================
-- PLAYERS
-- ============================================================
create table players (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  position text,
  real_world_team text,
  sport text not null check (sport in ('nfl', 'nba', 'mlb')),
  level text default 'MLB',
  mlb_stats_api_id integer,
  espn_id integer,
  created_at timestamptz default now()
);

-- ============================================================
-- CONTRACTS
-- ============================================================
create table contracts (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references players(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  sport text not null check (sport in ('nfl', 'nba', 'mlb')),
  salary integer not null,
  year1 integer,
  year2 integer,
  year3 integer,
  year4 integer,
  status text not null default 'active' check (status in ('active', 'dl', 'ir', 'sspd', 'minors', 'drafted')),
  rookie_contract boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CAP STATE
-- ============================================================
create table cap_state (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade,
  sport text not null check (sport in ('nfl', 'nba', 'mlb')),
  season integer not null default 2025,
  total_cap integer not null,
  spent integer not null default 0,
  luxury_tax_total integer default 0,
  amnesty_used boolean default false,
  unique(team_id, sport, season)
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  team_id uuid references teams(id),
  player_id uuid references players(id),
  sport text check (sport in ('nfl', 'nba', 'mlb')),
  timestamp timestamptz default now(),
  submitted_by uuid references auth.users(id),
  commissioner_approved boolean default false,
  proboards_post_id text,
  notes text,
  is_manual_entry boolean default false
);

-- ============================================================
-- FA BIDS
-- ============================================================
create table fa_bids (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references players(id),
  player_name text,
  sport text not null check (sport in ('nfl', 'nba', 'mlb')),
  bidding_team_id uuid references teams(id),
  salary integer not null,
  years integer not null check (years between 1 and 3),
  bid_time timestamptz default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'won', 'outbid', 'expired', 'cancelled')),
  corresponding_move text
);

-- ============================================================
-- RFA WINDOWS
-- ============================================================
create table rfa_windows (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references players(id),
  original_team_id uuid references teams(id),
  bidding_team_id uuid references teams(id),
  salary integer,
  years integer,
  match_deadline timestamptz,
  matched boolean default false
);

-- ============================================================
-- DRAFT PICKS
-- ============================================================
create table draft_picks (
  id uuid primary key default uuid_generate_v4(),
  original_team_id uuid references teams(id),
  current_team_id uuid references teams(id),
  sport text not null check (sport in ('nfl', 'nba', 'mlb')),
  year integer not null,
  round integer not null,
  traded boolean default false
);

-- ============================================================
-- MINORS ROSTER
-- ============================================================
create table minors_roster (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references players(id),
  team_id uuid references teams(id),
  sport text not null check (sport in ('nfl', 'nba', 'mlb')),
  list_type text not null default 'minors' check (list_type in ('minors', 'drafted')),
  added_date date default current_date
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_contracts_team on contracts(team_id);
create index idx_contracts_sport on contracts(sport);
create index idx_contracts_status on contracts(status);
create index idx_cap_state_team on cap_state(team_id);
create index idx_transactions_team on transactions(team_id);
create index idx_transactions_timestamp on transactions(timestamp desc);
create index idx_fa_bids_status on fa_bids(status);
create index idx_fa_bids_expires on fa_bids(expires_at);
create index idx_players_sport on players(sport);
create index idx_players_name on players(name);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table teams enable row level security;
alter table user_roles enable row level security;
alter table players enable row level security;
alter table contracts enable row level security;
alter table cap_state enable row level security;
alter table transactions enable row level security;
alter table fa_bids enable row level security;
alter table rfa_windows enable row level security;
alter table draft_picks enable row level security;
alter table minors_roster enable row level security;

-- Everyone can read teams, players, contracts, cap_state, transactions, fa_bids, draft_picks
create policy "Public read" on teams for select using (true);
create policy "Public read" on players for select using (true);
create policy "Public read" on contracts for select using (true);
create policy "Public read" on cap_state for select using (true);
create policy "Public read" on transactions for select using (true);
create policy "Public read" on fa_bids for select using (true);
create policy "Public read" on rfa_windows for select using (true);
create policy "Public read" on draft_picks for select using (true);
create policy "Public read" on minors_roster for select using (true);
create policy "Public read" on user_roles for select using (true);

-- Owners can only modify their own team data
create policy "Owner update contracts" on contracts for update
  using (team_id in (select team_id from user_roles where user_id = auth.uid()));

create policy "Owner insert fa_bids" on fa_bids for insert
  with check (bidding_team_id in (select team_id from user_roles where user_id = auth.uid()));

create policy "Owner insert transactions" on transactions for insert
  with check (team_id in (select team_id from user_roles where user_id = auth.uid()));

-- Commissioners can modify everything
create policy "Commissioner all on contracts" on contracts for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'commissioner'));

create policy "Commissioner all on cap_state" on cap_state for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'commissioner'));

create policy "Commissioner all on transactions" on transactions for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'commissioner'));

create policy "Commissioner all on fa_bids" on fa_bids for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'commissioner'));

create policy "Commissioner all on players" on players for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'commissioner'));

-- ============================================================
-- SEED DATA — 10 Teams
-- ============================================================
insert into teams (name) values
  ('Boston'), ('Ft. Wayne'), ('Greenville'), ('Karmiel'), ('Las Vegas'),
  ('Lufkin'), ('Oklahoma City'), ('Pittsburgh'), ('San Diego'), ('Cleveland');

-- Seed cap_state for all teams × all sports
insert into cap_state (team_id, sport, total_cap, spent)
select t.id, s.sport, s.cap, 0
from teams t
cross join (values ('nfl', 200), ('nba', 200), ('mlb', 260)) as s(sport, cap);

-- ============================================================
-- REALTIME
-- ============================================================
-- Enable realtime on key tables for live updates
alter publication supabase_realtime add table fa_bids;
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table contracts;
