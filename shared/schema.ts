import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, boolean, date, integer, timestamp, numeric, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
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
  cargo: varchar("cargo"),
  secuencia: integer("secuencia"),

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
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_bancos_codrel").on(table.codrel),
  index("idx_bancos_banco_comprobante").on(table.banco, table.comprobante),
  index("idx_bancos_banco_fecha").on(table.banco, table.fecha),
  index("idx_bancos_fecha").on(table.fecha),
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
  producto: varchar("producto"),
  cantidad: numeric("cantidad"),
  insumo: varchar("insumo"),
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
  enviada: boolean("enviada"),
  restacancelar: numeric("restacancelar"),
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_admin_codrel").on(table.codrel),
  index("idx_admin_tipo_unidad_fecha").on(table.tipo, table.unidad, table.fecha),
  index("idx_admin_tipo_fecha").on(table.tipo, table.fecha),
]);

export const insertAdministracionSchema = createInsertSchema(administracion).omit({ id: true });
export type InsertAdministracion = z.infer<typeof insertAdministracionSchema>;
export type Administracion = typeof administracion.$inferSelect;

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
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_cosecha_unidad_fecha").on(table.unidad, table.fecha),
]);

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
  relacionado: boolean("relacionado").default(false),
  codrel: varchar("codrel"),
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_almacen_suministro").on(table.suministro),
  index("idx_almacen_codrel").on(table.codrel),
  index("idx_almacen_unidad_fecha").on(table.unidad, table.fecha),
  index("idx_almacen_suministro_fecha").on(table.suministro, table.fecha),
]);

export const insertAlmacenSchema = createInsertSchema(almacen).omit({ id: true });
export type InsertAlmacen = z.infer<typeof insertAlmacenSchema>;
export type Almacen = typeof almacen.$inferSelect;

export const agronomia = pgTable("agronomia", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  utility: boolean("utility"),
  opagro: varchar("opagro"),
  descripcion: varchar("descripcion"),
  unidad: varchar("unidad"),
  fecha: text("fecha"),
  propietario: varchar("propietario"),
  relacionado: boolean("relacionado").default(false),
  codrel: varchar("codrel"),
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_agronomia_unidad").on(table.unidad),
  index("idx_agronomia_fecha").on(table.fecha),
  index("idx_agronomia_codrel").on(table.codrel),
]);

export const insertAgronomiaSchema = createInsertSchema(agronomia).omit({ id: true });
export type InsertAgronomia = z.infer<typeof insertAgronomiaSchema>;
export type Agronomia = typeof agronomia.$inferSelect;

export const arrime = pgTable("arrime", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feriado: boolean("feriado"),
  azucar: numeric("azucar"),
  finca: varchar("finca"),
  fecha: text("fecha"),
  chofer: varchar("chofer"),
  remesa: text("remesa"),
  boleto: text("boleto"),
  proveedor: varchar("proveedor"),
  placa: varchar("placa"),
  neto: numeric("neto"),
  utility: boolean("utility"),
  propietario: varchar("propietario"),
  central: varchar("central"),
  codigofinca: varchar("codigofinca"),
  empresa: varchar("empresa"),
  horaentrada: varchar("horaentrada"),
  horasalida: varchar("horasalida"),
  nucleocorte: varchar("nucleocorte"),
  nucleotransporte: varchar("nucleotransporte"),
  operador: varchar("operador"),
  remesero: varchar("remesero"),
  tractorista: varchar("tractorista"),
  horainiciocarga: varchar("horainiciocarga"),
  horafinalizacarga: varchar("horafinalizacarga"),
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_arrime_central").on(table.central),
  index("idx_arrime_central_fecha").on(table.central, table.fecha),
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
  montodolares: numeric("montodolares"),
  descripcion: varchar("descripcion"),
  personal: varchar("personal"),
  proveedor: varchar("proveedor"),
  transferido: boolean("transferido"),
  contabilizado: boolean("contabilizado"),
  ejecutada: boolean("ejecutada"),
  utility: boolean("utility"),
  unidad: varchar("unidad"),
  propietario: varchar("propietario"),
  rifced: varchar("rifced"),
  numcuenta: varchar("numcuenta"),
  email: varchar("email"),
  comprobante: text("comprobante"),
  nrofactura: text("nrofactura"),
  tipo: varchar("tipo"),
  actividad: varchar("actividad"),
  insumo: varchar("insumo"),
  anticipo: boolean("anticipo"),
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_transferencias_unidad").on(table.unidad),
  index("idx_transferencias_tipo").on(table.tipo),
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
}, (table) => [
  uniqueIndex("idx_grid_pref_table_setting").on(table.tableId, table.settingType),
]);

export const insertGridPreferencesSchema = createInsertSchema(gridPreferences).omit({ id: true });
export type InsertGridPreferences = z.infer<typeof insertGridPreferencesSchema>;
export type GridPreferences = typeof gridPreferences.$inferSelect;

export const reparaciones = pgTable("reparaciones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  utility: boolean("utility"),
  fecha: text("fecha"),
  maquinarias: varchar("maquinarias"),
  descripcion: varchar("descripcion"),
  unidad: varchar("unidad"),
  propietario: varchar("propietario"),
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_reparaciones_unidad").on(table.unidad),
  index("idx_reparaciones_fecha").on(table.fecha),
]);

export const insertReparacionesSchema = createInsertSchema(reparaciones).omit({ id: true });
export type InsertReparaciones = z.infer<typeof insertReparacionesSchema>;
export type Reparaciones = typeof reparaciones.$inferSelect;

export const bitacora = pgTable("bitacora", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  utility: boolean("utility"),
  fecha: text("fecha"),
  descripcion: text("descripcion"),
  unidad: varchar("unidad"),
  propietario: varchar("propietario"),
  secuencia: integer("secuencia"),

}, (table) => [
  index("idx_bitacora_unidad").on(table.unidad),
  index("idx_bitacora_fecha").on(table.fecha),
]);

export const insertBitacoraSchema = createInsertSchema(bitacora).omit({ id: true });
export type InsertBitacora = z.infer<typeof insertBitacoraSchema>;
export type Bitacora = typeof bitacora.$inferSelect;
