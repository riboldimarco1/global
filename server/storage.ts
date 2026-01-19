import { users, registros, centrales, fincas, backups, fincasFinanza, pagosFinanza, unidadesProduccion, type User, type InsertUser, type Registro, type InsertRegistro, type Central, type InsertCentral, type Finca, type InsertFinca, type Backup, type InsertBackup, type FincaFinanza, type InsertFincaFinanza, type PagoFinanza, type InsertPagoFinanza, type UnidadProduccion, type InsertUnidadProduccion } from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, and, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllUnidadesProduccion(): Promise<UnidadProduccion[]>;
  getUnidadProduccion(id: string): Promise<UnidadProduccion | undefined>;
  createUnidadProduccion(unidad: InsertUnidadProduccion): Promise<UnidadProduccion>;
  updateUnidadProduccion(id: string, unidad: Partial<InsertUnidadProduccion>): Promise<UnidadProduccion | undefined>;
  deleteUnidadProduccion(id: string): Promise<boolean>;
  
  getAllRegistros(): Promise<Registro[]>;
  getRegistro(id: string): Promise<Registro | undefined>;
  createRegistro(registro: InsertRegistro): Promise<Registro>;
  updateRegistro(id: string, registro: InsertRegistro): Promise<Registro | undefined>;
  deleteRegistro(id: string): Promise<boolean>;
  deleteAllRegistros(): Promise<void>;
  deleteRegistrosByDatesAndCentral(dates: string[], central: string): Promise<number>;
  getExistingRemesas(): Promise<string[]>;
  getRegistrosWithRemesas(): Promise<{ id: string; remesa: string }[]>;
  deleteRegistrosByIds(ids: string[]): Promise<number>;
  capitalizeAllRegistros(): Promise<number>;
  
  getAllCentrales(): Promise<Central[]>;
  getCentral(id: string): Promise<Central | undefined>;
  createCentral(central: InsertCentral): Promise<Central>;
  updateCentral(id: string, central: InsertCentral): Promise<Central | undefined>;
  deleteCentral(id: string): Promise<boolean>;
  deleteAllCentrales(): Promise<void>;

  getAllFincas(): Promise<Finca[]>;
  getFinca(id: string): Promise<Finca | undefined>;
  createFinca(finca: InsertFinca): Promise<Finca>;
  updateFinca(id: string, finca: InsertFinca): Promise<Finca | undefined>;
  deleteFinca(id: string): Promise<boolean>;
  deleteAllFincas(): Promise<void>;

  getAllBackups(): Promise<Backup[]>;
  getBackup(id: string): Promise<Backup | undefined>;
  createBackup(backup: InsertBackup): Promise<Backup>;
  deleteBackup(id: string): Promise<boolean>;

  getAllFincasFinanza(): Promise<FincaFinanza[]>;
  getFincaFinanza(id: string): Promise<FincaFinanza | undefined>;
  createFincaFinanza(finca: InsertFincaFinanza): Promise<FincaFinanza>;
  updateFincaFinanza(id: string, finca: Partial<InsertFincaFinanza>): Promise<FincaFinanza | undefined>;
  deleteFincaFinanza(id: string): Promise<boolean>;

  getAllPagosFinanza(): Promise<PagoFinanza[]>;
  getPagoFinanza(id: string): Promise<PagoFinanza | undefined>;
  createPagoFinanza(pago: InsertPagoFinanza): Promise<PagoFinanza>;
  updatePagoFinanza(id: string, pago: Partial<InsertPagoFinanza>): Promise<PagoFinanza | undefined>;
  deletePagoFinanza(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getAllUnidadesProduccion(): Promise<UnidadProduccion[]> {
    return await db.select().from(unidadesProduccion).orderBy(asc(unidadesProduccion.orden), asc(unidadesProduccion.nombre));
  }

  async getUnidadProduccion(id: string): Promise<UnidadProduccion | undefined> {
    const [unidad] = await db.select().from(unidadesProduccion).where(eq(unidadesProduccion.id, id));
    return unidad || undefined;
  }

  async createUnidadProduccion(insertUnidad: InsertUnidadProduccion): Promise<UnidadProduccion> {
    const [unidad] = await db
      .insert(unidadesProduccion)
      .values(insertUnidad)
      .returning();
    return unidad;
  }

  async updateUnidadProduccion(id: string, updateData: Partial<InsertUnidadProduccion>): Promise<UnidadProduccion | undefined> {
    const [unidad] = await db
      .update(unidadesProduccion)
      .set(updateData)
      .where(eq(unidadesProduccion.id, id))
      .returning();
    return unidad || undefined;
  }

  async deleteUnidadProduccion(id: string): Promise<boolean> {
    const result = await db.delete(unidadesProduccion).where(eq(unidadesProduccion.id, id)).returning();
    return result.length > 0;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllRegistros(): Promise<Registro[]> {
    return await db.select().from(registros).orderBy(asc(registros.fecha));
  }

  async getRegistro(id: string): Promise<Registro | undefined> {
    const [registro] = await db.select().from(registros).where(eq(registros.id, id));
    return registro || undefined;
  }

  async createRegistro(insertRegistro: InsertRegistro): Promise<Registro> {
    const [registro] = await db
      .insert(registros)
      .values(insertRegistro)
      .returning();
    return registro;
  }

  async updateRegistro(id: string, updateData: InsertRegistro): Promise<Registro | undefined> {
    const [registro] = await db
      .update(registros)
      .set(updateData)
      .where(eq(registros.id, id))
      .returning();
    return registro || undefined;
  }

  async deleteRegistro(id: string): Promise<boolean> {
    const result = await db.delete(registros).where(eq(registros.id, id)).returning();
    return result.length > 0;
  }

  async deleteAllRegistros(): Promise<void> {
    await db.delete(registros);
  }

  async deleteRegistrosByDatesAndCentral(dates: string[], central: string): Promise<number> {
    if (dates.length === 0) return 0;
    const result = await db
      .delete(registros)
      .where(and(
        inArray(registros.fecha, dates),
        eq(registros.central, central)
      ))
      .returning();
    return result.length;
  }

  async getExistingRemesas(): Promise<string[]> {
    const result = await db.select({ remesa: registros.remesa }).from(registros);
    const allRemesas: string[] = [];
    for (const r of result) {
      if (r.remesa && r.remesa.trim()) {
        const parts = r.remesa.split(",").map(p => p.trim()).filter(p => p !== "");
        allRemesas.push(...parts);
      }
    }
    return allRemesas;
  }

  async getRegistrosWithRemesas(): Promise<{ id: string; remesa: string }[]> {
    const result = await db.select({ id: registros.id, remesa: registros.remesa }).from(registros);
    return result.filter(r => r.remesa && r.remesa.trim()).map(r => ({ id: r.id, remesa: r.remesa! }));
  }

  async deleteRegistrosByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(registros).where(inArray(registros.id, ids)).returning();
    return result.length;
  }

  async capitalizeAllRegistros(): Promise<number> {
    const allRegistros = await db.select().from(registros);
    let updatedCount = 0;
    
    const capitalizeWords = (str: string | null): string | null => {
      if (!str) return str;
      return str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    for (const registro of allRegistros) {
      const newCentral = capitalizeWords(registro.central);
      const newFinca = capitalizeWords(registro.finca);
      
      if (newCentral !== registro.central || newFinca !== registro.finca) {
        await db
          .update(registros)
          .set({ central: newCentral!, finca: newFinca })
          .where(eq(registros.id, registro.id));
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  async getAllCentrales(): Promise<Central[]> {
    return await db.select().from(centrales).orderBy(asc(centrales.orden), asc(centrales.nombre));
  }

  async getCentral(id: string): Promise<Central | undefined> {
    const [central] = await db.select().from(centrales).where(eq(centrales.id, id));
    return central || undefined;
  }

  async createCentral(insertCentral: InsertCentral): Promise<Central> {
    const [central] = await db
      .insert(centrales)
      .values(insertCentral)
      .returning();
    return central;
  }

  async updateCentral(id: string, updateData: InsertCentral): Promise<Central | undefined> {
    const [central] = await db
      .update(centrales)
      .set(updateData)
      .where(eq(centrales.id, id))
      .returning();
    return central || undefined;
  }

  async deleteCentral(id: string): Promise<boolean> {
    const result = await db.delete(centrales).where(eq(centrales.id, id)).returning();
    return result.length > 0;
  }

  async deleteAllCentrales(): Promise<void> {
    await db.delete(centrales);
  }

  async getAllFincas(): Promise<Finca[]> {
    return await db.select().from(fincas).orderBy(asc(fincas.orden), asc(fincas.nombre));
  }

  async getFinca(id: string): Promise<Finca | undefined> {
    const [finca] = await db.select().from(fincas).where(eq(fincas.id, id));
    return finca || undefined;
  }

  async createFinca(insertFinca: InsertFinca): Promise<Finca> {
    const [finca] = await db
      .insert(fincas)
      .values(insertFinca)
      .returning();
    return finca;
  }

  async updateFinca(id: string, updateData: InsertFinca): Promise<Finca | undefined> {
    const [finca] = await db
      .update(fincas)
      .set(updateData)
      .where(eq(fincas.id, id))
      .returning();
    return finca || undefined;
  }

  async deleteFinca(id: string): Promise<boolean> {
    const result = await db.delete(fincas).where(eq(fincas.id, id)).returning();
    return result.length > 0;
  }

  async deleteAllFincas(): Promise<void> {
    await db.delete(fincas);
  }

  async getAllBackups(): Promise<Backup[]> {
    return await db.select().from(backups).orderBy(desc(backups.fecha));
  }

  async getBackup(id: string): Promise<Backup | undefined> {
    const [backup] = await db.select().from(backups).where(eq(backups.id, id));
    return backup || undefined;
  }

  async createBackup(insertBackup: InsertBackup): Promise<Backup> {
    const [backup] = await db
      .insert(backups)
      .values(insertBackup)
      .returning();
    return backup;
  }

  async deleteBackup(id: string): Promise<boolean> {
    const result = await db.delete(backups).where(eq(backups.id, id)).returning();
    return result.length > 0;
  }

  async getAllFincasFinanza(): Promise<FincaFinanza[]> {
    return await db.select().from(fincasFinanza).orderBy(asc(fincasFinanza.nombre));
  }

  async getFincaFinanza(id: string): Promise<FincaFinanza | undefined> {
    const [finca] = await db.select().from(fincasFinanza).where(eq(fincasFinanza.id, id));
    return finca || undefined;
  }

  async createFincaFinanza(insertFinca: InsertFincaFinanza): Promise<FincaFinanza> {
    const [finca] = await db
      .insert(fincasFinanza)
      .values(insertFinca)
      .returning();
    return finca;
  }

  async updateFincaFinanza(id: string, updateData: Partial<InsertFincaFinanza>): Promise<FincaFinanza | undefined> {
    const [finca] = await db
      .update(fincasFinanza)
      .set(updateData)
      .where(eq(fincasFinanza.id, id))
      .returning();
    return finca || undefined;
  }

  async deleteFincaFinanza(id: string): Promise<boolean> {
    const result = await db.delete(fincasFinanza).where(eq(fincasFinanza.id, id)).returning();
    return result.length > 0;
  }

  async getAllPagosFinanza(): Promise<PagoFinanza[]> {
    return await db.select().from(pagosFinanza).orderBy(desc(pagosFinanza.fecha));
  }

  async getPagoFinanza(id: string): Promise<PagoFinanza | undefined> {
    const [pago] = await db.select().from(pagosFinanza).where(eq(pagosFinanza.id, id));
    return pago || undefined;
  }

  async createPagoFinanza(insertPago: InsertPagoFinanza): Promise<PagoFinanza> {
    const [pago] = await db
      .insert(pagosFinanza)
      .values(insertPago)
      .returning();
    return pago;
  }

  async updatePagoFinanza(id: string, updateData: Partial<InsertPagoFinanza>): Promise<PagoFinanza | undefined> {
    const [pago] = await db
      .update(pagosFinanza)
      .set(updateData)
      .where(eq(pagosFinanza.id, id))
      .returning();
    return pago || undefined;
  }

  async deletePagoFinanza(id: string): Promise<boolean> {
    const result = await db.delete(pagosFinanza).where(eq(pagosFinanza.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
