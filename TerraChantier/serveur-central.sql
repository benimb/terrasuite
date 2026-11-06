-- TerraSuite : serveur central (Supabase). À exécuter une fois dans le projet Supabase TerraSuite (SQL Editor), puis à chaque mise à jour de ce fichier.
-- Comptes (e-mail, mot de passe) rattachés à une agence ; bibliothèque privée de l'agence (tc_items, tc-blobs) ; base commune anonymisée (ts_commun).
-- Le fichier peut être relancé sans perte de données.

create extension if not exists pgcrypto;

-- ===================== Agences et profils =====================
create table if not exists public.ts_agences (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code_invit text unique not null default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at timestamptz not null default now());
create table if not exists public.ts_profils (
  user_id uuid primary key references auth.users on delete cascade,
  agence_id uuid references public.ts_agences on delete set null,
  nom text, role text not null default 'membre',
  cgu_at timestamptz, created_at timestamptz not null default now());

create or replace function public.ts_mon_agence() returns uuid language sql stable security definer set search_path = public as
$$ select agence_id from public.ts_profils where user_id = auth.uid() $$;

alter table public.ts_agences enable row level security;
alter table public.ts_profils enable row level security;
drop policy if exists ts_agences_lire on public.ts_agences;
create policy ts_agences_lire on public.ts_agences for select to authenticated using (id = public.ts_mon_agence());
drop policy if exists ts_profils_lire on public.ts_profils;
create policy ts_profils_lire on public.ts_profils for select to authenticated using (user_id = auth.uid() or agence_id = public.ts_mon_agence());
drop policy if exists ts_profils_nom on public.ts_profils;
create policy ts_profils_nom on public.ts_profils for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and agence_id is not distinct from public.ts_mon_agence());

-- création d'une agence (le créateur en devient l'administrateur) et adhésion par code d'invitation ; acceptation des conditions de la base commune
create or replace function public.ts_creer_agence(p_nom text, p_user text) returns uuid language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  insert into ts_agences (nom) values (trim(p_nom)) returning id into a;
  insert into ts_profils (user_id, agence_id, nom, role, cgu_at) values (auth.uid(), a, trim(p_user), 'admin', now())
    on conflict (user_id) do update set agence_id = a, nom = excluded.nom, role = 'admin', cgu_at = now();
  return a;
end $$;
create or replace function public.ts_rejoindre_agence(p_code text, p_user text) returns uuid language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  select id into a from ts_agences where code_invit = upper(trim(p_code));
  if a is null then raise exception 'code d''invitation inconnu'; end if;
  insert into ts_profils (user_id, agence_id, nom, role, cgu_at) values (auth.uid(), a, trim(p_user), 'membre', now())
    on conflict (user_id) do update set agence_id = a, nom = excluded.nom, cgu_at = now();
  -- premier membre d'une agence : administrateur
  if not exists (select 1 from ts_profils where agence_id = a and role = 'admin') then update ts_profils set role = 'admin' where user_id = auth.uid(); end if;
  return a;
end $$;
create or replace function public.ts_renommer_agence(p_nom text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from ts_profils where user_id = auth.uid() and role = 'admin') then raise exception 'réservé à l''administrateur de l''agence'; end if;
  update ts_agences set nom = trim(p_nom) where id = public.ts_mon_agence();
end $$;

-- ===================== Bibliothèque de l'agence (TerraChantier, TerraContacts : projets, contacts, chantiers) =====================
create table if not exists public.tc_items (
  id uuid not null, store text not null, chantier_id uuid, data jsonb not null,
  updated_at timestamptz not null, deleted boolean not null default false, server_at timestamptz not null default now());
alter table public.tc_items add column if not exists agence_id uuid;
-- données déjà présentes (ancien serveur d'agence repris comme serveur central) : rangées dans une agence « données existantes » ;
-- son code d'invitation s'affiche ci-dessous (select) : le premier à la rejoindre en devient l'administrateur et peut la renommer
do $$ declare a uuid; begin
  if exists (select 1 from public.tc_items where agence_id is null) then
    select id into a from public.ts_agences where nom = 'Agence (données existantes)' limit 1;
    if a is null then insert into public.ts_agences (nom) values ('Agence (données existantes)') returning id into a; end if;
    update public.tc_items set agence_id = a where agence_id is null;
  end if; end $$;
alter table public.tc_items alter column agence_id set default public.ts_mon_agence();
-- clé : (agence, identifiant) : deux agences peuvent avoir un projet de même code sans se gêner
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'tc_items_pkey' and conrelid = 'public.tc_items'::regclass
             and array_length(conkey, 1) = 1) then alter table public.tc_items drop constraint tc_items_pkey; end if;
  if not exists (select 1 from pg_constraint where conname = 'tc_items_pkey' and conrelid = 'public.tc_items'::regclass) then
    alter table public.tc_items add constraint tc_items_pkey primary key (agence_id, id); end if;
