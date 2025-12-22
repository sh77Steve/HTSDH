/*
  # Reset Password for sh77@att.net
  
  This migration resets the password for the user sh77@att.net to the requested password.
  Uses pgcrypto extension to properly hash the password.
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the password for sh77@att.net
UPDATE auth.users
SET 
  encrypted_password = crypt('xs@XS123', gen_salt('bf')),
  updated_at = now()
WHERE email = 'sh77@att.net';
