-- Purely additive: links a profile to a real auth.users session identity,
-- without touching the existing profiles.id (which many other tables FK into)
-- or any existing RLS policy. Nothing currently working is affected by this.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_auth_user_id_idx ON public.profiles(auth_user_id);
