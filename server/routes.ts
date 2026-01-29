import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
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
  
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Login endpoint - validates against parametros table with tipo='claves'
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

  app.delete("/api/debug/wipe-all-data", async (req, res) => {
    try {
      await storage.wipeAllData();
      res.json({ message: "Todos los datos han sido eliminados" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar datos" });
    }
  });

  async function recalcularSaldosBanco(bancoNombre: string, desdeFecha?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let saldoInicial = 0;
      let saldoConciliadoInicial = 0;
      let registrosQuery: string;
      const queryParams: any[] = [bancoNombre];
      
      if (desdeFecha) {
        const prevQuery = `
          SELECT saldo, saldo_conciliado 
          FROM bancos 
          WHERE banco = $1 AND (fecha::date < $2::date OR (fecha::date = $2::date AND created_at < (
            SELECT MIN(created_at) FROM bancos WHERE banco = $1 AND fecha::date = $2::date
          )))
          ORDER BY fecha::date DESC, created_at DESC NULLS LAST, id DESC
          LIMIT 1
        `;
        const prevResult = await client.query(prevQuery, [bancoNombre, desdeFecha]);
        if (prevResult.rows.length > 0) {
          saldoInicial = prevResult.rows[0].saldo || 0;
          saldoConciliadoInicial = prevResult.rows[0].saldo_conciliado || 0;
        }
        
        registrosQuery = `SELECT id, monto, operador, fecha, created_at, conciliado FROM bancos WHERE banco = $1 AND fecha::date >= $2::date ORDER BY fecha::date ASC, created_at ASC NULLS FIRST, id ASC`;
        queryParams.push(desdeFecha);
      } else {
        registrosQuery = `SELECT id, monto, operador, fecha, created_at, conciliado FROM bancos WHERE banco = $1 ORDER BY fecha::date ASC, created_at ASC NULLS FIRST, id ASC`;
      }

      const registrosResult = await client.query(registrosQuery, queryParams);
      const registros = registrosResult.rows;

      let saldoAcumulado = saldoInicial;
      let saldoConciliadoAcumulado = saldoConciliadoInicial;
      
      for (const registro of registros) {
        const operador = registro.operador || "suma";
        const monto = registro.monto || 0;
        const estaConciliado = registro.conciliado === true;
        
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

        await client.query(
          `UPDATE bancos SET saldo = $1, saldo_conciliado = $2 WHERE id = $3`,
          [saldoAcumulado, saldoConciliadoAcumulado, registro.id]
        );
      }

      await client.query('COMMIT');
      console.log(`Saldos recalculados para banco: ${bancoNombre}, ${registros.length} registros${desdeFecha ? ` desde ${desdeFecha}` : ''}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error recalculando saldos para banco ${bancoNombre}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

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

  app.get("/api/bancos", async (req, res) => {
    try {
      const { banco, fechaInicio, fechaFin, limit, offset, codrel, id } = req.query;
      
      let result = await db.execute("SELECT * FROM bancos ORDER BY fecha DESC, created_at DESC NULLS LAST, id DESC");
      let registros = result.rows as any[];
      
      // Filtrar por ID específico (para buscar registro relacionado)
      if (id) {
        registros = registros.filter((r) => r.id === id);
      }
      if (banco) {
        registros = registros.filter((r) => r.banco === banco);
      }
      if (fechaInicio) {
        registros = registros.filter((r) => r.fecha >= (fechaInicio as string));
      }
      if (fechaFin) {
        registros = registros.filter((r) => r.fecha <= (fechaFin as string));
      }
      if (codrel) {
        registros = registros.filter((r) => r.codrel === codrel);
      }

      const total = registros.length;
      if (offset) registros = registros.slice(Number(offset));
      if (limit) registros = registros.slice(0, Number(limit));

      res.json({ data: registros, total, hasMore: total > (Number(offset || 0) + registros.length) });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener bancos" });
    }
  });
  
  app.get("/api/bancos/lista", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT banco FROM bancos ORDER BY banco");
      res.json(result.rows.map((r: any) => r.banco));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de bancos" });
    }
  });

  // GET individual banco by ID
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

  app.post("/api/bancos", async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.montodolares !== undefined) {
        body.montoDolares = body.montodolares;
        delete body.montodolares;
      }
      if (body.saldo_conciliado !== undefined) {
        body.saldoConciliado = body.saldo_conciliado;
        delete body.saldo_conciliado;
      }
      
      const parseResult = insertBancoSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const banco = await storage.createBanco(parseResult.data);
      
      if (banco.banco) {
        await recalcularSaldosBanco(banco.banco, banco.fecha || undefined);
      }
      
      const bancoActualizado = await db.execute(sql`SELECT * FROM bancos WHERE id = ${banco.id}`);
      const registroFinal = bancoActualizado.rows[0] || banco;
      
      broadcast("bancos_updated");
      res.status(201).json(registroFinal);
    } catch (error) {
      res.status(500).json({ error: "Error al crear banco" });
    }
  });

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
      const conciliadoAnterior = anterior.conciliado;
      
      const body = { ...req.body };
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
      const cambioConciliado = conciliadoAnterior !== banco.conciliado;
      const necesitaRecalculo = cambioBanco || cambioFecha || cambioMonto || cambioMontoDolares || cambioConciliado;
      
      if (necesitaRecalculo) {
        const fechaNueva = banco.fecha;
        const fechaDesde = fechaAnterior && fechaNueva 
          ? (fechaAnterior < fechaNueva ? fechaAnterior : fechaNueva)
          : fechaAnterior || fechaNueva || undefined;
        
        if (banco.banco) {
          await recalcularSaldosBanco(banco.banco, fechaDesde);
        }
        
        if (cambioBanco && bancoAnterior) {
          await recalcularSaldosBanco(bancoAnterior, fechaAnterior || undefined);
        }
      }
      
      const bancoActualizado = await db.execute(sql`SELECT * FROM bancos WHERE id = ${banco.id}`);
      const registroFinal = bancoActualizado.rows[0] || banco;
      
      broadcast("bancos_updated");
      res.json(registroFinal);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar banco" });
    }
  });

  app.delete("/api/bancos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const bancoResult = await db.execute(sql`SELECT banco, fecha, codrel FROM bancos WHERE id = ${id}`);
      const bancoNombre = (bancoResult.rows[0] as any)?.banco;
      const fechaRegistro = (bancoResult.rows[0] as any)?.fecha;
      const adminId = (bancoResult.rows[0] as any)?.codrel;
      
      const deleted = await storage.deleteBanco(id);
      if (!deleted) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      
      // Limpiar relación en el registro de administración correspondiente
      if (adminId) {
        await db.execute(sql`UPDATE administracion SET codrel = NULL, relacionado = false WHERE id = ${adminId}`);
        broadcast("administracion_updated");
      }
      
      if (bancoNombre) {
        await recalcularSaldosBanco(bancoNombre, fechaRegistro || undefined);
      }
      
      broadcast("bancos_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar banco" });
    }
  });

  app.get("/api/administracion", async (req, res) => {
    try {
      const { id, tipo, unidad, fechaInicio, fechaFin, codrel, limit = "100", offset = "0" } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      const offsetNum = parseInt(offset as string) || 0;
      
      let query = sql`SELECT * FROM administracion WHERE 1=1`;
      
      // Filtrar por ID específico (para buscar registro relacionado)
      if (id) {
        query = sql`${query} AND id = ${id}`;
      }
      if (tipo && tipo !== "all") {
        query = sql`${query} AND tipo = ${tipo}`;
      }
      if (unidad && unidad !== "all") {
        query = sql`${query} AND unidad = ${unidad}`;
      }
      if (fechaInicio) {
        query = sql`${query} AND fecha >= ${fechaInicio}`;
      }
      if (fechaFin) {
        query = sql`${query} AND fecha <= ${fechaFin}`;
      }
      if (codrel) {
        query = sql`${query} AND codrel = ${codrel}`;
      }
      
      query = sql`${query} ORDER BY fecha DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      
      const result = await db.execute(query);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching administracion:", error);
      res.status(500).json({ error: "Error al obtener registros de administración" });
    }
  });

  app.post("/api/administracion", async (req, res) => {
    try {
      const data = req.body;
      console.log("[POST /api/administracion] Received data:", JSON.stringify(data, null, 2));
      console.log("[POST /api/administracion] codrel:", data.codrel);
      const id = crypto.randomUUID();
      const fecha = data.fecha || new Date().toISOString().split('T')[0];
      
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

  app.get("/api/almacen", async (req, res) => {
    try {
      const { unidad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      let result = await db.execute("SELECT * FROM almacen ORDER BY fecha DESC");
      let registros = result.rows as any[];
      
      if (unidad) {
        registros = registros.filter((r) => r.unidad === unidad);
      }
      if (fechaInicio) {
        registros = registros.filter((r) => r.fecha >= (fechaInicio as string));
      }
      if (fechaFin) {
        registros = registros.filter((r) => r.fecha <= (fechaFin as string));
      }

      const total = registros.length;
      if (offset) registros = registros.slice(Number(offset));
      if (limit) registros = registros.slice(0, Number(limit));

      res.json({ data: registros, total, hasMore: total > (Number(offset || 0) + registros.length) });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener registros de almacén" });
    }
  });
  
  app.get("/api/cosecha", async (req, res) => {
    try {
      const { unidad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      let result = await db.execute("SELECT * FROM cosecha ORDER BY fecha DESC");
      let registros = result.rows as any[];
      
      if (unidad) {
        registros = registros.filter((r) => r.unidad === unidad);
      }
      if (fechaInicio) {
        registros = registros.filter((r) => r.fecha >= (fechaInicio as string));
      }
      if (fechaFin) {
        registros = registros.filter((r) => r.fecha <= (fechaFin as string));
      }

      const total = registros.length;
      if (offset) registros = registros.slice(Number(offset));
      if (limit) registros = registros.slice(0, Number(limit));

      res.json({ data: registros, total, hasMore: total > (Number(offset || 0) + registros.length) });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener registros de cosecha" });
    }
  });

  app.get("/api/cheques", async (req, res) => {
    try {
      const { banco, unidad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      let result = await db.execute("SELECT * FROM cheques ORDER BY fecha DESC");
      let registros = result.rows as any[];
      
      if (banco) {
        registros = registros.filter((r) => r.banco === banco);
      }
      if (unidad) {
        registros = registros.filter((r) => r.unidad === unidad);
      }
      if (fechaInicio) {
        registros = registros.filter((r) => r.fecha >= (fechaInicio as string));
      }
      if (fechaFin) {
        registros = registros.filter((r) => r.fecha <= (fechaFin as string));
      }

      const total = registros.length;
      if (offset) registros = registros.slice(Number(offset));
      if (limit) registros = registros.slice(0, Number(limit));

      res.json({ data: registros, total, hasMore: total > (Number(offset || 0) + registros.length) });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener cheques" });
    }
  });

  app.get("/api/transferencias", async (req, res) => {
    try {
      const { banco, unidad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      let result = await db.execute("SELECT * FROM transferencias ORDER BY fecha DESC");
      let registros = result.rows as any[];
      
      if (banco) {
        registros = registros.filter((r) => r.banco === banco);
      }
      if (unidad) {
        registros = registros.filter((r) => r.unidad === unidad);
      }
      if (fechaInicio) {
        registros = registros.filter((r) => r.fecha >= (fechaInicio as string));
      }
      if (fechaFin) {
        registros = registros.filter((r) => r.fecha <= (fechaFin as string));
      }

      const total = registros.length;
      if (offset) registros = registros.slice(Number(offset));
      if (limit) registros = registros.slice(0, Number(limit));

      res.json({ data: registros, total, hasMore: total > (Number(offset || 0) + registros.length) });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener transferencias" });
    }
  });

  app.get("/api/parametros", async (req, res) => {
    try {
      const { tipo, habilitado } = req.query;
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
      
      res.json(parametros);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener parámetros" });
    }
  });

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

  // Import DBF files from ZIP (Global format)
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

    // Helper to format date to YYYY-MM-DD
    const formatDate = (d: any): string | null => {
      if (d === null || d === undefined) return null;
      if (d instanceof Date) {
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
      }
      if (typeof d === 'string') {
        const cleaned = d.replace(/\x00/g, '').trim();
        if (!cleaned) return null;
        // Try parsing various formats
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
        // Try DD/MM/YYYY format
        const parts = cleaned.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          if (day && month && year) {
            const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
            return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

      sendProgress('extracting', 'Extrayendo archivos del ZIP...', 10);

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

      sendProgress('extracting', `Encontrados ${dbfEntries.length} archivos DBF`, 15);

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

      // Extract and save DBF files to temp, then read them
      const fs = await import('fs/promises');
      const path = await import('path');
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

            for (let batchStart = 0; batchStart < records.length; batchStart += BATCH_SIZE) {
              const batch = records.slice(batchStart, batchStart + BATCH_SIZE);

              for (const record of batch) {
                processedCount++;
                
                // Send progress update every 50 records
                if (processedCount % 50 === 0 || processedCount === fileRecordCount) {
                  res.write(`data: ${JSON.stringify({ 
                    phase: 'record_progress', 
                    file: fileName,
                    table: config.table,
                    current: processedCount, 
                    total: fileRecordCount,
                    detail: `${config.table}: ${processedCount} de ${fileRecordCount} registros...`
                  })}\n\n`);
                }
                const mappedRecord: Record<string, any> = {};
                let hasId = false;

                for (const [dbfField, appField] of Object.entries(config.fieldMap)) {
                  const upperField = dbfField.toUpperCase();
                  if (config.ignoreFields.some(f => f.toUpperCase() === upperField)) continue;
                  
                  // Find the value (DBF field names can vary in case)
                  let value = record[dbfField] ?? record[dbfField.toUpperCase()] ?? record[dbfField.toLowerCase()];
                  
                  if (value === undefined) {
                    // Try to find by partial match
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

                // Log unmapped fields (only once per file)
                if (processedCount === 1) {
                  const recordKeys = Object.keys(record);
                  const mappedFields = Object.keys(config.fieldMap).map(k => k.toUpperCase());
                  const ignoredFields = config.ignoreFields.map(f => f.toUpperCase());
                  const unmappedFields = recordKeys.filter(k => {
                    const upper = k.toUpperCase();
                    // Skip if it's mapped, ignored, or a system field
                    if (mappedFields.includes(upper)) return false;
                    if (ignoredFields.includes(upper)) return false;
                    if (upper === '_DELETED' || upper === 'DELETED') return false;
                    // Skip if value is empty/null
                    const val = record[k];
                    if (val === null || val === undefined || val === '' || 
                        (typeof val === 'string' && val.trim() === '')) return false;
                    return true;
                  });
                  
                  if (unmappedFields.length > 0) {
                    const sampleValues = unmappedFields.map(f => `${f}=${JSON.stringify(record[f])}`).join(', ');
                    console.log(`[DBF Import] ${fileName} -> ${config.table}: Campos DBF NO MAPEADOS (con datos): ${unmappedFields.join(', ')}`);
                    console.log(`[DBF Import] Valores de ejemplo: ${sampleValues.substring(0, 500)}`);
                    res.write(`data: ${JSON.stringify({ 
                      phase: 'unmapped_fields', 
                      file: fileName,
                      table: config.table,
                      fields: unmappedFields,
                      detail: `Campos DBF no mapeados en ${fileName}: ${unmappedFields.join(', ')}`
                    })}\n\n`);
                  }
                  
                  // Log expected fields that were NOT found in DBF
                  const recordKeysUpper = Object.keys(record).map(k => k.toUpperCase());
                  const missingFromDbf = Object.entries(config.fieldMap)
                    .filter(([dbfField, appField]) => {
                      const upperField = dbfField.toUpperCase();
                      // Check if this expected field exists in the record
                      const found = recordKeysUpper.includes(upperField);
                      // Only report if not found and not in ignore list
                      return !found && !config.ignoreFields.map(f => f.toUpperCase()).includes(upperField);
                    })
                    .map(([dbfField, appField]) => `${dbfField}->${appField}`);
                  
                  if (missingFromDbf.length > 0) {
                    console.log(`[DBF Import] ${fileName} -> ${config.table}: Campos ESPERADOS pero NO encontrados en DBF: ${missingFromDbf.join(', ')}`);
                    res.write(`data: ${JSON.stringify({ 
                      phase: 'missing_fields', 
                      file: fileName,
                      table: config.table,
                      fields: missingFromDbf,
                      detail: `Campos esperados no encontrados en ${fileName}: ${missingFromDbf.join(', ')}`
                    })}\n\n`);
                  }
                  
                  // Log mapped record summary
                  const mappedFieldsList = Object.keys(mappedRecord).filter(k => mappedRecord[k] !== null && mappedRecord[k] !== undefined && mappedRecord[k] !== '');
                  const emptyFieldsList = Object.keys(mappedRecord).filter(k => mappedRecord[k] === null || mappedRecord[k] === undefined || mappedRecord[k] === '');
                  console.log(`[DBF Import] ${fileName} -> ${config.table}: Campos CARGADOS: ${mappedFieldsList.join(', ')}`);
                  console.log(`[DBF Import] ${fileName} -> ${config.table}: Campos VACIOS en registro: ${emptyFieldsList.join(', ')}`);
                }

                if (!hasId) continue;

                // Special case: For parametros with tipo="dolar", use FLETE as valor
                if (config.table === 'parametros') {
                  const tipo = (mappedRecord.tipo || '').toLowerCase();
                  if (tipo === 'dolar' || tipo === 'dólar') {
                    // Try to get FLETE value
                    const fleteValue = record['FLETE'] ?? record['flete'] ?? record['Flete'];
                    if (fleteValue !== undefined && fleteValue !== null) {
                      mappedRecord.valor = toNumber(fleteValue);
                    }
                  }
                }

                // Build insert query - filter out columns that don't exist in the table
                const allColumns = Object.keys(mappedRecord);
                const columns = allColumns.filter(c => existingColumns.has(c.toLowerCase()));
                
                // Log skipped columns (only once per file)
                if (processedCount === 1) {
                  const skippedColumns = allColumns.filter(c => !existingColumns.has(c.toLowerCase()));
                  if (skippedColumns.length > 0) {
                    console.log(`[DBF Import] ${config.table}: Columnas ignoradas (no existen en tabla): ${skippedColumns.join(', ')}`);
                  }
                }
                
                // Guard against empty column set (would generate invalid SQL)
                if (columns.length === 0) {
                  console.log(`[DBF Import] ${config.table}: Registro ignorado - sin columnas válidas para insertar`);
                  continue;
                }
                
                const values = columns.map(c => mappedRecord[c]);
                const columnNames = columns.map(c => `"${c}"`).join(', ');
                const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

                try {
                  const query = `INSERT INTO "${config.table}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
                  await pool.query(query, values);
                  tableInserted++;
                } catch (err: any) {
                  console.error(`Error inserting into ${config.table}:`, err.message);
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
      
      if (tableName === "bancos") {
        const body = { ...req.body };
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
          await recalcularSaldosBanco(banco.banco, banco.fecha || undefined);
        }
        
        const bancoActualizado = await db.execute(sql`SELECT * FROM bancos WHERE id = ${banco.id}`);
        const registroFinal = bancoActualizado.rows[0] || banco;
        
        broadcast("bancos_updated");
        return res.status(201).json(registroFinal);
      }
      
      const record = await config.create(req.body);
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
        const conciliadoAnterior = anterior.conciliado;
        
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
        const cambioConciliado = conciliadoAnterior !== banco.conciliado;
        const necesitaRecalculo = cambioBanco || cambioFecha || cambioMonto || cambioMontoDolares || cambioConciliado;
        
        if (necesitaRecalculo) {
          const fechaNueva = banco.fecha;
          const fechaDesde = fechaAnterior && fechaNueva 
            ? (fechaAnterior < fechaNueva ? fechaAnterior : fechaNueva)
            : fechaAnterior || fechaNueva || undefined;
          
          if (banco.banco) {
            await recalcularSaldosBanco(banco.banco, fechaDesde);
          }
          
          if (cambioBanco && bancoAnterior) {
            await recalcularSaldosBanco(bancoAnterior, fechaAnterior || undefined);
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
        
        const deleted = await config.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Limpiar relación en el registro de administración correspondiente
        if (adminId) {
          await db.execute(sql`UPDATE administracion SET codrel = NULL, relacionado = false WHERE id = ${adminId}`);
          broadcast("administracion_updated");
        }
        
        if (bancoNombre) {
          await recalcularSaldosBanco(bancoNombre, fechaRegistro || undefined);
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
