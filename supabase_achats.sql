-- ============================================
-- MIGRATION : Table achats (fiches articles)
-- Colle ce code dans Supabase > SQL Editor > New Query > Run
-- ============================================

-- 1. Ajouter la colonne fiche_mode sur items
ALTER TABLE items ADD COLUMN IF NOT EXISTS fiche_mode boolean DEFAULT false;

-- 2. Créer la table achats
CREATE TABLE IF NOT EXISTS achats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  quantite integer NOT NULL DEFAULT 1,
  prix_unitaire numeric(10,2) NOT NULL,
  date_achat date,
  plateforme text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 3. RLS sur achats
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own achats" ON achats FOR ALL USING (auth.uid() = user_id);

-- 4. Ajouter achat_id sur ventes_unitaires
ALTER TABLE ventes_unitaires ADD COLUMN IF NOT EXISTS achat_id uuid REFERENCES achats(id) ON DELETE SET NULL;

-- 5. Migrer les items existants en fiche_mode (quantite_mode = true)
-- Crée un achat pour chaque item quantite_mode existant
INSERT INTO achats (user_id, item_id, quantite, prix_unitaire, date_achat, plateforme, notes)
SELECT 
  user_id,
  id,
  COALESCE(quantite_total, 1),
  prix_achat,
  date_achat,
  plateforme_achat,
  notes
FROM items
WHERE quantite_mode = true
ON CONFLICT DO NOTHING;

-- 6. Activer fiche_mode sur ces items
UPDATE items SET fiche_mode = true WHERE quantite_mode = true;

-- 7. Rattacher les ventes_unitaires existantes à leur achat migré
UPDATE ventes_unitaires vu
SET achat_id = a.id
FROM achats a
WHERE a.item_id = vu.item_id
  AND vu.achat_id IS NULL;

