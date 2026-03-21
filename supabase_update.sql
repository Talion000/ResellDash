-- Ajouter la colonne image_url à la table items
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_url text;

-- Créer le bucket storage pour les images
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour que les utilisateurs puissent uploader leurs images
CREATE POLICY "Users can upload item images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'item-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Item images are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

CREATE POLICY "Users can delete own item images"
ON storage.objects FOR DELETE
USING (bucket_id = 'item-images' AND auth.uid() IS NOT NULL);
