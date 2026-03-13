DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transferencias' AND column_name = 'contabilizado'
  ) THEN
    ALTER TABLE transferencias RENAME COLUMN contabilizado TO contbanco;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transferencias' AND column_name = 'contbanco'
  ) THEN
    ALTER TABLE transferencias ADD COLUMN contbanco boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transferencias' AND column_name = 'contadmin'
  ) THEN
    ALTER TABLE transferencias ADD COLUMN contadmin boolean;
  END IF;
END $$;
