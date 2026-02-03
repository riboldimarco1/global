import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, boolean, date, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const parametros = pgTable("parametros", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: date("fecha"),
  tipo: varchar("tipo"),
  nombre: varchar("nombre"),
  unidad: varchar("unidad"),
  unidaddemedida: varchar("unidaddemedida"),
  direccion: varchar("direccion"),
  telefono: varchar("telefono"),
  ced_rif: varchar("ced_rif"),
  descripcion: varchar("descripcion"),
  habilitado: boolean("habilitado"),
  cheque: boolean("cheque"),
  transferencia: boolean("transferencia"),
  propietario: varchar("propietario"),
  operador: text("operador"),
  valor: numeric("valor"),
  costo: numeric("costo"),
  precio: numeric("precio"),
  categoria: varchar("categoria"),
  cuenta: varchar("cuenta"),
  correo: varchar("correo"),
  proveedor: varchar("proveedor"),
  chofer: varchar("chofer"),
  hectareas: numeric("hectareas"),
});

export const insertParametrosSchema = createInsertSchema(parametros).omit({ id: true });
export type InsertParametros = z.infer<typeof insertParametrosSchema>;
export type Parametros = typeof parametros.$inferSelect;

export const bancos = pgTable("bancos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha").notNull(),
  monto: numeric("monto"),
  montodolares: numeric("montodolares"),
  saldo: numeric("saldo"),
  saldo_conciliado: numeric("saldo_conciliado"),
  numero: integer("numero"),
  operacion: text("operacion"),
  descripcion: text("descripcion"),
  conciliado: boolean("conciliado"),
  utility: boolean("utility"),
  banco: text("banco"),
  operador: text("operador"),
  propietario: text("propietario"),
  comprobante: text("comprobante"),
  relacionado: boolean("relacionado"),
  codrel: text("codrel"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertBancoSchema = createInsertSchema(bancos).omit({ id: true });
export type InsertBanco = z.infer<typeof insertBancoSchema>;
export type Banco = typeof bancos.$inferSelect;

export const administracion = pgTable("administracion", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha").notNull(),
  tipo: varchar("tipo"),
  descripcion: text("descripcion"),
  monto: numeric("monto"),
  montodolares: numeric("montodolares"),
  unidad: varchar("unidad"),
  capital: boolean("capital"),
  utility: boolean("utility"),
  operacion: varchar("operacion"),
  producto: varchar("producto"),
  cantidad: numeric("cantidad"),
  insumo: varchar("insumo"),
  comprobante: text("comprobante"),
  proveedor: varchar("proveedor"),
  cliente: varchar("cliente"),
  personal: varchar("personal"),
  actividad: varchar("actividad"),
  propietario: varchar("propietario"),
  anticipo: boolean("anticipo"),
  unidaddemedida: varchar("unidaddemedida"),
  codrel: text("codrel"),
  relacionado: boolean("relacionado"),
});

export const insertAdministracionSchema = createInsertSchema(administracion).omit({ id: true });
export type InsertAdministracion = z.infer<typeof insertAdministracionSchema>;
export type Administracion = typeof administracion.$inferSelect;

export const cheques = pgTable("cheques", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha"),
  numero: integer("numero"),
  deuda: numeric("deuda"),
  resta: numeric("resta"),
  descuento: numeric("descuento"),
  monto: numeric("monto"),
  descripcion: varchar("descripcion"),
  banco: varchar("banco"),
  personal: varchar("personal"),
  tikets: numeric("tikets"),
  proveedor: varchar("proveedor"),
  beneficiario: varchar("beneficiario"),
  transferido: boolean("transferido"),
  imprimido: boolean("imprimido"),
  norecibo: boolean("norecibo"),
  noendosable: boolean("noendosable"),
  lugar: varchar("lugar"),
  utility: boolean("utility"),
  contabilizado: boolean("contabilizado"),
  actividad: varchar("actividad"),
  insumo: varchar("insumo"),
  unidad: varchar("unidad"),
  propietario: varchar("propietario"),
  comprobante: text("comprobante"),
});

