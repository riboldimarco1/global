import { DBFFile } from 'dbffile';

async function analyzeDBF(filepath, name) {
  try {
    const dbf = await DBFFile.open(filepath);
    console.log(`\n=== ${name} ===`);
    console.log(`Records: ${dbf.recordCount}`);
    console.log(`Fields:`);
    dbf.fields.forEach(f => {
      console.log(`  ${f.name}: ${f.type} (${f.size})`);
    });
    
    // Sample first 3 records
    const records = await dbf.readRecords(3);
    console.log(`\nSample records:`);
    records.forEach((r, i) => {
      console.log(`  Record ${i}:`, JSON.stringify(r).substring(0, 300));
    });
  } catch (e) {
    console.error(`Error with ${name}:`, e.message);
  }
}

await analyzeDBF('attached_assets/bancos.DBF', 'BANCOS');
await analyzeDBF('attached_assets/administracion.DBF', 'ADMINISTRACION');
