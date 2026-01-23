import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import * as XLSX from "xlsx";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { insertRegistroSchema, insertCentralSchema, insertFincaSchema, insertFincaFinanzaSchema, insertPagoFinanzaSchema, insertActividadSchema, insertClienteSchema, insertInsumoSchema, insertPersonalSchema, insertProductoSchema, insertProveedorSchema, insertBancoSchema, insertOperacionBancariaSchema, insertTasaDolarSchema, insertGastoSchema, insertNominaSchema, insertVentaSchema, insertCuentaCobrarSchema, insertCuentaPagarSchema, insertPrestamoSchema, insertMovimientoBancarioSchema, insertAlmacenSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

// WebSocket clients set
const wsClients = new Set<WebSocket>();

// Broadcast to all connected clients
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
  
  // Set up WebSocket server for real-time updates
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

  app.get("/api/actividades", async (req, res) => {
    try {
      const actividades = await storage.getAllActividades();
      res.json(actividades);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener actividades" });
    }
  });

  app.post("/api/actividades", async (req, res) => {
    try {
      const parseResult = insertActividadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const actividad = await storage.createActividad(parseResult.data);
      broadcast("actividades_updated");
      res.status(201).json(actividad);
    } catch (error) {
      res.status(500).json({ error: "Error al crear actividad" });
    }
  });

  app.put("/api/actividades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertActividadSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const actividad = await storage.updateActividad(id, parseResult.data);
      if (!actividad) {
        return res.status(404).json({ error: "Actividad no encontrada" });
      }
      broadcast("actividades_updated");
      res.json(actividad);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar actividad" });
    }
  });

  app.delete("/api/actividades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteActividad(id);
      if (!deleted) {
        return res.status(404).json({ error: "Actividad no encontrada" });
      }
      broadcast("actividades_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar actividad" });
    }
  });

  app.get("/api/clientes", async (req, res) => {
    try {
      const clientes = await storage.getAllClientes();
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener clientes" });
    }
  });

  app.post("/api/clientes", async (req, res) => {
    try {
      const parseResult = insertClienteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const cliente = await storage.createCliente(parseResult.data);
      broadcast("clientes_updated");
      res.status(201).json(cliente);
    } catch (error) {
      res.status(500).json({ error: "Error al crear cliente" });
    }
  });

  app.put("/api/clientes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertClienteSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const cliente = await storage.updateCliente(id, parseResult.data);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      broadcast("clientes_updated");
      res.json(cliente);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar cliente" });
    }
  });

  app.delete("/api/clientes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCliente(id);
      if (!deleted) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      broadcast("clientes_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar cliente" });
    }
  });

  app.get("/api/insumos", async (req, res) => {
    try {
      const insumos = await storage.getAllInsumos();
      res.json(insumos);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener insumos" });
    }
  });

  app.post("/api/insumos", async (req, res) => {
    try {
      const parseResult = insertInsumoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const insumo = await storage.createInsumo(parseResult.data);
      broadcast("insumos_updated");
      res.status(201).json(insumo);
    } catch (error) {
      res.status(500).json({ error: "Error al crear insumo" });
    }
  });

  app.put("/api/insumos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertInsumoSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const insumo = await storage.updateInsumo(id, parseResult.data);
      if (!insumo) {
        return res.status(404).json({ error: "Insumo no encontrado" });
      }
      broadcast("insumos_updated");
      res.json(insumo);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar insumo" });
    }
  });

  app.delete("/api/insumos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInsumo(id);
      if (!deleted) {
        return res.status(404).json({ error: "Insumo no encontrado" });
      }
      broadcast("insumos_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar insumo" });
    }
  });

  app.get("/api/personal", async (req, res) => {
    try {
      const personal = await storage.getAllPersonal();
      res.json(personal);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener personal" });
    }
  });

  app.post("/api/personal", async (req, res) => {
    try {
      const parseResult = insertPersonalSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const persona = await storage.createPersonal(parseResult.data);
      broadcast("personal_updated");
      res.status(201).json(persona);
    } catch (error) {
      res.status(500).json({ error: "Error al crear personal" });
    }
  });

  app.put("/api/personal/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertPersonalSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const persona = await storage.updatePersonal(id, parseResult.data);
      if (!persona) {
        return res.status(404).json({ error: "Personal no encontrado" });
      }
      broadcast("personal_updated");
      res.json(persona);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar personal" });
    }
  });

  app.delete("/api/personal/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePersonal(id);
      if (!deleted) {
        return res.status(404).json({ error: "Personal no encontrado" });
      }
      broadcast("personal_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar personal" });
    }
  });

  app.get("/api/productos", async (req, res) => {
    try {
      const productos = await storage.getAllProductos();
      res.json(productos);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener productos" });
    }
  });

  app.post("/api/productos", async (req, res) => {
    try {
      const parseResult = insertProductoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const producto = await storage.createProducto(parseResult.data);
      broadcast("productos_updated");
      res.status(201).json(producto);
    } catch (error) {
      res.status(500).json({ error: "Error al crear producto" });
    }
  });

  app.put("/api/productos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertProductoSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const producto = await storage.updateProducto(id, parseResult.data);
      if (!producto) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      broadcast("productos_updated");
      res.json(producto);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar producto" });
    }
  });

  app.delete("/api/productos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteProducto(id);
      if (!deleted) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      broadcast("productos_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar producto" });
    }
  });

  app.get("/api/proveedores", async (req, res) => {
    try {
      const proveedores = await storage.getAllProveedores();
      res.json(proveedores);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener proveedores" });
    }
  });

  app.post("/api/proveedores", async (req, res) => {
    try {
      const parseResult = insertProveedorSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const proveedor = await storage.createProveedor(parseResult.data);
      broadcast("proveedores_updated");
      res.status(201).json(proveedor);
    } catch (error) {
      res.status(500).json({ error: "Error al crear proveedor" });
    }
  });

  app.put("/api/proveedores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertProveedorSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const proveedor = await storage.updateProveedor(id, parseResult.data);
      if (!proveedor) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }
      broadcast("proveedores_updated");
      res.json(proveedor);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar proveedor" });
    }
  });

  app.delete("/api/proveedores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteProveedor(id);
      if (!deleted) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }
      broadcast("proveedores_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar proveedor" });
    }
  });

  app.get("/api/bancos", async (req, res) => {
    try {
      const { banco, fechaInicio, fechaFin, limit, offset } = req.query;
      
      let result = await db.execute("SELECT * FROM bancos ORDER BY fecha DESC");
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

  app.post("/api/bancos", async (req, res) => {
    try {
      const parseResult = insertBancoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const banco = await storage.createBanco(parseResult.data);
      broadcast("bancos_updated");
      res.status(201).json(banco);
    } catch (error) {
      res.status(500).json({ error: "Error al crear banco" });
    }
  });

  app.put("/api/bancos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertBancoSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const banco = await storage.updateBanco(id, parseResult.data);
      if (!banco) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      broadcast("bancos_updated");
      res.json(banco);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar banco" });
    }
  });

  app.delete("/api/bancos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBanco(id);
      if (!deleted) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      broadcast("bancos_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar banco" });
    }
  });

  app.get("/api/operaciones-bancarias", async (req, res) => {
    try {
      const operaciones = await storage.getAllOperacionesBancarias();
      res.json(operaciones);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener operaciones bancarias" });
    }
  });

  app.post("/api/operaciones-bancarias", async (req, res) => {
    try {
      const parseResult = insertOperacionBancariaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const operacion = await storage.createOperacionBancaria(parseResult.data);
      broadcast("operaciones_bancarias_updated");
      res.status(201).json(operacion);
    } catch (error) {
      res.status(500).json({ error: "Error al crear operación bancaria" });
    }
  });

  app.put("/api/operaciones-bancarias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertOperacionBancariaSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const operacion = await storage.updateOperacionBancaria(id, parseResult.data);
      if (!operacion) {
        return res.status(404).json({ error: "Operación bancaria no encontrada" });
      }
      broadcast("operaciones_bancarias_updated");
      res.json(operacion);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar operación bancaria" });
    }
  });

  app.delete("/api/operaciones-bancarias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteOperacionBancaria(id);
      if (!deleted) {
        return res.status(404).json({ error: "Operación bancaria no encontrada" });
      }
      broadcast("operaciones_bancarias_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar operación bancaria" });
    }
  });

  app.get("/api/tasas-dolar", async (req, res) => {
    try {
      const tasas = await storage.getAllTasasDolar();
      res.json(tasas);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener tasas de dólar" });
    }
  });

  app.post("/api/tasas-dolar", async (req, res) => {
    try {
      const parseResult = insertTasaDolarSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const tasa = await storage.createTasaDolar(parseResult.data);
      broadcast("tasas_dolar_updated");
      res.status(201).json(tasa);
    } catch (error) {
      res.status(500).json({ error: "Error al crear tasa de dólar" });
    }
  });

  app.put("/api/tasas-dolar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertTasaDolarSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const tasa = await storage.updateTasaDolar(id, parseResult.data);
      if (!tasa) {
        return res.status(404).json({ error: "Tasa de dólar no encontrada" });
      }
      broadcast("tasas_dolar_updated");
      res.json(tasa);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar tasa de dólar" });
    }
  });

  app.delete("/api/tasas-dolar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTasaDolar(id);
      if (!deleted) {
        return res.status(404).json({ error: "Tasa de dólar no encontrada" });
      }
      broadcast("tasas_dolar_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar tasa de dólar" });
    }
  });

  app.get("/api/registros", async (req, res) => {
    try {
      const registros = await storage.getAllRegistros();
      res.json(registros);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener registros" });
    }
  });

  app.post("/api/registros", async (req, res) => {
    try {
      const parseResult = insertRegistroSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const registro = await storage.createRegistro(parseResult.data);
      broadcast("registros_updated");
      res.status(201).json(registro);
    } catch (error) {
      res.status(500).json({ error: "Error al crear registro" });
    }
  });

  app.put("/api/registros/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertRegistroSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const registro = await storage.updateRegistro(id, parseResult.data);
      if (!registro) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      broadcast("registros_updated");
      res.json(registro);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar registro" });
    }
  });

  app.delete("/api/registros/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRegistro(id);
      if (!deleted) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      broadcast("registros_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar registro" });
    }
  });

  app.post("/api/registros/capitalize", async (req, res) => {
    try {
      const updatedCount = await storage.capitalizeAllRegistros();
      broadcast("registros_updated");
      res.json({ success: true, updatedCount });
    } catch (error) {
      res.status(500).json({ error: "Error al capitalizar registros" });
    }
  });

  app.delete("/api/registros", async (req, res) => {
    try {
      await storage.deleteAllRegistros();
      broadcast("registros_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar todos los registros" });
    }
  });

  app.get("/api/centrales", async (req, res) => {
    try {
      const centralesList = await storage.getAllCentrales();
      res.json(centralesList);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener centrales" });
    }
  });

  app.post("/api/centrales", async (req, res) => {
    try {
      const parseResult = insertCentralSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const central = await storage.createCentral(parseResult.data);
      broadcast("centrales_updated");
      res.status(201).json(central);
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(400).json({ error: "Ya existe una central con ese nombre" });
      }
      res.status(500).json({ error: "Error al crear central" });
    }
  });

  app.put("/api/centrales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertCentralSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const central = await storage.updateCentral(id, parseResult.data);
      if (!central) {
        return res.status(404).json({ error: "Central no encontrada" });
      }
      broadcast("centrales_updated");
      res.json(central);
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(400).json({ error: "Ya existe una central con ese nombre" });
      }
      res.status(500).json({ error: "Error al actualizar central" });
    }
  });

  app.delete("/api/centrales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCentral(id);
      if (!deleted) {
        return res.status(404).json({ error: "Central no encontrada" });
      }
      broadcast("centrales_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar central" });
    }
  });

  app.get("/api/fincas", async (req, res) => {
    try {
      const fincasList = await storage.getAllFincas();
      res.json(fincasList);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener fincas" });
    }
  });

  app.post("/api/fincas", async (req, res) => {
    try {
      const parseResult = insertFincaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const finca = await storage.createFinca(parseResult.data);
      broadcast("fincas_updated");
      res.status(201).json(finca);
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(400).json({ error: "Ya existe una finca con ese nombre" });
      }
      res.status(500).json({ error: "Error al crear finca" });
    }
  });

  app.put("/api/fincas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertFincaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const finca = await storage.updateFinca(id, parseResult.data);
      if (!finca) {
        return res.status(404).json({ error: "Finca no encontrada" });
      }
      broadcast("fincas_updated");
      res.json(finca);
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(400).json({ error: "Ya existe una finca con ese nombre" });
      }
      res.status(500).json({ error: "Error al actualizar finca" });
    }
  });

  app.delete("/api/fincas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFinca(id);
      if (!deleted) {
        return res.status(404).json({ error: "Finca no encontrada" });
      }
      broadcast("fincas_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar finca" });
    }
  });

  app.post("/api/upload-palmar", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      let data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (data.length === 0) {
        return res.status(400).json({ error: "El archivo Excel está vacío" });
      }

      // Find the header row (look for "Dia" or "Neto")
      let headerRowIndex = -1;
      let headers: string[] = [];
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row && Array.isArray(row)) {
          const rowStr = row.map(c => String(c || "").toLowerCase());
          if (rowStr.some(c => c === "dia" || c === "día") && rowStr.some(c => c === "neto ajus." || c === "neto ajustado" || c === "neto")) {
            headerRowIndex = i;
            headers = row.map(c => String(c || "").trim());
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        console.log("Could not find header row. First 3 rows:", data.slice(0, 3));
        return res.status(400).json({ error: "No se encontró la fila de encabezados (Dia, Neto)" });
      }

      console.log("Header row found at index:", headerRowIndex);
      console.log("Headers:", headers);

      // Find column indices
      const diaCol = headers.findIndex(h => h.toLowerCase() === "dia" || h.toLowerCase() === "día");
      const netoCol = headers.findIndex(h => h.toLowerCase() === "neto ajus." || h.toLowerCase() === "neto ajustado");
      const fincaCol = headers.findIndex(h => h.toLowerCase().includes("nombre") && h.toLowerCase().includes("hda"));
      const rtoCol = headers.findIndex(h => h.toLowerCase() === "rto" || h.toLowerCase() === "rto ajt" || h.toLowerCase().startsWith("rto"));
      const nucleoCol = headers.findIndex(h => h.toLowerCase() === "nucleo" || h.toLowerCase() === "núcleo");
      const remesaCol = headers.findIndex(h => h.toLowerCase() === "remesa" || h.toLowerCase() === "rem" || h.toLowerCase().includes("remesa"));

      console.log("Column indices - Dia:", diaCol, "Neto:", netoCol, "Finca:", fincaCol, "RTO:", rtoCol, "Nucleo:", nucleoCol, "Remesa:", remesaCol);

      // First pass: collect all remesas from the file
      const fileRemesas = new Set<string>();
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        if (nucleoCol >= 0) {
          const nucleoValue = row[nucleoCol];
          const nucleoNum = typeof nucleoValue === "number" ? nucleoValue : parseInt(String(nucleoValue || ""));
          if (nucleoNum !== 1013) continue;
        }
        if (remesaCol >= 0) {
          const remesaValue = String(row[remesaCol] || "").trim();
          if (remesaValue) fileRemesas.add(remesaValue);
        }
      }

      // Find and delete existing registros that contain any of these remesas
      const existingRegistrosWithRemesas = await storage.getRegistrosWithRemesas();
      const idsToDelete: string[] = [];
      for (const reg of existingRegistrosWithRemesas) {
        const regRemesas = reg.remesa.split(",").map(r => r.trim());
        if (regRemesas.some(r => fileRemesas.has(r))) {
          idsToDelete.push(reg.id);
        }
      }
      if (idsToDelete.length > 0) {
        await storage.deleteRegistrosByIds(idsToDelete);
        console.log(`Deleted ${idsToDelete.length} existing registros with matching remesas`);
      }

      const groupedByDate: Record<string, { totalNeto: number; grados: number[]; finca: string; remesas: Set<string> }> = {};

      // Process data rows (skip header row)
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;

        // Filter by nucleo = 1013
        if (nucleoCol >= 0) {
          const nucleoValue = row[nucleoCol];
          const nucleoNum = typeof nucleoValue === "number" ? nucleoValue : parseInt(String(nucleoValue || ""));
          if (nucleoNum !== 1013) continue;
        }

        let fecha: string | null = null;
        
        const diaValue = diaCol >= 0 ? row[diaCol] : null;
        if (diaValue !== undefined && diaValue !== null) {
          if (typeof diaValue === "number") {
            // Excel date serial number conversion
            // Excel uses 1900 date system, day 1 = Jan 1, 1900
            const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
            const jsDate = new Date(excelEpoch.getTime() + diaValue * 24 * 60 * 60 * 1000);
            const year = jsDate.getFullYear();
            const month = String(jsDate.getMonth() + 1).padStart(2, "0");
            const day = String(jsDate.getDate()).padStart(2, "0");
            fecha = `${year}-${month}-${day}`;
          } else if (typeof diaValue === "string") {
            const dateMatch = diaValue.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, "0");
              const month = dateMatch[2].padStart(2, "0");
              let year = dateMatch[3];
              if (year.length === 2) {
                year = "20" + year;
              }
              fecha = `${year}-${month}-${day}`;
            }
          }
        }

        if (!fecha) continue;

        const neto = netoCol >= 0 ? parseFloat(row[netoCol]) : 0;
        const grado = rtoCol >= 0 ? parseFloat(row[rtoCol]) : 0;
        const fincaRaw = fincaCol >= 0 ? row[fincaCol] : "";
        const finca = String(fincaRaw || "").trim();

        if (isNaN(neto) || neto <= 0) continue;

        const remesaValue = remesaCol >= 0 ? String(row[remesaCol] || "").trim() : "";

        if (!groupedByDate[fecha]) {
          groupedByDate[fecha] = { totalNeto: 0, grados: [], finca: finca, remesas: new Set() };
        }

        groupedByDate[fecha].totalNeto += neto;
        if (!isNaN(grado) && grado > 0) {
          groupedByDate[fecha].grados.push(grado);
        }
        if (remesaValue) {
          groupedByDate[fecha].remesas.add(remesaValue);
        }
      }

      const dates = Object.keys(groupedByDate);
      if (dates.length === 0) {
        return res.status(400).json({ error: "No se encontraron registros válidos en el archivo" });
      }

      const createdRegistros = [];
      for (const [fecha, data] of Object.entries(groupedByDate)) {
        const avgGrado = data.grados.length > 0 
          ? data.grados.reduce((a, b) => a + b, 0) / data.grados.length 
          : undefined;

        const fincaCapitalized = data.finca 
          ? data.finca.trim().toLowerCase().split(' ').filter(w => w.length > 0).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : undefined;

        const remesasArray = Array.from(data.remesas);
        const remesaStr = remesasArray.length > 0 ? remesasArray.join(", ") : undefined;

        const registro = await storage.createRegistro({
          fecha,
          central: "Palmar",
          cantidad: Math.round(data.totalNeto * 100) / 100,
          grado: avgGrado ? Math.round(avgGrado * 100) / 100 : undefined,
          finca: fincaCapitalized || "Sin Finca",
          remesa: remesaStr || "Sin Remesa",
        });
        createdRegistros.push(registro);
      }

      broadcast("registros_updated");
      res.json({
        message: `Se procesaron ${createdRegistros.length} registros`,
        created: createdRegistros.length,
        registros: createdRegistros,
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ error: "Error al procesar el archivo Excel" });
    }
  });

  app.post("/api/upload-portuguesa", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      let data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (data.length === 0) {
        return res.status(400).json({ error: "El archivo Excel está vacío" });
      }

      let headerRowIndex = -1;
      let headers: string[] = [];
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row && Array.isArray(row)) {
          const rowStr = row.map(c => String(c || "").toLowerCase());
          if (rowStr.some(c => c.includes("nombrefinca") || c.includes("nombre")) && 
              rowStr.some(c => c.includes("fechadia") || c.includes("fecha"))) {
            headerRowIndex = i;
            headers = row.map(c => String(c || "").trim().toLowerCase());
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        console.log("Could not find header row. First 3 rows:", data.slice(0, 3));
        return res.status(400).json({ error: "No se encontró la fila de encabezados (nombrefinca, fechadia)" });
      }

      const fincaCol = headers.findIndex(h => h.includes("nombrefinca") || h === "nombre");
      const fechaCol = headers.findIndex(h => h.includes("fechadia") || h === "fecha");
      const cantidadCol = headers.findIndex(h => h.includes("caña") || h === "cana");
      const gradoCol = headers.findIndex(h => h.includes("rendimiento") || h === "rto");
      const nucleoCol = headers.findIndex(h => {
        const normalized = h.replace(/\s+/g, "").replace(/_/g, "").replace(/ú/g, "u");
        return normalized.includes("nucleotransporte") || 
               (h.includes("nucleo") && h.includes("transporte")) ||
               (h.includes("núcleo") && h.includes("transporte"));
      });
      const remesaCol = headers.findIndex(h => h === "remesa" || h === "rem" || h.includes("remesa"));

      console.log("Headers found:", headers);
      console.log("Column indices - Finca:", fincaCol, "Fecha:", fechaCol, "Cantidad:", cantidadCol, "Grado:", gradoCol, "Nucleo:", nucleoCol, "Remesa:", remesaCol);

      if (nucleoCol === -1) {
        return res.status(400).json({ error: "No se encontró la columna 'nucleo transporte' en el archivo. Columnas encontradas: " + headers.join(", ") });
      }

      // First pass: collect all remesas from the file
      const fileRemesas = new Set<string>();
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;
        const nucleoValue = row[nucleoCol];
        const nucleoNum = typeof nucleoValue === "number" ? nucleoValue : parseInt(String(nucleoValue || ""));
        if (nucleoNum !== 1013) continue;
        if (remesaCol >= 0) {
          const remesaValue = String(row[remesaCol] || "").trim();
          if (remesaValue) fileRemesas.add(remesaValue);
        }
      }

      // Find and delete existing registros that contain any of these remesas
      if (fileRemesas.size > 0) {
        const existingRegistrosWithRemesas = await storage.getRegistrosWithRemesas();
        const idsToDelete: string[] = [];
        for (const reg of existingRegistrosWithRemesas) {
          const regRemesas = reg.remesa.split(",").map(r => r.trim());
          if (regRemesas.some(r => fileRemesas.has(r))) {
            idsToDelete.push(reg.id);
          }
        }
        if (idsToDelete.length > 0) {
          await storage.deleteRegistrosByIds(idsToDelete);
          console.log(`Deleted ${idsToDelete.length} existing registros with matching remesas`);
        }
      }

      let totalCantidad = 0;
      let totalGradoWeighted = 0;
      let firstFinca = "";
      let firstFecha = "";
      let rowsProcessed = 0;
      let rowsSkipped = 0;
      const allRemesas = new Set<string>();

      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;

        // Filter by nucleo transporte = 1013
        const nucleoValue = row[nucleoCol];
        const nucleoNum = typeof nucleoValue === "number" ? nucleoValue : parseInt(String(nucleoValue || ""));
        if (nucleoNum !== 1013) {
          rowsSkipped++;
          continue;
        }
        rowsProcessed++;

        const cantidad = cantidadCol >= 0 ? parseFloat(row[cantidadCol]) : 0;
        const grado = gradoCol >= 0 ? parseFloat(row[gradoCol]) : 0;
        
        if (isNaN(cantidad) || cantidad <= 0) continue;

        totalCantidad += cantidad;
        if (!isNaN(grado) && grado > 0) {
          totalGradoWeighted += cantidad * grado;
        }

        if (!firstFinca && fincaCol >= 0) {
          firstFinca = String(row[fincaCol] || "").trim();
        }

        if (remesaCol >= 0) {
          const remesaValue = String(row[remesaCol] || "").trim();
          if (remesaValue) allRemesas.add(remesaValue);
        }

        if (!firstFecha && fechaCol >= 0) {
          const fechaValue = row[fechaCol];
          if (typeof fechaValue === "number") {
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + fechaValue * 24 * 60 * 60 * 1000);
            const year = jsDate.getFullYear();
            const month = String(jsDate.getMonth() + 1).padStart(2, "0");
            const day = String(jsDate.getDate()).padStart(2, "0");
            firstFecha = `${year}-${month}-${day}`;
          } else if (typeof fechaValue === "string") {
            const dateMatch = fechaValue.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, "0");
              const month = dateMatch[2].padStart(2, "0");
              let year = dateMatch[3];
              if (year.length === 2) year = "20" + year;
              firstFecha = `${year}-${month}-${day}`;
            }
          }
        }
      }

      console.log(`Portuguesa upload: ${rowsProcessed} filas con núcleo 1013 procesadas, ${rowsSkipped} filas descartadas`);

      if (totalCantidad <= 0) {
        return res.status(400).json({ 
          error: `No se encontraron registros con núcleo transporte = 1013. Se descartaron ${rowsSkipped} filas con otros valores.` 
        });
      }

      const avgGrado = totalCantidad > 0 && totalGradoWeighted > 0 
        ? totalGradoWeighted / totalCantidad 
        : undefined;

      const fincaCapitalized = firstFinca 
        ? firstFinca.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        : undefined;

      const fechaToUse = firstFecha || new Date().toISOString().split('T')[0];

      // Only delete by date if no remesas were found in the file
      if (allRemesas.size === 0) {
        await storage.deleteRegistrosByDatesAndCentral([fechaToUse], "Portuguesa");
      }

      const remesaStr = allRemesas.size > 0 ? Array.from(allRemesas).join(", ") : undefined;

      // Convert kilos to tons (divide by 1000)
      const cantidadTons = totalCantidad / 1000;
      const registro = await storage.createRegistro({
        fecha: fechaToUse,
        central: "Portuguesa",
        cantidad: Math.round(cantidadTons * 100) / 100,
        grado: avgGrado ? Math.round(avgGrado * 100) / 100 : undefined,
        finca: fincaCapitalized || "Sin Finca",
        remesa: remesaStr || "Sin Remesa",
      });

      broadcast("registros_updated");
      res.json({
        message: `Registro creado: ${rowsProcessed} filas con núcleo 1013 procesadas, ${rowsSkipped} descartadas`,
        created: 1,
        rowsProcessed,
        rowsSkipped,
        registro,
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ error: "Error al procesar el archivo Excel" });
    }
  });

  // List all backups
  app.get("/api/backups", async (req, res) => {
    try {
      const backupsList = await storage.getAllBackups();
      // Return without the full data field for listing
      const backupsInfo = backupsList.map(b => ({
        id: b.id,
        nombre: b.nombre,
        fecha: b.fecha,
      }));
      res.json(backupsInfo);
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ error: "Error al listar respaldos" });
    }
  });

  // Create a new backup with a name
  app.post("/api/backups", async (req, res) => {
    try {
      const { nombre } = req.body;
      if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
        return res.status(400).json({ error: "El nombre del respaldo es requerido" });
      }
      
      const registros = await storage.getAllRegistros();
      const centrales = await storage.getAllCentrales();
      const fincas = await storage.getAllFincas();
      
      const backupData = {
        version: 1,
        data: {
          registros,
          centrales,
          fincas,
        }
      };
      
      const backup = await storage.createBackup({
        nombre: nombre.trim(),
        fecha: new Date().toISOString(),
        datos: JSON.stringify(backupData),
      });
      
      res.status(201).json({
        id: backup.id,
        nombre: backup.nombre,
        fecha: backup.fecha,
        registrosCount: registros.length,
        centralesCount: centrales.length,
        fincasCount: fincas.length,
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Error al crear respaldo" });
    }
  });

  // Export all data as downloadable JSON
  app.get("/api/export-data", async (req, res) => {
    try {
      const registros = await storage.getAllRegistros();
      const centrales = await storage.getAllCentrales();
      const fincas = await storage.getAllFincas();
      const fincasFinanza = await storage.getAllFincasFinanza();
      const pagosFinanza = await storage.getAllPagosFinanza();
      
      const exportData = {
        version: 2,
        exportDate: new Date().toISOString(),
        data: {
          registros,
          centrales,
          fincas,
          fincasFinanza,
          pagosFinanza,
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="arrime-data-export.json"');
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Error al exportar datos" });
    }
  });

  // Import data from JSON
  app.post("/api/import-data", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }
      
      const fileContent = req.file.buffer.toString('utf-8');
      const importData = JSON.parse(fileContent);
      
      if (!importData.data) {
        return res.status(400).json({ error: "Formato de archivo inválido" });
      }
      
      const { registros, centrales, fincas, fincasFinanza, pagosFinanza } = importData.data;
      
      // Delete all existing data
      await storage.deleteAllRegistros();
      await storage.deleteAllCentrales();
      await storage.deleteAllFincas();
      
      let importedRegistros = 0;
      let importedCentrales = 0;
      let importedFincas = 0;
      let importedFincasFinanza = 0;
      let importedPagosFinanza = 0;
      
      // Import centrales first
      if (centrales && Array.isArray(centrales)) {
        for (const central of centrales) {
          try {
            await storage.createCentral({
              nombre: central.nombre,
              orden: central.orden,
            });
            importedCentrales++;
          } catch (e) {
            console.error("Error importing central:", e);
          }
        }
      }
      
      // Import fincas
      if (fincas && Array.isArray(fincas)) {
        for (const finca of fincas) {
          try {
            await storage.createFinca({ nombre: finca.nombre });
            importedFincas++;
          } catch (e) {
            console.error("Error importing finca:", e);
          }
        }
      }
      
      // Import registros
      if (registros && Array.isArray(registros)) {
        for (const registro of registros) {
          try {
            await storage.createRegistro({
              fecha: registro.fecha,
              central: registro.central,
              cantidad: registro.cantidad,
              grado: registro.grado,
              finca: registro.finca,
              remesa: registro.remesa,
            });
            importedRegistros++;
          } catch (e) {
            console.error("Error importing registro:", e);
          }
        }
      }
      
      // Import fincasFinanza
      if (fincasFinanza && Array.isArray(fincasFinanza)) {
        for (const finca of fincasFinanza) {
          try {
            await storage.createFincaFinanza({
              nombre: finca.nombre,
              central: finca.central,
              costoCosecha: finca.costoCosecha,
              compFlete: finca.compFlete,
              valorTonAzucar: finca.valorTonAzucar,
              valorMelazaTc: finca.valorMelazaTc,
            });
            importedFincasFinanza++;
          } catch (e) {
            console.error("Error importing fincaFinanza:", e);
          }
        }
      }
      
      // Import pagosFinanza
      if (pagosFinanza && Array.isArray(pagosFinanza)) {
        for (const pago of pagosFinanza) {
          try {
            await storage.createPagoFinanza({
              fecha: pago.fecha,
              finca: pago.finca,
              central: pago.central,
              monto: pago.monto,
              comentario: pago.comentario,
            });
            importedPagosFinanza++;
          } catch (e) {
            console.error("Error importing pagoFinanza:", e);
          }
        }
      }
      
      broadcast("registros_updated");
      broadcast("centrales_updated");
      broadcast("fincas_updated");
      broadcast("finanza_updated");
      
      res.json({
        message: "Datos importados correctamente",
        imported: {
          registros: importedRegistros,
          centrales: importedCentrales,
          fincas: importedFincas,
          fincasFinanza: importedFincasFinanza,
          pagosFinanza: importedPagosFinanza,
        }
      });
    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ error: "Error al importar datos" });
    }
  });

  // Restore from a specific backup
  app.post("/api/backups/:id/restore", async (req, res) => {
    try {
      const { id } = req.params;
      const backup = await storage.getBackup(id);
      
      if (!backup) {
        return res.status(404).json({ error: "Respaldo no encontrado" });
      }
      
      const backupData = JSON.parse(backup.datos);
      const { registros, centrales, fincas } = backupData.data;
      
      // First, delete all existing data
      await storage.deleteAllRegistros();
      await storage.deleteAllCentrales();
      await storage.deleteAllFincas();
      
      let restoredRegistros = 0;
      let restoredCentrales = 0;
      let restoredFincas = 0;
      
      // Restore centrales first (if provided)
      if (centrales && Array.isArray(centrales)) {
        for (const central of centrales) {
          try {
            await storage.createCentral({
              nombre: central.nombre,
              orden: central.orden,
            });
            restoredCentrales++;
          } catch (e) {
            // Skip errors
          }
        }
      }
      
      // Restore fincas (if provided)
      if (fincas && Array.isArray(fincas)) {
        for (const finca of fincas) {
          try {
            await storage.createFinca({ nombre: finca.nombre });
            restoredFincas++;
          } catch (e) {
            // Skip errors
          }
        }
      }
      
      // Restore registros
      if (registros && Array.isArray(registros)) {
        for (const registro of registros) {
          try {
            await storage.createRegistro({
              fecha: registro.fecha,
              central: registro.central,
              cantidad: registro.cantidad,
              grado: registro.grado,
              finca: registro.finca,
              remesa: registro.remesa,
            });
            restoredRegistros++;
          } catch (e) {
            // Skip errors
          }
        }
      }
      
      // Broadcast updates for all restored data
      broadcast("registros_updated");
      broadcast("centrales_updated");
      broadcast("fincas_updated");
      
      res.json({
        message: "Respaldo restaurado",
        restored: {
          registros: restoredRegistros,
          centrales: restoredCentrales,
          fincas: restoredFincas,
        }
      });
    } catch (error) {
      console.error("Error restoring backup:", error);
      res.status(500).json({ error: "Error al restaurar respaldo" });
    }
  });

  // Delete a backup
  app.delete("/api/backups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBackup(id);
      if (!deleted) {
        return res.status(404).json({ error: "Respaldo no encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ error: "Error al eliminar respaldo" });
    }
  });

  // ==================== FINANZA API ====================

  // Fincas Finanza CRUD
  app.get("/api/finanza/fincas", async (req, res) => {
    try {
      const fincasList = await storage.getAllFincasFinanza();
      res.json(fincasList);
    } catch (error) {
      console.error("Error getting fincas finanza:", error);
      res.status(500).json({ error: "Error al obtener fincas" });
    }
  });

  app.post("/api/finanza/fincas", async (req, res) => {
    try {
      const parseResult = insertFincaFinanzaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const finca = await storage.createFincaFinanza(parseResult.data);
      broadcast("finanza_fincas_updated");
      res.status(201).json(finca);
    } catch (error) {
      console.error("Error creating finca finanza:", error);
      res.status(500).json({ error: "Error al crear finca" });
    }
  });

  app.put("/api/finanza/fincas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertFincaFinanzaSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const finca = await storage.updateFincaFinanza(id, parseResult.data);
      if (!finca) {
        return res.status(404).json({ error: "Finca no encontrada" });
      }
      broadcast("finanza_fincas_updated");
      res.json(finca);
    } catch (error) {
      console.error("Error updating finca finanza:", error);
      res.status(500).json({ error: "Error al actualizar finca" });
    }
  });

  app.delete("/api/finanza/fincas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFincaFinanza(id);
      if (!deleted) {
        return res.status(404).json({ error: "Finca no encontrada" });
      }
      broadcast("finanza_fincas_updated");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting finca finanza:", error);
      res.status(500).json({ error: "Error al eliminar finca" });
    }
  });

  // Pagos Finanza CRUD
  app.get("/api/finanza/pagos", async (req, res) => {
    try {
      const pagosList = await storage.getAllPagosFinanza();
      res.json(pagosList);
    } catch (error) {
      console.error("Error getting pagos finanza:", error);
      res.status(500).json({ error: "Error al obtener pagos" });
    }
  });

  app.post("/api/finanza/pagos", async (req, res) => {
    try {
      const parseResult = insertPagoFinanzaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const pago = await storage.createPagoFinanza(parseResult.data);
      broadcast("finanza_pagos_updated");
      res.status(201).json(pago);
    } catch (error) {
      console.error("Error creating pago finanza:", error);
      res.status(500).json({ error: "Error al crear pago" });
    }
  });

  app.put("/api/finanza/pagos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertPagoFinanzaSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: parseResult.error.issues 
        });
      }
      const pago = await storage.updatePagoFinanza(id, parseResult.data);
      if (!pago) {
        return res.status(404).json({ error: "Pago no encontrado" });
      }
      broadcast("finanza_pagos_updated");
      res.json(pago);
    } catch (error) {
      console.error("Error updating pago finanza:", error);
      res.status(500).json({ error: "Error al actualizar pago" });
    }
  });

  app.delete("/api/finanza/pagos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePagoFinanza(id);
      if (!deleted) {
        return res.status(404).json({ error: "Pago no encontrado" });
      }
      broadcast("finanza_pagos_updated");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pago finanza:", error);
      res.status(500).json({ error: "Error al eliminar pago" });
    }
  });

  // ============ ADMINISTRACIÓN MODULE ROUTES ============

  // Get all administracion records
  app.get("/api/administracion", async (req, res) => {
    try {
      const { tipo, unidad, fechaInicio, fechaFin, limit = "100", offset = "0" } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      const offsetNum = parseInt(offset as string) || 0;
      
      let query = sql`SELECT * FROM administracion WHERE 1=1`;
      
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
      
      query = sql`${query} ORDER BY fecha DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      
      const result = await db.execute(query);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching administracion:", error);
      res.status(500).json({ error: "Error al obtener registros de administración" });
    }
  });

  app.patch("/api/administracion/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const allowedFields = ["capital", "utility", "anticipo", "conciliado"];
      const setClauses: any[] = [];
      
      for (const field of allowedFields) {
        if (field in updates) {
          if (field === "capital") setClauses.push(sql`capital = ${updates.capital}`);
          if (field === "utility") setClauses.push(sql`utility = ${updates.utility}`);
          if (field === "anticipo") setClauses.push(sql`anticipo = ${updates.anticipo}`);
          if (field === "conciliado") setClauses.push(sql`conciliado = ${updates.conciliado}`);
        }
      }
      
      if (setClauses.length === 0) {
        return res.status(400).json({ error: "No hay campos válidos para actualizar" });
      }
      
      const result = await db.execute(
        sql`UPDATE administracion SET ${sql.join(setClauses, sql`, `)} WHERE id = ${id} RETURNING *`
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      
      broadcast("administracion_updated");
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating administracion:", error);
      res.status(500).json({ error: "Error al actualizar registro" });
    }
  });

  // Gastos CRUD
  app.get("/api/administracion/gastos", async (req, res) => {
    try {
      const { unidadId } = req.query;
      const gastos = unidadId 
        ? await storage.getGastosByUnidad(unidadId as string)
        : await storage.getAllGastos();
      res.json(gastos);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener gastos" });
    }
  });

  app.post("/api/administracion/gastos", async (req, res) => {
    try {
      const parseResult = insertGastoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const gasto = await storage.createGasto(parseResult.data);
      broadcast("gastos_updated");
      res.status(201).json(gasto);
    } catch (error) {
      res.status(500).json({ error: "Error al crear gasto" });
    }
  });

  app.put("/api/administracion/gastos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertGastoSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const gasto = await storage.updateGasto(id, parseResult.data);
      if (!gasto) {
        return res.status(404).json({ error: "Gasto no encontrado" });
      }
      broadcast("gastos_updated");
      res.json(gasto);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar gasto" });
    }
  });

  app.delete("/api/administracion/gastos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGasto(id);
      if (!deleted) {
        return res.status(404).json({ error: "Gasto no encontrado" });
      }
      broadcast("gastos_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar gasto" });
    }
  });

  // Nóminas CRUD
  app.get("/api/administracion/nominas", async (req, res) => {
    try {
      const { unidadId } = req.query;
      const nominas = unidadId 
        ? await storage.getNominasByUnidad(unidadId as string)
        : await storage.getAllNominas();
      res.json(nominas);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener nóminas" });
    }
  });

  app.post("/api/administracion/nominas", async (req, res) => {
    try {
      const parseResult = insertNominaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const nomina = await storage.createNomina(parseResult.data);
      broadcast("nominas_updated");
      res.status(201).json(nomina);
    } catch (error) {
      res.status(500).json({ error: "Error al crear nómina" });
    }
  });

  app.put("/api/administracion/nominas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertNominaSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const nomina = await storage.updateNomina(id, parseResult.data);
      if (!nomina) {
        return res.status(404).json({ error: "Nómina no encontrada" });
      }
      broadcast("nominas_updated");
      res.json(nomina);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar nómina" });
    }
  });

  app.delete("/api/administracion/nominas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteNomina(id);
      if (!deleted) {
        return res.status(404).json({ error: "Nómina no encontrada" });
      }
      broadcast("nominas_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar nómina" });
    }
  });

  // Ventas CRUD
  app.get("/api/administracion/ventas", async (req, res) => {
    try {
      const { unidadId } = req.query;
      const ventas = unidadId 
        ? await storage.getVentasByUnidad(unidadId as string)
        : await storage.getAllVentas();
      res.json(ventas);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  });

  app.post("/api/administracion/ventas", async (req, res) => {
    try {
      const parseResult = insertVentaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const venta = await storage.createVenta(parseResult.data);
      broadcast("ventas_updated");
      res.status(201).json(venta);
    } catch (error) {
      res.status(500).json({ error: "Error al crear venta" });
    }
  });

  app.put("/api/administracion/ventas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertVentaSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const venta = await storage.updateVenta(id, parseResult.data);
      if (!venta) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      broadcast("ventas_updated");
      res.json(venta);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar venta" });
    }
  });

  app.delete("/api/administracion/ventas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteVenta(id);
      if (!deleted) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      broadcast("ventas_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar venta" });
    }
  });

  // Cuentas por Cobrar CRUD
  app.get("/api/administracion/cuentas-cobrar", async (req, res) => {
    try {
      const { unidadId } = req.query;
      const cuentas = unidadId 
        ? await storage.getCuentasCobrarByUnidad(unidadId as string)
        : await storage.getAllCuentasCobrar();
      res.json(cuentas);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener cuentas por cobrar" });
    }
  });

  app.post("/api/administracion/cuentas-cobrar", async (req, res) => {
    try {
      const parseResult = insertCuentaCobrarSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const cuenta = await storage.createCuentaCobrar(parseResult.data);
      broadcast("cuentas_cobrar_updated");
      res.status(201).json(cuenta);
    } catch (error) {
      res.status(500).json({ error: "Error al crear cuenta por cobrar" });
    }
  });

  app.put("/api/administracion/cuentas-cobrar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertCuentaCobrarSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const cuenta = await storage.updateCuentaCobrar(id, parseResult.data);
      if (!cuenta) {
        return res.status(404).json({ error: "Cuenta por cobrar no encontrada" });
      }
      broadcast("cuentas_cobrar_updated");
      res.json(cuenta);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar cuenta por cobrar" });
    }
  });

  app.delete("/api/administracion/cuentas-cobrar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCuentaCobrar(id);
      if (!deleted) {
        return res.status(404).json({ error: "Cuenta por cobrar no encontrada" });
      }
      broadcast("cuentas_cobrar_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar cuenta por cobrar" });
    }
  });

  // Cuentas por Pagar CRUD
  app.get("/api/administracion/cuentas-pagar", async (req, res) => {
    try {
      const { unidadId } = req.query;
      const cuentas = unidadId 
        ? await storage.getCuentasPagarByUnidad(unidadId as string)
        : await storage.getAllCuentasPagar();
      res.json(cuentas);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener cuentas por pagar" });
    }
  });

  app.post("/api/administracion/cuentas-pagar", async (req, res) => {
    try {
      const parseResult = insertCuentaPagarSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const cuenta = await storage.createCuentaPagar(parseResult.data);
      broadcast("cuentas_pagar_updated");
      res.status(201).json(cuenta);
    } catch (error) {
      res.status(500).json({ error: "Error al crear cuenta por pagar" });
    }
  });

  app.put("/api/administracion/cuentas-pagar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertCuentaPagarSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const cuenta = await storage.updateCuentaPagar(id, parseResult.data);
      if (!cuenta) {
        return res.status(404).json({ error: "Cuenta por pagar no encontrada" });
      }
      broadcast("cuentas_pagar_updated");
      res.json(cuenta);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar cuenta por pagar" });
    }
  });

  app.delete("/api/administracion/cuentas-pagar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCuentaPagar(id);
      if (!deleted) {
        return res.status(404).json({ error: "Cuenta por pagar no encontrada" });
      }
      broadcast("cuentas_pagar_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar cuenta por pagar" });
    }
  });

  // Préstamos CRUD
  app.get("/api/administracion/prestamos", async (req, res) => {
    try {
      const { unidadId } = req.query;
      const prestamos = unidadId 
        ? await storage.getPrestamosByUnidad(unidadId as string)
        : await storage.getAllPrestamos();
      res.json(prestamos);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener préstamos" });
    }
  });

  app.post("/api/administracion/prestamos", async (req, res) => {
    try {
      const parseResult = insertPrestamoSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const prestamo = await storage.createPrestamo(parseResult.data);
      broadcast("prestamos_updated");
      res.status(201).json(prestamo);
    } catch (error) {
      res.status(500).json({ error: "Error al crear préstamo" });
    }
  });

  app.put("/api/administracion/prestamos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertPrestamoSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const prestamo = await storage.updatePrestamo(id, parseResult.data);
      if (!prestamo) {
        return res.status(404).json({ error: "Préstamo no encontrado" });
      }
      broadcast("prestamos_updated");
      res.json(prestamo);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar préstamo" });
    }
  });

  app.delete("/api/administracion/prestamos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePrestamo(id);
      if (!deleted) {
        return res.status(404).json({ error: "Préstamo no encontrado" });
      }
      broadcast("prestamos_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar préstamo" });
    }
  });

  // Movimientos Bancarios CRUD
  app.get("/api/administracion/movimientos-bancarios", async (req, res) => {
    try {
      const { bancoId, fechaInicio, fechaFin, limit, offset } = req.query;
      let movimientos = bancoId 
        ? await storage.getMovimientosByBanco(bancoId as string)
        : await storage.getAllMovimientosBancarios();
      
      if (fechaInicio) {
        movimientos = movimientos.filter(m => m.fecha >= (fechaInicio as string));
      }
      if (fechaFin) {
        movimientos = movimientos.filter(m => m.fecha <= (fechaFin as string));
      }
      
      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        const offsetNum = parseInt((offset as string) || "0", 10);
        movimientos = movimientos.slice(offsetNum, offsetNum + limitNum);
      }
      
      res.json(movimientos);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener movimientos bancarios" });
    }
  });

  app.post("/api/administracion/movimientos-bancarios", async (req, res) => {
    try {
      const parseResult = insertMovimientoBancarioSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const movimiento = await storage.createMovimientoBancario(parseResult.data);
      broadcast("movimientos_bancarios_updated");
      res.status(201).json(movimiento);
    } catch (error) {
      res.status(500).json({ error: "Error al crear movimiento bancario" });
    }
  });

  app.put("/api/administracion/movimientos-bancarios/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertMovimientoBancarioSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const movimiento = await storage.updateMovimientoBancario(id, parseResult.data);
      if (!movimiento) {
        return res.status(404).json({ error: "Movimiento bancario no encontrado" });
      }
      broadcast("movimientos_bancarios_updated");
      res.json(movimiento);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar movimiento bancario" });
    }
  });

  app.delete("/api/administracion/movimientos-bancarios/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMovimientoBancario(id);
      if (!deleted) {
        return res.status(404).json({ error: "Movimiento bancario no encontrado" });
      }
      broadcast("movimientos_bancarios_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar movimiento bancario" });
    }
  });

  // Almacén CRUD - uses denormalized table
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
  
  app.get("/api/almacen/unidades", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT unidad FROM almacen ORDER BY unidad");
      res.json(result.rows.map((r: any) => r.unidad));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de unidades" });
    }
  });

  app.get("/api/almacen/insumos", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT insumo FROM almacen WHERE insumo IS NOT NULL ORDER BY insumo");
      res.json(result.rows.map((r: any) => r.insumo).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de insumos" });
    }
  });

  app.get("/api/almacen/operaciones", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT operacion FROM almacen WHERE operacion IS NOT NULL ORDER BY operacion");
      res.json(result.rows.map((r: any) => r.operacion).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de operaciones" });
    }
  });

  app.get("/api/almacen/categorias", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT categoria FROM almacen WHERE categoria IS NOT NULL ORDER BY categoria");
      res.json(result.rows.map((r: any) => r.categoria).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de categorías" });
    }
  });

  // Cosecha CRUD - uses denormalized table
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

  app.get("/api/cosecha/unidades", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT unidad FROM cosecha ORDER BY unidad");
      res.json(result.rows.map((r: any) => r.unidad).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de unidades" });
    }
  });

  app.get("/api/cosecha/cultivos", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT cultivo FROM cosecha WHERE cultivo IS NOT NULL ORDER BY cultivo");
      res.json(result.rows.map((r: any) => r.cultivo).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de cultivos" });
    }
  });

  app.get("/api/cosecha/ciclos", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT ciclo FROM cosecha WHERE ciclo IS NOT NULL ORDER BY ciclo");
      res.json(result.rows.map((r: any) => r.ciclo).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de ciclos" });
    }
  });

  app.get("/api/cosecha/choferes", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT chofer FROM cosecha WHERE chofer IS NOT NULL ORDER BY chofer");
      res.json(result.rows.map((r: any) => r.chofer).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de choferes" });
    }
  });

  app.get("/api/cosecha/destinos", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT destino FROM cosecha WHERE destino IS NOT NULL ORDER BY destino");
      res.json(result.rows.map((r: any) => r.destino).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de destinos" });
    }
  });

  // Cheques CRUD - uses denormalized table
  app.get("/api/cheques", async (req, res) => {
    try {
      const { unidad, banco, fechaInicio, fechaFin, limit, offset } = req.query;
      
      let result = await db.execute("SELECT * FROM cheques ORDER BY fecha DESC");
      let registros = result.rows as any[];
      
      if (unidad) {
        registros = registros.filter((r) => r.unidad === unidad);
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

      const total = registros.length;
      if (offset) registros = registros.slice(Number(offset));
      if (limit) registros = registros.slice(0, Number(limit));

      res.json({ data: registros, total, hasMore: total > (Number(offset || 0) + registros.length) });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener cheques" });
    }
  });

  app.get("/api/cheques/unidades", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT unidad FROM cheques WHERE unidad IS NOT NULL ORDER BY unidad");
      res.json(result.rows.map((r: any) => r.unidad).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de unidades" });
    }
  });

  app.get("/api/cheques/bancos", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT banco FROM cheques WHERE banco IS NOT NULL ORDER BY banco");
      res.json(result.rows.map((r: any) => r.banco).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de bancos" });
    }
  });

  app.get("/api/cheques/actividades", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT actividad FROM cheques WHERE actividad IS NOT NULL ORDER BY actividad");
      res.json(result.rows.map((r: any) => r.actividad).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de actividades" });
    }
  });

  // Transferencias CRUD - uses denormalized table
  app.get("/api/transferencias", async (req, res) => {
    try {
      const { unidad, banco, actividad, fechaInicio, fechaFin, limit, offset } = req.query;
      
      let result = await db.execute("SELECT * FROM transferencias ORDER BY fecha DESC");
      let registros = result.rows as any[];
      
      if (unidad) {
        registros = registros.filter((r) => r.unidad === unidad);
      }
      if (banco) {
        registros = registros.filter((r) => r.banco === banco);
      }
      if (actividad) {
        registros = registros.filter((r) => r.actividad === actividad);
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

  app.get("/api/transferencias/unidades", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT unidad FROM transferencias WHERE unidad IS NOT NULL ORDER BY unidad");
      res.json(result.rows.map((r: any) => r.unidad).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de unidades" });
    }
  });

  app.get("/api/transferencias/bancos", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT banco FROM transferencias WHERE banco IS NOT NULL ORDER BY banco");
      res.json(result.rows.map((r: any) => r.banco).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de bancos" });
    }
  });

  app.get("/api/transferencias/actividades", async (req, res) => {
    try {
      const result = await db.execute("SELECT DISTINCT actividad FROM transferencias WHERE actividad IS NOT NULL ORDER BY actividad");
      res.json(result.rows.map((r: any) => r.actividad).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Error al obtener lista de actividades" });
    }
  });

  app.post("/api/almacen", async (req, res) => {
    try {
      const parseResult = insertAlmacenSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const registro = await storage.createAlmacen(parseResult.data);
      broadcast("almacen_updated");
      res.status(201).json(registro);
    } catch (error) {
      res.status(500).json({ error: "Error al crear registro de almacén" });
    }
  });

  app.put("/api/almacen/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = insertAlmacenSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parseResult.error.issues });
      }
      const registro = await storage.updateAlmacen(id, parseResult.data);
      if (!registro) {
        return res.status(404).json({ error: "Registro de almacén no encontrado" });
      }
      broadcast("almacen_updated");
      res.json(registro);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar registro de almacén" });
    }
  });

  app.delete("/api/almacen/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAlmacen(id);
      if (!deleted) {
        return res.status(404).json({ error: "Registro de almacén no encontrado" });
      }
      broadcast("almacen_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar registro de almacén" });
    }
  });

  app.get("/api/parametros", async (req, res) => {
    try {
      const parametros = await storage.getAllParametros();
      res.json(parametros);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener parámetros" });
    }
  });

  // Temporary storage for export files
  const exportCache = new Map<string, { data: Buffer; filename: string; expires: number }>();

  // Export all data with progress - uses SSE for real-time updates
  app.get("/api/export-all-data-progress", async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendProgress = (phase: string, detail: string, progress: number) => {
      res.write(`data: ${JSON.stringify({ phase, detail, progress })}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();
    };

    try {
      const tables: Record<string, any[]> = {};
      const tableNames = [
        { key: 'almacen', name: 'Almacén', fn: () => storage.getAllAlmacen() },
        { key: 'parametros', name: 'Parámetros', fn: () => storage.getAllParametros() },
        { key: 'cosecha', name: 'Cosecha', fn: () => storage.getAllCosecha() },
        { key: 'cheques', name: 'Cheques', fn: () => storage.getAllCheques() },
        { key: 'transferencias', name: 'Transferencias', fn: () => storage.getAllTransferencias() },
        { key: 'administracion', name: 'Administración', fn: () => storage.getAllAdministracion() },
        { key: 'bancos', name: 'Bancos', fn: () => storage.getAllBancosDBF() }
      ];

      // Phase 1: Loading tables
      for (let i = 0; i < tableNames.length; i++) {
        const table = tableNames[i];
        sendProgress('loading', `Cargando ${table.name}...`, Math.round((i / tableNames.length) * 40));
        tables[table.key] = await table.fn();
      }

      // Phase 2: Preparing data
      sendProgress('preparing', 'Preparando datos...', 50);
      const exportData = {
        exportDate: new Date().toISOString(),
        tables
      };
      const jsonString = JSON.stringify(exportData);

      // Phase 3: Compressing
      sendProgress('compressing', 'Comprimiendo datos...', 70);
      const compressed = await gzipAsync(Buffer.from(jsonString));
      sendProgress('compressing', 'Guardando...', 90);

      // Phase 4: Store in cache with unique ID
      const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const filename = `export_${new Date().toISOString().split('T')[0]}.json.gz`;
      exportCache.set(exportId, { 
        data: compressed, 
        filename,
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes
      });

      // Clean old exports
      Array.from(exportCache.entries()).forEach(([id, entry]) => {
        if (entry.expires < Date.now()) exportCache.delete(id);
      });

      sendProgress('ready', 'Exportación lista', 100);
      
      // Send only the download ID, not the data
      const completeMsg = `data: ${JSON.stringify({ 
        phase: 'complete', 
        exportId,
        filename
      })}\n\n`;
      res.write(completeMsg);
      if (typeof (res as any).flush === 'function') (res as any).flush();
      
      // Small delay to ensure client receives the message
      await new Promise(resolve => setTimeout(resolve, 100));
      res.end();
    } catch (error) {
      console.error("Error exporting data:", error);
      res.write(`data: ${JSON.stringify({ phase: 'error', detail: 'Error al exportar datos' })}\n\n`);
      res.end();
    }
  });

  // Download exported file by ID
  app.get("/api/export-download/:exportId", (req, res) => {
    const { exportId } = req.params;
    const entry = exportCache.get(exportId);
    
    if (!entry || entry.expires < Date.now()) {
      exportCache.delete(exportId);
      return res.status(404).json({ error: "Exportación expirada o no encontrada" });
    }

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename=${entry.filename}`);
    res.setHeader('Content-Length', entry.data.length);
    res.send(entry.data);
    
    // Don't delete immediately - let it expire naturally (5 minutes)
  });

  // Import data endpoint
  app.post("/api/import-data", upload.single('file'), async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendProgress = (phase: string, detail: string, progress: number) => {
      res.write(`data: ${JSON.stringify({ phase, detail, progress })}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();
    };

    try {
      if (!req.file) {
        res.write(`data: ${JSON.stringify({ phase: 'error', detail: 'No se recibió archivo' })}\n\n`);
        res.end();
        return;
      }

      sendProgress('decompressing', 'Procesando archivo...', 20);

      let jsonData: string;
      const fileBuffer = req.file.buffer;
      
      // Check if gzipped
      if (req.file.originalname.endsWith('.gz')) {
        const decompressed = await gunzipAsync(fileBuffer);
        jsonData = decompressed.toString('utf-8');
      } else {
        jsonData = fileBuffer.toString('utf-8');
      }

      sendProgress('importing', 'Analizando datos...', 40);

      const importData = JSON.parse(jsonData);
      const tables = importData.tables;
      let totalRecords = 0;

      // Whitelist of allowed tables
      const allowedTables = ['administracion', 'almacen', 'bancos', 'cheques', 'cosecha', 'parametros', 'transferencias'];
      
      // Import each table
      const tableNames = Object.keys(tables).filter(t => allowedTables.includes(t));
      for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        const records = tables[tableName];
        
        if (!Array.isArray(records) || records.length === 0) continue;

        sendProgress('importing', `Importando ${tableName}...`, 40 + Math.round((i / tableNames.length) * 50));

        // Use raw SQL to insert data with parameterized queries
        for (const record of records) {
          try {
            const columns = Object.keys(record).filter(k => k !== 'id');
            const values = columns.map(c => record[c]);
            const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
            const columnNames = columns.map(c => `"${c}"`).join(', ');
            
            await db.execute({
              sql: `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              args: values
            } as any);
            totalRecords++;
          } catch (e) {
            // Skip individual record errors
          }
        }
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

  app.patch("/api/parametros/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updated = await storage.updateParametro(id, updateData);
      if (updated) {
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
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Parámetro no encontrado" });
      }
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar parámetro" });
    }
  });

  return httpServer;
}
