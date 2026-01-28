import { DBFFile } from 'dbffile';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BATCH_SIZE = 500;

function sanitize(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    return val.replace(/\x00/g, '').trim() || null;
  }
  return val;
}

function toDateStr(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return null;
}

async function batchInsert(table, columns, rows) {
  if (rows.length === 0) return;
  const placeholders = rows.map((_, i) => 
    `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
  ).join(', ');
  const values = rows.flat();
  await pool.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`, values);
}

async function importAdministracion() {
  console.log('\n=== Importing ADMINISTRACION ===');
  const dbf = await DBFFile.open('attached_assets/administracion.DBF');
  console.log(`Total records: ${dbf.recordCount}`);
  
  const records = await dbf.readRecords();
  records.sort((a, b) => (a.FECHA ? new Date(a.FECHA) : new Date(0)) - (b.FECHA ? new Date(b.FECHA) : new Date(0)));
  
  const columns = ['fecha', 'tipo', 'descripcion', 'monto', 'montodol', 'unidad', 'capital', 'utility', 'formadepag', 'producto', 'cantidad', 'insumo', 'comprobante', 'proveedor', 'cliente', 'personal', 'actividad', 'propietario', 'unidaddemedida', 'relacionado', 'codigoauto', 'codrel'];
  let batch = [], count = 0;
  
  for (const r of records) {
    batch.push([toDateStr(r.FECHA), sanitize(r.TIPO), sanitize(r.DESCRIPCIO), r.MONTO, r.MONTODOL, sanitize(r.UNIDADDEPR), r.CAPITAL, r.UTILITY, sanitize(r.FORMADEPAG), sanitize(r.PRODUCTO), r.CANTIDAD, sanitize(r.INSUMO), r.COMPROBANT ? String(r.COMPROBANT) : null, sanitize(r.PROVEEDOR), sanitize(r.CLIENTE), sanitize(r.PERSONALDE), sanitize(r.ACTIVIDAD), sanitize(r.PROP), sanitize(r.UNIDADDEME), r.RELAZ, sanitize(r.CODIGOAUTO), sanitize(r.CODREL)]);
    if (batch.length >= BATCH_SIZE) { await batchInsert('administracion', columns, batch); count += batch.length; batch = []; if (count % 50000 === 0) console.log(`  ${count}...`); }
  }
  if (batch.length > 0) { await batchInsert('administracion', columns, batch); count += batch.length; }
  console.log(`  Done: ${count}`);
}

async function importParametros() {
  console.log('\n=== Importing PARAMETROS ===');
  const dbf = await DBFFile.open('attached_assets/parametros.DBF');
  console.log(`Total records: ${dbf.recordCount}`);
  const records = await dbf.readRecords();
  const columns = ['fecha', 'tipo', 'nombre', 'unidad', 'direccion', 'telefono', 'ced_rif', 'descripcion', 'habilitado', 'operador', 'unidaddemedida', 'cheque', 'transferencia', 'propietario', 'hectareas'];
  let batch = [], count = 0;
  for (const r of records) {
    batch.push([toDateStr(r.FECHA), sanitize(r.CLASE), sanitize(r.NOMBRE), sanitize(r.UNIDADDEPR), sanitize(r.DIRECCION), sanitize(r.TELEFONO), sanitize(r.CEDULA), sanitize(r.DESCRIPCIO), r.ABILITADO, sanitize(r.OPERADOR), sanitize(r.UNIDADDEME), r.CHEQUE, r.TRANS, sanitize(r.PROP), r.HECTAREAS]);
    if (batch.length >= BATCH_SIZE) { await batchInsert('parametros', columns, batch); count += batch.length; batch = []; }
  }
  if (batch.length > 0) { await batchInsert('parametros', columns, batch); count += batch.length; }
  console.log(`  Done: ${count}`);
}

async function importCheques() {
  console.log('\n=== Importing CHEQUES ===');
  const dbf = await DBFFile.open('attached_assets/cheques.DBF');
  console.log(`Total records: ${dbf.recordCount}`);
  const records = await dbf.readRecords();
  records.sort((a, b) => (a.FECHA ? new Date(a.FECHA) : new Date(0)) - (b.FECHA ? new Date(b.FECHA) : new Date(0)));
  const columns = ['fecha', 'numero', 'deuda', 'resta', 'descuento', 'monto', 'descripcion', 'banco', 'personal', 'tikets', 'proveedor', 'beneficiario', 'transferido', 'imprimido', 'norecibo', 'noendosable', 'lugar', 'utility', 'contabilizado', 'actividad', 'insumo', 'unidad', 'propietario'];
  let batch = [], count = 0;
  for (const r of records) {
    batch.push([toDateStr(r.FECHA), r.NUMERO, r.DEUDA, r.RESTA, r.DESCUENTO, r.MONTO, sanitize(r.DESCRIPCIO), sanitize(r.BANCO), sanitize(r.PERSONALDE), r.TIKETS, sanitize(r.PROVEEDOR), sanitize(r.BENEFICIAR), r.TRANSFERID, r.IMPRIMIDO, r.NORECIBO, r.NOENDOSABL, sanitize(r.LUGAR), r.UTILITY, r.CONTABILIZ, sanitize(r.ACTIVIDAD), sanitize(r.INSUMO), sanitize(r.UNIDADDEPR), sanitize(r.PROP)]);
    if (batch.length >= BATCH_SIZE) { await batchInsert('cheques', columns, batch); count += batch.length; batch = []; }
  }
  if (batch.length > 0) { await batchInsert('cheques', columns, batch); count += batch.length; }
  console.log(`  Done: ${count}`);
}

