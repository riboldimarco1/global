CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bancos_banco_fecha ON bancos (banco, SUBSTR(fecha, 1, 10));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_tipo_unidad_fecha ON administracion (tipo, unidad, SUBSTR(fecha, 1, 10));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cheques_banco_fecha ON cheques (banco, SUBSTR(fecha, 1, 10));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transferencias_banco_fecha ON transferencias (banco, SUBSTR(fecha, 1, 10));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrime_fecha ON arrime (SUBSTR(fecha, 1, 10));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cosecha_fecha_unidad ON cosecha (SUBSTR(fecha, 1, 10), unidad);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_almacen_unidad_fecha ON almacen (unidad, SUBSTR(fecha, 1, 10));
