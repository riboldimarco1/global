import { users, registros, centrales, fincas, backups, fincasFinanza, pagosFinanza, unidadesProduccion, actividades, clientes, insumos, personal, productos, proveedores, bancos, operacionesBancarias, tasasDolar, gastos, nominas, ventas, cuentasCobrar, cuentasPagar, prestamos, movimientosBancarios, almacen, cosecha, cheques, transferencias, type User, type InsertUser, type Registro, type InsertRegistro, type Central, type InsertCentral, type Finca, type InsertFinca, type Backup, type InsertBackup, type FincaFinanza, type InsertFincaFinanza, type PagoFinanza, type InsertPagoFinanza, type UnidadProduccion, type InsertUnidadProduccion, type Actividad, type InsertActividad, type Cliente, type InsertCliente, type Insumo, type InsertInsumo, type Personal, type InsertPersonal, type Producto, type InsertProducto, type Proveedor, type InsertProveedor, type Banco, type InsertBanco, type OperacionBancaria, type InsertOperacionBancaria, type TasaDolar, type InsertTasaDolar, type Gasto, type InsertGasto, type Nomina, type InsertNomina, type Venta, type InsertVenta, type CuentaCobrar, type InsertCuentaCobrar, type CuentaPagar, type InsertCuentaPagar, type Prestamo, type InsertPrestamo, type MovimientoBancario, type InsertMovimientoBancario, type Almacen, type InsertAlmacen, type Cosecha, type Cheques, type Transferencias } from "@shared/schema";
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

  getAllTasasDolar(): Promise<TasaDolar[]>;
  createTasaDolar(tasa: InsertTasaDolar): Promise<TasaDolar>;
  updateTasaDolar(id: string, tasa: Partial<InsertTasaDolar>): Promise<TasaDolar | undefined>;
  deleteTasaDolar(id: string): Promise<boolean>;

  // Administración Module
  getAllGastos(): Promise<Gasto[]>;
  getGastosByUnidad(unidadId: string): Promise<Gasto[]>;
  createGasto(gasto: InsertGasto): Promise<Gasto>;
  updateGasto(id: string, gasto: Partial<InsertGasto>): Promise<Gasto | undefined>;
  deleteGasto(id: string): Promise<boolean>;

  getAllNominas(): Promise<Nomina[]>;
  getNominasByUnidad(unidadId: string): Promise<Nomina[]>;
  createNomina(nomina: InsertNomina): Promise<Nomina>;
  updateNomina(id: string, nomina: Partial<InsertNomina>): Promise<Nomina | undefined>;
  deleteNomina(id: string): Promise<boolean>;

  getAllVentas(): Promise<Venta[]>;
  getVentasByUnidad(unidadId: string): Promise<Venta[]>;
  createVenta(venta: InsertVenta): Promise<Venta>;
  updateVenta(id: string, venta: Partial<InsertVenta>): Promise<Venta | undefined>;
  deleteVenta(id: string): Promise<boolean>;

  getAllCuentasCobrar(): Promise<CuentaCobrar[]>;
  getCuentasCobrarByUnidad(unidadId: string): Promise<CuentaCobrar[]>;
  createCuentaCobrar(cuenta: InsertCuentaCobrar): Promise<CuentaCobrar>;
  updateCuentaCobrar(id: string, cuenta: Partial<InsertCuentaCobrar>): Promise<CuentaCobrar | undefined>;
  deleteCuentaCobrar(id: string): Promise<boolean>;

  getAllCuentasPagar(): Promise<CuentaPagar[]>;
  getCuentasPagarByUnidad(unidadId: string): Promise<CuentaPagar[]>;
  createCuentaPagar(cuenta: InsertCuentaPagar): Promise<CuentaPagar>;
  updateCuentaPagar(id: string, cuenta: Partial<InsertCuentaPagar>): Promise<CuentaPagar | undefined>;
  deleteCuentaPagar(id: string): Promise<boolean>;

  getAllPrestamos(): Promise<Prestamo[]>;
  getPrestamosByUnidad(unidadId: string): Promise<Prestamo[]>;
  createPrestamo(prestamo: InsertPrestamo): Promise<Prestamo>;
  updatePrestamo(id: string, prestamo: Partial<InsertPrestamo>): Promise<Prestamo | undefined>;
  deletePrestamo(id: string): Promise<boolean>;

  getAllMovimientosBancarios(): Promise<MovimientoBancario[]>;
  getMovimientosByBanco(bancoId: string): Promise<MovimientoBancario[]>;
  createMovimientoBancario(movimiento: InsertMovimientoBancario): Promise<MovimientoBancario>;
  updateMovimientoBancario(id: string, movimiento: Partial<InsertMovimientoBancario>): Promise<MovimientoBancario | undefined>;
  deleteMovimientoBancario(id: string): Promise<boolean>;

  getAllAlmacen(): Promise<Almacen[]>;
  getAlmacenByUnidad(unidadId: string): Promise<Almacen[]>;
  createAlmacen(registro: InsertAlmacen): Promise<Almacen>;
  updateAlmacen(id: string, registro: Partial<InsertAlmacen>): Promise<Almacen | undefined>;
  deleteAlmacen(id: string): Promise<boolean>;

  // Parametros (denormalized table)
  getAllParametros(): Promise<any[]>;
  updateParametro(id: string, updateData: Record<string, any>): Promise<any | undefined>;
  deleteParametro(id: string): Promise<boolean>;

  // DBF denormalized tables
  getAllCosecha(): Promise<Cosecha[]>;
  getAllCheques(): Promise<Cheques[]>;
  getAllTransferencias(): Promise<Transferencias[]>;
  getAllAdministracion(): Promise<any[]>;
  getAllBancosDBF(): Promise<any[]>;
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

  async getAllTasasDolar(): Promise<TasaDolar[]> {
    return await db.select().from(tasasDolar).orderBy(desc(tasasDolar.fecha));
  }

  async createTasaDolar(insertTasa: InsertTasaDolar): Promise<TasaDolar> {
    const [tasa] = await db.insert(tasasDolar).values(insertTasa).returning();
    return tasa;
  }

  async updateTasaDolar(id: string, updateData: Partial<InsertTasaDolar>): Promise<TasaDolar | undefined> {
    const [tasa] = await db.update(tasasDolar).set(updateData).where(eq(tasasDolar.id, id)).returning();
    return tasa || undefined;
  }

  async deleteTasaDolar(id: string): Promise<boolean> {
    const result = await db.delete(tasasDolar).where(eq(tasasDolar.id, id)).returning();
    return result.length > 0;
  }

  // Administración Module - Gastos
  async getAllGastos(): Promise<Gasto[]> {
    return await db.select().from(gastos).orderBy(desc(gastos.fecha));
  }

  async getGastosByUnidad(unidadId: string): Promise<Gasto[]> {
    return await db.select().from(gastos).where(eq(gastos.unidadProduccionId, unidadId)).orderBy(desc(gastos.fecha));
  }

  async createGasto(insertGasto: InsertGasto): Promise<Gasto> {
    const [gasto] = await db.insert(gastos).values(insertGasto).returning();
    return gasto;
  }

  async updateGasto(id: string, updateData: Partial<InsertGasto>): Promise<Gasto | undefined> {
    const [gasto] = await db.update(gastos).set(updateData).where(eq(gastos.id, id)).returning();
    return gasto || undefined;
  }

  async deleteGasto(id: string): Promise<boolean> {
    const result = await db.delete(gastos).where(eq(gastos.id, id)).returning();
    return result.length > 0;
  }

  // Administración Module - Nóminas
  async getAllNominas(): Promise<Nomina[]> {
    return await db.select().from(nominas).orderBy(desc(nominas.fecha));
  }

  async getNominasByUnidad(unidadId: string): Promise<Nomina[]> {
    return await db.select().from(nominas).where(eq(nominas.unidadProduccionId, unidadId)).orderBy(desc(nominas.fecha));
  }

  async createNomina(insertNomina: InsertNomina): Promise<Nomina> {
    const [nomina] = await db.insert(nominas).values(insertNomina).returning();
    return nomina;
  }

  async updateNomina(id: string, updateData: Partial<InsertNomina>): Promise<Nomina | undefined> {
    const [nomina] = await db.update(nominas).set(updateData).where(eq(nominas.id, id)).returning();
    return nomina || undefined;
  }

  async deleteNomina(id: string): Promise<boolean> {
    const result = await db.delete(nominas).where(eq(nominas.id, id)).returning();
    return result.length > 0;
  }

  // Administración Module - Ventas
  async getAllVentas(): Promise<Venta[]> {
    return await db.select().from(ventas).orderBy(desc(ventas.fecha));
  }

  async getVentasByUnidad(unidadId: string): Promise<Venta[]> {
    return await db.select().from(ventas).where(eq(ventas.unidadProduccionId, unidadId)).orderBy(desc(ventas.fecha));
  }

  async createVenta(insertVenta: InsertVenta): Promise<Venta> {
    const [venta] = await db.insert(ventas).values(insertVenta).returning();
    return venta;
  }

  async updateVenta(id: string, updateData: Partial<InsertVenta>): Promise<Venta | undefined> {
    const [venta] = await db.update(ventas).set(updateData).where(eq(ventas.id, id)).returning();
    return venta || undefined;
  }

  async deleteVenta(id: string): Promise<boolean> {
    const result = await db.delete(ventas).where(eq(ventas.id, id)).returning();
    return result.length > 0;
  }

  // Administración Module - Cuentas por Cobrar
  async getAllCuentasCobrar(): Promise<CuentaCobrar[]> {
    return await db.select().from(cuentasCobrar).orderBy(desc(cuentasCobrar.fecha));
  }

  async getCuentasCobrarByUnidad(unidadId: string): Promise<CuentaCobrar[]> {
    return await db.select().from(cuentasCobrar).where(eq(cuentasCobrar.unidadProduccionId, unidadId)).orderBy(desc(cuentasCobrar.fecha));
  }

  async createCuentaCobrar(insertCuenta: InsertCuentaCobrar): Promise<CuentaCobrar> {
    const [cuenta] = await db.insert(cuentasCobrar).values(insertCuenta).returning();
    return cuenta;
  }

  async updateCuentaCobrar(id: string, updateData: Partial<InsertCuentaCobrar>): Promise<CuentaCobrar | undefined> {
    const [cuenta] = await db.update(cuentasCobrar).set(updateData).where(eq(cuentasCobrar.id, id)).returning();
    return cuenta || undefined;
  }

  async deleteCuentaCobrar(id: string): Promise<boolean> {
    const result = await db.delete(cuentasCobrar).where(eq(cuentasCobrar.id, id)).returning();
    return result.length > 0;
  }

  // Administración Module - Cuentas por Pagar
  async getAllCuentasPagar(): Promise<CuentaPagar[]> {
    return await db.select().from(cuentasPagar).orderBy(desc(cuentasPagar.fecha));
  }

  async getCuentasPagarByUnidad(unidadId: string): Promise<CuentaPagar[]> {
    return await db.select().from(cuentasPagar).where(eq(cuentasPagar.unidadProduccionId, unidadId)).orderBy(desc(cuentasPagar.fecha));
  }

  async createCuentaPagar(insertCuenta: InsertCuentaPagar): Promise<CuentaPagar> {
    const [cuenta] = await db.insert(cuentasPagar).values(insertCuenta).returning();
    return cuenta;
  }

  async updateCuentaPagar(id: string, updateData: Partial<InsertCuentaPagar>): Promise<CuentaPagar | undefined> {
    const [cuenta] = await db.update(cuentasPagar).set(updateData).where(eq(cuentasPagar.id, id)).returning();
    return cuenta || undefined;
  }

  async deleteCuentaPagar(id: string): Promise<boolean> {
    const result = await db.delete(cuentasPagar).where(eq(cuentasPagar.id, id)).returning();
    return result.length > 0;
  }

  // Administración Module - Préstamos
  async getAllPrestamos(): Promise<Prestamo[]> {
    return await db.select().from(prestamos).orderBy(desc(prestamos.fecha));
  }

  async getPrestamosByUnidad(unidadId: string): Promise<Prestamo[]> {
    return await db.select().from(prestamos).where(eq(prestamos.unidadProduccionId, unidadId)).orderBy(desc(prestamos.fecha));
  }

  async createPrestamo(insertPrestamo: InsertPrestamo): Promise<Prestamo> {
    const [prestamo] = await db.insert(prestamos).values(insertPrestamo).returning();
    return prestamo;
  }

  async updatePrestamo(id: string, updateData: Partial<InsertPrestamo>): Promise<Prestamo | undefined> {
    const [prestamo] = await db.update(prestamos).set(updateData).where(eq(prestamos.id, id)).returning();
    return prestamo || undefined;
  }

  async deletePrestamo(id: string): Promise<boolean> {
    const result = await db.delete(prestamos).where(eq(prestamos.id, id)).returning();
    return result.length > 0;
  }

  // Administración Module - Movimientos Bancarios
  async getAllMovimientosBancarios(): Promise<MovimientoBancario[]> {
    return await db.select().from(movimientosBancarios).orderBy(desc(movimientosBancarios.fecha));
  }

  async getMovimientosByBanco(bancoId: string): Promise<MovimientoBancario[]> {
    return await db.select().from(movimientosBancarios).where(eq(movimientosBancarios.bancoId, bancoId)).orderBy(desc(movimientosBancarios.fecha));
  }

  async createMovimientoBancario(insertMovimiento: InsertMovimientoBancario): Promise<MovimientoBancario> {
    const [movimiento] = await db.insert(movimientosBancarios).values(insertMovimiento).returning();
    return movimiento;
  }

  async updateMovimientoBancario(id: string, updateData: Partial<InsertMovimientoBancario>): Promise<MovimientoBancario | undefined> {
    const [movimiento] = await db.update(movimientosBancarios).set(updateData).where(eq(movimientosBancarios.id, id)).returning();
    return movimiento || undefined;
  }

  async deleteMovimientoBancario(id: string): Promise<boolean> {
    const result = await db.delete(movimientosBancarios).where(eq(movimientosBancarios.id, id)).returning();
    return result.length > 0;
  }

  // Almacén
  async getAllAlmacen(): Promise<Almacen[]> {
    return await db.select().from(almacen).orderBy(desc(almacen.fecha));
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
    await db.delete(registros);
    await db.delete(gastos);
    await db.delete(nominas);
    await db.delete(ventas);
    await db.delete(cuentasCobrar);
    await db.delete(cuentasPagar);
    await db.delete(prestamos);
    await db.delete(movimientosBancarios);
    await db.delete(fincasFinanza);
    await db.delete(pagosFinanza);
    await db.delete(backups);
    // Note: We don't wipe configuration tables like units, banks, activities, etc.
    // unless the user specifically asks for it.
  }

  async getAllParametros(): Promise<any[]> {
    const result = await db.execute("SELECT * FROM parametros ORDER BY tipo, nombre");
    return result.rows as any[];
  }

  async updateParametro(id: string, updateData: Record<string, any>): Promise<any | undefined> {
    const allowedFields = [
      "fecha", "tipo", "nombre", "unidad", "direccion", "telefono",
      "ced_rif", "descripcion", "abilitado", "cheque", "transferencia",
      "propietario", "evidenciado"
    ];
    
    const fields = Object.keys(updateData).filter(f => allowedFields.includes(f));
    if (fields.length === 0) return undefined;
    
    const setClause = fields.map((f, i) => `"${f}" = $${i + 2}`).join(", ");
    const values = [id, ...fields.map(f => updateData[f])];
    const query = `UPDATE parametros SET ${setClause} WHERE id = $1 RETURNING *`;
    
    const result = await db.execute({
      sql: query,
      args: values
    } as any);
    return result.rows[0] || undefined;
  }

  async deleteParametro(id: string): Promise<boolean> {
    const result = await db.execute({
      sql: "DELETE FROM parametros WHERE id = $1 RETURNING id",
      args: [id]
    } as any);
    return (result.rows?.length || 0) > 0;
  }

  // DBF denormalized tables
  async getAllCosecha(): Promise<Cosecha[]> {
    return await db.select().from(cosecha).orderBy(desc(cosecha.fecha));
  }

  async getAllCheques(): Promise<Cheques[]> {
    return await db.select().from(cheques).orderBy(desc(cheques.fecha));
  }

  async getAllTransferencias(): Promise<Transferencias[]> {
    return await db.select().from(transferencias).orderBy(desc(transferencias.fecha));
  }

  async getAllAdministracion(): Promise<any[]> {
    const result = await db.execute("SELECT * FROM administracion ORDER BY fecha DESC");
    return result.rows as any[];
  }

  async getAllBancosDBF(): Promise<any[]> {
    const result = await db.execute("SELECT * FROM bancos ORDER BY fecha DESC");
    return result.rows as any[];
  }
}

export const storage = new DatabaseStorage();
