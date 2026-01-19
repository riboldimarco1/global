import { users, registros, centrales, fincas, backups, fincasFinanza, pagosFinanza, unidadesProduccion, actividades, clientes, insumos, personal, productos, proveedores, bancos, operacionesBancarias, type User, type InsertUser, type Registro, type InsertRegistro, type Central, type InsertCentral, type Finca, type InsertFinca, type Backup, type InsertBackup, type FincaFinanza, type InsertFincaFinanza, type PagoFinanza, type InsertPagoFinanza, type UnidadProduccion, type InsertUnidadProduccion, type Actividad, type InsertActividad, type Cliente, type InsertCliente, type Insumo, type InsertInsumo, type Personal, type InsertPersonal, type Producto, type InsertProducto, type Proveedor, type InsertProveedor, type Banco, type InsertBanco, type OperacionBancaria, type InsertOperacionBancaria } from "@shared/schema";
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

  getAllActividades(): Promise<Actividad[]>;
  createActividad(actividad: InsertActividad): Promise<Actividad>;
  updateActividad(id: string, actividad: Partial<InsertActividad>): Promise<Actividad | undefined>;
  deleteActividad(id: string): Promise<boolean>;

  getAllClientes(): Promise<Cliente[]>;
  createCliente(cliente: InsertCliente): Promise<Cliente>;
  updateCliente(id: string, cliente: Partial<InsertCliente>): Promise<Cliente | undefined>;
  deleteCliente(id: string): Promise<boolean>;

  getAllInsumos(): Promise<Insumo[]>;
  createInsumo(insumo: InsertInsumo): Promise<Insumo>;
  updateInsumo(id: string, insumo: Partial<InsertInsumo>): Promise<Insumo | undefined>;
  deleteInsumo(id: string): Promise<boolean>;

  getAllPersonal(): Promise<Personal[]>;
  createPersonal(persona: InsertPersonal): Promise<Personal>;
  updatePersonal(id: string, persona: Partial<InsertPersonal>): Promise<Personal | undefined>;
  deletePersonal(id: string): Promise<boolean>;

  getAllProductos(): Promise<Producto[]>;
  createProducto(producto: InsertProducto): Promise<Producto>;
  updateProducto(id: string, producto: Partial<InsertProducto>): Promise<Producto | undefined>;
  deleteProducto(id: string): Promise<boolean>;

  getAllProveedores(): Promise<Proveedor[]>;
  createProveedor(proveedor: InsertProveedor): Promise<Proveedor>;
  updateProveedor(id: string, proveedor: Partial<InsertProveedor>): Promise<Proveedor | undefined>;
  deleteProveedor(id: string): Promise<boolean>;

  getAllBancos(): Promise<Banco[]>;
  createBanco(banco: InsertBanco): Promise<Banco>;
  updateBanco(id: string, banco: Partial<InsertBanco>): Promise<Banco | undefined>;
  deleteBanco(id: string): Promise<boolean>;

  getAllOperacionesBancarias(): Promise<OperacionBancaria[]>;
  createOperacionBancaria(operacion: InsertOperacionBancaria): Promise<OperacionBancaria>;
  updateOperacionBancaria(id: string, operacion: Partial<InsertOperacionBancaria>): Promise<OperacionBancaria | undefined>;
  deleteOperacionBancaria(id: string): Promise<boolean>;
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

  async getAllActividades(): Promise<Actividad[]> {
    return await db.select().from(actividades).orderBy(asc(actividades.nombre));
  }

  async createActividad(insertActividad: InsertActividad): Promise<Actividad> {
    const [actividad] = await db.insert(actividades).values(insertActividad).returning();
    return actividad;
  }

  async updateActividad(id: string, updateData: Partial<InsertActividad>): Promise<Actividad | undefined> {
    const [actividad] = await db.update(actividades).set(updateData).where(eq(actividades.id, id)).returning();
    return actividad || undefined;
  }

  async deleteActividad(id: string): Promise<boolean> {
    const result = await db.delete(actividades).where(eq(actividades.id, id)).returning();
    return result.length > 0;
  }

  async getAllClientes(): Promise<Cliente[]> {
    return await db.select().from(clientes).orderBy(asc(clientes.nombre));
  }

  async createCliente(insertCliente: InsertCliente): Promise<Cliente> {
    const [cliente] = await db.insert(clientes).values(insertCliente).returning();
    return cliente;
  }

  async updateCliente(id: string, updateData: Partial<InsertCliente>): Promise<Cliente | undefined> {
    const [cliente] = await db.update(clientes).set(updateData).where(eq(clientes.id, id)).returning();
    return cliente || undefined;
  }

  async deleteCliente(id: string): Promise<boolean> {
    const result = await db.delete(clientes).where(eq(clientes.id, id)).returning();
    return result.length > 0;
  }

  async getAllInsumos(): Promise<Insumo[]> {
    return await db.select().from(insumos).orderBy(asc(insumos.nombre));
  }

  async createInsumo(insertInsumo: InsertInsumo): Promise<Insumo> {
    const [insumo] = await db.insert(insumos).values(insertInsumo).returning();
    return insumo;
  }

  async updateInsumo(id: string, updateData: Partial<InsertInsumo>): Promise<Insumo | undefined> {
    const [insumo] = await db.update(insumos).set(updateData).where(eq(insumos.id, id)).returning();
    return insumo || undefined;
  }

  async deleteInsumo(id: string): Promise<boolean> {
    const result = await db.delete(insumos).where(eq(insumos.id, id)).returning();
    return result.length > 0;
  }

  async getAllPersonal(): Promise<Personal[]> {
    return await db.select().from(personal).orderBy(asc(personal.nombre));
  }

  async createPersonal(insertPersonal: InsertPersonal): Promise<Personal> {
    const [persona] = await db.insert(personal).values(insertPersonal).returning();
    return persona;
  }

  async updatePersonal(id: string, updateData: Partial<InsertPersonal>): Promise<Personal | undefined> {
    const [persona] = await db.update(personal).set(updateData).where(eq(personal.id, id)).returning();
    return persona || undefined;
  }

  async deletePersonal(id: string): Promise<boolean> {
    const result = await db.delete(personal).where(eq(personal.id, id)).returning();
    return result.length > 0;
  }

  async getAllProductos(): Promise<Producto[]> {
    return await db.select().from(productos).orderBy(asc(productos.nombre));
  }

  async createProducto(insertProducto: InsertProducto): Promise<Producto> {
    const [producto] = await db.insert(productos).values(insertProducto).returning();
    return producto;
  }

  async updateProducto(id: string, updateData: Partial<InsertProducto>): Promise<Producto | undefined> {
    const [producto] = await db.update(productos).set(updateData).where(eq(productos.id, id)).returning();
    return producto || undefined;
  }

  async deleteProducto(id: string): Promise<boolean> {
    const result = await db.delete(productos).where(eq(productos.id, id)).returning();
    return result.length > 0;
  }

  async getAllProveedores(): Promise<Proveedor[]> {
    return await db.select().from(proveedores).orderBy(asc(proveedores.nombre));
  }

  async createProveedor(insertProveedor: InsertProveedor): Promise<Proveedor> {
    const [proveedor] = await db.insert(proveedores).values(insertProveedor).returning();
    return proveedor;
  }

  async updateProveedor(id: string, updateData: Partial<InsertProveedor>): Promise<Proveedor | undefined> {
    const [proveedor] = await db.update(proveedores).set(updateData).where(eq(proveedores.id, id)).returning();
    return proveedor || undefined;
  }

  async deleteProveedor(id: string): Promise<boolean> {
    const result = await db.delete(proveedores).where(eq(proveedores.id, id)).returning();
    return result.length > 0;
  }

  async getAllBancos(): Promise<Banco[]> {
    return await db.select().from(bancos).orderBy(asc(bancos.nombre));
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

  async getAllOperacionesBancarias(): Promise<OperacionBancaria[]> {
    return await db.select().from(operacionesBancarias).orderBy(asc(operacionesBancarias.nombre));
  }

  async createOperacionBancaria(insertOperacion: InsertOperacionBancaria): Promise<OperacionBancaria> {
    const [operacion] = await db.insert(operacionesBancarias).values(insertOperacion).returning();
    return operacion;
  }

  async updateOperacionBancaria(id: string, updateData: Partial<InsertOperacionBancaria>): Promise<OperacionBancaria | undefined> {
    const [operacion] = await db.update(operacionesBancarias).set(updateData).where(eq(operacionesBancarias.id, id)).returning();
    return operacion || undefined;
  }

  async deleteOperacionBancaria(id: string): Promise<boolean> {
    const result = await db.delete(operacionesBancarias).where(eq(operacionesBancarias.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
