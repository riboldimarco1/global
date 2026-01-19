import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const rifRegex = /^[VEOJveoj]-\d{8}-\d$/;

export const unidadesProduccion = pgTable("unidades_produccion", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  rif: text("rif"),
  descripcion: text("descripcion"),
  color: text("color").notNull().default("#3b82f6"),
  orden: integer("orden").notNull().default(0),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertUnidadProduccionSchema = createInsertSchema(unidadesProduccion).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  rif: z.string().regex(rifRegex, "Formato RIF inválido (ej: V-12345678-9)").optional().or(z.literal("")),
  descripcion: z.string().optional(),
  color: z.string().optional(),
  orden: z.number().optional(),
  habilitado: z.boolean().optional(),
});

export type InsertUnidadProduccion = z.infer<typeof insertUnidadProduccionSchema>;
export type UnidadProduccion = typeof unidadesProduccion.$inferSelect;

export const actividades = pgTable("actividades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  unidadProduccionId: varchar("unidad_produccion_id").references(() => unidadesProduccion.id),
  descripcion: text("descripcion"),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertActividadSchema = createInsertSchema(actividades).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  unidadProduccionId: z.string().optional(),
  descripcion: z.string().optional(),
  habilitado: z.boolean().optional(),
});

export type InsertActividad = z.infer<typeof insertActividadSchema>;
export type Actividad = typeof actividades.$inferSelect;

export const clientes = pgTable("clientes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  unidadProduccionId: varchar("unidad_produccion_id").references(() => unidadesProduccion.id),
  descripcion: text("descripcion"),
  rif: text("rif"),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertClienteSchema = createInsertSchema(clientes).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  unidadProduccionId: z.string().optional(),
  descripcion: z.string().optional(),
  rif: z.string().regex(rifRegex, "Formato RIF inválido (ej: V-12345678-9)").optional().or(z.literal("")),
  habilitado: z.boolean().optional(),
});

export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientes.$inferSelect;

export const insumos = pgTable("insumos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  unidadProduccionId: varchar("unidad_produccion_id").references(() => unidadesProduccion.id),
  descripcion: text("descripcion"),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertInsumoSchema = createInsertSchema(insumos).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  unidadProduccionId: z.string().optional(),
  descripcion: z.string().optional(),
  habilitado: z.boolean().optional(),
});

export type InsertInsumo = z.infer<typeof insertInsumoSchema>;
export type Insumo = typeof insumos.$inferSelect;

export const personal = pgTable("personal", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  unidadProduccionId: varchar("unidad_produccion_id").references(() => unidadesProduccion.id),
  descripcion: text("descripcion"),
  rif: text("rif"),
  numeroCuenta: text("numero_cuenta"),
  correo: text("correo"),
  telefono: text("telefono"),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertPersonalSchema = createInsertSchema(personal).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  unidadProduccionId: z.string().optional(),
  descripcion: z.string().optional(),
  rif: z.string().regex(rifRegex, "Formato RIF inválido (ej: V-12345678-9)").optional().or(z.literal("")),
  numeroCuenta: z.string().optional(),
  correo: z.string().email("Correo inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  habilitado: z.boolean().optional(),
});

export type InsertPersonal = z.infer<typeof insertPersonalSchema>;
export type Personal = typeof personal.$inferSelect;

export const productos = pgTable("productos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  unidadProduccionId: varchar("unidad_produccion_id").references(() => unidadesProduccion.id),
  descripcion: text("descripcion"),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertProductoSchema = createInsertSchema(productos).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  unidadProduccionId: z.string().optional(),
  descripcion: z.string().optional(),
  habilitado: z.boolean().optional(),
});

export type InsertProducto = z.infer<typeof insertProductoSchema>;
export type Producto = typeof productos.$inferSelect;

export const proveedores = pgTable("proveedores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  unidadProduccionId: varchar("unidad_produccion_id").references(() => unidadesProduccion.id),
  descripcion: text("descripcion"),
  numeroCuenta: text("numero_cuenta"),
  correo: text("correo"),
  telefono: text("telefono"),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertProveedorSchema = createInsertSchema(proveedores).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  unidadProduccionId: z.string().optional(),
  descripcion: z.string().optional(),
  numeroCuenta: z.string().optional(),
  correo: z.string().email("Correo inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  habilitado: z.boolean().optional(),
});

export type InsertProveedor = z.infer<typeof insertProveedorSchema>;
export type Proveedor = typeof proveedores.$inferSelect;

export const bancos = pgTable("bancos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  numeroCuenta: text("numero_cuenta"),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertBancoSchema = createInsertSchema(bancos).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  numeroCuenta: z.string().optional(),
  habilitado: z.boolean().optional(),
});

export type InsertBanco = z.infer<typeof insertBancoSchema>;
export type Banco = typeof bancos.$inferSelect;

