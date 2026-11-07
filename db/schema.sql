create table if not exists todos (
  id text primary key,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id text primary key,
  title text not null,
  body text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_color_check check (
    color in ('slate', 'sky', 'amber', 'emerald', 'rose')
  )
);

create table if not exists weather_location (
  id integer primary key,
  lat double precision not null,
  lon double precision not null,
  label text,
  constraint weather_location_singleton check (id = 1),
  constraint weather_location_lat check (lat >= -90 and lat <= 90),
  constraint weather_location_lon check (lon >= -180 and lon <= 180)
);
