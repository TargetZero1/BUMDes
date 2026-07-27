
-- Create a trigger to auto-confirm emails on signup (development/testing)
CREATE OR REPLACE FUNCTION private.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS auto_confirm_email_on_signup ON auth.users;

-- Create the trigger
CREATE TRIGGER auto_confirm_email_on_signup
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.auto_confirm_email();

-- Also confirm any existing unconfirmed users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