async function importAlmacen() {
  console.log('\n=== Importing ALMACEN ===');
  const dbf = await DBFFile.open('attached_assets/almacen.DBF');
  console.log(`Total records: ${dbf.recordCount}`);
  const records = await dbf.readRecords();
  records.sort((a, b) => (a.FECHA ? new Date(a.FECHA) : new Date(0)) - (b.FECHA ? new Date(b.FECHA) : new Date(0)));
  const columns = ['unidad', 'fecha', 'comprobante', 'insumo', 'unidad_medida', 'monto', 'precio', 'operacion', 'cantidad', 'descripcion', 'saldo', 'utility', 'relaz', 'codigo_auto', 'cod_rel', 'categoria', 'propietario'];
  let batch = [], count = 0;
  for (const r of records) {
    batch.push([sanitize(r.UNIDADDEPR), toDateStr(r.FECHA), r.COMPROBANT ? String(r.COMPROBANT) : null, sanitize(r.INSUMO), sanitize(r.UNIDADDEME), r.MONTO, r.PRECIO, sanitize(r.OPERACION), r.CANTIDAD, sanitize(r.DESCRIPCIO), r.SALDO, r.UTILITY, r.RELAZ, sanitize(r.CODIGOAUTO), sanitize(r.CODREL), sanitize(r.CATEGORIA), sanitize(r.PROP)]);
    if (batch.length >= BATCH_SIZE) { await batchInsert('almacen', columns, batch); count += batch.length; batch = []; }
  }
  if (batch.length > 0) { await batchInsert('almacen', columns, batch); count += batch.length; }
  console.log(`  Done: ${count}`);
}

async function importTransferencias() {
  console.log('\n=== Importing TRANSFERENCIAS ===');
  const dbf = await DBFFile.open('attached_assets/transferencias.DBF');
  console.log(`Total records: ${dbf.recordCount}`);
  const records = await dbf.readRecords();
  records.sort((a, b) => (a.FECHA ? new Date(a.FECHA) : new Date(0)) - (b.FECHA ? new Date(b.FECHA) : new Date(0)));
  const columns = ['numero', 'banco', 'fecha', 'deuda', 'resta', 'descuento', 'monto', 'descripcion', 'personal', 'proveedor', 'beneficiario', 'transferido', 'contabilizado', 'ejecutada', 'utility', 'actividad', 'insumo', 'unidad', 'propietario', 'rifced', 'numcuenta', 'email'];
  let batch = [], count = 0;
  for (const r of records) {
    batch.push([r.NUMERO, sanitize(r.BANCO), toDateStr(r.FECHA), r.DEUDA, r.RESTA, r.DESCUENTO, r.MONTO, sanitize(r.DESCRIPCIO), sanitize(r.PERSONALDE), sanitize(r.PROVEEDOR), sanitize(r.BENEFICIAR), r.TRANSFERID, r.CONTABILIZ, r.EJECUTADA, r.UTILITY, sanitize(r.ACTIVIDAD), sanitize(r.INSUMO), sanitize(r.UNIDADDEPR), sanitize(r.PROP), sanitize(r.RIFCED), sanitize(r.NUMCUENTA), sanitize(r.EMAIL)]);
    if (batch.length >= BATCH_SIZE) { await batchInsert('transferencias', columns, batch); count += batch.length; batch = []; }
  }
  if (batch.length > 0) { await batchInsert('transferencias', columns, batch); count += batch.length; }
  console.log(`  Done: ${count}`);
}

async function main() {
  console.log('Starting import...');
  try {
    await importAdministracion();
    await importParametros();
    await importCheques();
    await importAlmacen();
    await importTransferencias();
    
    const counts = await pool.query(`SELECT (SELECT COUNT(*) FROM bancos) as bancos, (SELECT COUNT(*) FROM administracion) as administracion, (SELECT COUNT(*) FROM parametros) as parametros, (SELECT COUNT(*) FROM cheques) as cheques, (SELECT COUNT(*) FROM almacen) as almacen, (SELECT COUNT(*) FROM transferencias) as transferencias`);
    console.log('\nFinal counts:', counts.rows[0]);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
