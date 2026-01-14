import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const registros = pgTable("registros", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: text("fecha").notNull(),
  central: text("central").notNull(),
  cantidad: real("cantidad").notNull(),
  grado: real("grado"),
  finca: text("finca"),
  remesa: text("remesa"),
});

export const insertRegistroSchema = createInsertSchema(registros).omit({ id: true }).extend({
  fecha: z.string().min(1, "La fecha es requerida"),
  central: z.string().min(1, "Seleccione una central"),
  cantidad: z.number().positive("La cantidad debe ser positiva"),
  grado: z.number().min(0, "El grado debe ser positivo").optional(),
  finca: z.string().optional(),
  remesa: z.string().optional(),
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
