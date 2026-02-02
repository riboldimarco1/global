import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";
import { db, pool } from "./db";
import { sql, eq } from "drizzle-orm";
import { insertBancoSchema, insertAlmacenSchema, gridDefaults, insertGridDefaultsSchema } from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

const wsClients = new Set<WebSocket>();

function broadcast(type: string, data?: any) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function serverLog(operation: string, details?: string) {
  broadcast("server_log", { 
    operation, 
    details,
    time: new Date().toLocaleTimeString()
  });
}

function buildDateComparisonSQL(fieldName: string, fechaInicio?: string, fechaFin?: string) {
  const dateOnly = sql.raw(`SUBSTR(${fieldName}, 1, 10)`);
  let clause = sql``;
  
  if (fechaInicio) {
    clause = sql`${clause} AND ${dateOnly} >= ${fechaInicio}`;
  }
  if (fechaFin) {
    clause = sql`${clause} AND ${dateOnly} <= ${fechaFin}`;
  }
  return clause;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws) => {
    wsClients.add(ws);
    console.log(`WebSocket client connected. Total clients: ${wsClients.size}`);
    
    ws.on("close", () => {
      wsClients.delete(ws);
      console.log(`WebSocket client disconnected. Total clients: ${wsClients.size}`);
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      wsClients.delete(ws);
    });
  });
  
  // [HEALTH] Verificar que el servidor está funcionando
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/test-error", (_req, _res, next) => {
      next(new Error("Error de prueba para verificar notificaciones Telegram"));
    });
  }

  // [LOGIN] Validar credenciales del usuario contra la tabla parametros con tipo='claves'
  // Helper function to decode permissions (matching client-side permissionUtils)
  function decodePermissions(encoded: string): { password: string; bancos: string[]; tabs: string[]; menu: string[] } {
    const perms = { password: "", bancos: [] as string[], tabs: [] as string[], menu: [] as string[] };
    if (!encoded) return perms;
    
    const parts = encoded.split("|");
    for (const part of parts) {
      const colonIndex = part.indexOf(":");
      if (colonIndex === -1) continue;
      const key = part.substring(0, colonIndex);
      const value = part.substring(colonIndex + 1);
      if (!value) continue;
      
      switch (key) {
        case "password":
          perms.password = value;
          break;
        case "bancos":
          perms.bancos = value.split(",").filter(Boolean);
          break;
        case "tabs":
          perms.tabs = value.split(",").filter(Boolean);
          break;
        case "menu":
          perms.menu = value.split(",").filter(Boolean);
          break;
      }
    }
    return perms;
  }

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña requeridos" });
      }
      
      // Search for user in parametros with tipo='claves' and nombre=username
      const result = await db.execute(
        sql`SELECT * FROM parametros WHERE tipo = 'claves' AND LOWER(nombre) = LOWER(${username}) AND habilitado = true LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }
      
      const user = result.rows[0] as any;
      const perms = decodePermissions(user.descripcion || "");
      
      if (!perms.password) {
        return res.status(401).json({ error: "Usuario sin contraseña configurada" });
      }
      
      if (password !== perms.password) {
        return res.status(401).json({ error: "Contraseña incorrecta" });
      }
      
      res.json({
        success: true,
        username: user.nombre,
        permissions: {
          bancos: perms.bancos,
          tabs: perms.tabs,
          menu: perms.menu
        }
      });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ error: "Error al validar credenciales" });
    }
  });

  // [DEBUG] Eliminar todos los datos de todas las tablas (solo para desarrollo)
  app.delete("/api/debug/wipe-all-data", async (req, res) => {
    try {
      await storage.wipeAllData();
      res.json({ message: "Todos los datos han sido eliminados" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar datos" });
    }
  });

  // Función auxiliar para parsear fechas en diferentes formatos
  function parseFechaToDate(fecha: string | null | undefined): Date | null {
    if (!fecha) return null;
    // Formato dd/mm/aa o dd/mm/yyyy
    const ddmmMatch = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (ddmmMatch) {
      const [, day, month, year] = ddmmMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    // Formato yyyy-mm-dd (con o sin timestamp)
    const isoMatch = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return new Date(isoMatch[1]);
    }
    return new Date(fecha);
  }

  // Normaliza una fecha a formato yyyy-mm-dd para comparaciones SQL
  function normalizarFechaParaSQL(fecha: string | null | undefined): string | null {
    const date = parseFechaToDate(fecha);
    if (!date || isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10); // yyyy-mm-dd
  }

  // Compara dos fechas y devuelve la menor (más antigua) en formato SQL
  function getFechaMenor(fecha1: string | null | undefined, fecha2: string | null | undefined): string | undefined {
    const norm1 = normalizarFechaParaSQL(fecha1);
    const norm2 = normalizarFechaParaSQL(fecha2);
    
    if (!norm1 && !norm2) return undefined;
    if (!norm1) return norm2 || undefined;
    if (!norm2) return norm1 || undefined;
    
    return norm1 <= norm2 ? norm1 : norm2;
  }

  interface RegistroRecalculado {
    id: string;
    fecha: string;
    monto: number;
    operador: string;
    conciliado: boolean;
    saldo: number;
    saldo_conciliado: number;
  }

  async function recalcularSaldosBanco(bancoNombre: string, desdeFecha?: string): Promise<RegistroRecalculado[]> {
    serverLog("RECÁLCULO INICIO", `Banco: ${bancoNombre}${desdeFecha ? `, desde: ${desdeFecha}` : ''}`);
    const client = await pool.connect();
    const registrosRecalculados: RegistroRecalculado[] = [];
    try {
      await client.query('BEGIN');

      let saldoInicial = 0;
      let saldoConciliadoInicial = 0;
      let registrosQuery: string;
      const queryParams: any[] = [bancoNombre];
      
      // Fecha de reconversión monetaria venezolana (18/08/2018)
      const fechaReconversion = new Date("2018-08-18");
      let reconversionAplicada = false;
      let fechaUltimoRegistroAnterior: Date | null = null;
      
      if (desdeFecha) {
        const prevQuery = `
          SELECT saldo, saldo_conciliado, fecha 
          FROM bancos 
          WHERE banco = $1 AND fecha < $2
          ORDER BY fecha DESC, id DESC
          LIMIT 1
        `;
        const prevResult = await client.query(prevQuery, [bancoNombre, desdeFecha]);
        if (prevResult.rows.length > 0) {
          saldoInicial = Number(prevResult.rows[0].saldo) || 0;
          saldoConciliadoInicial = Number(prevResult.rows[0].saldo_conciliado) || 0;
          fechaUltimoRegistroAnterior = parseFechaToDate(prevResult.rows[0].fecha);
        }
        
        registrosQuery = `SELECT id, monto, operador, fecha, conciliado FROM bancos WHERE banco = $1 AND fecha >= $2 ORDER BY fecha ASC, id ASC`;
        queryParams.push(desdeFecha);
      } else {
        registrosQuery = `SELECT id, monto, operador, fecha, conciliado FROM bancos WHERE banco = $1 ORDER BY fecha ASC, id ASC`;
      }

      const registrosResult = await client.query(registrosQuery, queryParams);
      const registros = registrosResult.rows;

      let saldoAcumulado = saldoInicial;
      let saldoConciliadoAcumulado = saldoConciliadoInicial;
      
      // Determinar si la reconversión ya fue aplicada basándose en la fecha del último registro anterior
      if (fechaUltimoRegistroAnterior && fechaUltimoRegistroAnterior >= fechaReconversion) {
        // El saldo inicial ya está en unidades post-reconversión
        reconversionAplicada = true;
      } else if (desdeFecha) {
        // El saldo inicial está en unidades pre-reconversión
        // Si vamos a procesar registros post-reconversión, necesitamos dividir el saldo inicial
        const fechaInicio = parseFechaToDate(desdeFecha);
        if (fechaInicio && fechaInicio >= fechaReconversion && saldoAcumulado !== 0) {
          saldoAcumulado = saldoAcumulado / 100000;
          saldoConciliadoAcumulado = saldoConciliadoAcumulado / 100000;
          reconversionAplicada = true;
        }
      }
      
      for (const registro of registros) {
        // Verificar si debemos aplicar la reconversión monetaria
        const registroFecha = parseFechaToDate(registro.fecha);
        if (!reconversionAplicada && registroFecha && registroFecha >= fechaReconversion) {
          saldoAcumulado = saldoAcumulado / 100000;
          saldoConciliadoAcumulado = saldoConciliadoAcumulado / 100000;
          reconversionAplicada = true;
        }
        
        const operador = registro.operador || "suma";
        const monto = Number(registro.monto) || 0;
        const estaConciliado = registro.conciliado === true || registro.conciliado === "t";
        
        if (operador === "suma") {
          saldoAcumulado += monto;
          if (estaConciliado) {
            saldoConciliadoAcumulado += monto;
          }
        } else {
          saldoAcumulado -= monto;
          if (estaConciliado) {
            saldoConciliadoAcumulado -= monto;
          }
        }

        const saldoFinal = Math.round(saldoAcumulado * 100) / 100;
        const saldoConciliadoFinal = Math.round(saldoConciliadoAcumulado * 100) / 100;

        await client.query(
          `UPDATE bancos SET saldo = $1, saldo_conciliado = $2 WHERE id = $3`,
          [saldoFinal, saldoConciliadoFinal, registro.id]
        );

        registrosRecalculados.push({
          id: registro.id,
          fecha: registro.fecha,
          monto,
          operador,
          conciliado: estaConciliado,
          saldo: saldoFinal,
          saldo_conciliado: saldoConciliadoFinal
        });
      }

      await client.query('COMMIT');
      serverLog("RECÁLCULO FIN", `Banco: ${bancoNombre}, ${registros.length} registros actualizados`);
      console.log(`Saldos recalculados para banco: ${bancoNombre}, ${registros.length} registros${desdeFecha ? ` desde ${desdeFecha}` : ''}`);
      return registrosRecalculados;
    } catch (error) {
      await client.query('ROLLBACK');
      serverLog("RECÁLCULO ERROR", `Banco: ${bancoNombre}, error: ${error}`);
      console.error(`Error recalculando saldos para banco ${bancoNombre}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [BANCOS] Recalcular todos los saldos de todos los bancos desde cero
  app.post("/api/bancos/recalcular-saldos", async (req, res) => {
    try {
      const bancosResult = await db.execute(sql`SELECT DISTINCT banco FROM bancos WHERE banco IS NOT NULL`);
      const bancos = bancosResult.rows as { banco: string }[];
      
      for (const b of bancos) {
        if (b.banco) {
          await recalcularSaldosBanco(b.banco);
        }
      }
      
      broadcast("bancos_updated");
      res.json({ success: true, bancosRecalculados: bancos.length });
    } catch (error) {
      console.error("Error recalculando todos los saldos:", error);
      res.status(500).json({ error: "Error al recalcular saldos" });
    }
  });

  // [BANCOS] Obtener lista paginada de movimientos bancarios con filtros opcionales
  app.get("/api/bancos", async (req, res) => {
    try {
      const { banco, fechaInicio, fechaFin, limit = "100", offset = "0", codrel, id } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      const offsetNum = parseInt(offset as string) || 0;
      
      let whereClause = sql`WHERE 1=1`;
      
      // Filtrar por ID específico (para buscar registro relacionado)
      if (id) {
        whereClause = sql`${whereClause} AND id = ${id}`;
      }
      if (banco && banco !== "all") {
        whereClause = sql`${whereClause} AND banco = ${banco}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      if (codrel) {
        whereClause = sql`${whereClause} AND codrel = ${codrel}`;
      }
      
      // Get total count with filters
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM bancos ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      // Get paginated data
      const query = sql`SELECT * FROM bancos ${whereClause} ORDER BY fecha DESC, id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);
      
      res.json({ 
        data: result.rows, 
        total,
        hasMore: offsetNum + result.rows.length < total
      });
    } catch (error) {
      console.error("Error fetching bancos:", error);
      res.status(500).json({ error: "Error al obtener bancos" });
    }
  });
  
  // [BANCOS] Obtener lista única de nombres de bancos para los filtros
  app.get("/api/bancos/lista", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT banco FROM bancos ORDER BY banco");
      res.json(result.rows.map((r: any) => r.banco));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de bancos" });
    }
  });

  // [BANCOS] Exportar todos los registros de un banco para Excel (sin límite)
  app.get("/api/bancos/export", async (req, res) => {
    try {
      const { banco } = req.query;
      if (!banco || banco === "all") {
        return res.status(400).json({ error: "Debe especificar un banco" });
      }
      
      const result = await db.execute(
        sql`SELECT fecha, monto, saldo, saldo_conciliado FROM bancos WHERE banco = ${banco} ORDER BY fecha ASC, id ASC`
      );
      
      res.json({ data: result.rows });
    } catch (error) {
      res.status(500).json({ error: "Error al exportar datos del banco" });
    }
  });

  // [BANCOS] Obtener un movimiento bancario específico por ID
  app.get("/api/bancos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.execute(sql`SELECT * FROM bancos WHERE id = ${id}`);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener banco" });
    }
  });

  // [BANCOS] Crear nuevo movimiento bancario y recalcular saldos
  app.post("/api/bancos", async (req, res) => {
    try {
      const body = { ...req.body };
      
      // Convertir campos numéricos a strings para Zod/Drizzle (numeric espera string)
      const numericFields = ['monto', 'montodolares', 'saldo', 'saldo_conciliado'];
      for (const field of numericFields) {
        if (body[field] !== undefined && typeof body[field] === 'number') {
          body[field] = String(body[field]);
        }
      }
      
      if (body.montodolares !== undefined) {
        body.montoDolares = body.montodolares;
        delete body.montodolares;
      }
      if (body.saldo_conciliado !== undefined) {
        body.saldoConciliado = body.saldo_conciliado;
        delete body.saldo_conciliado;
      }
      
      // Agregar timestamp a la fecha si no tiene (formato: yyyy-mm-dd HH:mm:ss.microseconds)
      if (body.fecha) {
        if (body.fecha.length === 10) { // Solo fecha yyyy-mm-dd
          const now = new Date();
          const timestamp = now.toISOString().slice(11, 23).replace('T', ' ') + now.getMilliseconds().toString().padStart(3, '0');
          body.fecha = body.fecha + ' ' + now.toTimeString().slice(0, 8) + '.' + String(now.getTime() % 1000000).padStart(6, '0');
        }
      } else {
        const now = new Date();
        body.fecha = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8) + '.' + String(now.getTime() % 1000000).padStart(6, '0');
      }
      
      const parseResult = insertBancoSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const banco = await storage.createBanco(parseResult.data);
      
      if (banco.banco) {
        const fechaNorm = normalizarFechaParaSQL(banco.fecha);
        let fechaDesdeRecalculo = fechaNorm;
        
        // Buscar fecha inmediatamente anterior al nuevo registro
        if (fechaNorm) {
          const prevResult = await db.execute(sql`
            SELECT fecha FROM bancos 
            WHERE banco = ${banco.banco} AND fecha < ${fechaNorm} AND id != ${banco.id}
            ORDER BY fecha DESC, id DESC
            LIMIT 1
          `);
          if (prevResult.rows.length > 0) {
            fechaDesdeRecalculo = normalizarFechaParaSQL((prevResult.rows[0] as any).fecha) || fechaNorm;
          }
        }
        
        if (fechaDesdeRecalculo) {
          await recalcularSaldosBanco(banco.banco, fechaDesdeRecalculo);
        }
      }
      
      const bancoActualizado = await db.execute(sql`SELECT * FROM bancos WHERE id = ${banco.id}`);
      const registroFinal = bancoActualizado.rows[0] || banco;
      
      broadcast("bancos_updated");
      res.status(201).json(registroFinal);
    } catch (error) {
      res.status(500).json({ error: "Error al crear banco" });
    }
  });

  // [BANCOS] Actualizar movimiento bancario y recalcular saldos si cambió monto/fecha/conciliado
  app.put("/api/bancos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Obtener registro anterior completo para comparar campos que afectan saldos
      const bancoAnteriorResult = await db.execute(sql`SELECT banco, fecha, monto, montodolares, conciliado FROM bancos WHERE id = ${id}`);
      if (!bancoAnteriorResult.rows[0]) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      const anterior = bancoAnteriorResult.rows[0] as any;
      const bancoAnterior = anterior.banco;
      const fechaAnterior = anterior.fecha;
      const montoAnterior = anterior.monto;
      const montoDolaresAnterior = anterior.montodolares;
      const conciliadoAnteriorRaw = anterior.conciliado;
      const conciliadoAnterior = conciliadoAnteriorRaw === true || conciliadoAnteriorRaw === "t";
      
      const body = { ...req.body };
      
      // Convertir campos numéricos a strings para Zod/Drizzle (numeric espera string)
      const numericFields = ['monto', 'montodolares', 'saldo', 'saldo_conciliado'];
      for (const field of numericFields) {
        if (body[field] !== undefined && typeof body[field] === 'number') {
          body[field] = String(body[field]);
        }
      }
      
      if (body.montodolares !== undefined) {
        body.montoDolares = body.montodolares;
        delete body.montodolares;
      }
      if (body.saldo_conciliado !== undefined) {
        body.saldoConciliado = body.saldo_conciliado;
        delete body.saldo_conciliado;
      }
      
      const parseResult = insertBancoSchema.partial().safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const banco = await storage.updateBanco(id, parseResult.data);
      if (!banco) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      
      // Solo recalcular si cambiaron campos que afectan saldos: monto, montoDolares, fecha, banco, o conciliado
      const cambioBanco = bancoAnterior !== banco.banco;
      const cambioFecha = fechaAnterior !== banco.fecha;
      const cambioMonto = montoAnterior !== banco.monto;
      const cambioMontoDolares = montoDolaresAnterior !== banco.montodolares;
      const conciliadoNuevo = banco.conciliado === true || (banco.conciliado as any) === "t";
      const cambioConciliado = conciliadoAnterior !== conciliadoNuevo;
      const necesitaRecalculo = cambioBanco || cambioFecha || cambioMonto || cambioMontoDolares || cambioConciliado;
      
      // Log de actualización
      const cambios: string[] = [];
      if (cambioBanco) cambios.push(`banco: ${bancoAnterior} → ${banco.banco}`);
      if (cambioFecha) cambios.push(`fecha: ${fechaAnterior} → ${banco.fecha}`);
      if (cambioMonto) cambios.push(`monto: ${montoAnterior} → ${banco.monto}`);
      if (cambioMontoDolares) cambios.push(`montoDolares: ${montoDolaresAnterior} → ${banco.montodolares}`);
      if (cambioConciliado) cambios.push(`conciliado: ${conciliadoAnterior} → ${banco.conciliado}`);
      if (cambios.length > 0) {
        serverLog("PUT BANCO", cambios.join(", "));
      }
      
      let registrosRecalculados: RegistroRecalculado[] = [];
      
      if (necesitaRecalculo) {
        // Usar la fecha más antigua entre la anterior y la nueva
        let fechaDesde = getFechaMenor(fechaAnterior, banco.fecha);
        
        if (banco.banco && fechaDesde) {
          // Buscar fecha inmediatamente anterior para recalcular desde ahí
          const prevResult = await db.execute(sql`
            SELECT fecha FROM bancos 
            WHERE banco = ${banco.banco} AND fecha < ${fechaDesde} AND id != ${id}
            ORDER BY fecha DESC, id DESC
            LIMIT 1
          `);
          if (prevResult.rows.length > 0) {
            fechaDesde = normalizarFechaParaSQL((prevResult.rows[0] as any).fecha) || fechaDesde;
          }
          
          registrosRecalculados = await recalcularSaldosBanco(banco.banco, fechaDesde);
        }
        
        if (cambioBanco && bancoAnterior) {
          const fechaAnteriorNorm = normalizarFechaParaSQL(fechaAnterior);
          if (fechaAnteriorNorm) {
            // Buscar fecha inmediatamente anterior en el banco anterior
            const prevResultAnterior = await db.execute(sql`
              SELECT fecha FROM bancos 
              WHERE banco = ${bancoAnterior} AND fecha < ${fechaAnteriorNorm}
              ORDER BY fecha DESC, id DESC
              LIMIT 1
            `);
            const fechaDesdeAnterior = prevResultAnterior.rows.length > 0 
              ? normalizarFechaParaSQL((prevResultAnterior.rows[0] as any).fecha) || fechaAnteriorNorm
              : fechaAnteriorNorm;
            
            const registrosBancoAnterior = await recalcularSaldosBanco(bancoAnterior, fechaDesdeAnterior);
            registrosRecalculados = [...registrosRecalculados, ...registrosBancoAnterior];
          }
        }
      }
      
      const bancoActualizado = await db.execute(sql`SELECT * FROM bancos WHERE id = ${banco.id}`);
      const registroFinal = bancoActualizado.rows[0] || banco;
      
      broadcast("bancos_updated");
      
      // Devolver registro actualizado junto con lista de registros recalculados
      console.log(`[BANCOS PUT] Devolviendo respuesta con ${registrosRecalculados.length} registros recalculados para banco: ${banco.banco}`);
      res.json({
        ...registroFinal,
        _registrosRecalculados: registrosRecalculados,
        _bancoNombre: banco.banco
      });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar banco" });
    }
  });

  // [BANCOS] Eliminar movimiento bancario, limpiar relaciones y recalcular saldos
  app.delete("/api/bancos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const bancoResult = await db.execute(sql`SELECT banco, fecha, codrel FROM bancos WHERE id = ${id}`);
      const bancoNombre = (bancoResult.rows[0] as any)?.banco;
      const fechaRegistro = (bancoResult.rows[0] as any)?.fecha;
      const adminId = (bancoResult.rows[0] as any)?.codrel;
      
      if (!bancoNombre) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      
      // Buscar fecha inmediatamente anterior ANTES de borrar
      const fechaNormRegistro = normalizarFechaParaSQL(fechaRegistro);
      let fechaDesdeRecalculo: string | undefined;
      
      if (fechaNormRegistro) {
        const prevResult = await db.execute(sql`
          SELECT fecha FROM bancos 
          WHERE banco = ${bancoNombre} AND fecha < ${fechaNormRegistro} AND id != ${id}
          ORDER BY fecha DESC, id DESC
          LIMIT 1
        `);
        if (prevResult.rows.length > 0) {
          fechaDesdeRecalculo = normalizarFechaParaSQL((prevResult.rows[0] as any).fecha) || fechaNormRegistro;
        } else {
          // No hay registro anterior, usar la fecha del registro a borrar
          fechaDesdeRecalculo = fechaNormRegistro;
        }
      }
      
      const deleted = await storage.deleteBanco(id);
      if (!deleted) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      
      // Limpiar relación en el registro de administración correspondiente
      if (adminId) {
        await db.execute(sql`UPDATE administracion SET codrel = NULL, relacionado = false WHERE id = ${adminId}`);
        broadcast("administracion_updated");
      }
      
      // Recalcular desde la fecha inmediatamente anterior
      if (fechaDesdeRecalculo) {
        await recalcularSaldosBanco(bancoNombre, fechaDesdeRecalculo);
      }
      
      broadcast("bancos_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar banco" });
    }
  });

  // [ADMIN] Obtener lista paginada de registros de administración con filtros
  app.get("/api/administracion", async (req, res) => {
    try {
      const { id, tipo, unidad, fechaInicio, fechaFin, codrel, limit = "100", offset = "0" } = req.query;
      console.log("[GET /api/administracion] Query params:", { fechaInicio, fechaFin, tipo, unidad });
      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      const offsetNum = parseInt(offset as string) || 0;
      
      let whereClause = sql`WHERE 1=1`;
      
      // Filtrar por ID específico (para buscar registro relacionado)
      if (id) {
        whereClause = sql`${whereClause} AND id = ${id}`;
      }
      if (tipo && tipo !== "all") {
        whereClause = sql`${whereClause} AND tipo = ${tipo}`;
      }
      if (unidad && unidad !== "all") {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClauseAdmin = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClauseAdmin}`;
      if (codrel) {
        whereClause = sql`${whereClause} AND codrel = ${codrel}`;
      }
      
      // Get total count with filters
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM administracion ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      // Get paginated data
      const query = sql`SELECT * FROM administracion ${whereClause} ORDER BY fecha DESC, id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);
      
      res.json({ 
        data: result.rows, 
        total,
        hasMore: offsetNum + result.rows.length < total
      });
    } catch (error) {
      console.error("Error fetching administracion:", error);
      res.status(500).json({ error: "Error al obtener registros de administración" });
    }
  });

  // [ADMIN] Crear nuevo registro de administración y vincular con bancos si aplica
  app.post("/api/administracion", async (req, res) => {
    try {
      const data = req.body;
      console.log("[POST /api/administracion] Received data:", JSON.stringify(data, null, 2));
      console.log("[POST /api/administracion] codrel:", data.codrel);
      const id = crypto.randomUUID();
      // Agregar timestamp a fecha (formato: yyyy-mm-dd HH:mm:ss.microseconds)
      const now = new Date();
      const timestamp = now.toTimeString().slice(0, 8) + '.' + String(now.getTime() % 1000000).padStart(6, '0');
      let fecha = data.fecha;
      if (fecha && fecha.length === 10) {
        fecha = fecha + ' ' + timestamp;
      } else if (!fecha) {
        fecha = now.toISOString().slice(0, 10) + ' ' + timestamp;
      }
      
      await db.execute(sql`
        INSERT INTO administracion (id, fecha, tipo, descripcion, monto, montodolares, unidad, capital, utility, operacion, producto, cantidad, insumo, comprobante, proveedor, cliente, personal, actividad, propietario, anticipo, codrel, relacionado)
        VALUES (
          ${id},
          ${fecha},
          ${data.tipo || 'facturas'},
          ${data.descripcion || ''},
          ${data.monto || 0},
          ${data.montodolares || 0},
          ${data.unidad || ''},
          ${data.capital || false},
          ${data.utility || false},
          ${data.operacion || ''},
          ${data.producto || ''},
          ${data.cantidad || 0},
          ${data.insumo || ''},
          ${data.comprobante || ''},
          ${data.proveedor || ''},
          ${data.cliente || ''},
          ${data.personal || ''},
          ${data.actividad || ''},
          ${data.propietario || ''},
          ${data.anticipo || false},
          ${data.codrel || null},
          ${data.codrel ? true : false}
        )
      `);
      
      if (data.codrel) {
        console.log("[POST /api/administracion] Updating bancos with codrel:", id, "for codrel:", data.codrel);
        await db.execute(sql`UPDATE bancos SET relacionado = true, codrel = ${id} WHERE id = ${data.codrel}`);
        console.log("[POST /api/administracion] Bancos updated successfully");
        broadcast("bancos_updated");
      }
      
      broadcast("administracion_updated");
      res.status(201).json({ id, ...data });
    } catch (error) {
      console.error("Error creating administracion record:", error);
      res.status(500).json({ error: "Error al crear registro de administración" });
    }
  });

  // [ALMACEN] Obtener lista de movimientos de almacén con filtros opcionales
  app.get("/api/almacen", async (req, res) => {
    try {
      const { unidad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      const limitNum = limit ? parseInt(limit as string) : 100;
      const offsetNum = offset ? parseInt(offset as string) : 0;
      
      let whereClause = sql`WHERE 1=1`;
      if (unidad) {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM almacen ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM almacen ${whereClause} ORDER BY fecha DESC, id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);
      
      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener registros de almacén" });
    }
  });
  
  // [COSECHA] Obtener lista de registros de cosecha con filtros opcionales
  app.get("/api/cosecha", async (req, res) => {
    try {
      const { unidad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      const limitNum = limit ? parseInt(limit as string) : 100;
      const offsetNum = offset ? parseInt(offset as string) : 0;
      
      let whereClause = sql`WHERE 1=1`;
      if (unidad) {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM cosecha ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM cosecha ${whereClause} ORDER BY fecha DESC, id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);
      
      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener registros de cosecha" });
    }
  });

  // [CHEQUES] Obtener lista de cheques con filtros opcionales
  app.get("/api/cheques", async (req, res) => {
    try {
      const { banco, unidad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      const limitNum = limit ? parseInt(limit as string) : 100;
      const offsetNum = offset ? parseInt(offset as string) : 0;
      
      let whereClause = sql`WHERE 1=1`;
      if (banco) {
        whereClause = sql`${whereClause} AND banco = ${banco}`;
      }
      if (unidad) {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM cheques ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM cheques ${whereClause} ORDER BY fecha DESC, id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);
      
      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener cheques" });
    }
  });

  // [TRANSFERENCIAS] Obtener lista de transferencias bancarias con filtros
  app.get("/api/transferencias", async (req, res) => {
    try {
      const { banco, unidad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      const limitNum = limit ? parseInt(limit as string) : 100;
      const offsetNum = offset ? parseInt(offset as string) : 0;
      
      let whereClause = sql`WHERE 1=1`;
      if (banco) {
        whereClause = sql`${whereClause} AND banco = ${banco}`;
      }
      if (unidad) {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM transferencias ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM transferencias ${whereClause} ORDER BY fecha DESC, id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);
      
      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener transferencias" });
    }
  });

  // [TRANSFERENCIAS] Obtener máximo número de referencia (comprobante)
  app.get("/api/transferencias/max-numero", async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT COALESCE(MAX(CAST(comprobante AS INTEGER)), 0) as max_numero FROM transferencias WHERE comprobante IS NOT NULL AND comprobante ~ '^[0-9]+$'`);
      const maxNumero = parseInt((result.rows[0] as any).max_numero) || 0;
      res.json({ maxNumero });
    } catch (error) {
      console.error("Error getting max numero:", error);
      res.json({ maxNumero: 0 });
    }
  });

  // [TRANSFERENCIAS] Actualizar comprobante en múltiples registros después de generar TXT
  const actualizarComprobantesSchema = z.object({
    ids: z.array(z.string().uuid()).min(1, "Se requiere al menos un ID"),
    comprobanteInicial: z.number().int().positive()
  });
  
  app.post("/api/transferencias/actualizar-comprobantes", async (req, res) => {
    try {
      const parsed = actualizarComprobantesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Datos inválidos" });
      }
      
      const { ids, comprobanteInicial } = parsed.data;
      const comprobante = String(comprobanteInicial);
      
      // Actualizar todos los registros con el MISMO comprobante y marcar como transferido
      for (const id of ids) {
        await db.execute(sql`UPDATE transferencias SET comprobante = ${comprobante}, transferido = true WHERE id = ${id}`);
      }
      
      broadcast("transferencias_updated");
      res.json({ success: true, actualizados: ids.length, comprobante: comprobanteInicial });
    } catch (error) {
      console.error("Error actualizando comprobantes:", error);
      res.status(500).json({ error: "Error al actualizar comprobantes" });
    }
  });

  // [TRANSFERENCIAS] Enviar a bancos y administración - lógica FoxPro
  app.post("/api/transferencias/enviar", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de IDs" });
      }

      const resultados = { 
        procesados: 0, 
        bancos: 0, 
        administracion: 0, 
        errores: [] as string[],
        detalles: [] as { proveedor: string; personal: string; monto: number; resta: number; descuento: number; banco: string; bancoCreado: boolean; adminCreado: boolean; descuentoCreado: boolean }[]
      };
      
      // Acumular bancos afectados para recalcular saldos al final
      const bancosAfectados = new Set<string>();
      
      for (const id of ids) {
        try {
          // Obtener la transferencia
          const transResult = await db.execute(sql`SELECT * FROM transferencias WHERE id = ${id}`);
          if (!transResult.rows[0]) {
            resultados.errores.push(`Transferencia ${id} no encontrada`);
            continue;
          }
          const trans = transResult.rows[0] as any;
          
          // Solo procesar si transferido=true (ya se generó el TXT)
          const esTransferido = trans.transferido === true || trans.transferido === "t" || trans.transferido === "true";
          if (!esTransferido) {
            resultados.errores.push(`${trans.proveedor || trans.personal || id}: no transferida aún`);
            continue;
          }

          // Solo procesar si contabilizado=false
          const yaContabilizado = trans.contabilizado === true || trans.contabilizado === "t" || trans.contabilizado === "true";
          if (yaContabilizado) {
            resultados.errores.push(`${trans.proveedor || trans.personal || id}: ya contabilizada`);
            continue;
          }

          const resta = parseFloat(trans.resta) || 0;
          const monto = parseFloat(trans.monto) || 0;
          const descuento = parseFloat(trans.descuento) || 0;

          // Obtener tasa de cambio del dólar para la fecha
          let tasaDolar = 1;
          if (trans.fecha) {
            const tasaResult = await db.execute(
              sql`SELECT valor FROM parametros WHERE tipo = 'dolar' AND fecha = ${trans.fecha} LIMIT 1`
            );
            if (tasaResult.rows[0]) {
              tasaDolar = parseFloat((tasaResult.rows[0] as any).valor) || 1;
            }
          }

          let bancoId: string | null = null;
          let bancoCreado = false;
          let adminCreado = false;
          let descuentoCreado = false;

          // A. Si resta != 0, crear registro en BANCOS
          if (resta !== 0) {
            const descripcionBanco = `${trans.proveedor || ''}${trans.personal ? ' ' + trans.personal : ''} ${trans.descripcion || ''}`.trim();
            const montoDolaresBanco = tasaDolar > 0 ? resta / tasaDolar : 0;
            const numeroComprobante = trans.comprobante ? parseInt(trans.comprobante) : null;

            const bancoResult = await db.execute(sql`
              INSERT INTO bancos (fecha, monto, montodolares, numero, operacion, descripcion, conciliado, utility, banco, relacionado, codrel)
              VALUES (
                ${trans.fecha},
                ${resta},
                ${montoDolaresBanco},
                ${numeroComprobante},
                'transferencia a terceros',
                ${descripcionBanco},
                false,
                false,
                ${trans.banco},
                false,
                null
              )
              RETURNING id
            `);
            bancoId = (bancoResult.rows[0] as any)?.id;
            resultados.bancos++;
            bancoCreado = true;
            
            if (trans.banco) {
              bancosAfectados.add(trans.banco);
            }
          }

          // B. Si monto != 0, crear registro en ADMINISTRACION
          if (monto !== 0) {
            const tipoAdmin = trans.personal ? 'nomina' : 'facturas';
            const descripcionAdmin = `${(trans.banco || '').toLowerCase()} - ${trans.descripcion || ''}`;
            const montoDolaresAdmin = tasaDolar > 0 ? monto / tasaDolar : 0;

            const adminResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, descripcion, monto, montodolares, unidad, capital, utility, operacion, insumo, comprobante, proveedor, personal, actividad, relacionado, codrel)
              VALUES (
                ${trans.fecha},
                ${tipoAdmin},
                ${descripcionAdmin},
                ${monto},
                ${montoDolaresAdmin},
                ${trans.unidad},
                false,
                false,
                'transferencia a terceros',
                ${trans.insumo},
                ${trans.comprobante},
                ${trans.proveedor},
                ${trans.personal},
                ${trans.actividad},
                ${bancoId ? true : false},
                ${bancoId}
              )
              RETURNING id
            `);
            const adminId = (adminResult.rows[0] as any)?.id;
            resultados.administracion++;
            adminCreado = true;

            // Relacionar bancos con administracion
            if (adminId && bancoId) {
              await db.execute(sql`UPDATE bancos SET relacionado = true, codrel = ${adminId} WHERE id = ${bancoId}`);
            }
          }

          // C. Si descuento != 0, crear segundo registro en ADMINISTRACION
          if (descuento !== 0) {
            const tipoAdminDesc = trans.personal ? 'nomina' : 'facturas';
            let descripcionDesc = '';
            if (descuento < 0) {
              // Negativo: descuento o devolución de préstamo
              if (yaContabilizado) {
                descripcionDesc = `descuento por comida u otro concepto ${trans.descripcion || ''}`;
              } else {
                descripcionDesc = `devolucion de prestamo ${trans.descripcion || ''}`;
              }
            } else {
              // Positivo: préstamo
              descripcionDesc = `prestamo ${trans.descripcion || ''}`;
            }
            const montoDolaresDesc = tasaDolar > 0 ? descuento / tasaDolar : 0;

            await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, descripcion, monto, montodolares, unidad, capital, utility, operacion, insumo, comprobante, proveedor, personal, actividad, relacionado, codrel)
              VALUES (
                ${trans.fecha},
                ${tipoAdminDesc},
                ${descripcionDesc},
                ${descuento},
                ${montoDolaresDesc},
                ${trans.unidad},
                true,
                false,
                'transferencia',
                ${trans.insumo},
                ${trans.comprobante},
                ${trans.proveedor},
                ${trans.personal},
                ${trans.actividad},
                ${bancoId ? true : false},
                ${bancoId}
              )
            `);
            resultados.administracion++;
            descuentoCreado = true;
          }

          // Marcar la transferencia como contabilizada
          await db.execute(sql`UPDATE transferencias SET contabilizado = true WHERE id = ${id}`);
          
          resultados.detalles.push({
            proveedor: trans.proveedor || '',
            personal: trans.personal || '',
            monto,
            resta,
            descuento,
            banco: trans.banco || '',
            bancoCreado,
            adminCreado,
            descuentoCreado
          });
          resultados.procesados++;
        } catch (error) {
          resultados.errores.push(`Error en ${id}: ${(error as Error).message}`);
        }
      }
      
      // Recalcular saldos de todos los bancos afectados usando la función existente
      for (const bancoNombre of Array.from(bancosAfectados)) {
        try {
          await recalcularSaldosBanco(bancoNombre);
        } catch (error) {
          // Silently continue if saldo recalculation fails
        }
      }
      
      broadcast("transferencias_updated");
      broadcast("bancos_updated");
      broadcast("administracion_updated");

      res.json(resultados);
    } catch (error) {
      console.error("Error en enviar transferencias:", error);
      res.status(500).json({ error: "Error al procesar transferencias" });
    }
  });

  // [PARAMETROS] Obtener lista de parámetros del sistema con filtros opcionales
  app.get("/api/parametros", async (req, res) => {
    try {
      const { tipo, habilitado, unidad } = req.query;
      let parametros = await storage.getAllParametros();
      
      if (tipo) {
        const tipoStr = String(tipo).toLowerCase();
        parametros = parametros.filter(p => {
          const pTipo = (p.tipo || "").toLowerCase();
          if (pTipo === tipoStr) return true;
          if (tipoStr.endsWith("es") && (pTipo === tipoStr.slice(0, -2) || pTipo === tipoStr.slice(0, -1))) return true;
          if (tipoStr.endsWith("s") && pTipo === tipoStr.slice(0, -1)) return true;
          if (pTipo === tipoStr + "s" || pTipo === tipoStr + "es") return true;
          return false;
        });
      }
      
      if (habilitado === "true" || habilitado === "si") {
        parametros = parametros.filter(p => p.habilitado === true || p.habilitado === "t");
      }
      
      // Filtrar por unidad: mostrar opciones que coincidan con la unidad o que no tengan unidad definida
      if (unidad && unidad !== "all") {
        parametros = parametros.filter(p => !p.unidad || p.unidad === "" || p.unidad === unidad);
      }
      
      res.json(parametros);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener parámetros" });
    }
  });

  // [TASA] Obtener tasa de cambio del dólar para una fecha específica
  app.get("/api/tasa-cambio/:fecha", async (req, res) => {
    try {
      const { fecha } = req.params;
      const result = await db.execute(
        sql`SELECT valor FROM parametros WHERE tipo = 'dolar' AND fecha = ${fecha}::date LIMIT 1`
      );
      if (result.rows.length > 0) {
        res.json({ tasa: (result.rows[0] as any).valor });
      } else {
        res.json({ tasa: null });
      }
    } catch (error) {
      console.error("Error getting tasa cambio:", error);
      res.status(500).json({ error: "Error al obtener tasa de cambio" });
    }
  });

  // [PARAMETROS] Crear nuevo parámetro del sistema
  app.post("/api/parametros", async (req, res) => {
    try {
      const data = req.body;
      console.log("Creating parametro with data:", JSON.stringify(data, null, 2));
      const result = await storage.createParametro(data);
      broadcast("parametros_updated");
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating parametro:", error);
      res.status(500).json({ error: "Error al crear parámetro" });
    }
  });

  // [PARAMETROS] Actualizar un parámetro existente
  app.patch("/api/parametros/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updated = await storage.updateParametro(id, updateData);
      if (updated) {
        broadcast("parametros_updated");
        res.json(updated);
      } else {
        res.status(404).json({ error: "Parámetro no encontrado" });
      }
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar parámetro" });
    }
  });

  // [PARAMETROS] Eliminar un parámetro del sistema
  app.delete("/api/parametros/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteParametro(id);
      // Idempotente: devolver 200 con indicador de si realmente se borró
      if (deleted) {
        broadcast("parametros_updated");
      }
      res.json({ success: true, deleted });
    } catch (error) {
      console.error("[DELETE /api/parametros/:id] Error:", error);
      res.status(500).json({ error: "Error al eliminar parámetro" });
    }
  });

  // [BULK] Eliminar múltiples registros de una tabla y limpiar relaciones
  app.post("/api/bulk-delete", async (req, res) => {
    try {
      const { table, ids } = req.body;
      
      if (!table || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Se requiere tabla e IDs válidos" });
      }

      let deletedCount = 0;
      const tableHandlers: Record<string, (id: string) => Promise<boolean>> = {
        bancos: (id) => storage.deleteBanco(id),
        almacen: (id) => storage.deleteAlmacen(id),
        cosecha: (id) => storage.deleteCosecha(id),
        cheques: (id) => storage.deleteCheque(id),
        transferencias: (id) => storage.deleteTransferencia(id),
        administracion: (id) => storage.deleteAdministracion(id),
        parametros: (id) => storage.deleteParametro(id),
      };

      const deleteHandler = tableHandlers[table];
      if (!deleteHandler) {
        return res.status(400).json({ error: `Tabla no soportada: ${table}` });
      }

      // Lógica especial para limpiar relaciones bidireccionales
      if (table === "bancos") {
        // Primero recopilar todas las relaciones y limpiarlas
        const adminIdsToClean: string[] = [];
        for (const id of ids) {
          try {
            const bancoResult = await db.execute(sql`SELECT codrel FROM bancos WHERE id = ${String(id)}`);
            const adminId = (bancoResult.rows[0] as any)?.codrel;
            if (adminId) {
              adminIdsToClean.push(adminId);
            }
          } catch (e) {
            console.error(`Error obteniendo relación para banco/${id}:`, e);
          }
        }
        
        // Limpiar relaciones en administración primero
        for (const adminId of adminIdsToClean) {
          try {
            await db.execute(sql`UPDATE administracion SET codrel = NULL, relacionado = false WHERE id = ${adminId}`);
          } catch (e) {
            console.error(`Error limpiando relación en administracion/${adminId}:`, e);
          }
        }
        
        // Luego eliminar los bancos
        for (const id of ids) {
          try {
            const deleted = await deleteHandler(String(id));
            if (deleted) deletedCount++;
          } catch (e) {
            console.error(`Error borrando ${table}/${id}:`, e);
          }
        }
        broadcast("bancos_updated");
        broadcast("administracion_updated");
        return res.json({ deleted: deletedCount, total: ids.length });
      }

      if (table === "administracion") {
        // Primero recopilar todas las relaciones y limpiarlas
        const bancoIdsToClean: string[] = [];
        for (const id of ids) {
          try {
            const adminResult = await db.execute(sql`SELECT codrel FROM administracion WHERE id = ${String(id)}`);
            const bancoId = (adminResult.rows[0] as any)?.codrel;
            if (bancoId) {
              bancoIdsToClean.push(bancoId);
            }
          } catch (e) {
            console.error(`Error obteniendo relación para administracion/${id}:`, e);
          }
        }
        
        // Limpiar relaciones en bancos primero
        for (const bancoId of bancoIdsToClean) {
          try {
            await db.execute(sql`UPDATE bancos SET codrel = NULL, relacionado = false WHERE id = ${bancoId}`);
          } catch (e) {
            console.error(`Error limpiando relación en bancos/${bancoId}:`, e);
          }
        }
        
        // Luego eliminar las administraciones
        for (const id of ids) {
          try {
            const deleted = await deleteHandler(String(id));
            if (deleted) deletedCount++;
          } catch (e) {
            console.error(`Error borrando ${table}/${id}:`, e);
          }
        }
        broadcast("administracion_updated");
        broadcast("bancos_updated");
        return res.json({ deleted: deletedCount, total: ids.length });
      }

      // Para otras tablas, eliminar normalmente
      for (const id of ids) {
        try {
          const deleted = await deleteHandler(String(id));
          if (deleted) deletedCount++;
        } catch (e) {
          console.error(`Error borrando ${table}/${id}:`, e);
        }
      }

      broadcast(`${table}_updated`);
      res.json({ deleted: deletedCount, total: ids.length });
    } catch (error) {
      console.error("Error en bulk-delete:", error);
      res.status(500).json({ error: "Error al eliminar registros" });
    }
  });

  // [EXPORT] Exportar todos los datos en formato JSON
  app.post("/api/export", async (req, res) => {
    try {
      const tables = ['administracion', 'almacen', 'bancos', 'cheques', 'cosecha', 'parametros', 'transferencias'];
      const exportData: Record<string, any[]> = {};
      
      for (const table of tables) {
        const result = await db.execute(`SELECT * FROM "${table}"`);
        exportData[table] = result.rows as any[];
      }
      
      res.json({
        version: "2.0",
        exportDate: new Date().toISOString(),
        tables: exportData
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Error al exportar datos" });
    }
  });

  const exportFiles = new Map<string, { data: Buffer; filename: string; createdAt: Date }>();

  // [EXPORT] Exportar datos con progreso en tiempo real (Server-Sent Events)
  app.get("/api/export-all-data-progress", async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendProgress = (phase: string, detail: string, progress: number, extra?: Record<string, any>) => {
      res.write(`data: ${JSON.stringify({ phase, detail, progress, ...extra })}\n\n`);
    };

    try {
      const tables = ['administracion', 'almacen', 'bancos', 'cheques', 'cosecha', 'parametros', 'transferencias'];
      const exportData: Record<string, any[]> = {};
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        sendProgress('loading', `Cargando ${table}...`, Math.round(((i + 1) / tables.length) * 60));
        const result = await db.execute(`SELECT * FROM "${table}"`);
        exportData[table] = result.rows as any[];
      }
      
      sendProgress('preparing', 'Preparando JSON...', 70);
      const jsonData = JSON.stringify({
        version: "2.0",
        exportDate: new Date().toISOString(),
        tables: exportData
      }, null, 2);

      sendProgress('compressing', 'Comprimiendo archivo...', 85);
      const zip = new AdmZip();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `export_${dateStr}.zip`;
      zip.addFile("export.json", Buffer.from(jsonData, 'utf-8'));
      const zipBuffer = zip.toBuffer();

      const exportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      exportFiles.set(exportId, { data: zipBuffer, filename, createdAt: new Date() });

      setTimeout(() => exportFiles.delete(exportId), 10 * 60 * 1000);

      sendProgress('complete', 'Exportación completada', 100, { exportId, filename });
    } catch (error) {
      console.error("Error in export-all-data-progress:", error);
      sendProgress('error', 'Error al exportar datos', 0);
    }
  });

  // [EXPORT] Descargar archivo ZIP generado por la exportación
  app.get("/api/export-download/:exportId", (req, res) => {
    const { exportId } = req.params;
    const file = exportFiles.get(exportId);
    
    if (!file) {
      return res.status(404).json({ error: "Archivo no encontrado o expirado" });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', file.data.length);
    res.send(file.data);
  });

  // [IMPORT] Importar datos desde archivo JSON/ZIP con progreso en tiempo real
  app.post("/api/import-data", upload.single("file"), async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendProgress = (phase: string, detail: string, progress: number) => {
      res.write(`data: ${JSON.stringify({ phase, detail, progress })}\n\n`);
    };

    try {
      if (!req.file) {
        res.write(`data: ${JSON.stringify({ phase: 'error', detail: 'No se proporcionó archivo' })}\n\n`);
        res.end();
        return;
      }

      sendProgress('reading', 'Leyendo archivo...', 10);

      let jsonData: string;
      const fileName = req.file.originalname.toLowerCase();
      
      if (fileName.endsWith('.zip')) {
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();
        const jsonEntry = entries.find(e => e.entryName.endsWith('.json'));
        if (!jsonEntry) {
          res.write(`data: ${JSON.stringify({ phase: 'error', detail: 'El archivo ZIP no contiene un archivo JSON' })}\n\n`);
          res.end();
          return;
        }
        jsonData = zip.readAsText(jsonEntry);
      } else {
        jsonData = req.file.buffer.toString('utf-8');
      }

      sendProgress('parsing', 'Procesando datos...', 30);

      let importData: any;
      try {
        importData = JSON.parse(jsonData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        res.write(`data: ${JSON.stringify({ phase: 'error', detail: 'El archivo no contiene JSON válido' })}\n\n`);
        res.end();
        return;
      }
      const tables = importData.tables;
      let totalRecords = 0;

      const allowedTables = ['administracion', 'almacen', 'bancos', 'cheques', 'cosecha', 'parametros', 'transferencias'];
      
      const tableNames = Object.keys(tables).filter(t => allowedTables.includes(t));
      for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        const records = tables[tableName];
        
        if (!Array.isArray(records) || records.length === 0) continue;

        sendProgress('importing', `Importando ${tableName}...`, 40 + Math.round((i / tableNames.length) * 50));

        let tableInserted = 0;
        let tableErrors = 0;
        
        const firstRecord = records[0];
        const columns = Object.keys(firstRecord).filter(k => k !== 'id');
        const columnNames = columns.map(c => `"${c}"`).join(', ');
        
        const BATCH_SIZE = Math.min(500, Math.floor(60000 / columns.length));
        
        for (let batchStart = 0; batchStart < records.length; batchStart += BATCH_SIZE) {
          const batch = records.slice(batchStart, batchStart + BATCH_SIZE);
          
          try {
            const allValues: any[] = [];
            const valueClauses: string[] = [];
            
            batch.forEach((record, batchIdx) => {
              const rowValues = columns.map(c => record[c] !== undefined ? record[c] : null);
              allValues.push(...rowValues);
              const startIdx = batchIdx * columns.length + 1;
              const placeholders = columns.map((_, colIdx) => `$${startIdx + colIdx}`).join(', ');
              valueClauses.push(`(${placeholders})`);
            });
            
            const query = `INSERT INTO "${tableName}" (${columnNames}) VALUES ${valueClauses.join(', ')} ON CONFLICT DO NOTHING`;
            await pool.query(query, allValues);
            tableInserted += batch.length;
            totalRecords += batch.length;
          } catch (e: any) {
            console.error(`Batch insert failed for ${tableName}, falling back to individual inserts:`, e.message);
            for (const record of batch) {
              try {
                const rowValues = columns.map(c => record[c] !== undefined ? record[c] : null);
                const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
                const query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                await pool.query(query, rowValues);
                tableInserted++;
                totalRecords++;
              } catch (rowError) {
                tableErrors++;
              }
            }
          }
        }
        console.log(`Table ${tableName}: ${tableInserted} inserted, ${tableErrors} errors, ${records.length} total`);
      }

      sendProgress('complete', `Importados ${totalRecords} registros`, 100);
      res.write(`data: ${JSON.stringify({ phase: 'complete', records: totalRecords })}\n\n`);
      
      broadcast("data_imported");
      res.end();
    } catch (error) {
      console.error("Error importing data:", error);
      res.write(`data: ${JSON.stringify({ phase: 'error', detail: 'Error al importar datos' })}\n\n`);
      res.end();
    }
  });

  // [IMPORT-DBF] Importar archivos DBF desde ZIP con mapeo de campos y eliminación selectiva
  app.post("/api/import-dbf-global", upload.single("file"), async (req, res) => {
    // Disable request timeout for large file imports
    req.setTimeout(0);
    res.setTimeout(0);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    const sendProgress = (phase: string, detail: string, progress: number) => {
      res.write(`data: ${JSON.stringify({ phase, detail, progress })}\n\n`);
    };

    // Helper to clean strings (remove NUL chars and trim)
    const cleanString = (s: any): string | null => {
      if (s === null || s === undefined) return null;
      if (typeof s === 'string') {
        const cleaned = s.replace(/\x00/g, '').trim();
        return cleaned === '' ? null : cleaned;
      }
      return String(s);
    };

    // Helper to generate timestamp for date fields
    const generateTimestamp = (): string => {
      const now = new Date();
      return now.toTimeString().slice(0, 8) + '.' + String(now.getTime() % 1000000).padStart(6, '0');
    };
    
    const formatDate = (d: any): string | null => {
      if (d === null || d === undefined) return null;
      const timestamp = generateTimestamp();
      
      if (d instanceof Date) {
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0] + ' ' + timestamp;
      }
      if (typeof d === 'string') {
        const cleaned = d.replace(/\x00/g, '').trim();
        if (!cleaned) return null;
        // Try parsing various formats
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0] + ' ' + timestamp;
        }
        // Try DD/MM/YYYY format
        const parts = cleaned.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          if (day && month && year) {
            const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
            return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${timestamp}`;
          }
        }
      }
      return null;
    };

    // Helper to convert value to number
    const toNumber = (v: any): number | null => {
      if (v === null || v === undefined) return null;
      const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/\x00/g, ''));
      return isNaN(num) ? null : num;
    };

    // Helper to convert value to boolean (DBF formats: .T., .F., T, F, Y, N, etc.)
    const toBoolean = (v: any): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const s = v.toLowerCase().trim().replace(/\./g, '');
        return s === 'true' || s === 't' || s === '1' || s === 'si' || s === 'yes' || s === 's' || s === 'v' || s === 'y';
      }
      return !!v;
    };

    try {
      if (!req.file) {
        res.write(`data: ${JSON.stringify({ phase: 'error', detail: 'No se proporcionó archivo' })}\n\n`);
        res.end();
        return;
      }

      sendProgress('extracting', 'Extrayendo archivos del ZIP...', 5);

      const { DBFFile } = await import('dbffile');
      const zip = new AdmZip(req.file.buffer);
      const entries = zip.getEntries();
      
      // Find DBF files
      const dbfEntries = entries.filter(e => e.entryName.toLowerCase().endsWith('.dbf'));
      if (dbfEntries.length === 0) {
        res.write(`data: ${JSON.stringify({ phase: 'error', detail: 'El archivo ZIP no contiene archivos DBF' })}\n\n`);
        res.end();
        return;
      }

      sendProgress('extracting', `Encontrados ${dbfEntries.length} archivos DBF`, 8);

      // Mapping of DBF files to tables
      const tableMapping: Record<string, { table: string; fieldMap: Record<string, string>; ignoreFields: string[] }> = {
        'parametr': {
          table: 'parametros',
          fieldMap: {
            'codigoauto': 'id',
            'fecha': 'fecha',
            'clase': 'tipo',
            'nombre': 'nombre',
            'unidaddepr': 'unidad',
            'unidaddeme': 'unidaddemedida',
            'direccion': 'direccion',
            'telefono': 'telefono',
            'cedula': 'ced_rif',
            'descripcio': 'descripcion',
            'abilitado': 'habilitado',
            'cheque': 'cheque',
            'prop': 'propietario',
            'operador': 'operador',
            'hectareas': 'hectareas'
          },
          ignoreFields: ['bloqueado', 'trans', 'flete', 'fletechofe', 'tipo', 'ced_rif', 'habilitado', 'transferen', 'valor', 'costo', 'precio', 'categoria', 'cuenta', 'correo', 'proveedor', 'chofer', 'comprobant']
        },
        'parametros': {
          table: 'parametros',
          fieldMap: {
            'codigoauto': 'id',
            'fecha': 'fecha',
            'clase': 'tipo',
            'nombre': 'nombre',
            'unidaddepr': 'unidad',
            'unidaddeme': 'unidaddemedida',
            'direccion': 'direccion',
            'telefono': 'telefono',
            'cedula': 'ced_rif',
            'descripcio': 'descripcion',
            'abilitado': 'habilitado',
            'cheque': 'cheque',
            'prop': 'propietario',
            'operador': 'operador',
            'hectareas': 'hectareas'
          },
          ignoreFields: ['bloqueado', 'trans', 'flete', 'fletechofe', 'tipo', 'ced_rif', 'habilitado', 'transferen', 'valor', 'costo', 'precio', 'categoria', 'cuenta', 'correo', 'proveedor', 'chofer', 'comprobant']
        },
        'bancos': {
          table: 'bancos',
          fieldMap: {
            'codigoauto': 'id',
            'fecha': 'fecha',
            'monto': 'monto',
            'montodol': 'montodolares',
            'saldo': 'saldo',
            'saldoconci': 'saldo_conciliado',
            'numero': 'comprobante',
            'operacion': 'operacion',
            'descripcio': 'descripcion',
            'conciliado': 'conciliado',
            'utility': 'utility',
            'banco': 'banco',
            'tipoop': 'operador',
            'prop': 'propietario',
            'relaz': 'relacionado',
            'codrel': 'codrel'
          },
          ignoreFields: ['bloqueado', 'flete', 'fletechof']
        },
        'administra': {
          table: 'administracion',
          fieldMap: {
            'codigoauto': 'id',
            'fecha': 'fecha',
            'tipo': 'tipo',
            'descripcio': 'descripcion',
            'monto': 'monto',
            'montodol': 'montodolares',
            'formadepag': 'operacion',
            'unidaddepr': 'unidad',
            'capital': 'anticipo',
            'utility': 'utility',
            'producto': 'producto',
            'cantidad': 'cantidad',
            'insumo': 'insumo',
            'comprobant': 'comprobante',
            'proveedor': 'proveedor',
            'cliente': 'cliente',
            'personalde': 'personal',
            'actividad': 'actividad',
            'prop': 'propietario',
            'unidaddeme': 'unidaddemedida',
            'relaz': 'relacionado',
            'codrel': 'codrel'
          },
          ignoreFields: ['bloqueado']
        },
        'cheques': {
          table: 'cheques',
          fieldMap: {
            'codigoauto': 'id',
            'fecha': 'fecha',
            'numero': 'comprobante',
            'deuda': 'deuda',
            'resta': 'resta',
            'descuento': 'descuento',
            'monto': 'monto',
            'descripcio': 'descripcion',
            'banco': 'banco',
            'personalde': 'personal',
            'tikets': 'tikets',
            'proveedor': 'proveedor',
            'beneficiar': 'beneficiario',
            'transferid': 'transferido',
            'imprimido': 'imprimido',
            'norecibo': 'norecibo',
            'noendosabl': 'noendosable',
            'lugar': 'lugar',
            'utility': 'utility',
            'contabiliz': 'contabilizado',
            'actividad': 'actividad',
            'insumo': 'insumo',
            'unidaddepr': 'unidad',
            'prop': 'propietario'
          },
          ignoreFields: ['bloqueado', 'montodol', 'relaz']
        },
        'cosecha': {
          table: 'cosecha',
          fieldMap: {
            'codigoauto': 'id',
            'fecha': 'fecha',
            'numero': 'comprobante',
            'chofer': 'chofer',
            'placa': 'placa',
            'ciclo': 'ciclo',
            'destino': 'destino',
            'torbas': 'torbas',
            'tablon': 'tablon',
            'cantidad': 'cantidad',
            'cantnet': 'cantnet',
            'descporc': 'descporc',
            'cancelado': 'cancelado',
            'guiamov': 'guiamov',
            'guiamat': 'guiamat',
            'descripcio': 'descripcion',
            'utility': 'utility',
            'unidaddepr': 'unidad',
            'cultivo': 'cultivo',
            'prop': 'propietario'
          },
          ignoreFields: ['bloqueado', 'comprobant']
        },
        'almacen': {
          table: 'almacen',
          fieldMap: {
            'codigoauto': 'id',
            'unidaddepr': 'unidad',
            'fecha': 'fecha',
            'comprobant': 'comprobante',
            'insumo': 'insumo',
            'unidaddeme': 'unidaddemedida',
            'monto': 'monto',
            'precio': 'precio',
            'operacion': 'operacion',
            'cantidad': 'cantidad',
            'descripcio': 'descripcion',
            'saldo': 'saldo',
            'utility': 'utility',
            'relaz': 'relacionado',
            'categoria': 'categoria',
            'prop': 'propietario'
          },
          ignoreFields: ['bloqueado', 'flete', 'fletechof', 'codrel', 'codigo_aut']
        },
        'transfere': {
          table: 'transferencias',
          fieldMap: {
            'codigoauto': 'id',
            'numero': 'comprobante',
            'banco': 'banco',
            'fecha': 'fecha',
            'deuda': 'deuda',
            'resta': 'resta',
            'descuento': 'descuento',
            'monto': 'monto',
            'descripcio': 'descripcion',
            'personalde': 'personal',
            'proveedor': 'proveedor',
            'beneficiar': 'beneficiario',
            'transferid': 'transferido',
            'contabiliz': 'contabilizado',
            'ejecutada': 'ejecutada',
            'utility': 'utility',
            'actividad': 'actividad',
            'insumo': 'insumo',
            'unidaddepr': 'unidad',
            'prop': 'propietario',
            'rifced': 'rifced',
            'numcuenta': 'numcuenta',
            'email': 'email'
          },
          ignoreFields: ['bloqueado', 'montodol', 'relaz', 'comprobant']
        }
      };

      // Determine which tables will be affected by the DBF files in the ZIP
      const pathModule = await import('path');
      const tablesToClear = new Set<string>();
      
      for (const entry of dbfEntries) {
        const baseName = pathModule.basename(entry.entryName, '.dbf').toLowerCase().replace('.dbf', '');
        let config = tableMapping[baseName];
        if (!config) {
          const matchKey = Object.keys(tableMapping).find(k => baseName.includes(k) || k.includes(baseName));
          if (matchKey) config = tableMapping[matchKey];
        }
        if (config) {
          tablesToClear.add(config.table);
        }
      }

      // Only clear the tables that correspond to DBF files in the ZIP
      if (tablesToClear.size > 0) {
        const tablesList = Array.from(tablesToClear);
        sendProgress('cleaning', `Eliminando datos de: ${tablesList.join(', ')}...`, 10);
        await storage.wipeTablesData(tablesList);
        sendProgress('cleaning', `Datos eliminados de ${tablesList.length} tabla(s)`, 12);
      }

      // Extract and save DBF files to temp, then read them
      const fs = await import('fs/promises');
      const path = pathModule;
      const os = await import('os');
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dbf-import-'));

      let totalRecords = 0;
      const processedTables: string[] = [];

      try {
        for (let i = 0; i < dbfEntries.length; i++) {
          const entry = dbfEntries[i];
          const baseName = path.basename(entry.entryName, '.dbf').toLowerCase().replace('.dbf', '');
          
          // Find matching table config
          let config = tableMapping[baseName];
          if (!config) {
            // Try partial match
            const matchKey = Object.keys(tableMapping).find(k => baseName.includes(k) || k.includes(baseName));
            if (matchKey) config = tableMapping[matchKey];
          }
          
          if (!config) {
            console.log(`Skipping unknown DBF: ${entry.entryName}`);
            res.write(`data: ${JSON.stringify({ phase: 'file_error', detail: `Archivo ignorado: ${entry.entryName} (no reconocido)`, file: entry.entryName })}\n\n`);
            continue;
          }

          const fileName = path.basename(entry.entryName);
          res.write(`data: ${JSON.stringify({ phase: 'file_start', file: fileName, detail: `Iniciando: ${fileName}` })}\n\n`);
          sendProgress('processing', `Procesando ${fileName}...`, 20 + Math.round((i / dbfEntries.length) * 30));

          // Extract DBF to temp directory
          const dbfPath = path.join(tmpDir, fileName);
          await fs.writeFile(dbfPath, entry.getData());

          try {
            let records: any[] = [];
            
            // Try primary library first (dbffile)
            try {
              const dbf = await DBFFile.open(dbfPath);
              records = await dbf.readRecords();
            } catch (dbfFileError: any) {
              // If dbffile fails, try alternative library (dbase)
              console.log(`dbffile failed for ${fileName}, trying dbase library: ${dbfFileError.message}`);
              res.write(`data: ${JSON.stringify({ phase: 'info', detail: `Usando librería alternativa para ${fileName}...` })}\n\n`);
              
              try {
                const dbase = await import('dbase');
                const dbfData = entry.getData();
                records = await new Promise<any[]>((resolve, reject) => {
                  const parser = new dbase.Parser(dbfPath);
                  const rows: any[] = [];
                  parser.on('record', (record: any) => rows.push(record));
                  parser.on('end', () => resolve(rows));
                  parser.on('error', (err: any) => reject(err));
                  parser.parse();
                });
              } catch (dbaseError: any) {
                console.error(`Both libraries failed for ${fileName}:`, dbaseError.message);
                res.write(`data: ${JSON.stringify({ phase: 'file_error', file: fileName, detail: `Error en ${fileName}: No se pudo leer (${dbfFileError.message})` })}\n\n`);
                continue;
              }
            }
            
            if (records.length === 0) {
              res.write(`data: ${JSON.stringify({ phase: 'file_complete', file: fileName, records: 0, detail: `${fileName}: vacío` })}\n\n`);
              continue;
            }

            sendProgress('importing', `Importando ${config.table} (${records.length} registros)...`, 50 + Math.round((i / dbfEntries.length) * 40));

            // Log first record fields for debugging
            if (records.length > 0) {
              const firstRecord = records[0];
              const fieldNames = Object.keys(firstRecord);
              console.log(`[DBF Import] ${fileName} fields:`, fieldNames.join(', '));
              console.log(`[DBF Import] ${fileName} first record sample:`, JSON.stringify(firstRecord).substring(0, 1000));
              
              // Extra logging for administracion to debug field issues
              if (config.table === 'administracion') {
                console.log(`[DBF Import] ADMINISTRACION detailed fields:`, JSON.stringify({
                  DESCRIPCIO: firstRecord.DESCRIPCIO || firstRecord.descripcio,
                  DESCRIPCION: firstRecord.DESCRIPCION || firstRecord.descripcion,
                  MONTODOL: firstRecord.MONTODOL || firstRecord.montodol,
                  MONTODOLAR: firstRecord.MONTODOLAR || firstRecord.montodolar,
                  OPERACION: firstRecord.OPERACION || firstRecord.operacion,
                  COMPROBANT: firstRecord.COMPROBANT || firstRecord.comprobant,
                  CAPITAL: firstRecord.CAPITAL || firstRecord.capital,
                  ANTICIPO: firstRecord.ANTICIPO || firstRecord.anticipo,
                  UTILITY: firstRecord.UTILITY || firstRecord.utility,
                  RELACIONAD: firstRecord.RELACIONAD || firstRecord.relacionad,
                  allKeys: Object.keys(firstRecord)
                }));
              }
            }

            // Sort by date
            const dateField = Object.keys(config.fieldMap).find(k => k.toUpperCase().includes('FECHA'));
            if (dateField) {
              records.sort((a: any, b: any) => {
                const dateA = formatDate(a[dateField]) || '';
                const dateB = formatDate(b[dateField]) || '';
                return dateA.localeCompare(dateB);
              });
            }

            let tableInserted = 0;
            const BATCH_SIZE = 100;
            
            // Get existing columns for this table to avoid inserting into non-existent columns
            const columnsResult = await pool.query(`
              SELECT column_name FROM information_schema.columns 
              WHERE table_name = $1
            `, [config.table]);
            const existingColumns = new Set(columnsResult.rows.map((r: any) => r.column_name.toLowerCase()));
            const fileRecordCount = records.length;
            let processedCount = 0;
            let loggedOnce = false;
            let finalColumns: string[] | null = null;

            // Helper function to map a single record
            const mapRecord = (record: any): { mapped: Record<string, any>; hasId: boolean } => {
              const mappedRecord: Record<string, any> = {};
              let hasId = false;

              for (const [dbfField, appField] of Object.entries(config.fieldMap)) {
                const upperField = dbfField.toUpperCase();
                if (config.ignoreFields.some(f => f.toUpperCase() === upperField)) continue;
                
                let value = record[dbfField] ?? record[dbfField.toUpperCase()] ?? record[dbfField.toLowerCase()];
                
                if (value === undefined) {
                  const recordKeys = Object.keys(record);
                  const matchKey = recordKeys.find(k => k.toUpperCase() === upperField);
                  if (matchKey) value = record[matchKey];
                }
                
                if (appField === 'id') {
                  const idVal = cleanString(value);
                  if (idVal) {
                    mappedRecord.id = idVal;
                    hasId = true;
                  }
                } else if (appField === 'fecha' || appField.includes('fecha')) {
                  mappedRecord[appField] = formatDate(value);
                } else if (['monto', 'montodolares', 'saldo', 'saldo_conciliado', 'deuda', 'resta', 'descuento', 
                           'cantidad', 'cantnet', 'descporc', 'precio', 'valor', 'costo', 'torbas', 
                           'tikets', 'hectareas'].includes(appField)) {
                  mappedRecord[appField] = toNumber(value);
                } else if (['numero', 'guiamov', 'guiamat'].includes(appField)) {
                  const numVal = toNumber(value);
                  mappedRecord[appField] = numVal !== null ? Math.round(numVal) : null;
                } else if (['conciliado', 'utility', 'capital', 'anticipo', 'transferido', 'imprimido', 
                           'norecibo', 'noendosable', 'contabilizado', 'cancelado', 'ejecutada', 
                           'habilitado', 'cheque', 'transferencia', 'relacionado', 'relaz'].includes(appField)) {
                  mappedRecord[appField] = toBoolean(value);
                } else {
                  mappedRecord[appField] = cleanString(value);
                }
              }

              // Special case: For parametros with tipo="dolar", use FLETE as valor
              if (config.table === 'parametros') {
                const tipo = (mappedRecord.tipo || '').toLowerCase();
                if (tipo === 'dolar' || tipo === 'dólar') {
                  const fleteValue = record['FLETE'] ?? record['flete'] ?? record['Flete'];
                  if (fleteValue !== undefined && fleteValue !== null) {
                    mappedRecord.valor = toNumber(fleteValue);
                  }
                }
              }

              return { mapped: mappedRecord, hasId };
            };

            for (let batchStart = 0; batchStart < records.length; batchStart += BATCH_SIZE) {
              const batch = records.slice(batchStart, batchStart + BATCH_SIZE);
              const mappedBatch: Record<string, any>[] = [];

              for (const record of batch) {
                processedCount++;
                const { mapped, hasId } = mapRecord(record);
                
                // Log diagnostics only once per file
                if (!loggedOnce) {
                  loggedOnce = true;
                  const recordKeys = Object.keys(record);
                  const mappedFields = Object.keys(config.fieldMap).map(k => k.toUpperCase());
                  const ignoredFields = config.ignoreFields.map(f => f.toUpperCase());
                  const unmappedFields = recordKeys.filter(k => {
                    const upper = k.toUpperCase();
                    if (mappedFields.includes(upper)) return false;
                    if (ignoredFields.includes(upper)) return false;
                    if (upper === '_DELETED' || upper === 'DELETED') return false;
                    const val = record[k];
                    if (val === null || val === undefined || val === '' || 
                        (typeof val === 'string' && val.trim() === '')) return false;
                    return true;
                  });
                  
                  if (unmappedFields.length > 0) {
                    res.write(`data: ${JSON.stringify({ 
                      phase: 'unmapped_fields', 
                      file: fileName,
                      table: config.table,
                      fields: unmappedFields,
                      detail: `Campos DBF no mapeados en ${fileName}: ${unmappedFields.join(', ')}`
                    })}\n\n`);
                  }
                  
                  const recordKeysUpper = Object.keys(record).map(k => k.toUpperCase());
                  const missingFromDbf = Object.entries(config.fieldMap)
                    .filter(([dbfField, _]) => {
                      const upperField = dbfField.toUpperCase();
                      const found = recordKeysUpper.includes(upperField);
                      return !found && !config.ignoreFields.map(f => f.toUpperCase()).includes(upperField);
                    })
                    .map(([dbfField, appField]) => `${dbfField}->${appField}`);
                  
                  if (missingFromDbf.length > 0) {
                    res.write(`data: ${JSON.stringify({ 
                      phase: 'missing_fields', 
                      file: fileName,
                      table: config.table,
                      fields: missingFromDbf,
                      detail: `Campos esperados no encontrados en ${fileName}: ${missingFromDbf.join(', ')}`
                    })}\n\n`);
                  }

                  // Determine columns once for entire file
                  const allColumns = Object.keys(mapped);
                  finalColumns = allColumns.filter(c => existingColumns.has(c.toLowerCase()));
                  const skippedColumns = allColumns.filter(c => !existingColumns.has(c.toLowerCase()));
                  if (skippedColumns.length > 0) {
                    console.log(`[DBF Import] ${config.table}: Columnas ignoradas (no existen en tabla): ${skippedColumns.join(', ')}`);
                  }
                }

                if (!hasId || !finalColumns || finalColumns.length === 0) continue;
                mappedBatch.push(mapped);
              }

              // Send progress update per batch
              res.write(`data: ${JSON.stringify({ 
                phase: 'record_progress', 
                file: fileName,
                table: config.table,
                current: processedCount, 
                total: fileRecordCount,
                detail: `${config.table}: ${processedCount} de ${fileRecordCount} registros...`
              })}\n\n`);

              // Batch insert
              if (mappedBatch.length > 0 && finalColumns && finalColumns.length > 0) {
                const columnNames = finalColumns.map(c => `"${c}"`).join(', ');
                const allValues: any[] = [];
                const valueClauses: string[] = [];

                mappedBatch.forEach((rec, idx) => {
                  const rowValues = finalColumns!.map(c => rec[c] ?? null);
                  allValues.push(...rowValues);
                  const startIdx = idx * finalColumns!.length + 1;
                  const placeholders = finalColumns!.map((_, colIdx) => `$${startIdx + colIdx}`).join(', ');
                  valueClauses.push(`(${placeholders})`);
                });

                try {
                  const query = `INSERT INTO "${config.table}" (${columnNames}) VALUES ${valueClauses.join(', ')} ON CONFLICT (id) DO NOTHING`;
                  await pool.query(query, allValues);
                  tableInserted += mappedBatch.length;
                } catch (err: any) {
                  console.error(`Batch insert error for ${config.table}, falling back to individual:`, err.message);
                  // Fallback to individual inserts
                  for (const rec of mappedBatch) {
                    try {
                      const values = finalColumns!.map(c => rec[c] ?? null);
                      const placeholders = finalColumns!.map((_, idx) => `$${idx + 1}`).join(', ');
                      const query = `INSERT INTO "${config.table}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
                      await pool.query(query, values);
                      tableInserted++;
                    } catch (e: any) {
                      console.error(`Individual insert error:`, e.message);
                    }
                  }
                }
              }
            }

            totalRecords += tableInserted;
            processedTables.push(`${config.table}: ${tableInserted}`);
            console.log(`Imported ${tableInserted} records into ${config.table}`);
            res.write(`data: ${JSON.stringify({ phase: 'file_complete', file: fileName, records: tableInserted, detail: `${fileName}: ${tableInserted} registros importados` })}\n\n`);

          } catch (dbfError: any) {
            console.error(`Error reading DBF ${entry.entryName}:`, dbfError.message);
            res.write(`data: ${JSON.stringify({ phase: 'file_error', file: fileName, detail: `Error en ${fileName}: ${dbfError.message}` })}\n\n`);
          }
        }

        // Cleanup temp directory
        const files = await fs.readdir(tmpDir);
        for (const file of files) {
          await fs.unlink(path.join(tmpDir, file));
        }
        await fs.rmdir(tmpDir);

      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }

      const summary = processedTables.length > 0 
        ? `Importados ${totalRecords} registros (${processedTables.join(', ')})`
        : 'No se encontraron archivos DBF compatibles';

      sendProgress('complete', summary, 100);
      res.write(`data: ${JSON.stringify({ phase: 'complete', detail: summary, records: totalRecords })}\n\n`);
      
      broadcast("data_imported");
      res.end();

    } catch (error: any) {
      console.error("Error importing DBF data:", error);
      res.write(`data: ${JSON.stringify({ phase: 'error', detail: error.message || 'Error al importar datos DBF' })}\n\n`);
      res.end();
    }
  });

  const tableConfig: Record<string, {
    getAll: () => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<boolean>;
    hasPagination?: boolean;
    hasSpecialLogic?: boolean;
  }> = {
    parametros: {
      getAll: () => storage.getAllParametros(),
      create: (data) => storage.createParametro(data),
      update: (id, data) => storage.updateParametro(id, data),
      delete: (id) => storage.deleteParametro(id),
       hasPagination: true,
    },
    almacen: {
      getAll: () => storage.getAllAlmacen(),
      create: (data) => storage.createAlmacen(data),
      update: (id, data) => storage.updateAlmacen(id, data),
      delete: (id) => storage.deleteAlmacen(id),
      hasPagination: true,
    },
    cosecha: {
      getAll: () => storage.getAllCosecha(),
      create: (data) => storage.createCosecha(data),
      update: (id, data) => storage.updateCosecha(id, data),
      delete: (id) => storage.deleteCosecha(id),
      hasPagination: true,
    },
    cheques: {
      getAll: () => storage.getAllCheques(),
      create: (data) => storage.createCheque(data),
      update: (id, data) => storage.updateCheque(id, data),
      delete: (id) => storage.deleteCheque(id),
      hasPagination: true,
    },
    transferencias: {
      getAll: () => storage.getAllTransferencias(),
      create: (data) => storage.createTransferencia(data),
      update: (id, data) => storage.updateTransferencia(id, data),
      delete: (id) => storage.deleteTransferencia(id),
      hasPagination: true,
    },
    administracion: {
      getAll: () => storage.getAllAdministracion(),
      create: (data) => storage.createAdministracion(data),
      update: (id, data) => storage.updateAdministracion(id, data),
      delete: (id) => storage.deleteAdministracion(id),
      hasPagination: true,
    },
    bancos: {
      getAll: () => storage.getAllBancos(),
      create: (data) => storage.createBanco(data),
      update: (id, data) => storage.updateBanco(id, data),
      delete: (id) => storage.deleteBanco(id),
      hasPagination: true,
      hasSpecialLogic: true,
    },
  };

  // Grid defaults endpoints - global configuration for all users (single row with fixed ID)
  // IMPORTANT: Must be defined before the generic /:tableName route
  const GRID_DEFAULTS_ID = "global";
  const gridDefaultsBodySchema = z.object({ config: z.string().min(1) });
  
  app.get("/api/grid-defaults", async (_req, res) => {
    try {
      const result = await db.select().from(gridDefaults).where(eq(gridDefaults.id, GRID_DEFAULTS_ID)).limit(1);
      if (result.length > 0) {
        res.json({ config: result[0].config });
      } else {
        res.json({ config: null });
      }
    } catch (error) {
      console.error("Error fetching grid defaults:", error);
      res.status(500).json({ error: "Error fetching grid defaults" });
    }
  });

  app.post("/api/grid-defaults", async (req, res) => {
    try {
      const parsed = gridDefaultsBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Config string is required" });
      }
      const { config } = parsed.data;
      const existing = await db.select().from(gridDefaults).where(eq(gridDefaults.id, GRID_DEFAULTS_ID)).limit(1);
      if (existing.length > 0) {
        await db.update(gridDefaults).set({ config, updated_at: new Date() }).where(eq(gridDefaults.id, GRID_DEFAULTS_ID));
      } else {
        await db.insert(gridDefaults).values({ id: GRID_DEFAULTS_ID, config });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving grid defaults:", error);
      res.status(500).json({ error: "Error saving grid defaults" });
    }
  });

  const PREFERENCIAS_FILE = path.join(process.cwd(), "preferencias.json");

  app.get("/api/preferencias", async (_req, res) => {
    try {
      if (fs.existsSync(PREFERENCIAS_FILE)) {
        const data = fs.readFileSync(PREFERENCIAS_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json({});
      }
    } catch (error) {
      console.error("Error reading preferencias:", error);
      res.status(500).json({ error: "Error al leer preferencias" });
    }
  });

  app.post("/api/preferencias", async (req, res) => {
    try {
      const preferencias = req.body;
      fs.writeFileSync(PREFERENCIAS_FILE, JSON.stringify(preferencias, null, 2), "utf-8");
      res.json({ success: true, message: "Preferencias guardadas" });
    } catch (error) {
      console.error("Error saving preferencias:", error);
      res.status(500).json({ error: "Error al guardar preferencias" });
    }
  });

  app.get("/api/:tableName", async (req, res) => {
    try {
      const { tableName } = req.params;
      const config = tableConfig[tableName];
      
      if (!config) {
        return res.status(404).json({ error: `Tabla '${tableName}' no encontrada` });
      }
      
      const data = await config.getAll();
      
      if (config.hasPagination) {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        const paginatedData = data.slice(offset, offset + limit);
        return res.json({
          data: paginatedData,
          total: data.length,
          hasMore: offset + limit < data.length
        });
      }
      
      res.json(data);
    } catch (error) {
      console.error(`Error al obtener ${req.params.tableName}:`, error);
      res.status(500).json({ error: `Error al obtener datos` });
    }
  });

  app.post("/api/:tableName", async (req, res) => {
    try {
      const { tableName } = req.params;
      const config = tableConfig[tableName];
      
      if (!config) {
        return res.status(404).json({ error: `Tabla '${tableName}' no encontrada` });
      }
      
      // Tablas que tienen campo fecha y necesitan timestamp automático
      const tablasConFecha = ["bancos", "administracion", "cosecha", "cheques", "almacen", "transferencias"];
      const body = { ...req.body };
      
      // Agregar timestamp a fecha si es tabla con fecha
      if (tablasConFecha.includes(tableName) && body.fecha !== undefined) {
        const now = new Date();
        const timestamp = now.toTimeString().slice(0, 8) + '.' + String(now.getTime() % 1000000).padStart(6, '0');
        if (body.fecha && body.fecha.length === 10) {
          body.fecha = body.fecha + ' ' + timestamp;
        } else if (!body.fecha) {
          body.fecha = now.toISOString().slice(0, 10) + ' ' + timestamp;
        }
      } else if (tablasConFecha.includes(tableName) && body.fecha === undefined) {
        const now = new Date();
        const timestamp = now.toTimeString().slice(0, 8) + '.' + String(now.getTime() % 1000000).padStart(6, '0');
        body.fecha = now.toISOString().slice(0, 10) + ' ' + timestamp;
      }
      
      // Auto-incrementar comprobante para transferencias
      if (tableName === "transferencias" && !body.comprobante) {
        const maxResult = await db.execute(sql`SELECT COALESCE(MAX(CAST(comprobante AS INTEGER)), 0) as max_numero FROM transferencias WHERE comprobante IS NOT NULL AND comprobante ~ '^[0-9]+$'`);
        const maxNumero = parseInt((maxResult.rows[0] as any).max_numero) || 0;
        body.comprobante = String(maxNumero + 1);
      }
      
      if (tableName === "bancos") {
        if (body.montodolares !== undefined) {
          body.montoDolares = body.montodolares;
          delete body.montodolares;
        }
        if (body.saldo_conciliado !== undefined) {
          body.saldoConciliado = body.saldo_conciliado;
          delete body.saldo_conciliado;
        }
        
        const banco = await config.create(body);
        
        if (banco.banco) {
          const fechaNorm = normalizarFechaParaSQL(banco.fecha);
          let fechaDesdeRecalculo = fechaNorm;
          
          // Buscar fecha inmediatamente anterior al nuevo registro
          if (fechaNorm) {
            const prevResult = await db.execute(sql`
              SELECT fecha FROM bancos 
              WHERE banco = ${banco.banco} AND fecha < ${fechaNorm} AND id != ${banco.id}
              ORDER BY fecha DESC, id DESC
              LIMIT 1
            `);
            if (prevResult.rows.length > 0) {
              fechaDesdeRecalculo = normalizarFechaParaSQL((prevResult.rows[0] as any).fecha) || fechaNorm;
            }
          }
          
          if (fechaDesdeRecalculo) {
            await recalcularSaldosBanco(banco.banco, fechaDesdeRecalculo);
          }
        }
        
        const bancoActualizado = await db.execute(sql`SELECT * FROM bancos WHERE id = ${banco.id}`);
        const registroFinal = bancoActualizado.rows[0] || banco;
        
        broadcast("bancos_updated");
        return res.status(201).json(registroFinal);
      }
      
      const record = await config.create(body);
      broadcast(`${tableName}_updated`);
      res.status(201).json(record);
    } catch (error) {
      console.error(`Error al crear en ${req.params.tableName}:`, error);
      res.status(500).json({ error: `Error al crear registro` });
    }
  });

  app.put("/api/:tableName/:id", async (req, res) => {
    try {
      const { tableName, id } = req.params;
      const config = tableConfig[tableName];
      
      if (!config) {
        return res.status(404).json({ error: `Tabla '${tableName}' no encontrada` });
      }
      
      if (tableName === "bancos") {
        // Obtener registro anterior completo para comparar campos que afectan saldos
        const bancoAnteriorResult = await db.execute(sql`SELECT banco, fecha, monto, montodolares, conciliado FROM bancos WHERE id = ${id}`);
        if (!bancoAnteriorResult.rows[0]) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        const anterior = bancoAnteriorResult.rows[0] as any;
        const bancoAnterior = anterior.banco;
        const fechaAnterior = anterior.fecha;
        const montoAnterior = anterior.monto;
        const montoDolaresAnterior = anterior.montodolares;
        const conciliadoAnteriorRaw = anterior.conciliado;
        const conciliadoAnterior = conciliadoAnteriorRaw === true || conciliadoAnteriorRaw === "t";
        
        const body = { ...req.body };
        if (body.montodolares !== undefined) {
          body.montoDolares = body.montodolares;
          delete body.montodolares;
        }
        if (body.saldo_conciliado !== undefined) {
          body.saldoConciliado = body.saldo_conciliado;
          delete body.saldo_conciliado;
        }
        
        const banco = await config.update(id, body);
        if (!banco) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Solo recalcular si cambiaron campos que afectan saldos: monto, montoDolares, fecha, banco, o conciliado
        const cambioBanco = bancoAnterior !== banco.banco;
        const cambioFecha = fechaAnterior !== banco.fecha;
        const cambioMonto = montoAnterior !== banco.monto;
        const cambioMontoDolares = montoDolaresAnterior !== banco.montodolares;
        const conciliadoNuevo = banco.conciliado === true || (banco.conciliado as any) === "t";
        const cambioConciliado = conciliadoAnterior !== conciliadoNuevo;
        const necesitaRecalculo = cambioBanco || cambioFecha || cambioMonto || cambioMontoDolares || cambioConciliado;
        
        if (necesitaRecalculo) {
          // Usar la fecha más antigua entre la anterior y la nueva
          let fechaDesde = getFechaMenor(fechaAnterior, banco.fecha);
          
          if (banco.banco && fechaDesde) {
            // Buscar fecha inmediatamente anterior para recalcular desde ahí
            const prevResult = await db.execute(sql`
              SELECT fecha FROM bancos 
              WHERE banco = ${banco.banco} AND fecha < ${fechaDesde} AND id != ${id}
              ORDER BY fecha DESC, id DESC
              LIMIT 1
            `);
            if (prevResult.rows.length > 0) {
              fechaDesde = normalizarFechaParaSQL((prevResult.rows[0] as any).fecha) || fechaDesde;
            }
            
            await recalcularSaldosBanco(banco.banco, fechaDesde);
          }
          
          if (cambioBanco && bancoAnterior) {
            const fechaAnteriorNorm = normalizarFechaParaSQL(fechaAnterior);
            if (fechaAnteriorNorm) {
              // Buscar fecha inmediatamente anterior en el banco anterior
              const prevResultAnterior = await db.execute(sql`
                SELECT fecha FROM bancos 
                WHERE banco = ${bancoAnterior} AND fecha < ${fechaAnteriorNorm}
                ORDER BY fecha DESC, id DESC
                LIMIT 1
              `);
              const fechaDesdeAnterior = prevResultAnterior.rows.length > 0 
                ? normalizarFechaParaSQL((prevResultAnterior.rows[0] as any).fecha) || fechaAnteriorNorm
                : fechaAnteriorNorm;
              
              await recalcularSaldosBanco(bancoAnterior, fechaDesdeAnterior);
            }
          }
        }
        
        const bancoActualizado = await db.execute(sql`SELECT * FROM bancos WHERE id = ${banco.id}`);
        const registroFinal = bancoActualizado.rows[0] || banco;
        
        broadcast("bancos_updated");
        return res.json(registroFinal);
      }
      
      if (tableName === "administracion") {
        const body = { ...req.body };
        console.log("[PUT /api/administracion] Received body:", JSON.stringify(body, null, 2));
        console.log("[PUT /api/administracion] codrel:", body.codrel);
        // If codrel is present, set relacionado to true
        if (body.codrel) {
          body.relacionado = true;
        }
        const record = await config.update(id, body);
        if (!record) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        // Update bancos with codrel and relacionado if codrel is set
        if (body.codrel) {
          console.log("[PUT /api/administracion] Updating bancos with codrel:", id, "for codrel:", body.codrel);
          await db.execute(sql`UPDATE bancos SET relacionado = true, codrel = ${id} WHERE id = ${body.codrel}`);
          console.log("[PUT /api/administracion] Bancos updated successfully");
          broadcast("bancos_updated");
        }
        broadcast("administracion_updated");
        return res.json(record);
      }
      
      const record = await config.update(id, req.body);
      if (!record) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      broadcast(`${tableName}_updated`);
      res.json(record);
    } catch (error) {
      console.error(`Error al actualizar en ${req.params.tableName}:`, error);
      res.status(500).json({ error: `Error al actualizar registro` });
    }
  });

  app.patch("/api/:tableName/:id", async (req, res) => {
    try {
      const { tableName, id } = req.params;
      const config = tableConfig[tableName];
      
      if (!config) {
        return res.status(404).json({ error: `Tabla '${tableName}' no encontrada` });
      }
      
      if (tableName === "administracion") {
        const body = { ...req.body };
        console.log("[PATCH /api/administracion] Received body:", JSON.stringify(body, null, 2));
        console.log("[PATCH /api/administracion] codrel:", body.codrel);
        // If codrel is present, set relacionado to true
        if (body.codrel) {
          body.relacionado = true;
        }
        const record = await config.update(id, body);
        if (!record) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        // Update bancos with codrel and relacionado if codrel is set
        if (body.codrel) {
          console.log("[PATCH /api/administracion] Updating bancos with codrel:", id, "for codrel:", body.codrel);
          await db.execute(sql`UPDATE bancos SET relacionado = true, codrel = ${id} WHERE id = ${body.codrel}`);
          console.log("[PATCH /api/administracion] Bancos updated successfully");
          broadcast("bancos_updated");
        }
        broadcast("administracion_updated");
        return res.json(record);
      }
      
      const record = await config.update(id, req.body);
      if (!record) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      broadcast(`${tableName}_updated`);
      res.json(record);
    } catch (error) {
      console.error(`Error al actualizar en ${req.params.tableName}:`, error);
      res.status(500).json({ error: `Error al actualizar registro` });
    }
  });

  app.delete("/api/:tableName/:id", async (req, res) => {
    try {
      const { tableName, id } = req.params;
      const config = tableConfig[tableName];
      
      if (!config) {
        return res.status(404).json({ error: `Tabla '${tableName}' no encontrada` });
      }
      
      if (tableName === "bancos") {
        const bancoResult = await db.execute(sql`SELECT banco, fecha, codrel FROM bancos WHERE id = ${id}`);
        const bancoNombre = (bancoResult.rows[0] as any)?.banco;
        const fechaRegistro = (bancoResult.rows[0] as any)?.fecha;
        const adminId = (bancoResult.rows[0] as any)?.codrel;
        
        if (!bancoNombre) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Buscar fecha inmediatamente anterior ANTES de borrar
        const fechaNormRegistro = normalizarFechaParaSQL(fechaRegistro);
        let fechaDesdeRecalculo: string | undefined;
        
        if (fechaNormRegistro) {
          const prevResult = await db.execute(sql`
            SELECT fecha FROM bancos 
            WHERE banco = ${bancoNombre} AND fecha < ${fechaNormRegistro} AND id != ${id}
            ORDER BY fecha DESC, id DESC
            LIMIT 1
          `);
          if (prevResult.rows.length > 0) {
            fechaDesdeRecalculo = normalizarFechaParaSQL((prevResult.rows[0] as any).fecha) || fechaNormRegistro;
          } else {
            // No hay registro anterior, usar la fecha del registro a borrar
            fechaDesdeRecalculo = fechaNormRegistro;
          }
        }
        
        const deleted = await config.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Limpiar relación en el registro de administración correspondiente
        if (adminId) {
          await db.execute(sql`UPDATE administracion SET codrel = NULL, relacionado = false WHERE id = ${adminId}`);
          broadcast("administracion_updated");
        }
        
        // Recalcular desde la fecha inmediatamente anterior
        if (fechaDesdeRecalculo) {
          await recalcularSaldosBanco(bancoNombre, fechaDesdeRecalculo);
        }
        
        broadcast("bancos_updated");
        return res.json({ success: true });
      }
      
      // Lógica especial para administración: limpiar relación en bancos
      if (tableName === "administracion") {
        const adminResult = await db.execute(sql`SELECT codrel FROM administracion WHERE id = ${id}`);
        const bancoId = (adminResult.rows[0] as any)?.codrel;
        
        const deleted = await config.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Limpiar relación en el registro de banco correspondiente
        if (bancoId) {
          await db.execute(sql`UPDATE bancos SET codrel = NULL, relacionado = false WHERE id = ${bancoId}`);
          broadcast("bancos_updated");
        }
        
        broadcast("administracion_updated");
        return res.json({ success: true });
      }
      
      const deleted = await config.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      broadcast(`${tableName}_updated`);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error al eliminar en ${req.params.tableName}:`, error);
      res.status(500).json({ error: `Error al eliminar registro` });
    }
  });

  return httpServer;
}
