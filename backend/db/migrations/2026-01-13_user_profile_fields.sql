-- Add missing columns and indexes for users table (Neon Postgres)
-- Safe migration: checks existence before altering

DO $$
BEGIN
  -- email nullable
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    EXECUTE 'ALTER TABLE users ALTER COLUMN email DROP NOT NULL';
  END IF;

  -- add username
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    EXECUTE 'ALTER TABLE users ADD COLUMN username VARCHAR(50)';
  END IF;

  -- add role
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    EXECUTE 'ALTER TABLE users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT ''general_user''';
  END IF;

  -- add first_name
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'first_name'
  ) THEN
    EXECUTE 'ALTER TABLE users ADD COLUMN first_name VARCHAR(100)';
  END IF;

  -- add last_name
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_name'
  ) THEN
    EXECUTE 'ALTER TABLE users ADD COLUMN last_name VARCHAR(100)';
  END IF;
END $$;

-- Unique indexes for email and username (skip if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_username_idx'
  ) THEN
    CREATE UNIQUE INDEX users_username_idx ON users (username);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_email_idx'
  ) THEN
    CREATE UNIQUE INDEX users_email_idx ON users (email);
  END IF;
END $$;

-- Role constraint to match frontend dropdown
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (
    role IN (
      'student',
      'teacher',
      'scientist',
      'journalist',
      'engineer',
      'healthcare_professional',
      'general_user'
    )
  );

