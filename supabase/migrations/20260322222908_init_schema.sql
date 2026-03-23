create extension if not exists "pgcrypto";

-- 1. contributors
create table contributors (
  id              uuid primary key default gen_random_uuid(),
  github_username varchar not null unique,
  display_name    varchar,
  role            varchar not null default 'contributor' check (role in ('contributor','reviewer','moderator','admin')),
  reputation      integer not null default 0,
  joined_at       timestamp with time zone default now()
);

-- 2. politicians
create table politicians (
  id             uuid primary key default gen_random_uuid(),
  slug           varchar not null unique,
  full_name      varchar not null,
  photo_url      text,
  party          varchar not null,
  role           text not null,
  level          varchar not null check (level in ('Gouvernement','Parlement','Régional','Local','Européen')),
  mandate_start  date not null,
  mandate_end    date,
  status         varchar not null default 'active' check (status in ('active','inactive','archived')),
  created_at     timestamp with time zone default now(),
  updated_at     timestamp with time zone default now()
);

-- 3. scores
create table scores (
  id               uuid primary key default gen_random_uuid(),
  politician_id    uuid not null references politicians(id) on delete cascade,
  score_corruption char(1) not null check (score_corruption in ('A','B','C','D','E')),
  score_lies       char(1) not null check (score_lies in ('A','B','C','D','E')),
  score_conflicts  char(1) not null check (score_conflicts in ('A','B','C','D','E')),
  score_general    char(1) not null check (score_general in ('A','B','C','D','E')),
  methodology_note text,
  version          integer not null default 1,
  scored_by        uuid references contributors(id),
  scored_at        timestamp with time zone default now()
);

-- 4. affairs
create table affairs (
  id              uuid primary key default gen_random_uuid(),
  politician_id   uuid not null references politicians(id) on delete cascade,
  title           varchar not null,
  description     text not null,
  severity        varchar not null check (severity in ('condamne','mis_en_examen','inculpe','soupcon','classe')),
  judicial_status varchar,
  date_start      date,
  date_end        date,
  is_active       boolean not null default true,
  submitted_by    uuid references contributors(id),
  review_status   varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at      timestamp with time zone default now()
);

-- 5. lies
create table lies (
  id                   uuid primary key default gen_random_uuid(),
  politician_id        uuid not null references politicians(id) on delete cascade,
  title                varchar not null,
  statement_original   text not null,
  statement_correction text not null,
  severity             varchar not null check (severity in ('avere','etabli','probable','nuance')),
  date_declared        date,
  fact_check_org       varchar,
  submitted_by         uuid references contributors(id),
  review_status        varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at           timestamp with time zone default now()
);

-- 6. conflicts
create table conflicts (
  id              uuid primary key default gen_random_uuid(),
  politician_id   uuid not null references politicians(id) on delete cascade,
  title           varchar not null,
  description     text not null,
  severity        varchar not null check (severity in ('avere','soupcon','potentiel')),
  conflict_type   varchar not null check (conflict_type in ('financier','familial','professionnel','actionariat')),
  declared_hatvp  boolean not null default false,
  submitted_by    uuid references contributors(id),
  review_status   varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at      timestamp with time zone default now()
);

-- 7. sources
create table sources (
  id               uuid primary key default gen_random_uuid(),
  linked_id        uuid not null,
  linked_type      varchar not null check (linked_type in ('affair','lie','conflict')),
  label            varchar not null,
  url              text not null,
  source_type      varchar not null check (source_type in ('presse','legal','officiel','hatvp','parquet','autre')),
  media_name       varchar,
  publication_date date,
  is_legal_doc     boolean not null default false,
  is_verified      boolean not null default false
);

-- 8. contributions
create table contributions (
  id                uuid primary key default gen_random_uuid(),
  contributor_id    uuid references contributors(id),
  politician_id     uuid not null references politicians(id) on delete cascade,
  contribution_type varchar not null check (contribution_type in ('affair','lie','conflict','score_update','new_politician')),
  payload           jsonb not null,
  status            varchar not null default 'pending' check (status in ('pending','in_review','approved','rejected')),
  upvotes           integer not null default 0,
  downvotes         integer not null default 0,
  rejection_reason  text,
  submitted_at      timestamp with time zone default now(),
  reviewed_at       timestamp with time zone
);

-- 9. reviews
create table reviews (
  id              uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references contributions(id) on delete cascade,
  reviewer_id     uuid not null references contributors(id),
  vote            varchar not null check (vote in ('up','down','flag')),
  comment         text,
  voted_at        timestamp with time zone default now(),
  unique (contribution_id, reviewer_id)
);

-- 10. audit_log
create table audit_log (
  id             uuid primary key default gen_random_uuid(),
  contributor_id uuid references contributors(id),
  action         varchar not null check (action in ('insert','update','delete','approve','reject')),
  table_name     varchar not null,
  record_id      uuid not null,
  old_value      jsonb,
  new_value      jsonb,
  logged_at      timestamp with time zone default now()
);

-- Trigger : updated_at automatique sur politicians
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger politicians_updated_at
  before update on politicians
  for each row execute function update_updated_at();

-- Trigger : audit_log automatique sur les tables principales
create or replace function audit_trigger()
returns trigger as $$
begin
  insert into audit_log (action, table_name, record_id, old_value, new_value)
  values (
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP = 'INSERT' then null else to_jsonb(old) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger audit_affairs   after insert or update or delete on affairs   for each row execute function audit_trigger();
create trigger audit_lies      after insert or update or delete on lies      for each row execute function audit_trigger();
create trigger audit_conflicts after insert or update or delete on conflicts for each row execute function audit_trigger();
create trigger audit_scores    after insert or update or delete on scores    for each row execute function audit_trigger();

-- Index pour les performances
create index on politicians(slug);
create index on politicians(level);
create index on politicians(status);
create index on scores(politician_id);
create index on affairs(politician_id);
create index on lies(politician_id);
create index on conflicts(politician_id);
create index on contributions(status);
create index on contributions(politician_id);
create index on sources(linked_id, linked_type);