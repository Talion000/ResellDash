-- Table pour les comptes en attente de validation
CREATE TABLE IF NOT EXISTS pending_users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout voir
CREATE POLICY "Service role can manage pending users"
  ON pending_users FOR ALL
  USING (true)
  WITH CHECK (true);
