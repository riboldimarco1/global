import { users, registros, centrales, fincas, type User, type InsertUser, type Registro, type InsertRegistro, type Central, type InsertCentral, type Finca, type InsertFinca } from "@shared/schema";
import { db } from "./db";
import { eq, asc, and, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllRegistros(): Promise<Registro[]>;
  getRegistro(id: string): Promise<Registro | undefined>;
  createRegistro(registro: InsertRegistro): Promise<Registro>;
  updateRegistro(id: string, registro: InsertRegistro): Promise<Registro | undefined>;
  deleteRegistro(id: string): Promise<boolean>;
  deleteAllRegistros(): Promise<void>;
  deleteRegistrosByDatesAndCentral(dates: string[], central: string): Promise<number>;
  getExistingRemesas(): Promise<string[]>;
  
  getAllCentrales(): Promise<Central[]>;
  getCentral(id: string): Promise<Central | undefined>;
  createCentral(central: InsertCentral): Promise<Central>;
  updateCentral(id: string, central: InsertCentral): Promise<Central | undefined>;
  deleteCentral(id: string): Promise<boolean>;

  getAllFincas(): Promise<Finca[]>;
  getFinca(id: string): Promise<Finca | undefined>;
  createFinca(finca: InsertFinca): Promise<Finca>;
  updateFinca(id: string, finca: InsertFinca): Promise<Finca | undefined>;
  deleteFinca(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
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
    return result
      .map(r => r.remesa)
      .filter((r): r is string => r !== null && r !== undefined && r.trim() !== "");
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
}

export const storage = new DatabaseStorage();
