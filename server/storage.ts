import { users, registros, centrales, type User, type InsertUser, type Registro, type InsertRegistro, type Central, type InsertCentral } from "@shared/schema";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";

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
  
  getAllCentrales(): Promise<Central[]>;
  getCentral(id: string): Promise<Central | undefined>;
  createCentral(central: InsertCentral): Promise<Central>;
  updateCentral(id: string, central: InsertCentral): Promise<Central | undefined>;
  deleteCentral(id: string): Promise<boolean>;
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
}

export const storage = new DatabaseStorage();
