import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import { storage } from "./storage";
import { db, pool } from "./db";
import { sql } from "drizzle-orm";
import { insertBancoSchema, insertAlmacenSchema } from "@shared/schema";

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
      const { banco, fechaInicio, fechaFin, limit, offset } = req.query;
      
      let result = await db.execute("SELECT * FROM bancos ORDER BY fecha DESC, created_at DESC NULLS LAST, id DESC");
      let registros = result.rows as any[];
      
      if (banco) {
        registros = registros.filter((r) => r.banco === banco);
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
      if (body.monto_dolares !== undefined) {
        body.montoDolares = body.monto_dolares;
        delete body.monto_dolares;
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
      
      const bancoAnteriorResult = await db.execute(sql`SELECT banco, fecha FROM bancos WHERE id = ${id}`);
      const bancoAnterior = (bancoAnteriorResult.rows[0] as any)?.banco;
      const fechaAnterior = (bancoAnteriorResult.rows[0] as any)?.fecha;
      
      const body = { ...req.body };
      if (body.monto_dolares !== undefined) {
        body.montoDolares = body.monto_dolares;
        delete body.monto_dolares;
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
      
      const fechaNueva = banco.fecha;
      const fechaDesde = fechaAnterior && fechaNueva 
        ? (fechaAnterior < fechaNueva ? fechaAnterior : fechaNueva)
        : fechaAnterior || fechaNueva || undefined;
      
      if (banco.banco) {
        await recalcularSaldosBanco(banco.banco, fechaDesde);
      }
      
      if (bancoAnterior && bancoAnterior !== banco.banco) {
        await recalcularSaldosBanco(bancoAnterior, fechaAnterior || undefined);
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
      
      const bancoResult = await db.execute(sql`SELECT banco, fecha, administracion_id FROM bancos WHERE id = ${id}`);
      const bancoNombre = (bancoResult.rows[0] as any)?.banco;
      const fechaRegistro = (bancoResult.rows[0] as any)?.fecha;
      const adminId = (bancoResult.rows[0] as any)?.administracion_id;
      
      const deleted = await storage.deleteBanco(id);
      if (!deleted) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      
      // Limpiar relación en el registro de administración correspondiente
      if (adminId) {
        await db.execute(sql`UPDATE administracion SET banco_id = NULL, relacionado = false WHERE id = ${adminId}`);
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
      const { id, tipo, unidad, fechaInicio, fechaFin, banco_id, limit = "100", offset = "0" } = req.query;
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
      if (banco_id) {
        query = sql`${query} AND banco_id = ${banco_id}`;
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
      console.log("[POST /api/administracion] banco_id:", data.banco_id);
      const id = crypto.randomUUID();
      const fecha = data.fecha || new Date().toISOString().split('T')[0];
      
      await db.execute(sql`
        INSERT INTO administracion (id, fecha, tipo, descripcion, monto, montodol, unidad, capital, utility, formadepag, producto, cantidad, insumo, comprobante, proveedor, cliente, personal, actividad, prop, anticipo, banco_id, relacionado)
        VALUES (
          ${id},
          ${fecha},
          ${data.tipo || 'facturas'},
          ${data.descripcion || ''},
          ${data.monto || 0},
          ${data.montodol || 0},
          ${data.unidad || ''},
          ${data.capital || false},
          ${data.utility || false},
          ${data.formadepag || ''},
          ${data.producto || ''},
          ${data.cantidad || 0},
          ${data.insumo || ''},
          ${data.comprobante || ''},
          ${data.proveedor || ''},
          ${data.cliente || ''},
          ${data.personal || ''},
          ${data.actividad || ''},
          ${data.prop || ''},
          ${data.anticipo || false},
          ${data.banco_id || null},
          ${data.banco_id ? true : false}
        )
      `);
      
      if (data.banco_id) {
        console.log("[POST /api/administracion] Updating bancos with administracion_id:", id, "for banco_id:", data.banco_id);
        await db.execute(sql`UPDATE bancos SET relacionado = true, administracion_id = ${id} WHERE id = ${data.banco_id}`);
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
            const bancoResult = await db.execute(sql`SELECT administracion_id FROM bancos WHERE id = ${String(id)}`);
            const adminId = (bancoResult.rows[0] as any)?.administracion_id;
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
            await db.execute(sql`UPDATE administracion SET banco_id = NULL, relacionado = false WHERE id = ${adminId}`);
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
            const adminResult = await db.execute(sql`SELECT banco_id FROM administracion WHERE id = ${String(id)}`);
            const bancoId = (adminResult.rows[0] as any)?.banco_id;
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
            await db.execute(sql`UPDATE bancos SET administracion_id = NULL, relacionado = false WHERE id = ${bancoId}`);
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
        if (body.monto_dolares !== undefined) {
          body.montoDolares = body.monto_dolares;
          delete body.monto_dolares;
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
        const bancoAnteriorResult = await db.execute(sql`SELECT banco, fecha FROM bancos WHERE id = ${id}`);
        const bancoAnterior = (bancoAnteriorResult.rows[0] as any)?.banco;
        const fechaAnterior = (bancoAnteriorResult.rows[0] as any)?.fecha;
        
        const body = { ...req.body };
        if (body.monto_dolares !== undefined) {
          body.montoDolares = body.monto_dolares;
          delete body.monto_dolares;
        }
        if (body.saldo_conciliado !== undefined) {
          body.saldoConciliado = body.saldo_conciliado;
          delete body.saldo_conciliado;
        }
        
        const banco = await config.update(id, body);
        if (!banco) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        const fechaNueva = banco.fecha;
        const fechaDesde = fechaAnterior && fechaNueva 
          ? (fechaAnterior < fechaNueva ? fechaAnterior : fechaNueva)
          : fechaAnterior || fechaNueva || undefined;
        
        if (banco.banco) {
          await recalcularSaldosBanco(banco.banco, fechaDesde);
        }
        
        if (bancoAnterior && bancoAnterior !== banco.banco) {
          await recalcularSaldosBanco(bancoAnterior, fechaAnterior || undefined);
        }
        
        const bancoActualizado = await db.execute(sql`SELECT * FROM bancos WHERE id = ${banco.id}`);
        const registroFinal = bancoActualizado.rows[0] || banco;
        
        broadcast("bancos_updated");
        return res.json(registroFinal);
      }
      
      if (tableName === "administracion") {
        const body = { ...req.body };
        console.log("[PUT /api/administracion] Received body:", JSON.stringify(body, null, 2));
        console.log("[PUT /api/administracion] banco_id:", body.banco_id);
        // If banco_id is present, set relacionado to true
        if (body.banco_id) {
          body.relacionado = true;
        }
        const record = await config.update(id, body);
        if (!record) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        // Update bancos with administracion_id and relacionado if banco_id is set
        if (body.banco_id) {
          console.log("[PUT /api/administracion] Updating bancos with administracion_id:", id, "for banco_id:", body.banco_id);
          await db.execute(sql`UPDATE bancos SET relacionado = true, administracion_id = ${id} WHERE id = ${body.banco_id}`);
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
        console.log("[PATCH /api/administracion] banco_id:", body.banco_id);
        // If banco_id is present, set relacionado to true
        if (body.banco_id) {
          body.relacionado = true;
        }
        const record = await config.update(id, body);
        if (!record) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        // Update bancos with administracion_id and relacionado if banco_id is set
        if (body.banco_id) {
          console.log("[PATCH /api/administracion] Updating bancos with administracion_id:", id, "for banco_id:", body.banco_id);
          await db.execute(sql`UPDATE bancos SET relacionado = true, administracion_id = ${id} WHERE id = ${body.banco_id}`);
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
        const bancoResult = await db.execute(sql`SELECT banco, fecha, administracion_id FROM bancos WHERE id = ${id}`);
        const bancoNombre = (bancoResult.rows[0] as any)?.banco;
        const fechaRegistro = (bancoResult.rows[0] as any)?.fecha;
        const adminId = (bancoResult.rows[0] as any)?.administracion_id;
        
        const deleted = await config.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Limpiar relación en el registro de administración correspondiente
        if (adminId) {
          await db.execute(sql`UPDATE administracion SET banco_id = NULL, relacionado = false WHERE id = ${adminId}`);
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
        const adminResult = await db.execute(sql`SELECT banco_id FROM administracion WHERE id = ${id}`);
        const bancoId = (adminResult.rows[0] as any)?.banco_id;
        
        const deleted = await config.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Limpiar relación en el registro de banco correspondiente
        if (bancoId) {
          await db.execute(sql`UPDATE bancos SET administracion_id = NULL, relacionado = false WHERE id = ${bancoId}`);
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
