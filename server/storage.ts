import { bancos, almacen, cosecha, transferencias, administracion, parametros, agrodata, arrime, agronomia, reparaciones, bitacora, type Banco, type InsertBanco, type Almacen, type InsertAlmacen, type Cosecha, type InsertCosecha, type Transferencia, type InsertTransferencia, type Administracion, type InsertAdministracion, type Parametros, type InsertParametros, type Agrodata, type InsertAgrodata, type Arrime, type InsertArrime, type Agronomia, type InsertAgronomia, type Reparaciones, type InsertReparaciones, type Bitacora, type InsertBitacora } from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, sql } from "drizzle-orm";

export interface IStorage {
  getAllBancos(): Promise<Banco[]>;
  createBanco(banco: InsertBanco): Promise<Banco>;
  updateBanco(id: string, banco: Partial<InsertBanco>): Promise<Banco | undefined>;
  deleteBanco(id: string): Promise<boolean>;

  getAllAlmacen(): Promise<Almacen[]>;
  getAlmacenByUnidad(unidadId: string): Promise<Almacen[]>;
  createAlmacen(registro: InsertAlmacen): Promise<Almacen>;
  updateAlmacen(id: string, registro: Partial<InsertAlmacen>): Promise<Almacen | undefined>;
  deleteAlmacen(id: string): Promise<boolean>;

  getAllParametros(): Promise<any[]>;
  createParametro(data: Record<string, any>): Promise<any>;
  updateParametro(id: string, updateData: Record<string, any>): Promise<any | undefined>;
  deleteParametro(id: string): Promise<boolean>;

  getAllCosecha(): Promise<Cosecha[]>;
  getAllTransferencias(): Promise<Transferencia[]>;
  getAllAdministracion(): Promise<any[]>;
  getAllBancosDBF(): Promise<any[]>;
  
  createCosecha(data: Record<string, any>): Promise<any>;
  createTransferencia(data: Record<string, any>): Promise<any>;
  createAdministracion(data: Record<string, any>): Promise<any>;
  
  updateCosecha(id: string, data: Record<string, any>): Promise<any | undefined>;
  updateTransferencia(id: string, data: Record<string, any>): Promise<any | undefined>;
  updateAdministracion(id: string, data: Record<string, any>): Promise<any | undefined>;
  
  deleteCosecha(id: string): Promise<boolean>;
  deleteTransferencia(id: string): Promise<boolean>;
  deleteAdministracion(id: string): Promise<boolean>;

  getAllAgrodata(): Promise<Agrodata[]>;
  createAgrodata(data: InsertAgrodata): Promise<Agrodata>;
  updateAgrodata(id: string, data: Partial<InsertAgrodata>): Promise<Agrodata | undefined>;
  deleteAgrodata(id: string): Promise<boolean>;

  getAllArrime(): Promise<Arrime[]>;
  createArrime(data: Record<string, any>): Promise<any>;
  createArrimeBatch(records: Record<string, any>[]): Promise<number>;
  updateArrime(id: string, data: Record<string, any>): Promise<any | undefined>;
  deleteArrime(id: string): Promise<boolean>;

  getAllAgronomia(): Promise<Agronomia[]>;
  createAgronomia(data: InsertAgronomia): Promise<Agronomia>;
  updateAgronomia(id: string, data: Partial<InsertAgronomia>): Promise<Agronomia | undefined>;
  deleteAgronomia(id: string): Promise<boolean>;

  getAllReparaciones(): Promise<Reparaciones[]>;
  createReparaciones(data: InsertReparaciones): Promise<Reparaciones>;
  updateReparaciones(id: string, data: Partial<InsertReparaciones>): Promise<Reparaciones | undefined>;
  deleteReparaciones(id: string): Promise<boolean>;

  getAllBitacora(): Promise<Bitacora[]>;
  createBitacora(data: InsertBitacora): Promise<Bitacora>;
  updateBitacora(id: string, data: Partial<InsertBitacora>): Promise<Bitacora | undefined>;
  deleteBitacora(id: string): Promise<boolean>;

