DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portal' AND column_name = 'estado' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE portal ALTER COLUMN estado TYPE varchar USING CASE WHEN estado = true THEN 'activo' WHEN estado = false THEN 'suspendido' ELSE '' END;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portal' AND column_name = 'estado'
  ) THEN
    ALTER TABLE portal ADD COLUMN estado varchar;
  END IF;
END $$;