export const insertChequeSchema = createInsertSchema(cheques).omit({ id: true });
export type InsertCheque = z.infer<typeof insertChequeSchema>;
export type Cheque = typeof cheques.$inferSelect;

export const cosecha = pgTable("cosecha", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha"),
  numero: integer("numero"),
  chofer: varchar("chofer"),
  placa: varchar("placa"),
  ciclo: varchar("ciclo"),
  destino: varchar("destino"),
  torbas: numeric("torbas"),
  tablon: varchar("tablon"),
  cantidad: numeric("cantidad"),
  cantnet: numeric("cantnet"),
  descporc: numeric("descporc"),
  cancelado: boolean("cancelado"),
  guiamov: integer("guiamov"),
  guiamat: integer("guiamat"),
  descripcion: varchar("descripcion"),
  utility: boolean("utility"),
  unidad: varchar("unidad"),
  cultivo: varchar("cultivo"),
  propietario: varchar("propietario"),
  comprobante: text("comprobante"),
});

export const insertCosechaSchema = createInsertSchema(cosecha).omit({ id: true });
export type InsertCosecha = z.infer<typeof insertCosechaSchema>;
export type Cosecha = typeof cosecha.$inferSelect;

export const almacen = pgTable("almacen", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unidad: varchar("unidad"),
  fecha: text("fecha"),
  comprobante: text("comprobante"),
  insumo: varchar("insumo"),
  unidaddemedida: varchar("unidaddemedida"),
  monto: numeric("monto"),
  precio: numeric("precio"),
  operacion: varchar("operacion"),
  cantidad: numeric("cantidad"),
  descripcion: varchar("descripcion"),
  saldo: numeric("saldo"),
  utility: boolean("utility"),
  relaz: boolean("relaz"),
  categoria: varchar("categoria"),
  propietario: varchar("propietario"),
});

export const insertAlmacenSchema = createInsertSchema(almacen).omit({ id: true });
export type InsertAlmacen = z.infer<typeof insertAlmacenSchema>;
export type Almacen = typeof almacen.$inferSelect;

export const transferencias = pgTable("transferencias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  banco: varchar("banco"),
  fecha: text("fecha"),
  deuda: numeric("deuda"),
  resta: numeric("resta"),
  descuento: numeric("descuento"),
  monto: numeric("monto"),
  descripcion: varchar("descripcion"),
  personal: varchar("personal"),
  proveedor: varchar("proveedor"),
  beneficiario: varchar("beneficiario"),
  transferido: boolean("transferido"),
  contabilizado: boolean("contabilizado"),
  ejecutada: boolean("ejecutada"),
  utility: boolean("utility"),
  actividad: varchar("actividad"),
  insumo: varchar("insumo"),
  unidad: varchar("unidad"),
  propietario: varchar("propietario"),
  rifced: varchar("rifced"),
  numcuenta: varchar("numcuenta"),
  email: varchar("email"),
  comprobante: text("comprobante"),
});

export const insertTransferenciaSchema = createInsertSchema(transferencias).omit({ id: true });
export type InsertTransferencia = z.infer<typeof insertTransferenciaSchema>;
export type Transferencia = typeof transferencias.$inferSelect;

export const gridDefaults = pgTable("grid_defaults", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  config: text("config").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertGridDefaultsSchema = createInsertSchema(gridDefaults).omit({ id: true });
export type InsertGridDefaults = z.infer<typeof insertGridDefaultsSchema>;
export type GridDefaults = typeof gridDefaults.$inferSelect;

export const agrodata = pgTable("agrodata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plan: varchar("plan"),
  monto: numeric("monto"),
  montodolares: numeric("montodolares"),
  estado: varchar("estado"),
  descripcion: varchar("descripcion"),
  utility: boolean("utility"),
  propietario: varchar("propietario"),
  equipo: varchar("equipo"),
  nombre: varchar("nombre"),
  ip: varchar("ip"),
  mac: varchar("mac"),
  latencia: varchar("latencia"),
});

export const insertAgrodataSchema = createInsertSchema(agrodata).omit({ id: true });
export type InsertAgrodata = z.infer<typeof insertAgrodataSchema>;
export type Agrodata = typeof agrodata.$inferSelect;
