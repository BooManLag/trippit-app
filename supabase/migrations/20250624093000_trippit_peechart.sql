-- Create city_visits table
create extension if not exists "uuid-ossp";

create table if not exists city_visits (
  id uuid primary key default uuid_generate_v4(),
  city text not null,
  country text not null,
  trip_count int not null default 1,
  updated_at timestamptz default now(),
  unique (city, country)
);

-- Function to increment visit count
create or replace function increment_city_visit(p_city text, p_country text)
returns city_visits as $$
declare rec city_visits;
begin
  insert into city_visits (city, country, trip_count)
  values (p_city, p_country, 1)
  on conflict (city, country)
  do update set trip_count = city_visits.trip_count + 1,
               updated_at = now()
  returning * into rec;
  return rec;
end;
$$ language plpgsql;

