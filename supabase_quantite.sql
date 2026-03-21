-- Ajouter les colonnes quantité à la table items
ALTER TABLE items ADD COLUMN IF NOT EXISTS quantite_mode boolean default false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS quantite_total integer default 1;

-- Table pour les ventes unitaires
CREATE TABLE IF NOT EXISTS ventes_unitaires (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references items(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  prix_vente numeric(10,2) not null,
  date_vente date,
  notes text,
  created_at timestamptz default now()
);

ALTER TABLE ventes_unitaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ventes"
  ON ventes_unitaires FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Mettre à jour la contrainte de statut
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_statut_check;
ALTER TABLE items ADD CONSTRAINT items_statut_check 
  CHECK (statut IN ('Acheté', 'En livraison', 'En stock', 'Vendu', 'En retour', 'Remboursé'));