end $$;
create index if not exists tc_items_server_at on public.tc_items (agence_id, server_at);
create or replace function public.tc_touch() returns trigger language plpgsql as $$ begin new.server_at := clock_timestamp(); return new; end $$;
drop trigger if exists tc_touch on public.tc_items;
create trigger tc_touch before insert or update on public.tc_items for each row execute function public.tc_touch();
alter table public.tc_items enable row level security;
drop policy if exists tc_team on public.tc_items;
drop policy if exists tc_agence on public.tc_items;
create policy tc_agence on public.tc_items for all to authenticated using (agence_id = public.ts_mon_agence()) with check (agence_id = public.ts_mon_agence());

-- photos et plans : visibles des seuls membres de l'agence de la personne qui les a envoyés ; jamais dans la base commune
insert into storage.buckets (id, name, public) values ('tc-blobs', 'tc-blobs', false) on conflict (id) do nothing;
drop policy if exists tc_blobs_team on storage.objects;
drop policy if exists tc_blobs_agence on storage.objects;
create policy tc_blobs_agence on storage.objects for all to authenticated
  using (bucket_id = 'tc-blobs' and (owner = auth.uid() or exists (select 1 from public.ts_profils x where x.user_id = owner and x.agence_id = public.ts_mon_agence())))
  with check (bucket_id = 'tc-blobs' and public.ts_mon_agence() is not null);

-- ===================== Base commune (anonymisée) =====================
-- genre : projet, dpgf, estimation, cctp, planning, faisa, produits. L'agence qui contribue n'est jamais visible des autres.
create table if not exists public.ts_commun (
  id text primary key, genre text not null, dept text, loc numeric, type_ouvrage text, nature text, phase text, mois text, surface numeric,
  data jsonb not null, agence_id uuid not null, contributeur uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists ts_commun_genre on public.ts_commun (genre, dept, type_ouvrage);
alter table public.ts_commun enable row level security;
drop policy if exists ts_commun_miens on public.ts_commun;
create policy ts_commun_miens on public.ts_commun for select to authenticated using (agence_id = public.ts_mon_agence());
-- lecture pour tous les comptes, sans l'agence ni le contributeur
create or replace view public.ts_commun_public as
  select id, genre, dept, loc, type_ouvrage, nature, phase, mois, surface, data, updated_at from public.ts_commun;
revoke all on public.ts_commun_public from anon;
grant select on public.ts_commun_public to authenticated;

-- envoi : un élément nouveau est enregistré ; un élément déjà présent n'est mis à jour que par l'agence qui l'a apporté
-- (les données de départ communes à tous les postes ne sont comptées qu'une fois)
create or replace function public.ts_contribuer(p_items jsonb) returns integer language plpgsql security definer set search_path = public as $$
declare a uuid := public.ts_mon_agence(); it jsonb; n integer := 0;
begin
  if a is null then raise exception 'compte sans agence'; end if;
  if not exists (select 1 from ts_profils where user_id = auth.uid() and cgu_at is not null) then raise exception 'conditions de la base commune non acceptées'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    insert into ts_commun (id, genre, dept, loc, type_ouvrage, nature, phase, mois, surface, data, agence_id, contributeur)
    values (it->>'id', it->>'genre', nullif(it->>'dept', ''), (it->>'loc')::numeric, nullif(it->>'type_ouvrage', ''), nullif(it->>'nature', ''),
            nullif(it->>'phase', ''), nullif(it->>'mois', ''), (it->>'surface')::numeric, coalesce(it->'data', '{}'::jsonb), a, auth.uid())
    on conflict (id) do update set dept = excluded.dept, loc = excluded.loc, type_ouvrage = excluded.type_ouvrage, nature = excluded.nature,
      phase = excluded.phase, mois = excluded.mois, surface = excluded.surface, data = excluded.data, updated_at = now()
      where ts_commun.agence_id = a;
    n := n + 1;
  end loop;
  return n;
end $$;
create or replace function public.ts_commun_stats() returns jsonb language sql stable security definer set search_path = public as
$$ select coalesce(jsonb_object_agg(genre, n), '{}'::jsonb) from (select genre, count(*) n from ts_commun group by genre) s $$;

revoke execute on function public.ts_contribuer(jsonb), public.ts_commun_stats(), public.ts_creer_agence(text, text), public.ts_rejoindre_agence(text, text), public.ts_renommer_agence(text) from anon, public;
grant execute on function public.ts_contribuer(jsonb), public.ts_commun_stats(), public.ts_creer_agence(text, text), public.ts_rejoindre_agence(text, text), public.ts_renommer_agence(text), public.ts_mon_agence() to authenticated;

-- code d'invitation de l'agence des données existantes, le cas échéant
select nom, code_invit from public.ts_agences where nom = 'Agence (données existantes)';