  wipeAllData(): Promise<void>;
  wipeDataKeepParametros(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllBancos(): Promise<Banco[]> {
    return await db.select().from(bancos).orderBy(desc(bancos.fecha), desc(bancos.id));
  }

  async createBanco(insertBanco: InsertBanco): Promise<Banco> {
    const [banco] = await db.insert(bancos).values(insertBanco).returning();
    return banco;
  }

  async updateBanco(id: string, updateData: Partial<InsertBanco>): Promise<Banco | undefined> {
    const [banco] = await db.update(bancos).set(updateData).where(eq(bancos.id, id)).returning();
    return banco || undefined;
  }

  async deleteBanco(id: string): Promise<boolean> {
    const result = await db.delete(bancos).where(eq(bancos.id, id)).returning();
    return result.length > 0;
  }

  async getAllAlmacen(): Promise<Almacen[]> {
    return await db.select().from(almacen).orderBy(desc(almacen.fecha), desc(almacen.id));
  }

  async getAlmacenByUnidad(unidadId: string): Promise<Almacen[]> {
    return await db.select().from(almacen).where(eq(almacen.unidad, unidadId)).orderBy(desc(almacen.fecha));
  }

  async createAlmacen(insertRegistro: InsertAlmacen): Promise<Almacen> {
    const [registro] = await db.insert(almacen).values(insertRegistro).returning();
    return registro;
  }

  async updateAlmacen(id: string, updateData: Partial<InsertAlmacen>): Promise<Almacen | undefined> {
    const [registro] = await db.update(almacen).set(updateData).where(eq(almacen.id, id)).returning();
    return registro || undefined;
  }

  async deleteAlmacen(id: string): Promise<boolean> {
    const result = await db.delete(almacen).where(eq(almacen.id, id)).returning();
    return result.length > 0;
  }

  async wipeAllData(): Promise<void> {
    const tables = ['administracion', 'almacen', 'agrodata', 'arrime', 'bancos', 'cosecha', 'parametros', 'transferencias'];
    await this.wipeTablesData(tables);
  }

  async wipeDataKeepParametros(): Promise<void> {
    const result = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    const tables = (result.rows as any[])
      .map((r: any) => r.tablename)
      .filter((t: string) => t !== 'parametros');
    await this.wipeTablesData(tables);
  }

  async wipeTablesData(tables: string[]): Promise<void> {
    for (const table of tables) {
      try {
        await db.execute(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        console.log(`Truncated table: ${table}`);
      } catch (error) {
        console.error(`Error truncating ${table}:`, error);
        try {
          await db.execute(`DELETE FROM "${table}"`);
          console.log(`Deleted from table: ${table}`);
        } catch (deleteError) {
          console.error(`Error deleting from ${table}:`, deleteError);
        }
      }
    }
    
    console.log('Compacting tables...');
    for (const table of tables) {
      try {
        await db.execute(`VACUUM FULL "${table}"`);
        console.log(`Vacuumed table: ${table}`);
      } catch (error) {
        console.error(`Error vacuuming ${table}:`, error);
      }
    }
    console.log('Database cleanup complete');
  }

  async getAllParametros(): Promise<any[]> {
    const result = await db.execute("SELECT * FROM parametros ORDER BY tipo, nombre");
    return result.rows as any[];
  }

  async updateParametro(id: string, updateData: Record<string, any>): Promise<any | undefined> {
    const allowedFields = [
      "fecha", "tipo", "nombre", "unidad", "direccion", "telefono",
      "ced_rif", "descripcion", "habilitado", "cheque", "transferencia",
      "propietario", "operador", "valor", "cargo", "cuenta", "correo"
    ];
    
    const filteredData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in updateData) {
        filteredData[key] = updateData[key];
      }
    }
    
    if (Object.keys(filteredData).length === 0) return undefined;
    
    const [result] = await db.update(parametros)
      .set(filteredData)
      .where(eq(parametros.id, id))
      .returning();
    return result;
  }

  async createParametro(data: Record<string, any>): Promise<any> {
    const [result] = await db.insert(parametros).values(data).returning();
    return result;
  }

  async deleteParametro(id: string): Promise<boolean> {
    const result = await db.delete(parametros).where(eq(parametros.id, id)).returning();
    return result.length > 0;
  }

  async getAllCosecha(): Promise<Cosecha[]> {
    return await db.select().from(cosecha).orderBy(desc(cosecha.fecha), desc(cosecha.id));
  }

  async getAllTransferencias(): Promise<Transferencia[]> {
    return await db.select().from(transferencias).orderBy(desc(transferencias.fecha), desc(transferencias.id));
  }

  async getAllAdministracion(): Promise<any[]> {
    const result = await db.execute("SELECT * FROM administracion ORDER BY LEFT(fecha, 10) DESC, secuencia ASC");
    return result.rows as any[];
  }

  async getAllBancosDBF(): Promise<any[]> {
    const result = await db.execute("SELECT * FROM bancos ORDER BY LEFT(fecha, 10) DESC, secuencia ASC");
    return result.rows as any[];
  }

  async createCosecha(data: Record<string, any>): Promise<any> {
    const [result] = await db.insert(cosecha).values(data).returning();
    return result;
  }

  async createTransferencia(data: Record<string, any>): Promise<any> {
    const [result] = await db.insert(transferencias).values(data as any).returning();
    return result;
  }

  async createAdministracion(data: Record<string, any>): Promise<any> {
    const [result] = await db.insert(administracion).values(data as any).returning();
    return result;
  }

  async updateCosecha(id: string, data: Record<string, any>): Promise<any | undefined> {
    const [result] = await db.update(cosecha).set(data).where(eq(cosecha.id, id)).returning();
    return result;
  }

  async updateTransferencia(id: string, data: Record<string, any>): Promise<any | undefined> {
    const [result] = await db.update(transferencias).set(data).where(eq(transferencias.id, id)).returning();
    return result;
  }

