import { DBFFile } from 'dbffile';

async function analyzeDBF(filepath, name) {
  try {
    const dbf = await DBFFile.open(filepath);
    console.log(`\n=== ${name} (${dbf.recordCount} records) ===`);
    console.log(`Fields: ${dbf.fields.map(f => f.name).join(', ')}`);
  } catch (e) {
    console.error(`Error with ${name}:`, e.message);
  }
}

await analyzeDBF('attached_assets/cosecha.DBF', 'COSECHA');
await analyzeDBF('attached_assets/almacen.DBF', 'ALMACEN');
await analyzeDBF('attached_assets/cheques.DBF', 'CHEQUES');
await analyzeDBF('attached_assets/transferencias.DBF', 'TRANSFERENCIAS');
await analyzeDBF('attached_assets/parametros.DBF', 'PARAMETROS');
