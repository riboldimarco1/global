import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, boolean, date, integer, timestamp } from "drizzle-orm/pg-core";
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
  valor: real("valor"),
});

export const insertParametrosSchema = createInsertSchema(parametros).omit({ id: true });
export type InsertParametros = z.infer<typeof insertParametrosSchema>;
export type Parametros = typeof parametros.$inferSelect;

export const bancos = pgTable("bancos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha").notNull(),
  monto: real("monto"),
  monto_dolares: real("monto_dolares"),
  saldo: real("saldo"),
  saldo_conciliado: real("saldo_conciliado"),
  numero: integer("numero"),
  operacion: text("operacion"),
  descripcion: text("descripcion"),
  conciliado: boolean("conciliado"),
  utility: boolean("utility"),
  banco: text("banco"),
  operador: text("operador"),
  prop: text("prop"),
  comprobante: text("comprobante"),
  relacionado: boolean("relacionado"),
  administracion_id: varchar("administracion_id"),
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
  monto: real("monto"),
  montodol: real("montodol"),
  unidad: varchar("unidad"),
  capital: boolean("capital"),
  utility: boolean("utility"),
  formadepag: varchar("formadepag"),
  producto: varchar("producto"),
  cantidad: real("cantidad"),
  insumo: varchar("insumo"),
  comprobante: text("comprobante"),
  proveedor: varchar("proveedor"),
  cliente: varchar("cliente"),
  personal: varchar("personal"),
  actividad: varchar("actividad"),
  prop: varchar("prop"),
  anticipo: boolean("anticipo"),
  banco_id: varchar("banco_id"),
  relacionado: boolean("relacionado"),
});

export const insertAdministracionSchema = createInsertSchema(administracion).omit({ id: true });
export type InsertAdministracion = z.infer<typeof insertAdministracionSchema>;
export type Administracion = typeof administracion.$inferSelect;

export const cheques = pgTable("cheques", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: date("fecha"),
  deuda: real("deuda"),
  resta: real("resta"),
  descuento: real("descuento"),
  monto: real("monto"),
  descripcion: varchar("descripcion"),
  banco: varchar("banco"),
  personal: varchar("personal"),
  tikets: real("tikets"),
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
  prop: varchar("prop"),
  comprobante: text("comprobante"),
});

export const insertChequeSchema = createInsertSchema(cheques).omit({ id: true });
export type InsertCheque = z.infer<typeof insertChequeSchema>;
export type Cheque = typeof cheques.$inferSelect;

export const cosecha = pgTable("cosecha", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: date("fecha"),
  chofer: varchar("chofer"),
  placa: varchar("placa"),
  ciclo: varchar("ciclo"),
  destino: varchar("destino"),
  torbas: real("torbas"),
  tablon: varchar("tablon"),
  cantidad: real("cantidad"),
  cantnet: real("cantnet"),
  descporc: real("descporc"),
  cancelado: boolean("cancelado"),
  guiamov: integer("guiamov"),
  guiamat: integer("guiamat"),
  descripcion: varchar("descripcion"),
  utility: boolean("utility"),
  unidad: varchar("unidad"),
  cultivo: varchar("cultivo"),
  prop: varchar("prop"),
  comprobante: text("comprobante"),
});

export const insertCosechaSchema = createInsertSchema(cosecha).omit({ id: true });
export type InsertCosecha = z.infer<typeof insertCosechaSchema>;
export type Cosecha = typeof cosecha.$inferSelect;

export const almacen = pgTable("almacen", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unidad: varchar("unidad"),
  fecha: date("fecha"),
  comprobante: text("comprobante"),
  insumo: varchar("insumo"),
  unidad_medida: varchar("unidad_medida"),
  monto: real("monto"),
  precio: real("precio"),
  operacion: varchar("operacion"),
  cantidad: real("cantidad"),
  descripcion: varchar("descripcion"),
  saldo: real("saldo"),
  utility: boolean("utility"),
  relaz: boolean("relaz"),
  codigo_auto: varchar("codigo_auto"),
  cod_rel: varchar("cod_rel"),
  categoria: varchar("categoria"),
  prop: varchar("prop"),
});

export const insertAlmacenSchema = createInsertSchema(almacen).omit({ id: true });
export type InsertAlmacen = z.infer<typeof insertAlmacenSchema>;
export type Almacen = typeof almacen.$inferSelect;

export const transferencias = pgTable("transferencias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  banco: varchar("banco"),
  fecha: date("fecha"),
  deuda: real("deuda"),
  resta: real("resta"),
  descuento: real("descuento"),
  monto: real("monto"),
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
  prop: varchar("prop"),
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