export const operacionesBancarias = pgTable("operaciones_bancarias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  operador: text("operador").notNull().default("suma"),
  habilitado: boolean("habilitado").notNull().default(true),
});

export const insertOperacionBancariaSchema = createInsertSchema(operacionesBancarias).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  operador: z.enum(["suma", "resta"], { errorMap: () => ({ message: "Debe ser suma o resta" }) }),
  habilitado: z.boolean().optional(),
});

export type InsertOperacionBancaria = z.infer<typeof insertOperacionBancariaSchema>;
export type OperacionBancaria = typeof operacionesBancarias.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const centrales = pgTable("centrales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  color: text("color").notNull().default("#3b82f6"),
  orden: integer("orden").notNull().default(0),
});

export const insertCentralSchema = createInsertSchema(centrales).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  color: z.string().optional(),
  orden: z.number().optional(),
});

export type InsertCentral = z.infer<typeof insertCentralSchema>;
export type Central = typeof centrales.$inferSelect;

export const fincas = pgTable("fincas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  orden: integer("orden").notNull().default(0),
});

export const insertFincaSchema = createInsertSchema(fincas).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  orden: z.number().optional(),
});

export type InsertFinca = z.infer<typeof insertFincaSchema>;
export type Finca = typeof fincas.$inferSelect;

export const registros = pgTable("registros", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha").notNull(),
  central: text("central").notNull(),
  cantidad: real("cantidad").notNull(),
  grado: real("grado"),
  finca: text("finca"),
  remesa: text("remesa"),
});

export const backups = pgTable("backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  fecha: text("fecha").notNull(),
  datos: text("datos").notNull(),
});

export const insertBackupSchema = createInsertSchema(backups).omit({ id: true });
export type InsertBackup = z.infer<typeof insertBackupSchema>;
export type Backup = typeof backups.$inferSelect;

export const insertRegistroSchema = createInsertSchema(registros).omit({ id: true }).extend({
  fecha: z.string().min(1, "La fecha es requerida"),
  central: z.string().min(1, "Seleccione una central"),
  cantidad: z.number().positive("La cantidad debe ser positiva"),
  grado: z.number().min(0, "El grado debe ser positivo").optional(),
  finca: z.string().min(1, "Finca es obligatorio"),
  remesa: z.string().min(1, "Remesa es obligatorio"),
});

export type InsertRegistro = z.infer<typeof insertRegistroSchema>;
export type Registro = typeof registros.$inferSelect;

export const WEEK_START_DATE = new Date(2025, 10, 3);

export function getWeekNumber(date: Date): number {
  const startDate = new Date(WEEK_START_DATE);
  const diffTime = date.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

export function getWeekDateRange(weekNumber: number): { start: Date; end: Date } {
  const start = new Date(WEEK_START_DATE);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export function formatDateSpanish(date: Date): string {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

export const fincasFinanza = pgTable("fincas_finanza", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  central: text("central").notNull(),
  costoCosecha: real("costo_cosecha").notNull().default(0),
  compFlete: real("comp_flete").notNull().default(0),
  valorTonAzucar: real("valor_ton_azucar").notNull().default(0),
  valorMelazaTc: real("valor_melaza_tc").notNull().default(0),
});

export const insertFincaFinanzaSchema = createInsertSchema(fincasFinanza).omit({ id: true }).extend({
  nombre: z.string().min(1, "El nombre es requerido"),
  central: z.string().min(1, "La central es requerida"),
  costoCosecha: z.number().min(0, "Debe ser un valor positivo"),
  compFlete: z.number().min(0, "Debe ser un valor positivo"),
  valorTonAzucar: z.number().min(0, "Debe ser un valor positivo"),
  valorMelazaTc: z.number().min(0, "Debe ser un valor positivo"),
});

export type InsertFincaFinanza = z.infer<typeof insertFincaFinanzaSchema>;
export type FincaFinanza = typeof fincasFinanza.$inferSelect;

export const pagosFinanza = pgTable("pagos_finanza", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha").notNull(),
  finca: text("finca").notNull(),
  central: text("central").notNull(),
  comentario: text("comentario"),
  monto: real("monto").notNull().default(0),
});

export const insertPagoFinanzaSchema = createInsertSchema(pagosFinanza).omit({ id: true }).extend({
  fecha: z.string().min(1, "La fecha es requerida"),
  finca: z.string().min(1, "La finca es requerida"),
  central: z.string().min(1, "La central es requerida"),
  comentario: z.string().optional(),
  monto: z.number().min(0, "Debe ser un valor positivo"),
});

export type InsertPagoFinanza = z.infer<typeof insertPagoFinanzaSchema>;
export type PagoFinanza = typeof pagosFinanza.$inferSelect;
