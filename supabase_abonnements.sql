-- Table abonnements/charges fixes
CREATE TABLE IF NOT EXISTS abonnements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nom text not null,
  montant numeric(10,2) not null,
  actif boolean default true,
  created_at timestamptz default now()
);

ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own abonnements"
  ON abonnements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
