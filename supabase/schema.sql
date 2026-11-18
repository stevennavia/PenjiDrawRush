create table if not exists public.leaderboard_scores (
  id bigint generated always as identity primary key,
  name varchar(16) not null check (char_length(name) between 2 and 16),
  name_key varchar(16) not null unique check (char_length(name_key) between 2 and 16),
  score integer not null check (score between 0 and 10000000),
  distance integer not null check (distance between 0 and 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_scores_rank_idx
  on public.leaderboard_scores (score desc, distance desc, updated_at asc);

alter table public.leaderboard_scores enable row level security;

create or replace function public.submit_leaderboard_score(
  p_name text,
  p_name_key text,
  p_score integer,
  p_distance integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  insert into public.leaderboard_scores (name, name_key, score, distance)
  values (p_name, p_name_key, p_score, p_distance)
  on conflict (name_key) do update
    set name = excluded.name,
        score = excluded.score,
        distance = excluded.distance,
        updated_at = now()
    where excluded.score > leaderboard_scores.score
       or (excluded.score = leaderboard_scores.score
           and excluded.distance > leaderboard_scores.distance);

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on public.leaderboard_scores from anon, authenticated;
revoke all on function public.submit_leaderboard_score(text, text, integer, integer)
  from public, anon, authenticated;
