import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, boolean, date, integer, timestamp, numeric, jsonb, index } from "drizzle-orm/pg-core";
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
}, (table) => [
  index("idx_parametros_tipo_habilitado").on(table.tipo, table.habilitado),
]);

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
}, (table) => [
  index("idx_bancos_codrel").on(table.codrel),
  index("idx_bancos_banco_comprobante").on(table.banco, table.comprobante),
]);

export const insertBancoSchema = createInsertSchema(bancos).omit({ id: true });
export type InsertBanco = z.infer<typeof insertBancoSchema>;
export type Banco = typeof bancos.$inferSelect;

export const administracion = pgTable("administracion", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha").notNull(),
  tipo: varchar("tipo"),
  nombre: varchar("nombre"),
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
  nrofactura: text("nrofactura"),
  fechafactura: text("fechafactura"),
  cancelada: boolean("cancelada"),
}, (table) => [
  index("idx_admin_codrel").on(table.codrel),
]);

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
}, (table) => [
  index("idx_cheques_unidad").on(table.unidad),
]);

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
  suministro: varchar("suministro"),
  unidaddemedida: varchar("unidaddemedida"),
  monto: numeric("monto"),
  movimiento: varchar("movimiento"),
  cantidad: numeric("cantidad"),
  descripcion: varchar("descripcion"),
  saldo: numeric("saldo"),
  utility: boolean("utility"),
  categoria: varchar("categoria"),
  propietario: varchar("propietario"),
}, (table) => [
  index("idx_almacen_suministro").on(table.suministro),
]);

export const insertAlmacenSchema = createInsertSchema(almacen).omit({ id: true });
export type InsertAlmacen = z.infer<typeof insertAlmacenSchema>;
export type Almacen = typeof almacen.$inferSelect;

export const arrime = pgTable("arrime", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feriado: boolean("feriado"),
  nucleo: varchar("nucleo"),
  azucar: numeric("azucar"),
  finca: varchar("finca"),
  fecha: text("fecha"),
  ruta: varchar("ruta"),
  chofer: varchar("chofer"),
  fletechofer: numeric("fletechofer"),
  flete: numeric("flete"),
  remesa: text("remesa"),
  ticket: text("ticket"),
  montochofer: numeric("montochofer"),
  monto: numeric("monto"),
  cancelado: boolean("cancelado"),
  proveedor: varchar("proveedor"),
  placa: varchar("placa"),
  cantidad: numeric("cantidad"),
  utility: boolean("utility"),
  descripcion: varchar("descripcion"),
  pagochofer: boolean("pagochofer"),
  brix: numeric("brix"),
  pol: numeric("pol"),
  torta: numeric("torta"),
  tablon: varchar("tablon"),
  grado: numeric("grado"),
  propietario: varchar("propietario"),
  central: varchar("central"),
  transporte: numeric("transporte"),
}, (table) => [
  index("idx_arrime_central").on(table.central),
]);

export const insertArrimeSchema = createInsertSchema(arrime).omit({ id: true });
export type InsertArrime = z.infer<typeof insertArrimeSchema>;
export type Arrime = typeof arrime.$inferSelect;

export const transferencias = pgTable("transferencias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  banco: varchar("banco"),
  fecha: text("fecha"),
  deuda: numeric("deuda"),
  resta: numeric("resta"),
  prestamo: numeric("prestamo"),
  descuento: numeric("descuento"),
  monto: numeric("monto"),
  descripcion: varchar("descripcion"),
  personal: varchar("personal"),
  proveedor: varchar("proveedor"),
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
}, (table) => [
  index("idx_transferencias_unidad").on(table.unidad),
]);

export const insertTransferenciaSchema = createInsertSchema(transferencias).omit({ id: true });
export type InsertTransferencia = z.infer<typeof insertTransferenciaSchema>;
export type Transferencia = typeof transferencias.$inferSelect;

export const agrodata = pgTable("agrodata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plan: varchar("plan"),
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

export const defaults = pgTable("defaults", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: varchar("nombre").unique(),
  valores: jsonb("valores"),
});

export const insertDefaultsSchema = createInsertSchema(defaults);
export type InsertDefaults = z.infer<typeof insertDefaultsSchema>;
export type Defaults = typeof defaults.$inferSelect;

export const gridPreferences = pgTable("grid_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: varchar("table_id").notNull(),
  settingType: varchar("setting_type").notNull(),
  value: jsonb("value"),
});

export const insertGridPreferencesSchema = createInsertSchema(gridPreferences).omit({ id: true });
export type InsertGridPreferences = z.infer<typeof insertGridPreferencesSchema>;
export type GridPreferences = typeof gridPreferences.$inferSelect;