  async updateAdministracion(id: string, data: Record<string, any>): Promise<any | undefined> {
    const [result] = await db.update(administracion).set(data).where(eq(administracion.id, id)).returning();
    return result;
  }

  async deleteCosecha(id: string): Promise<boolean> {
    const result = await db.delete(cosecha).where(eq(cosecha.id, id)).returning();
    return result.length > 0;
  }

  async deleteTransferencia(id: string): Promise<boolean> {
    const result = await db.delete(transferencias).where(eq(transferencias.id, id)).returning();
    return result.length > 0;
  }

  async deleteAdministracion(id: string): Promise<boolean> {
    const result = await db.delete(administracion).where(eq(administracion.id, id)).returning();
    return result.length > 0;
  }

  async getAllAgrodata(): Promise<Agrodata[]> {
    return await db.select().from(agrodata).orderBy(asc(agrodata.nombre));
  }

  async createAgrodata(insertData: InsertAgrodata): Promise<Agrodata> {
    const [record] = await db.insert(agrodata).values(insertData).returning();
    return record;
  }

  async updateAgrodata(id: string, updateData: Partial<InsertAgrodata>): Promise<Agrodata | undefined> {
    const [record] = await db.update(agrodata).set(updateData).where(eq(agrodata.id, id)).returning();
    return record || undefined;
  }

  async deleteAgrodata(id: string): Promise<boolean> {
    const result = await db.delete(agrodata).where(eq(agrodata.id, id)).returning();
    return result.length > 0;
  }

  async getAllArrime(): Promise<Arrime[]> {
    return await db.select().from(arrime).orderBy(desc(arrime.fecha), desc(arrime.id));
  }

  async createArrime(data: Record<string, any>): Promise<any> {
    const [result] = await db.insert(arrime).values(data as any).returning();
    return result;
  }

  async createArrimeBatch(records: Record<string, any>[]): Promise<number> {
    if (records.length === 0) return 0;
    const BATCH_SIZE = 1000;
    let imported = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      try {
        await db.transaction(async (tx) => {
          const result = await tx.insert(arrime).values(batch as any[]).returning();
          imported += result.length;
        });
      } catch (err) {
        for (const record of batch) {
          try {
            await db.insert(arrime).values(record as any).returning();
            imported++;
          } catch (singleErr) {
            console.error("Error importing single arrime record:", singleErr);
          }
        }
      }
    }
    return imported;
  }

  async updateArrime(id: string, data: Record<string, any>): Promise<any | undefined> {
    const [result] = await db.update(arrime).set(data).where(eq(arrime.id, id)).returning();
    return result;
  }

  async deleteArrime(id: string): Promise<boolean> {
    const result = await db.delete(arrime).where(eq(arrime.id, id)).returning();
    return result.length > 0;
  }

  async getAllAgronomia(): Promise<Agronomia[]> {
    return await db.select().from(agronomia).orderBy(desc(agronomia.fecha), desc(agronomia.id));
  }

  async createAgronomia(data: InsertAgronomia): Promise<Agronomia> {
    const [result] = await db.insert(agronomia).values(data).returning();
    return result;
  }

  async updateAgronomia(id: string, data: Partial<InsertAgronomia>): Promise<Agronomia | undefined> {
    const [result] = await db.update(agronomia).set(data).where(eq(agronomia.id, id)).returning();
    return result || undefined;
  }

  async deleteAgronomia(id: string): Promise<boolean> {
    const result = await db.delete(agronomia).where(eq(agronomia.id, id)).returning();
    return result.length > 0;
  }

  async getAllReparaciones(): Promise<Reparaciones[]> {
    return await db.select().from(reparaciones).orderBy(desc(reparaciones.fecha), desc(reparaciones.id));
  }

  async createReparaciones(data: InsertReparaciones): Promise<Reparaciones> {
    const [result] = await db.insert(reparaciones).values(data).returning();
    return result;
  }

  async updateReparaciones(id: string, data: Partial<InsertReparaciones>): Promise<Reparaciones | undefined> {
    const [result] = await db.update(reparaciones).set(data).where(eq(reparaciones.id, id)).returning();
    return result || undefined;
  }

  async deleteReparaciones(id: string): Promise<boolean> {
    const result = await db.delete(reparaciones).where(eq(reparaciones.id, id)).returning();
    return result.length > 0;
  }

  async getAllBitacora(): Promise<Bitacora[]> {
    return await db.select().from(bitacora).orderBy(desc(bitacora.fecha), desc(bitacora.id));
  }

  async createBitacora(data: InsertBitacora): Promise<Bitacora> {
    const [result] = await db.insert(bitacora).values(data).returning();
    return result;
  }

  async updateBitacora(id: string, data: Partial<InsertBitacora>): Promise<Bitacora | undefined> {
    const [result] = await db.update(bitacora).set(data).where(eq(bitacora.id, id)).returning();
    return result || undefined;
  }

  async deleteBitacora(id: string): Promise<boolean> {
    const result = await db.delete(bitacora).where(eq(bitacora.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
