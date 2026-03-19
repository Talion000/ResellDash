-- ============================================
-- RESELL APP — SUPABASE SQL SCHEMA
-- Colle ce code dans Supabase > SQL Editor > New Query > Run
-- ============================================

-- Table catégories
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#22c55e',
  created_at timestamptz default now()
);

-- Table items
create table if not exists items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nom text not null,
  categorie text not null,
  taille_ref text,
  prix_achat numeric(10,2) not null,
  date_achat date,
  plateforme_achat text,
  prix_vente numeric(10,2),
  date_vente date,
  statut text default 'En stock' check (statut in ('En stock', 'Vendu', 'Réservé', 'En livraison')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS (Row Level Security) — chaque user voit seulement ses données
alter table categories enable row level security;
alter table items enable row level security;

create policy "Users see own categories" on categories
  for all using (auth.uid() = user_id);

create policy "Users see own items" on items
  for all using (auth.uid() = user_id);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- Catégories par défaut (insérer après signup via trigger ou manuellement)
-- Ces 3 catégories seront créées automatiquement pour chaque nouvel utilisateur
create or replace function create_default_categories()
returns trigger as $$
begin
  insert into categories (user_id, name, color) values
    (new.id, 'Sneakers', '#3b82f6'),
    (new.id, 'Pokémon', '#f97316'),
    (new.id, 'Random', '#22c55e');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function create_default_categories();
