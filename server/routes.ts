import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import * as net from "net";
import { storage } from "./storage";
import { db, pool } from "./db";
import { sql, eq } from "drizzle-orm";
import { insertBancoSchema, insertAlmacenSchema, agrodata, defaults, bancos as bancosTable } from "@shared/schema";
import { z } from "zod";
import { enviarComprobantePago, type PagoEmailData } from "./gmail";

const execFileAsync = promisify(execFile);

const TZ = 'America/Caracas';

function getLocalDate() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('es-VE', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(now);
  const p = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return {
    dd: p('day'),
    mm: p('month'),
    yyyy: p('year'),
    aa: p('year').slice(-2),
    hh: p('hour'),
    mi: p('minute'),
    ss: p('second'),
  };
}

function isValidIPv4(ip: string): boolean {
  return net.isIPv4(ip);
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const wsClients = new Set<WebSocket>();

export function broadcast(type: string, data?: any) {
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

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 4).padStart(4, "0");
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

// Campos válidos para filtros de texto por módulo
const VALID_TEXT_FILTER_FIELDS: Record<string, string[]> = {
  administracion: ["actividad", "proveedor", "insumo", "personal", "producto", "cliente", "nrofactura"],
  cosecha: ["cultivo", "ciclo", "chofer", "destino"],
  almacen: ["suministro", "movimiento", "categoria"],

  transferencias: ["actividad", "tipo"],
  agronomia: ["opagro"],
  reparaciones: ["maquinarias"],
  bitacora: [],
  bancos: ["operacion", "operador"],
  agrodata: ["equipo", "plan", "estado"],
  arrime: ["proveedor", "placa", "nucleocorte", "nucleotransporte", "finca", "central"],
  portal: ["banco"]
};

// Campos válidos para filtros booleanos por módulo
const VALID_BOOLEAN_FILTER_FIELDS: Record<string, string[]> = {
  administracion: ["capital", "utility", "anticipo", "relacionado", "cancelada", "enviada"],
  cosecha: ["utility", "cancelado"],
  almacen: ["utility"],
  agronomia: ["utility"],
  reparaciones: ["utility"],
  bitacora: [],

  transferencias: ["utility", "transferido", "contabilizado", "ejecutada"],
  bancos: ["conciliado", "utility", "relacionado"],
  agrodata: ["utility"],
  arrime: ["utility", "feriado"]
};

// Construye cláusulas WHERE para filtros de texto, booleanos y descripción
function buildAdvancedFiltersSQL(
  query: Record<string, any>,
  moduleName: string
) {
  let clause = sql``;
  
  const tablasConDescripcion = ["bancos", "administracion", "parametros", "almacen", "agronomia", "bitacora", "agrodata", "reparaciones", "transferencias"];
  const descripcion = query.descripcion as string | undefined;
  if (descripcion && descripcion.trim() && tablasConDescripcion.includes(moduleName)) {
    const searchPattern = '%' + descripcion.trim() + '%';
    clause = sql`${clause} AND LOWER(descripcion) LIKE LOWER(${searchPattern})`;
  }
  
  if (moduleName === "agrodata") {
    for (const searchField of ["nombre", "ip"]) {
      const val = query[searchField] as string | undefined;
      if (val && val.trim()) {
        const pattern = val.trim() + '%';
        clause = sql`${clause} AND LOWER(${sql.raw(searchField)}) LIKE LOWER(${pattern})`;
      }
    }
  }

  if (moduleName === "portal") {
    const nombre = query.nombre as string | undefined;
    if (nombre && nombre.trim()) {
      const pattern = '%' + nombre.trim().toLowerCase() + '%';
      clause = sql`${clause} AND LOWER(nombre) LIKE ${pattern}`;
    }
    const fechaInicio = query.fechaInicio as string | undefined;
    if (fechaInicio && fechaInicio.trim()) {
      clause = sql`${clause} AND fecha >= ${fechaInicio.trim()}`;
    }
    const fechaFin = query.fechaFin as string | undefined;
    if (fechaFin && fechaFin.trim()) {
      clause = sql`${clause} AND fecha <= ${fechaFin.trim()}`;
    }
  }

  if (moduleName === "bancos") {
    const comprobante = query.comprobante as string | undefined;
    if (comprobante && comprobante.trim()) {
      const comprobantePattern = '%' + comprobante.trim() + '%';
      clause = sql`${clause} AND LOWER(comprobante) LIKE LOWER(${comprobantePattern})`;
    }
  }
  
  // Filtros de texto (coincidencia exacta)
  const validTextFields = VALID_TEXT_FILTER_FIELDS[moduleName] || [];
  for (const field of validTextFields) {
    const value = query[field] as string | undefined;
    if (value && value.trim()) {
      clause = sql`${clause} AND ${sql.raw(field)} = ${value.trim()}`;
    }
  }
  
  // Filtros booleanos
  const validBooleanFields = VALID_BOOLEAN_FILTER_FIELDS[moduleName] || [];
  for (const field of validBooleanFields) {
    const value = query[field] as string | undefined;
    if (value === "true") {
      clause = sql`${clause} AND (${sql.raw(field)} = true OR ${sql.raw(field)} = 't')`;
    } else if (value === "false") {
      clause = sql`${clause} AND (${sql.raw(field)} = false OR ${sql.raw(field)} = 'f' OR ${sql.raw(field)} IS NULL)`;
    }
  }

  const modulosConMonto = ["bancos", "administracion"];
  if (modulosConMonto.includes(moduleName)) {
    const montoMin = parseFloat(query.montoMin as string);
    const montoMax = parseFloat(query.montoMax as string);
    const montoDolaresMin = parseFloat(query.montoDolaresMin as string);
    const montoDolaresMax = parseFloat(query.montoDolaresMax as string);
    if (!isNaN(montoMin)) {
      clause = sql`${clause} AND monto >= ${montoMin}`;
    }
    if (!isNaN(montoMax)) {
      clause = sql`${clause} AND monto <= ${montoMax}`;
    }
    if (!isNaN(montoDolaresMin)) {
      clause = sql`${clause} AND montodolares >= ${montoDolaresMin}`;
    }
    if (!isNaN(montoDolaresMax)) {
      clause = sql`${clause} AND montodolares <= ${montoDolaresMax}`;
    }
  }
  
  return clause;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      tabla TEXT NOT NULL,
      operacion TEXT NOT NULL,
      registro_id TEXT NOT NULL,
      datos_anteriores JSONB,
      datos_nuevos JSONB,
      usuario TEXT DEFAULT 'sistema',
      deshecho BOOLEAN DEFAULT false
    )
  `);

  function extractUsername(body: any): string {
    return (body?.propietario || "").split(" ")[0].trim() || "sistema";
  }

  async function logAudit(tabla: string, operacion: string, registroId: string, datosAnteriores: any, datosNuevos: any, usuario?: string) {
    try {
      await db.execute(sql`
        INSERT INTO audit_log (tabla, operacion, registro_id, datos_anteriores, datos_nuevos, usuario)
        VALUES (${tabla}, ${operacion}, ${registroId}, ${datosAnteriores ? JSON.stringify(datosAnteriores) : null}::jsonb, ${datosNuevos ? JSON.stringify(datosNuevos) : null}::jsonb, ${usuario || 'sistema'})
      `);
      await db.execute(sql`
        DELETE FROM audit_log WHERE id NOT IN (
          SELECT id FROM audit_log ORDER BY timestamp DESC LIMIT 50
        )
      `);
    } catch (e) {
      console.error("[AUDIT] Error logging:", e);
    }
  }

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  // MODELO DE SEGURIDAD para ping-agent (aplicación de usuario único):
  // - validAgentToken: Token de 6 caracteres para autenticar al agente Python
  // - sessionToken: Token único por sesión de navegador para vincular resultados
  // - El usuario ejecuta su propio agente en su PC para acceder a su red local
  // - Los tokens previenen conexiones aleatorias pero no multi-tenancy
  let pingAgent: WebSocket | null = null;
  // Usar token de variable de entorno si existe, sino generar uno nuevo
  let validAgentToken: string = process.env.PING_AGENT_TOKEN || generateAgentToken();
  console.log(`[PING-AGENT] Token: ${validAgentToken}${process.env.PING_AGENT_TOKEN ? " (desde env)" : " (generado)"}`);
  const pingBrowserSessions = new Map<string, { ws: WebSocket, sessionToken: string }>();
  const identifiedClients = new WeakMap<WebSocket, "agent" | "browser">();
  const pendingPingRequests = new Map<string, string>(); // sessionId -> sessionToken
  
  // Generar token de autenticación para el agente
  function generateAgentToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
  
  // Generar token único por sesión
  function generateSessionToken(): string {
    return `st_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }
  
  wss.on("connection", (ws: WebSocket) => {
    wsClients.add(ws);
    console.log(`WebSocket client connected. Total clients: ${wsClients.size}`);
    
    ws.on("message", (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "agent_hello") {
          // Validar que este socket no esté ya identificado como navegador
          if (identifiedClients.get(ws) === "browser") {
            ws.send(JSON.stringify({ type: "error", error: "Ya identificado como navegador" }));
            return;
          }
          
          // Validar token de autenticación
          const providedToken = message.token?.toUpperCase();
          if (!validAgentToken || providedToken !== validAgentToken) {
            console.log(`[PING-AGENT] Token inválido: ${providedToken} (esperado: ${validAgentToken})`);
            ws.send(JSON.stringify({ type: "agent_rejected", error: "Token inválido o expirado" }));
            return;
          }
          
          // Agente de PC conectado y autenticado
          identifiedClients.set(ws, "agent");
          pingAgent = ws;
          console.log(`[PING-AGENT] Agente conectado y autenticado desde ${message.platform || "desconocido"}`);
          
          ws.send(JSON.stringify({ type: "agent_registered", success: true }));
          
          // Notificar a todos los navegadores que hay un agente disponible
          pingBrowserSessions.forEach((session) => {
            if (session.ws.readyState === WebSocket.OPEN) {
              session.ws.send(JSON.stringify({ type: "agent_status", connected: true }));
            }
          });
          
        } else if (message.type === "browser_hello") {
          // Validar que este socket no esté ya identificado como agente
          if (identifiedClients.get(ws) === "agent") {
            ws.send(JSON.stringify({ type: "error", error: "Ya identificado como agente" }));
            return;
          }
          
          // Navegador conectado
          identifiedClients.set(ws, "browser");
          const sessionId = message.sessionId || `session_${Date.now()}`;
          
          // Reutilizar sessionToken si existe (reconexión), si no generar nuevo
          const existingSession = pingBrowserSessions.get(sessionId);
          const sessionToken = existingSession?.sessionToken || generateSessionToken();
          
          // Actualizar websocket pero mantener token si existía
          pingBrowserSessions.set(sessionId, { ws, sessionToken });
          console.log(`[PING-AGENT] Navegador conectado, sesión: ${sessionId}, reconexión: ${!!existingSession}`);
          
          // El token ya se genera al inicio del servidor y se mantiene estable
          
          // Informar al navegador si hay un agente conectado y darle el token
          ws.send(JSON.stringify({ 
            type: "agent_status", 
            connected: pingAgent?.readyState === WebSocket.OPEN,
            sessionId,
            agentToken: validAgentToken
          }));
          
        } else if (message.type === "ping_request") {
          // Solo navegadores pueden solicitar pings
          if (identifiedClients.get(ws) !== "browser") {
            ws.send(JSON.stringify({ type: "error", error: "Solo navegadores pueden solicitar pings" }));
            return;
          }
          
          // Obtener el token de sesión para validar las respuestas
          const browserSession = pingBrowserSessions.get(message.sessionId);
          if (!browserSession) {
            ws.send(JSON.stringify({ type: "error", error: "Sesión no encontrada" }));
            return;
          }
          
          // Guardar token de sesión para validar respuestas
          pendingPingRequests.set(message.sessionId, browserSession.sessionToken);
          
          if (pingAgent && pingAgent.readyState === WebSocket.OPEN) {
            console.log(`[PING-AGENT] Reenviando solicitud de ping para ${message.records?.length || 0} registros`);
            // Incluir sessionToken para que el agente lo devuelva en las respuestas
            pingAgent.send(JSON.stringify({
              ...message,
              sessionToken: browserSession.sessionToken
            }));
          } else {
            pendingPingRequests.delete(message.sessionId);
            ws.send(JSON.stringify({ 
              type: "agent_error", 
              error: "No hay agente conectado" 
            }));
          }
          
        } else if (message.type === "ping_result" || message.type === "ping_complete") {
          // Solo el agente puede enviar resultados
          if (identifiedClients.get(ws) !== "agent" || ws !== pingAgent) {
            ws.send(JSON.stringify({ type: "error", error: "Solo el agente puede enviar resultados" }));
            return;
          }
          
          // Validar que la sesión existe
          const browserSession = pingBrowserSessions.get(message.sessionId);
          if (!browserSession) {
            ws.send(JSON.stringify({ type: "error", error: "Sesión no encontrada" }));
            return;
          }
          
          // Validar token de sesión
          const expectedToken = pendingPingRequests.get(message.sessionId);
          if (!expectedToken || message.sessionToken !== expectedToken) {
            console.log(`[PING-AGENT] Token de sesión inválido para ${message.sessionId}`);
            ws.send(JSON.stringify({ type: "error", error: "Token de sesión inválido" }));
            return;
          }
          
          // Limpiar pending si es ping_complete
          if (message.type === "ping_complete") {
            pendingPingRequests.delete(message.sessionId);
          }
          
          // Resultado del agente, reenviar al navegador (sin el sessionToken)
          const { sessionToken, ...messageWithoutToken } = message;
          console.log(`[PING-AGENT] Reenviando resultado:`, JSON.stringify(messageWithoutToken));
          if (browserSession.ws.readyState === WebSocket.OPEN) {
            browserSession.ws.send(JSON.stringify(messageWithoutToken));
            
            // Si es un resultado exitoso, actualizar la base de datos
            if (message.type === "ping_result" && message.result) {
              const { id, latencia, mac, estado } = message.result;
              console.log(`[PING-AGENT] Resultado para ${id}: latencia=${latencia}, mac=${mac}, estado=${estado}`);
              if (id) {
                db.update(agrodata)
                  .set({
                    latencia: latencia || null,
                    mac: mac || undefined,
                    estado: estado || undefined
                  })
                  .where(eq(agrodata.id, id))
                  .execute()
                  .catch((err: Error) => console.error(`Error actualizando agrodata ${id}:`, err));
              }
            }
          }
          
        } else if (message.type === "heartbeat_response") {
          // Respuesta de heartbeat del agente
        }
        
      } catch (err) {
        console.error("[PING-AGENT] Error procesando mensaje:", err);
      }
    });
    
    ws.on("close", () => {
      wsClients.delete(ws);
      console.log(`WebSocket client disconnected. Total clients: ${wsClients.size}`);
      
      const clientType = identifiedClients.get(ws);
      
      if (clientType === "agent" && ws === pingAgent) {
        pingAgent = null;
        console.log("[PING-AGENT] Agente desconectado");
        // Notificar a todos los navegadores
        pingBrowserSessions.forEach((session) => {
          if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({ type: "agent_status", connected: false }));
          }
        });
      } else if (clientType === "browser") {
        // Buscar y eliminar sesión de navegador
        pingBrowserSessions.forEach((session, sessionId) => {
          if (session.ws === ws) {
            pingBrowserSessions.delete(sessionId);
            pendingPingRequests.delete(sessionId);
            console.log(`[PING-AGENT] Navegador desconectado, sesión: ${sessionId}`);
          }
        });
      }
    });
    
    ws.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
      wsClients.delete(ws);
    });
  });

  // Endpoint para verificar estado del agente
  app.get("/api/ping-agent/status", (_req, res) => {
    res.json({ 
      connected: pingAgent?.readyState === WebSocket.OPEN,
      browserSessions: pingBrowserSessions.size
    });
  });
  
  // Servir el script del agente Python
  app.get("/ping-agent.py", (_req, res) => {
    const filePath = path.join(process.cwd(), "public", "ping-agent.py");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "text/x-python");
      res.setHeader("Content-Disposition", "attachment; filename=ping-agent.py");
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ error: "Archivo no encontrado" });
    }
  });
  
  // [HEALTH] Verificar que el servidor está funcionando
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  const SERVER_START_VERSION = Date.now().toString();
  const startParts = getLocalDate();
  const versionLabel = `v${startParts.aa}.${startParts.mm}.${startParts.dd}-${startParts.hh}:${startParts.mi}`;
  app.get("/api/version", (_req, res) => {
    res.json({ version: SERVER_START_VERSION, label: versionLabel });
  });

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/test-error", (_req, _res, next) => {
      next(new Error("Error de prueba para verificar notificaciones Telegram"));
    });
  }

  // [LOGIN] Validar credenciales del usuario contra la tabla parametros con tipo='claves'
  // Helper function to decode permissions (matching client-side permissionUtils)
  function decodePermissions(encoded: string): { password: string; bancos: string[]; tabs: string[]; menu: string[]; unidades: string[] } {
    const perms = { password: "", bancos: [] as string[], tabs: [] as string[], menu: [] as string[], unidades: [] as string[] };
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
        case "unidades":
          perms.unidades = value.split(",").filter(Boolean);
          break;
      }
    }
    return perms;
  }

  app.get("/api/permissions/:username", async (req, res) => {
    try {
      const { username } = req.params;
      if (!username) {
        return res.status(400).json({ error: "Username requerido" });
      }
      const result = await db.execute(
        sql`SELECT * FROM parametros WHERE tipo = 'claves' AND LOWER(nombre) = LOWER(${username}) AND habilitado = true LIMIT 1`
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      const user = result.rows[0] as any;
      const perms = decodePermissions(user.descripcion || "");
      res.json({
        bancos: perms.bancos,
        tabs: perms.tabs,
        menu: perms.menu,
        unidades: perms.unidades,
      });
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ error: "Error al obtener permisos" });
    }
  });

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
          menu: perms.menu,
          unidades: perms.unidades
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

  app.delete("/api/debug/wipe-keep-parametros", async (req, res) => {
    try {
      await storage.wipeDataKeepParametros();
      res.json({ message: "Datos eliminados, parámetros conservados" });
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
      // No aplicar reconversión a cuentas en dólares o euros
      const bancoLower = bancoNombre.toLowerCase().trim();
      const esCuentaDivisas = bancoLower.startsWith("dolares") || bancoLower.startsWith("euro");
      const fechaReconversion = new Date("2018-08-18");
      let reconversionAplicada = esCuentaDivisas ? true : false;
      let fechaUltimoRegistroAnterior: Date | null = null;
      
      if (desdeFecha) {
        const prevQuery = `
          SELECT saldo, saldo_conciliado, fecha 
          FROM bancos 
          WHERE banco = $1 AND fecha < $2
          ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
          LIMIT 1
        `;
        const prevResult = await client.query(prevQuery, [bancoNombre, desdeFecha]);
        if (prevResult.rows.length > 0) {
          saldoInicial = Number(prevResult.rows[0].saldo) || 0;
          saldoConciliadoInicial = Number(prevResult.rows[0].saldo_conciliado) || 0;
          fechaUltimoRegistroAnterior = parseFechaToDate(prevResult.rows[0].fecha);
        }
        
        registrosQuery = `SELECT id, monto, operador, fecha, conciliado FROM bancos WHERE banco = $1 AND fecha >= $2 ORDER BY LEFT(fecha, 10) ASC, secuencia ASC`;
        queryParams.push(desdeFecha);
      } else {
        registrosQuery = `SELECT id, monto, operador, fecha, conciliado FROM bancos WHERE banco = $1 ORDER BY LEFT(fecha, 10) ASC, secuencia ASC`;
      }

      const registrosResult = await client.query(registrosQuery, queryParams);
      const registros = registrosResult.rows;

      let saldoAcumulado = saldoInicial;
      let saldoConciliadoAcumulado = saldoConciliadoInicial;
      
      if (!esCuentaDivisas) {
        if (fechaUltimoRegistroAnterior && fechaUltimoRegistroAnterior >= fechaReconversion) {
          reconversionAplicada = true;
        } else if (desdeFecha) {
          const fechaInicio = parseFechaToDate(desdeFecha);
          if (fechaInicio && fechaInicio >= fechaReconversion && saldoAcumulado !== 0) {
            saldoAcumulado = saldoAcumulado / 100000;
            saldoConciliadoAcumulado = saldoConciliadoAcumulado / 100000;
            reconversionAplicada = true;
          }
        }
      }

      const batchIds: string[] = [];
      const batchSaldos: number[] = [];
      const batchSaldosConciliados: number[] = [];
      
      for (const registro of registros) {
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

        batchIds.push(registro.id);
        batchSaldos.push(saldoFinal);
        batchSaldosConciliados.push(saldoConciliadoFinal);

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

      if (batchIds.length > 0) {
        await client.query(
          `UPDATE bancos SET saldo = batch.saldo, saldo_conciliado = batch.saldo_conciliado
           FROM (SELECT unnest($1::text[]) AS id, unnest($2::numeric[]) AS saldo, unnest($3::numeric[]) AS saldo_conciliado) AS batch
           WHERE bancos.id = batch.id`,
          [batchIds, batchSaldos, batchSaldosConciliados]
        );
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

  // [ALMACEN] Recalcular existencia (saldo) para un suministro específico
  async function recalcularExistenciaAlmacen(suministroNombre: string, desdeFecha?: string): Promise<void> {
    serverLog("RECÁLCULO ALMACEN INICIO", `Suministro: ${suministroNombre}${desdeFecha ? `, desde: ${desdeFecha}` : ''}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let existenciaInicial = 0;
      let registrosQuery: string;
      const queryParams: any[] = [suministroNombre];
      
      if (desdeFecha) {
        const prevQuery = `
          SELECT saldo 
          FROM almacen 
          WHERE suministro = $1 AND fecha < $2
          ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
          LIMIT 1
        `;
        const prevResult = await client.query(prevQuery, [suministroNombre, desdeFecha]);
        if (prevResult.rows.length > 0) {
          existenciaInicial = Number(prevResult.rows[0].saldo) || 0;
        }
        
        registrosQuery = `SELECT id, cantidad, movimiento, fecha FROM almacen WHERE suministro = $1 AND fecha >= $2 ORDER BY LEFT(fecha, 10) ASC, secuencia ASC`;
        queryParams.push(desdeFecha);
      } else {
        registrosQuery = `SELECT id, cantidad, movimiento, fecha FROM almacen WHERE suministro = $1 ORDER BY LEFT(fecha, 10) ASC, secuencia ASC`;
      }

      const registrosResult = await client.query(registrosQuery, queryParams);
      const registros = registrosResult.rows;

      let existenciaAcumulada = existenciaInicial;

      const batchIds: string[] = [];
      const batchSaldos: number[] = [];
      
      for (const registro of registros) {
        const movimiento = (registro.movimiento || "entrada").toLowerCase();
        const cantidad = Number(registro.cantidad) || 0;
        
        if (movimiento === "entrada") {
          existenciaAcumulada += cantidad;
        } else if (movimiento === "salida") {
          existenciaAcumulada -= cantidad;
        }

        const existenciaFinal = Math.round(existenciaAcumulada * 100) / 100;

        batchIds.push(registro.id);
        batchSaldos.push(existenciaFinal);
      }

      if (batchIds.length > 0) {
        await client.query(
          `UPDATE almacen SET saldo = batch.saldo
           FROM (SELECT unnest($1::text[]) AS id, unnest($2::numeric[]) AS saldo) AS batch
           WHERE almacen.id = batch.id`,
          [batchIds, batchSaldos]
        );
      }

      await client.query('COMMIT');
      serverLog("RECÁLCULO ALMACEN OK", `Suministro: ${suministroNombre}, ${registros.length} registros`);
    } catch (error) {
      await client.query('ROLLBACK');
      serverLog("RECÁLCULO ALMACEN ERROR", `Suministro: ${suministroNombre}, error: ${error}`);
      console.error(`Error recalculando existencia para suministro ${suministroNombre}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async function recalcularRestaCancelar(tipo: 'cuentasporcobrar' | 'cuentasporpagar', persona?: string, nrofactura?: string, unidad?: string): Promise<void> {
    const isCxc = tipo === 'cuentasporcobrar';
    const personaCol = isCxc ? 'cliente' : 'proveedor';

    let whereClause = sql`WHERE tipo = ${tipo}`;
    if (persona) {
      whereClause = sql`${whereClause} AND LOWER(${sql.raw(personaCol)}) = ${persona.toLowerCase()}`;
    }
    if (nrofactura) {
      whereClause = sql`${whereClause} AND LOWER(nrofactura) = ${nrofactura.toLowerCase()}`;
    }
    if (unidad) {
      whereClause = sql`${whereClause} AND LOWER(unidad) = ${unidad.toLowerCase()}`;
    }

    const cols = isCxc
      ? sql`id, cliente, nrofactura, montodolares, unidad`
      : sql`id, proveedor, nrofactura, montodolares, monto, unidad`;
    const allRows = await db.execute(sql`SELECT ${cols} FROM administracion ${whereClause} ORDER BY LEFT(fecha, 10) ASC, secuencia DESC`);

    const groups: Record<string, { facturaId: string | null; firstId: string; total: number; ids: string[] }> = {};
    for (const row of allRows.rows) {
      const r = row as any;
      const personaVal = (r[personaCol] || '').toLowerCase();
      const nrofacturaVal = (r.nrofactura || '').toLowerCase();
      const uni = (r.unidad || '').toLowerCase();
      const key = `${personaVal}|${nrofacturaVal}|${uni}`;
      const monto = isCxc
        ? (parseFloat(r.montodolares) || 0)
        : (parseFloat(r.montodolares) || parseFloat(r.monto) || 0);
      if (!groups[key]) {
        groups[key] = { facturaId: null, firstId: r.id, total: 0, ids: [] };
      }
      groups[key].total += monto;
      groups[key].ids.push(r.id);
      if (monto > 0 && groups[key].facturaId === null) {
        groups[key].facturaId = r.id;
      }
    }

    const updates: { id: string; restacancelar: number; cancelada: boolean }[] = [];
    for (const key of Object.keys(groups)) {
      const g = groups[key];
      const resta = parseFloat(g.total.toFixed(2));
      const invoiceId = g.facturaId || g.firstId;
      for (const id of g.ids) {
        if (id === invoiceId) {
          updates.push({ id, restacancelar: resta, cancelada: resta <= 0 });
        } else {
          updates.push({ id, restacancelar: 0, cancelada: true });
        }
      }
    }

    if (updates.length > 0) {
      const batchSize = 200;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        let caseResta = "CASE id";
        let caseCancelada = "CASE id";
        const batchIds: string[] = [];
        for (const u of batch) {
          caseResta += ` WHEN '${u.id.replace(/'/g, "''")}' THEN ${u.restacancelar}`;
          caseCancelada += ` WHEN '${u.id.replace(/'/g, "''")}' THEN ${u.cancelada}`;
          batchIds.push(`'${u.id.replace(/'/g, "''")}'`);
        }
        caseResta += " END";
        caseCancelada += " END";
        await db.execute(sql.raw(`UPDATE administracion SET restacancelar = (${caseResta})::numeric, cancelada = (${caseCancelada})::boolean WHERE id IN (${batchIds.join(',')})`));
      }
    }
  }

  app.get("/api/bancos/siguiente-comprobante", async (req, res) => {
    try {
      const { banco, operacion } = req.query as { banco?: string; operacion?: string };
      if (!banco || !operacion) {
        return res.status(400).json({ error: "banco y operacion son requeridos" });
      }
      const result = await db.execute(sql`
        SELECT COALESCE(MAX(CAST(comprobante AS INTEGER)), 0) AS max_comp
        FROM bancos
        WHERE banco = ${banco} AND operacion = ${operacion}
          AND comprobante IS NOT NULL AND comprobante ~ '^[0-9]+$'
      `);
      const maxComp = parseInt((result.rows[0] as any)?.max_comp || "0", 10);
      res.json({ siguiente: String(maxComp + 1) });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener siguiente comprobante" });
    }
  });

  // [BANCOS] TEMPORAL - Corregir comprobantes largos (>6 dígitos numéricos) → últimos 6 + nombre banco
  app.get("/api/bancos/recalcular-todas-secuencias", async (req, res) => {
    try {
      const bancosResult = await db.execute(sql`SELECT DISTINCT banco FROM bancos WHERE banco IS NOT NULL ORDER BY banco`);
      const bancosList = bancosResult.rows.map((r: any) => r.banco as string);

      let totalRegistros = 0;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const bancoNombre of bancosList) {
          const registros = await client.query(
            `SELECT id, LEFT(fecha,10) as fecha_dia FROM bancos WHERE banco = $1 ORDER BY LEFT(fecha,10) ASC, id ASC`,
            [bancoNombre]
          );

          let currentFecha = "";
          let sec = 0;
          const ids: string[] = [];
          const secs: number[] = [];

          for (const row of registros.rows) {
            if (row.fecha_dia !== currentFecha) {
              currentFecha = row.fecha_dia;
              sec = 0;
            }
            sec++;
            ids.push(row.id);
            secs.push(sec);
          }

          if (ids.length > 0) {
            const BATCH = 1000;
            for (let i = 0; i < ids.length; i += BATCH) {
              const batchIds = ids.slice(i, i + BATCH);
              const batchSecs = secs.slice(i, i + BATCH);
              const cases = batchIds.map((id, idx) => `WHEN '${id}' THEN ${batchSecs[idx]}`).join(' ');
              const idList = batchIds.map(id => `'${id}'`).join(',');
              await client.query(`UPDATE bancos SET secuencia = CASE id ${cases} END WHERE id IN (${idList})`);
            }
            totalRegistros += ids.length;
          }
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      broadcast("bancos_updated");
      res.json({ ok: true, bancos: bancosList.length, registros: totalRegistros });
    } catch (error) {
      serverLog("ERROR", `recalcular-todas-secuencias: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.get("/api/bancos/recalcular-todos-saldos", async (req, res) => {
    try {
      const bancosResult = await db.execute(sql`SELECT DISTINCT banco FROM bancos WHERE banco IS NOT NULL ORDER BY banco`);
      const bancosList = bancosResult.rows.map((r: any) => r.banco as string);

      let totalRegistros = 0;
      for (const bancoNombre of bancosList) {
        const recalculados = await recalcularSaldosBanco(bancoNombre);
        totalRegistros += recalculados.length;
      }

      res.json({ ok: true, bancos: bancosList.length, registros: totalRegistros });
    } catch (error) {
      serverLog("ERROR", `recalcular-todos-saldos: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.get("/api/bancos/saldos", async (req, res) => {
    try {
      const moneda = String(req.query.moneda || "todos").toLowerCase();

      const paramResult = await db.execute(
        sql`SELECT nombre FROM parametros WHERE tipo = 'bancos' AND habilitado = true`
      );
      let bancosHabilitados: string[] = paramResult.rows.map((r: any) => String(r.nombre).toLowerCase());

      if (moneda !== "todos") {
        bancosHabilitados = bancosHabilitados.filter(nombre => {
          const hasDolar = nombre.includes("dolar") || nombre.includes("dólar");
          const hasEuro = nombre.includes("euro");
          const hasCaja = nombre.includes("caja");
          if (moneda === "dolares") return hasDolar;
          if (moneda === "euros") return hasEuro;
          if (moneda === "caja") return hasCaja;
          if (moneda === "bolivares") return !hasDolar && !hasEuro && !hasCaja;
          return true;
        });
      }

      if (bancosHabilitados.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        const tasaResult = await db.execute(
          sql`SELECT valor FROM parametros WHERE tipo = 'dolar' AND fecha <= ${today}::date ORDER BY fecha DESC LIMIT 1`
        );
        const tasa = tasaResult.rows.length > 0 ? parseFloat(String(tasaResult.rows[0].valor)) : null;
        return res.json({ saldos: [], tasa });
      }

      const result = await db.execute(sql`
        SELECT DISTINCT ON (banco) banco, saldo, saldo_conciliado, fecha
        FROM bancos
        WHERE LOWER(banco) IN ${sql.raw(`(${bancosHabilitados.map(b => `'${b.replace(/'/g, "''")}'`).join(",")})`)}
        ORDER BY banco, fecha DESC, secuencia DESC
      `);
      
      const today = new Date().toISOString().slice(0, 10);
      const tasaResult = await db.execute(
        sql`SELECT valor FROM parametros WHERE tipo = 'dolar' AND fecha <= ${today}::date ORDER BY fecha DESC LIMIT 1`
      );
      const tasa = tasaResult.rows.length > 0 ? parseFloat(String(tasaResult.rows[0].valor)) : null;

      res.json({
        saldos: result.rows.map((r: any) => ({
          banco: r.banco,
          saldo: parseFloat(String(r.saldo || 0)),
          saldo_conciliado: parseFloat(String(r.saldo_conciliado || 0)),
          fecha: r.fecha,
        })),
        tasa,
      });
    } catch (error) {
      serverLog("ERROR", `bancos/saldos: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.get("/api/bancos/fix-comprobantes-largos", async (req, res) => {
    try {
      const dry = req.query.dry !== "false";
      const encontrados = await db.execute(sql`
        SELECT id, banco, comprobante
        FROM bancos
        WHERE comprobante ~ '^[0-9]+$'
          AND LENGTH(comprobante) > 6
        ORDER BY banco, comprobante
      `);
      const cambios = (encontrados.rows as any[]).map((row) => {
        const ultimos6 = row.comprobante.slice(-6).padStart(6, "0");
        const comprobante_nuevo = `${ultimos6}-${row.banco}`;
        return {
          id: row.id,
          banco: row.banco,
          comprobante_anterior: row.comprobante,
          comprobante_nuevo,
        };
      });
      if (!dry) {
        for (const cambio of cambios) {
          await db.execute(sql`
            UPDATE bancos SET comprobante = ${cambio.comprobante_nuevo} WHERE id = ${cambio.id}
          `);
        }
      }
      res.json({ total: cambios.length, aplicado: !dry, cambios });
    } catch (error) {
      res.status(500).json({ error: "Error al corregir comprobantes" });
    }
  });


  // [BANCOS] Importar registros desde extracto bancario (TXT)
  app.post("/api/bancos/import", async (req, res) => {
    try {
      const { banco, records, username } = req.body;
      
      if (!banco || !records || !Array.isArray(records)) {
        return res.status(400).json({ error: "Banco y registros son requeridos" });
      }
      
      const loc = getLocalDate();
      const propietario = `${username || "sistema"} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;
      
      const existingResult = await db.execute(
        sql`SELECT comprobante FROM bancos WHERE banco = ${banco}`
      );
      const seenComprobantes = new Set(
        existingResult.rows.map((r: any) => r.comprobante)
      );

      const bancoLower = banco.toLowerCase();
      const esBancoEnDolares = bancoLower.includes("dolar") || bancoLower.includes("dólar");
      const esBancoEnEuros = bancoLower.includes("euro");
      const esBancoEnMonedaExtranjera = esBancoEnDolares || esBancoEnEuros;

      let tasasSorted: { fecha: string; valor: number }[] = [];
      if (!esBancoEnMonedaExtranjera) {
        const tasasResult = await db.execute(
          sql`SELECT to_char(fecha, 'YYYY-MM-DD') as fecha_str, valor FROM parametros WHERE tipo = 'dolar' ORDER BY fecha`
        );
        tasasSorted = (tasasResult.rows as any[]).map(r => ({
          fecha: r.fecha_str,
          valor: parseFloat(r.valor) || 0,
        }));
      }

      function getTasaParaFecha(fechaISO: string): number {
        let best = 0;
        for (const t of tasasSorted) {
          if (t.fecha <= fechaISO) best = t.valor;
          else break;
        }
        return best;
      }

      const secResult = await db.execute(
        sql`SELECT LEFT(fecha,10) as fecha_dia, COALESCE(MAX(secuencia),0) as max_sec FROM bancos WHERE banco = ${banco} GROUP BY LEFT(fecha,10)`
      );
      const secMap = new Map<string, number>();
      for (const row of secResult.rows as any[]) {
        secMap.set(row.fecha_dia, parseInt(row.max_sec) || 0);
      }

      let duplicates = 0;
      const duplicatedComprobantes: string[] = [];

      interface ParsedRow {
        fechaISO: string;
        comprobante: string;
        descripcion: string;
        monto: number;
        saldo: number;
        operador: string;
        originalIndex: number;
      }
      const validRows: ParsedRow[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const comprobante = (record.comprobante || "").toLowerCase();
        const descripcion = (record.descripcion || "").toLowerCase();
        if (seenComprobantes.has(comprobante)) {
          duplicates++;
          duplicatedComprobantes.push(comprobante);
          continue;
        }
        seenComprobantes.add(comprobante);

        const monto = Math.abs(parseFloat(record.monto) || 0);
        const saldo = Math.abs(parseFloat(record.saldo) || 0);
        const operador = record.operador || "suma";

        let fechaISO = record.fecha;
        const fechaParts = record.fecha.split("/");
        if (fechaParts.length === 3) {
          const [d, m, a] = fechaParts;
          const anioFecha = a.length === 2 ? (parseInt(a) > 50 ? `19${a}` : `20${a}`) : a;
          fechaISO = `${anioFecha}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        validRows.push({ fechaISO, comprobante, descripcion, monto, saldo, operador, originalIndex: i });
      }

      validRows.sort((a, b) => {
        if (a.fechaISO < b.fechaISO) return -1;
        if (a.fechaISO > b.fechaISO) return 1;
        return a.originalIndex - b.originalIndex;
      });

      const batchValues: any[] = [];
      for (const row of validRows) {
        const currentSec = (secMap.get(row.fechaISO) || 0) + 1;
        secMap.set(row.fechaISO, currentSec);

        let montodolares = "0";
        if (!esBancoEnMonedaExtranjera && row.monto > 0) {
          const tasa = getTasaParaFecha(row.fechaISO);
          if (tasa > 0) {
            montodolares = (row.monto / tasa).toFixed(2);
          }
        }

        batchValues.push({
          fecha: row.fechaISO,
          comprobante: row.comprobante,
          descripcion: row.descripcion,
          monto: String(row.monto),
          saldo_conciliado: String(row.saldo),
          banco: banco,
          operacion: row.operador === "suma" ? "nota de credito" : "nota de debito",
          operador: row.operador,
          conciliado: true,
          utility: false,
          propietario: propietario,
          montodolares: montodolares,
          secuencia: currentSec,
        });
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < batchValues.length; i += BATCH_SIZE) {
        const chunk = batchValues.slice(i, i + BATCH_SIZE);
        await db.insert(bancosTable).values(chunk);
      }
      const success = batchValues.length;
      
      if (success > 0) {
        let fechaMinima: string | undefined;
        for (const val of batchValues) {
          const f = String(val.fecha).slice(0, 10);
          if (!fechaMinima || f < fechaMinima) fechaMinima = f;
        }
        await recalcularSaldosBanco(banco, fechaMinima);
        broadcast("bancos_updated");
      }
      
      res.json({ success, duplicates, duplicatedComprobantes });
    } catch (error) {
      console.error("Error importando bancos:", error);
      res.status(500).json({ error: "Error al importar registros" });
    }
  });

  app.post("/api/bancos/grid-import", async (req, res) => {
    try {
      const { records, username } = req.body;

      if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "Registros son requeridos" });
      }

      const loc = getLocalDate();
      const propietarioStamp = `${username || "sistema"} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;

      const bancosSet = new Set<string>(records.map((r: any) => (r.banco || "").toLowerCase()));
      const bancosArr = Array.from(bancosSet);
      const bancosInClause = sql.join(bancosArr.map(b => sql`${b}`), sql`, `);

      const existingResult = await db.execute(
        sql`SELECT LOWER(comprobante) as comprobante, LOWER(banco) as banco FROM bancos WHERE LOWER(banco) IN (${bancosInClause})`
      );
      const existingKeys = new Set(
        (existingResult.rows as any[]).map((r: any) => `${r.banco}|${r.comprobante}`)
      );

      const secResult = await db.execute(
        sql`SELECT LOWER(banco) as banco_lower, LEFT(fecha,10) as fecha_dia, COALESCE(MAX(secuencia),0) as max_sec FROM bancos WHERE LOWER(banco) IN (${bancosInClause}) GROUP BY LOWER(banco), LEFT(fecha,10)`
      );
      const secMap = new Map<string, number>();
      for (const row of secResult.rows as any[]) {
        secMap.set(`${row.banco_lower}|${row.fecha_dia}`, parseInt(row.max_sec) || 0);
      }

      const tasasResult = await db.execute(
        sql`SELECT to_char(fecha, 'YYYY-MM-DD') as fecha_str, valor FROM parametros WHERE tipo = 'dolar' ORDER BY fecha`
      );
      const tasasSorted = (tasasResult.rows as any[]).map(r => ({
        fecha: r.fecha_str,
        valor: parseFloat(r.valor) || 0,
      }));

      function getTasaParaFecha(fechaISO: string): number {
        let best = 0;
        for (const t of tasasSorted) {
          if (t.fecha <= fechaISO) best = t.valor;
          else break;
        }
        return best;
      }

      let skipped = 0;

      interface GridRow {
        fechaISO: string;
        banco: string;
        comprobante: string;
        operacion: string;
        descripcion: string;
        monto: number;
        montodolares: number;
        saldo: number;
        saldo_conciliado: number;
        conciliado: boolean;
        relacionado: boolean;
        operador: string;
        propietario: string;
        originalIndex: number;
      }
      const validRows: GridRow[] = [];

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const banco = (r.banco || "").toLowerCase();
        const comprobante = (r.comprobante || "").toLowerCase();
        const key = `${banco}|${comprobante}`;

        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        existingKeys.add(key);

        validRows.push({
          fechaISO: r.fecha,
          banco: r.banco,
          comprobante,
          operacion: (r.operacion || "").toLowerCase(),
          descripcion: (r.descripcion || "").toLowerCase(),
          monto: Math.abs(parseFloat(r.monto) || 0),
          montodolares: parseFloat(r.montodolares) || 0,
          saldo: parseFloat(r.saldo) || 0,
          saldo_conciliado: parseFloat(r.saldo_conciliado) || 0,
          conciliado: !!r.conciliado,
          relacionado: !!r.relacionado,
          operador: r.operador || "suma",
          propietario: r.propietario || propietarioStamp,
          originalIndex: i,
        });
      }

      validRows.sort((a, b) => {
        if (a.fechaISO < b.fechaISO) return -1;
        if (a.fechaISO > b.fechaISO) return 1;
        return a.originalIndex - b.originalIndex;
      });

      const batchValues: any[] = [];
      for (const row of validRows) {
        const bancoLower = row.banco.toLowerCase();
        const secKey = `${bancoLower}|${row.fechaISO}`;
        const currentSec = (secMap.get(secKey) || 0) + 1;
        secMap.set(secKey, currentSec);

        const esBancoEnDolares = bancoLower.includes("dolar") || bancoLower.includes("dólar");
        const esBancoEnEuros = bancoLower.includes("euro");
        const esBancoEnMonedaExtranjera = esBancoEnDolares || esBancoEnEuros;

        let montodolares = String(row.montodolares);
        if (!esBancoEnMonedaExtranjera && row.monto > 0 && row.montodolares === 0) {
          const tasa = getTasaParaFecha(row.fechaISO);
          if (tasa > 0) {
            montodolares = (row.monto / tasa).toFixed(2);
          }
        }

        batchValues.push({
          fecha: row.fechaISO,
          banco: row.banco,
          comprobante: row.comprobante,
          operacion: row.operacion,
          descripcion: row.descripcion,
          monto: String(row.monto),
          montodolares,
          saldo: String(row.saldo),
          saldo_conciliado: String(row.saldo_conciliado),
          conciliado: row.conciliado,
          relacionado: row.relacionado,
          operador: row.operador,
          utility: false,
          propietario: row.propietario,
          secuencia: currentSec,
        });
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < batchValues.length; i += BATCH_SIZE) {
        const chunk = batchValues.slice(i, i + BATCH_SIZE);
        await db.insert(bancosTable).values(chunk);
      }

      const inserted = batchValues.length;

      if (inserted > 0) {
        const affectedBancos = new Set<string>();
        const fechaMinimaByBanco = new Map<string, string>();
        for (const val of batchValues) {
          const b = val.banco;
          affectedBancos.add(b);
          const f = String(val.fecha).slice(0, 10);
          const cur = fechaMinimaByBanco.get(b);
          if (!cur || f < cur) fechaMinimaByBanco.set(b, f);
        }
        for (const b of affectedBancos) {
          await recalcularSaldosBanco(b, fechaMinimaByBanco.get(b));
        }
        broadcast("bancos_updated");
      }

      res.json({ ok: true, inserted, skipped });
    } catch (error) {
      console.error("Error en grid-import bancos:", error);
      res.status(500).json({ error: "Error al importar registros desde grilla" });
    }
  });

  // [BANCOS] Obtener lista paginada de movimientos bancarios con filtros opcionales
  app.get("/api/bancos", async (req, res) => {
    try {
      const { banco, bancos, fechaInicio, fechaFin, limit = "100", offset = "0", id, source } = req.query;
      const isReport = source === "report";
      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      const offsetNum = parseInt(offset as string) || 0;
      
      let whereClause = sql`WHERE 1=1`;
      
      if (id) {
        whereClause = sql`${whereClause} AND id = ${id}`;
      }
      if (banco && banco !== "all") {
        whereClause = sql`${whereClause} AND banco = ${banco}`;
      } else if (bancos && typeof bancos === "string") {
        const bancosList = bancos.split(",").map(b => b.trim()).filter(Boolean);
        if (bancosList.length > 0) {
          const inList = sql.join(bancosList.map(b => sql`${b}`), sql`, `);
          whereClause = sql`${whereClause} AND banco IN (${inList})`;
        }
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "bancos");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM bancos ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = isReport
        ? sql`SELECT * FROM bancos ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC`
        : sql`SELECT * FROM bancos ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
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
        sql`SELECT fecha, monto, saldo, saldo_conciliado FROM bancos WHERE banco = ${banco} ORDER BY LEFT(fecha, 10) ASC, secuencia DESC`
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
      
      if (body.saldo_conciliado !== undefined) {
        body.saldoConciliado = body.saldo_conciliado;
        delete body.saldo_conciliado;
      }
      
      if (body.fecha) {
        body.fecha = body.fecha.substring(0, 10);
      } else {
        const now = new Date();
        body.fecha = now.toISOString().slice(0, 10);
      }
      
      const fechaDateBanco = (body.fecha || '').substring(0, 10);
      const secBancoResult = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM bancos WHERE banco = ${body.banco} AND LEFT(fecha, 10) = ${fechaDateBanco}`);
      body.secuencia = ((secBancoResult.rows[0] as any)?.max_sec || 0) + 1;

      // Auto-generar comprobante si no fue ingresado manualmente
      if (!body.comprobante || String(body.comprobante).trim() === '') {
        if (body.banco && body.operacion) {
          const lastCompResult = await db.execute(sql`
            SELECT comprobante FROM bancos
            WHERE banco = ${body.banco} AND operacion = ${body.operacion}
              AND comprobante IS NOT NULL AND comprobante ~ '^[0-9]+$'
            ORDER BY fecha DESC, secuencia DESC
            LIMIT 1
          `);
          if (lastCompResult.rows.length > 0) {
            const lastNum = parseInt((lastCompResult.rows[0] as any).comprobante, 10);
            if (!isNaN(lastNum)) {
              body.comprobante = String(lastNum + 1);
            }
          }
        }
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
            ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
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
      
      await logAudit("bancos", "insert", (registroFinal as any).id, null, registroFinal, extractUsername(body));

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
      
      const auditAnteriorResult = await db.execute(sql`SELECT * FROM bancos WHERE id = ${id}`);
      const auditAnterior = auditAnteriorResult.rows[0] || null;

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
      
      if (body.secuencia !== undefined && typeof body.secuencia === 'string') {
        body.secuencia = parseInt(body.secuencia, 10) || 0;
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
      const cambioFecha = (fechaAnterior || '').substring(0, 10) !== (banco.fecha || '').substring(0, 10);
      if (cambioFecha) {
        const newDatePart = (banco.fecha || '').substring(0, 10);
        const secR = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM bancos WHERE banco = ${banco.banco} AND LEFT(fecha, 10) = ${newDatePart} AND id != ${id}`);
        const newSec = ((secR.rows[0] as any)?.max_sec || 0) + 1;
        await db.execute(sql`UPDATE bancos SET secuencia = ${newSec} WHERE id = ${id}`);
        (banco as any).secuencia = newSec;
      }
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
            ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
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
              ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
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
      
      await logAudit("bancos", "update", id, auditAnterior, registroFinal, extractUsername(req.body));

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
      
      const auditDelResult = await db.execute(sql`SELECT * FROM bancos WHERE id = ${id}`);
      const auditDelAnterior = auditDelResult.rows[0] || null;

      const bancoResult = await db.execute(sql`SELECT banco, fecha FROM bancos WHERE id = ${id}`);
      const bancoNombre = (bancoResult.rows[0] as any)?.banco;
      const fechaRegistro = (bancoResult.rows[0] as any)?.fecha;
      
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
          ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
          LIMIT 1
        `);
        if (prevResult.rows.length > 0) {
          fechaDesdeRecalculo = normalizarFechaParaSQL((prevResult.rows[0] as any).fecha) || fechaNormRegistro;
        } else {
          fechaDesdeRecalculo = fechaNormRegistro;
        }
      }
      
      const bancoRow = bancoResult.rows[0] as any;
      const bancoCodrel = bancoRow?.codrel;

      const deleted = await storage.deleteBanco(id);
      if (!deleted) {
        return res.status(404).json({ error: "Banco no encontrado" });
      }
      
      await db.execute(sql`UPDATE administracion SET codrel = NULL, relacionado = false WHERE codrel = ${id}`);
      if (bancoCodrel) {
        const otherRefs = await db.execute(sql`
          SELECT COUNT(*)::int as cnt FROM (
            SELECT 1 FROM administracion WHERE id = ${bancoCodrel} AND codrel IS NOT NULL
            UNION ALL SELECT 1 FROM bancos WHERE codrel = ${bancoCodrel}
          ) t
        `);
        if (((otherRefs.rows[0] as any)?.cnt || 0) === 0) {
          await db.execute(sql`UPDATE administracion SET relacionado = false WHERE id = ${bancoCodrel}`);
        }
      }
      broadcast("administracion_updated");
      
      // Recalcular desde la fecha inmediatamente anterior
      if (fechaDesdeRecalculo) {
        await recalcularSaldosBanco(bancoNombre, fechaDesdeRecalculo);
      }
      
      await logAudit("bancos", "delete", id, auditDelAnterior, null, (req.query._username as string) || "sistema");

      broadcast("bancos_updated");
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar banco" });
    }
  });


  app.get("/api/administracion/deuda", async (req, res) => {
    try {
      const { nombre, unidad } = req.query;
      if (!nombre || !unidad) {
        return res.json({ deuda: 0 });
      }
      const result = await db.execute(
        sql`SELECT COALESCE(SUM(montodolares), 0) as total FROM administracion WHERE tipo = 'prestamos' AND LOWER(nombre) = LOWER(${nombre}) AND LOWER(unidad) = LOWER(${unidad})`
      );
      const total = parseFloat((result.rows[0] as any).total) || 0;
      res.json({ deuda: total });
    } catch (error) {
      console.error("Error fetching deuda:", error);
      res.status(500).json({ error: "Error al calcular deuda" });
    }
  });

  app.get("/api/administracion/deudas-batch", async (req, res) => {
    try {
      const { unidad } = req.query;
      if (!unidad) {
        return res.json({ deudas: {} });
      }
      const result = await db.execute(
        sql`SELECT LOWER(COALESCE(NULLIF(nombre, ''), personal)) as persona, COALESCE(SUM(montodolares::numeric), 0) as total FROM administracion WHERE tipo = 'prestamos' AND LOWER(unidad) = LOWER(${unidad}) GROUP BY LOWER(COALESCE(NULLIF(nombre, ''), personal))`
      );
      const deudas: Record<string, number> = {};
      for (const row of result.rows as any[]) {
        const persona = (row as any).persona;
        if (persona) {
          deudas[persona] = parseFloat((row as any).total) || 0;
        }
      }
      res.json({ deudas });
    } catch (error) {
      console.error("Error fetching deudas batch:", error);
      res.status(500).json({ error: "Error al calcular deudas" });
    }
  });

  app.get("/api/administracion/saldos-prestamos", async (req, res) => {
    try {
      const { unidad } = req.query;
      if (!unidad) {
        return res.json({ saldos: {} });
      }
      const result = await db.execute(
        sql`SELECT id, SUM(COALESCE(montodolares::numeric, 0)) OVER (PARTITION BY LOWER(COALESCE(NULLIF(nombre, ''), personal)) ORDER BY LEFT(fecha, 10), secuencia) as saldo FROM administracion WHERE tipo = 'prestamos' AND LOWER(unidad) = LOWER(${unidad})`
      );
      const saldos: Record<string, number> = {};
      for (const row of result.rows as any[]) {
        saldos[(row as any).id] = parseFloat((row as any).saldo) || 0;
      }
      res.json({ saldos });
    } catch (error) {
      console.error("Error fetching saldos prestamos:", error);
      res.status(500).json({ error: "Error al calcular saldos" });
    }
  });

  app.get("/api/administracion/cuentasporpagar-pendientes", async (req, res) => {
    try {
      const { unidad } = req.query;
      let whereClause = sql`WHERE tipo = 'cuentasporpagar' AND (cancelada IS NULL OR cancelada = false) AND COALESCE(montodolares, 0) > 0`;
      if (unidad && unidad !== "all") {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const result = await db.execute(sql`SELECT * FROM administracion ${whereClause} ORDER BY LEFT(fecha, 10) ASC, secuencia DESC`);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching cuentas por pagar pendientes:", error);
      res.status(500).json({ error: "Error al obtener cuentas por pagar pendientes" });
    }
  });

  app.post("/api/administracion/enviar-a-facturas", async (req, res) => {
    try {
      const { unidad, username } = req.body;
      const { dd, mm, yyyy, hh, mi, ss } = getLocalDate();
      const user = username || 'sistema';
      const propietario = `${user} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;

      let whereUnidad = sql``;
      if (unidad && unidad !== "all") {
        whereUnidad = sql` AND unidad = ${unidad}`;
      }

      const cancelados = await db.execute(sql`
        SELECT * FROM administracion 
        WHERE tipo = 'cuentasporpagar' AND cancelada = true AND (enviada = false OR enviada IS NULL) ${whereUnidad}
        ORDER BY LEFT(fecha, 10) ASC, secuencia DESC
      `);

      if (cancelados.rows.length === 0) {
        return res.json({ facturas: 0, eliminados: 0 });
      }

      let facturasCreadas = 0;
      let bancosActualizados = 0;

      const facturaIdsByKey: Map<string, string> = new Map();

      await db.execute(sql`BEGIN`);
      try {
        for (const row of cancelados.rows) {
          const r = row as any;
          const montodolares = parseFloat(r.montodolares) || 0;
          if (montodolares > 0) {
            const facturaResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, proveedor, nrofactura, fechafactura, cancelada, restacancelar, propietario, capital, utility, relacionado, codrel, anticipo, insumo, actividad, personal, cliente)
              VALUES (
                ${r.fecha}, 'facturas', ${r.nombre}, ${r.descripcion}, ${r.monto}, ${r.montodolares},
                ${r.unidad}, ${r.proveedor}, ${r.nrofactura}, ${r.fechafactura}, true, ${0},
                ${propietario}, ${r.capital || false}, ${r.utility || false}, ${r.relacionado || false}, ${r.codrel}, false,
                ${r.insumo}, ${r.actividad}, ${r.personal}, ${r.cliente}
              )
              RETURNING id
            `);
            const facturaId = (facturaResult.rows[0] as any)?.id;
            if (facturaId) {
              const key = `${(r.proveedor || '').toLowerCase()}|${(r.nrofactura || '').toLowerCase()}|${(r.unidad || '').toLowerCase()}`;
              facturaIdsByKey.set(key, facturaId);
            }
            facturasCreadas++;
          }
        }

        const canceladoIds = cancelados.rows.map((r: any) => r.id);
        for (const cid of canceladoIds) {
          await db.execute(sql`UPDATE administracion SET enviada = true WHERE id = ${cid}`);
        }

        await db.execute(sql`COMMIT`);
      } catch (txError) {
        await db.execute(sql`ROLLBACK`);
        throw txError;
      }

      broadcast("administracion_updated");
      broadcast("bancos_updated");
      res.json({ facturas: facturasCreadas, bancosActualizados });
    } catch (error) {
      console.error("Error enviando a facturas:", error);
      res.status(500).json({ error: "Error al enviar a facturas" });
    }
  });

  // [ADMIN] Enviar registros cancelados de cuentas por cobrar a ventas
  app.post("/api/administracion/enviar-a-ventas", async (req, res) => {
    try {
      const { unidad, username } = req.body;
      const { dd, mm, yyyy, hh, mi, ss } = getLocalDate();
      const user = username || 'sistema';
      const propietario = `${user} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;

      let whereUnidad = sql``;
      if (unidad && unidad !== "all") {
        whereUnidad = sql` AND unidad = ${unidad}`;
      }

      const cancelados = await db.execute(sql`
        SELECT * FROM administracion 
        WHERE tipo = 'cuentasporcobrar' AND cancelada = true AND (enviada IS NULL OR enviada = false) ${whereUnidad}
        ORDER BY LEFT(fecha, 10) ASC, secuencia DESC
      `);

      if (cancelados.rows.length === 0) {
        return res.json({ ventas: 0, eliminados: 0 });
      }

      let ventasCreadas = 0;
      let bancosActualizados = 0;

      const ventaIdsByKey: Map<string, string> = new Map();

      await db.execute(sql`BEGIN`);
      try {
        for (const row of cancelados.rows) {
          const r = row as any;
          const montodolares = parseFloat(r.montodolares) || 0;
          if (montodolares > 0) {
            const ventaResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, proveedor, nrofactura, fechafactura, cancelada, restacancelar, propietario, capital, utility, relacionado, codrel, anticipo, insumo, actividad, personal, cliente, producto, cantidad)
              VALUES (
                ${r.fecha}, 'ventas', ${r.nombre}, ${r.descripcion}, ${r.monto}, ${r.montodolares},
                ${r.unidad}, ${r.proveedor}, ${r.nrofactura}, ${r.fechafactura}, true, ${0},
                ${propietario}, ${r.capital || false}, ${r.utility || false}, ${r.relacionado || false}, ${r.codrel}, false,
                ${r.insumo}, ${r.actividad}, ${r.personal}, ${r.cliente}, ${r.producto}, ${r.cantidad}
              )
              RETURNING id
            `);
            const ventaId = (ventaResult.rows[0] as any)?.id;
            if (ventaId) {
              const key = `${(r.cliente || '').toLowerCase()}|${(r.nrofactura || '').toLowerCase()}|${(r.unidad || '').toLowerCase()}`;
              ventaIdsByKey.set(key, ventaId);
            }
            ventasCreadas++;
          }
        }

        for (const row of cancelados.rows) {
          const r = row as any;
          await db.execute(sql`
            UPDATE administracion SET enviada = true WHERE id = ${r.id}
          `);
        }

        await db.execute(sql`COMMIT`);
      } catch (txError) {
        await db.execute(sql`ROLLBACK`);
        throw txError;
      }

      broadcast("administracion_updated");
      broadcast("bancos_updated");
      res.json({ ventas: ventasCreadas, bancosActualizados });
    } catch (error) {
      console.error("Error enviando a ventas:", error);
      res.status(500).json({ error: "Error al enviar a ventas" });
    }
  });

  // [ADMIN] Eliminar registros cancelados de cuentas por cobrar (paso 2, después de enviar a ventas)
  app.post("/api/administracion/eliminar-cancelados-cxc", async (req, res) => {
    try {
      const { unidad } = req.body;

      let whereUnidad = sql``;
      if (unidad && unidad !== "all") {
        whereUnidad = sql` AND unidad = ${unidad}`;
      }

      const cancelados = await db.execute(sql`
        SELECT id FROM administracion 
        WHERE tipo = 'cuentasporcobrar' AND cancelada = true ${whereUnidad}
      `);

      if (cancelados.rows.length === 0) {
        return res.json({ eliminados: 0 });
      }

      await db.execute(sql`
        DELETE FROM administracion 
        WHERE tipo = 'cuentasporcobrar' AND cancelada = true ${whereUnidad}
      `);

      broadcast("administracion_updated");
      res.json({ eliminados: cancelados.rows.length });
    } catch (error) {
      console.error("Error eliminando cancelados cxc:", error);
      res.status(500).json({ error: "Error al eliminar registros cancelados" });
    }
  });

  // [ADMIN] Eliminar registros cancelados de cuentas por pagar (paso 2, después de enviar a facturas)
  app.post("/api/administracion/eliminar-cancelados-cxp", async (req, res) => {
    try {
      const { unidad } = req.body;

      let whereUnidad = sql``;
      if (unidad && unidad !== "all") {
        whereUnidad = sql` AND unidad = ${unidad}`;
      }

      const cancelados = await db.execute(sql`
        SELECT id FROM administracion 
        WHERE tipo = 'cuentasporpagar' AND cancelada = true ${whereUnidad}
      `);

      if (cancelados.rows.length === 0) {
        return res.json({ eliminados: 0 });
      }

      await db.execute(sql`
        DELETE FROM administracion 
        WHERE tipo = 'cuentasporpagar' AND cancelada = true ${whereUnidad}
      `);

      broadcast("administracion_updated");
      res.json({ eliminados: cancelados.rows.length });
    } catch (error) {
      console.error("Error eliminando cancelados cxp:", error);
      res.status(500).json({ error: "Error al eliminar registros cancelados" });
    }
  });

  app.post("/api/administracion/procesar-pago", async (req, res) => {
    try {
      const { pagos, username } = req.body;
      if (!Array.isArray(pagos) || pagos.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron pagos" });
      }

      const loc = getLocalDate();
      const propietario = `${username || "sistema"} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;
      const fecha = `${loc.dd}/${loc.mm}/${loc.aa}`;

      let completados = 0;
      let parciales = 0;
      const cxpGroups: string[] = [];

      await db.execute(sql`BEGIN`);
      try {
        for (const pago of pagos) {
          const { id, abonoDolares } = pago;
          if (!id || !abonoDolares || abonoDolares <= 0) continue;

          const existing = await db.execute(sql`SELECT * FROM administracion WHERE id = ${id} AND tipo = 'cuentasporpagar'`);
          if (!existing.rows[0]) continue;
          const rec = existing.rows[0] as any;

          const montoDolares = parseFloat(rec.montodolares) || 0;
          const restaActual = parseFloat(rec.restacancelar) || montoDolares;

          const abonoValidado = Math.min(abonoDolares, restaActual);
          if (abonoValidado <= 0) continue;

          const nuevaResta = parseFloat((restaActual - abonoValidado).toFixed(2));

          if (nuevaResta <= 0.01) {
            await db.execute(sql`
              INSERT INTO administracion (id, fecha, tipo, nombre, descripcion, monto, montodolares, unidad, capital, utility, producto, cantidad, insumo, proveedor, cliente, personal, actividad, propietario, anticipo, unidaddemedida, codrel, relacionado, nrofactura, fechafactura, cancelada, restacancelar)
              VALUES (
                gen_random_uuid(), ${rec.fecha}, 'facturas', ${rec.nombre}, ${rec.descripcion}, ${rec.monto}, ${rec.montodolares},
                ${rec.unidad}, ${rec.capital}, ${rec.utility}, ${rec.producto}, ${rec.cantidad}, ${rec.insumo},
                ${rec.proveedor}, ${rec.cliente}, ${rec.personal}, ${rec.actividad}, ${propietario},
                ${rec.anticipo}, ${rec.unidaddemedida}, ${rec.codrel}, ${rec.relacionado}, ${rec.nrofactura}, ${rec.fechafactura},
                true, ${0}
              )
            `);

            await db.execute(sql`DELETE FROM administracion WHERE id = ${id}`);
            const cxpKey = `${(rec.proveedor || '')}|${(rec.nrofactura || '')}|${(rec.unidad || '')}`;
            if (!cxpGroups.includes(cxpKey)) cxpGroups.push(cxpKey);
            completados++;
          } else {
            parciales++;
          }
        }
        await db.execute(sql`COMMIT`);
      } catch (txError) {
        await db.execute(sql`ROLLBACK`);
        throw txError;
      }

      broadcast("administracion_updated");
      for (const key of cxpGroups) {
        const [proveedor, nrofactura, unidad] = key.split('|');
        await recalcularRestaCancelar('cuentasporpagar', proveedor || undefined, nrofactura || undefined, unidad || undefined);
      }
      res.json({ completados, parciales, total: completados + parciales });
    } catch (error) {
      console.error("Error procesando pagos:", error);
      res.status(500).json({ error: "Error al procesar pagos" });
    }
  });

  // [ADMIN] Reporte de Ingresos/Egresos por mes
  app.get("/api/administracion/ingresos-egresos", async (req, res) => {
    try {
      const { unidad, fechaInicio, fechaFin } = req.query;
      let whereClause = sql`WHERE 1=1`;
      if (unidad && unidad !== "all") {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;

      const result = await db.execute(sql`
        SELECT 
          SUBSTR(fecha, 1, 7) as mes,
          SUM(CASE WHEN tipo = 'ventas' THEN COALESCE(monto::numeric, 0) ELSE 0 END) as ventas_bs,
          SUM(CASE WHEN tipo = 'ventas' THEN COALESCE(montodolares::numeric, 0) ELSE 0 END) as ventas_dol,
          SUM(CASE WHEN tipo = 'cuentasporcobrar' AND monto::numeric < 0 AND SUBSTR(fecha, 1, 7) >= '2026-01' THEN ABS(COALESCE(monto::numeric, 0)) ELSE 0 END) as cxc_bs,
          SUM(CASE WHEN tipo = 'cuentasporcobrar' AND monto::numeric < 0 AND SUBSTR(fecha, 1, 7) >= '2026-01' THEN ABS(COALESCE(montodolares::numeric, 0)) ELSE 0 END) as cxc_dol,
          SUM(CASE WHEN tipo = 'nomina' THEN COALESCE(monto::numeric, 0) ELSE 0 END) as nomina_bs,
          SUM(CASE WHEN tipo = 'nomina' THEN COALESCE(montodolares::numeric, 0) ELSE 0 END) as nomina_dol,
          SUM(CASE WHEN tipo = 'facturas' THEN COALESCE(monto::numeric, 0) ELSE 0 END) as facturas_bs,
          SUM(CASE WHEN tipo = 'facturas' THEN COALESCE(montodolares::numeric, 0) ELSE 0 END) as facturas_dol,
          SUM(CASE WHEN tipo = 'cuentasporpagar' AND monto::numeric < 0 AND SUBSTR(fecha, 1, 7) >= '2026-01' THEN ABS(COALESCE(monto::numeric, 0)) ELSE 0 END) as cxp_bs,
          SUM(CASE WHEN tipo = 'cuentasporpagar' AND monto::numeric < 0 AND SUBSTR(fecha, 1, 7) >= '2026-01' THEN ABS(COALESCE(montodolares::numeric, 0)) ELSE 0 END) as cxp_dol
        FROM administracion ${whereClause}
        GROUP BY SUBSTR(fecha, 1, 7)
        ORDER BY SUBSTR(fecha, 1, 7) ASC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error generating ingresos/egresos report:", error);
      res.status(500).json({ error: "Error al generar reporte de ingresos/egresos" });
    }
  });

  // [ADMIN] Obtener lista paginada de registros de administración con filtros
  app.get("/api/administracion", async (req, res) => {
    try {
      const { id, tipo, unidad, fechaInicio, fechaFin, codrel, limit = "100", offset = "0", source } = req.query;
      console.log("[GET /api/administracion] Query params:", req.query);
      const isReport = source === "report";
      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      const offsetNum = parseInt(offset as string) || 0;
      
      let whereClause = sql`WHERE 1=1`;
      
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
      
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "administracion");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM administracion ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = isReport
        ? sql`SELECT * FROM administracion ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC`
        : sql`SELECT * FROM administracion ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
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
      const data = { ...req.body };
      console.log("[POST /api/administracion] Received data:", JSON.stringify(data, null, 2));
      console.log("[POST /api/administracion] codrel:", data.codrel);
      const id = crypto.randomUUID();
      
      // Auto-populate propietario con usuario + fecha/hora del servidor
      {
        const loc = getLocalDate();
        const username = extractUsername(data);
        data.propietario = `${username} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;
      }
      
      let fecha = data.fecha;
      if (fecha) {
        fecha = fecha.substring(0, 10);
      } else {
        fecha = new Date().toISOString().slice(0, 10);
      }
      
      // Validar duplicado proveedor+nrofactura (solo si monto positivo y ambos campos tienen valor)
      const proveedorVal = (data.proveedor || '').trim().toLowerCase();
      const nrofacturaVal = (data.nrofactura || '').trim().toLowerCase();
      const montoVal = parseFloat(data.monto) || 0;
      const montodolaresVal = parseFloat(data.montodolares) || 0;
      const tipoVal = (data.tipo || '').trim().toLowerCase();
      if (proveedorVal && nrofacturaVal && montoVal >= 0 && montodolaresVal >= 0 && tipoVal === 'factura') {
        const duplicado = await db.execute(sql`
          SELECT id FROM administracion 
          WHERE LOWER(proveedor) = ${proveedorVal} 
          AND LOWER(nrofactura) = ${nrofacturaVal}
          AND LOWER(tipo) = 'factura'
          LIMIT 1
        `);
        if (duplicado.rows.length > 0) {
          return res.status(409).json({ error: `Ya existe un registro con proveedor '${proveedorVal}' y nro factura '${nrofacturaVal}'` });
        }
      }

      const fechaDate = fecha.substring(0, 10);
      const secResult = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM administracion WHERE LEFT(fecha, 10) = ${fechaDate}`);
      const secuencia = ((secResult.rows[0] as any)?.max_sec || 0) + 1;

      await db.execute(sql`
        INSERT INTO administracion (id, fecha, tipo, descripcion, monto, montodolares, unidad, capital, utility, producto, cantidad, insumo, proveedor, cliente, personal, actividad, propietario, anticipo, codrel, relacionado, nombre, unidaddemedida, nrofactura, fechafactura, cancelada, restacancelar, secuencia)
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
          ${data.producto || ''},
          ${data.cantidad || 0},
          ${data.insumo || ''},
          ${data.proveedor || ''},
          ${data.cliente || ''},
          ${data.personal || ''},
          ${data.actividad || ''},
          ${data.propietario || ''},
          ${data.anticipo || false},
          ${data.codrel || null},
          ${data.relacionado === true || data.relacionado === "true" || !!data.codrel},
          ${data.nombre || ''},
          ${data.unidaddemedida || ''},
          ${data.nrofactura || ''},
          ${data.fechafactura || ''},
          ${data.cancelada || false},
          ${data.restacancelar != null ? data.restacancelar : (data.tipo === 'cuentasporpagar' && !data.cancelada ? (parseFloat(data.montodolares) || parseFloat(data.monto) || 0) : 0)},
          ${secuencia}
        )
      `);
      
      if (data.codrel) {
        await db.execute(sql`UPDATE bancos SET relacionado = true WHERE id = ${data.codrel}`);
        broadcast("bancos_updated");
      }
      
      broadcast("administracion_updated");
      
      const tipoLower = (data.tipo || '').toLowerCase();
      if (tipoLower === 'cuentasporcobrar' || tipoLower === 'cuentasporpagar') {
        const persona = tipoLower === 'cuentasporcobrar' ? (data.cliente || '') : (data.proveedor || '');
        await recalcularRestaCancelar(tipoLower as any, persona || undefined, data.nrofactura || undefined, data.unidad || undefined);
      }
      
      // Fetch the saved record from DB to return accurate data
      const savedResult = await db.execute(sql`SELECT * FROM administracion WHERE id = ${id}`);
      const savedAdmin = savedResult.rows[0] || { id, ...data };
      await logAudit("administracion", "insert", id, null, savedAdmin, extractUsername(data));
      res.status(201).json(savedAdmin);
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
      
      // Filtros avanzados: descripcion, textFilters, booleanFilters
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "almacen");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM almacen ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM almacen ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
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
      if (unidad && unidad !== "all") {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "cosecha");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM cosecha ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM cosecha ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);
      
      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener registros de cosecha" });
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
      
      // Filtros avanzados: descripcion, textFilters, booleanFilters
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "transferencias");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM transferencias ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM transferencias ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
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
      const { ids, requestId, unidad: filtroDeUnidad } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de IDs" });
      }
      
      // Usar requestId para correlacionar mensajes WebSocket con el cliente que hizo la petición
      const correlationId = requestId || `req_${Date.now()}`;

      const resultados = { 
        procesados: 0, 
        bancos: 0, 
        administracion: 0, 
        errores: [] as string[],
        detalles: [] as { proveedor: string; personal: string; monto: number; resta: number; descuento: number; banco: string; bancoCreado: boolean; adminCreado: boolean; descuentoCreado: boolean }[]
      };
      
      // Acumular bancos afectados con su fecha más antigua para recalcular saldos eficientemente
      const bancosAfectados = new Map<string, string>();
      
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
          const prestamo = parseFloat(trans.prestamo) || 0;
          const unidadEnviar = filtroDeUnidad || trans.unidad || '';

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

          const esProveedores = trans.tipo === 'proveedores';
          const esAnticipo = trans.anticipo === true || trans.anticipo === 't' || trans.anticipo === 'true';
          const montoDolaresTransf = parseFloat(trans.montodolares) || 0;

          // A. Si resta != 0, crear registro en BANCOS
          if (resta !== 0) {
            let descripcionBanco: string;
            let montoDolaresBanco: number;
            if (esProveedores) {
              descripcionBanco = `${(trans.banco || '').toLowerCase()} ${(trans.proveedor || '').toLowerCase()} factura n: ${(trans.nrofactura || '').toLowerCase()}`;
              if (esAnticipo) descripcionBanco += ' pago parcial';
              montoDolaresBanco = montoDolaresTransf;
            } else {
              descripcionBanco = `${trans.proveedor || ''}${trans.personal ? ' ' + trans.personal : ''} ${trans.descripcion || ''}`.trim();
              montoDolaresBanco = tasaDolar > 0 ? resta / tasaDolar : 0;
            }
            const operadorBanco = "resta";
            const hashDataBanco = `${trans.fecha}|${Math.abs(resta).toFixed(2)}|${operadorBanco}`;
            const hashBanco = simpleHash(hashDataBanco);
            const comprobanteConHashBanco = trans.comprobante ? `${trans.comprobante}-${hashBanco}` : null;

            const fechaDateBancoEnv = (trans.fecha || '').substring(0, 10);
            const secBancoEnvR = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM bancos WHERE LEFT(fecha, 10) = ${fechaDateBancoEnv}`);
            const secBancoEnv = ((secBancoEnvR.rows[0] as any)?.max_sec || 0) + 1;

            const bancoResult = await db.execute(sql`
              INSERT INTO bancos (fecha, monto, montodolares, comprobante, operacion, descripcion, conciliado, utility, banco, relacionado, secuencia)
              VALUES (
                ${trans.fecha},
                ${resta},
                ${montoDolaresBanco},
                ${comprobanteConHashBanco},
                'transferencia a terceros',
                ${descripcionBanco},
                false,
                false,
                ${trans.banco},
                false,
                ${secBancoEnv}
              )
              RETURNING *
            `);
            const bancoRecord = bancoResult.rows[0] as any;
            bancoId = bancoRecord?.id;
            resultados.bancos++;
            bancoCreado = true;
            
            // Enviar broadcast individual para que la ventana Bancos se actualice
            if (bancoRecord) {
              broadcast("bancos:create", bancoRecord);
            }
            
            if (trans.banco) {
              const fechaNorm = normalizarFechaParaSQL(trans.fecha);
              if (fechaNorm) {
                const fechaActual = bancosAfectados.get(trans.banco);
                const fechaMenor = getFechaMenor(fechaNorm, fechaActual);
                if (fechaMenor) {
                  bancosAfectados.set(trans.banco, fechaMenor);
                }
              }
            }
          }

          const descripcionAdmin = `${(trans.banco || '').toLowerCase()} - ${(trans.descripcion || '').toLowerCase()}`;
          const nombreAdmin = (trans.personal || trans.proveedor || '').toLowerCase();

          // B. Si tiene personal y monto != 0, crear registro en ADMINISTRACION tipo nomina
          if (trans.personal && monto !== 0) {
            const montoDolaresAdmin = tasaDolar > 0 ? monto / tasaDolar : 0;
            const operadorAdmin = monto >= 0 ? "suma" : "resta";
            const fechaDateAdmEnv = (trans.fecha || '').substring(0, 10);
            const secAdmEnvR1 = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM administracion WHERE LEFT(fecha, 10) = ${fechaDateAdmEnv}`);
            const secAdmEnv1 = ((secAdmEnvR1.rows[0] as any)?.max_sec || 0) + 1;
            const adminResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, capital, utility, insumo, proveedor, personal, actividad, relacionado, codrel, secuencia)
              VALUES (
                ${trans.fecha},
                'nomina',
                ${nombreAdmin},
                ${descripcionAdmin},
                ${monto},
                ${montoDolaresAdmin},
                ${unidadEnviar},
                false,
                false,
                ${trans.insumo},
                ${trans.proveedor},
                ${trans.personal},
                ${trans.actividad},
                ${bancoId ? true : false},
                ${bancoId},
                ${secAdmEnv1}
              )
              RETURNING *
            `);
            const adminRecord = adminResult.rows[0] as any;
            const adminId = adminRecord?.id;
            resultados.administracion++;
            adminCreado = true;
            
            if (adminRecord) {
              broadcast("administracion:create", adminRecord);
            }

            if (adminId && bancoId) {
              await db.execute(sql`UPDATE bancos SET relacionado = true WHERE id = ${bancoId}`);
            }
          }

          // B2. Si prestamo != 0, crear registro en ADMINISTRACION tipo prestamos
          if (prestamo !== 0) {
            const montoDolaresPrestamo = tasaDolar > 0 ? prestamo / tasaDolar : 0;
            const operadorPrestamo = prestamo >= 0 ? "suma" : "resta";
            const secAdmEnvR2 = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM administracion WHERE LEFT(fecha, 10) = ${(trans.fecha || '').substring(0, 10)}`);
            const secAdmEnv2 = ((secAdmEnvR2.rows[0] as any)?.max_sec || 0) + 1;
            const prestamoResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, capital, utility, insumo, proveedor, personal, actividad, relacionado, codrel, secuencia)
              VALUES (
                ${trans.fecha},
                'prestamos',
                ${nombreAdmin},
                ${descripcionAdmin},
                ${prestamo},
                ${montoDolaresPrestamo},
                ${unidadEnviar},
                false,
                false,
                ${trans.insumo},
                ${trans.proveedor},
                ${trans.personal},
                ${trans.actividad},
                false,
                null,
                ${secAdmEnv2}
              )
              RETURNING *
            `);
            const prestamoRecord = prestamoResult.rows[0] as any;
            resultados.administracion++;
            
            if (prestamoRecord) {
              broadcast("administracion:create", prestamoRecord);
            }
          }

          // B3. Si descuento != 0, crear registro en ADMINISTRACION tipo prestamos con monto negativo
          if (descuento !== 0) {
            const descuentoNegativo = -Math.abs(descuento);
            const montoDolaresDesc = tasaDolar > 0 ? descuentoNegativo / tasaDolar : 0;
            const secAdmEnvR3 = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM administracion WHERE LEFT(fecha, 10) = ${(trans.fecha || '').substring(0, 10)}`);
            const secAdmEnv3 = ((secAdmEnvR3.rows[0] as any)?.max_sec || 0) + 1;
            const descResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, capital, utility, insumo, proveedor, personal, actividad, relacionado, codrel, secuencia)
              VALUES (
                ${trans.fecha},
                'prestamos',
                ${nombreAdmin},
                ${descripcionAdmin},
                ${descuentoNegativo},
                ${montoDolaresDesc},
                ${unidadEnviar},
                false,
                false,
                ${trans.insumo},
                ${trans.proveedor},
                ${trans.personal},
                ${trans.actividad},
                false,
                null,
                ${secAdmEnv3}
              )
              RETURNING *
            `);
            const descRecord = descResult.rows[0] as any;
            resultados.administracion++;
            descuentoCreado = true;
            
            if (descRecord) {
              broadcast("administracion:create", descRecord);
            }
          }

          // C. Si es tipo proveedores, procesar en administración
          if (esProveedores && trans.proveedor) {
            const proveedorLower = (trans.proveedor || '').toLowerCase();
            const nrofacturaLower = (trans.nrofactura || '').toLowerCase();
            const descripcionProv = `${(trans.banco || '').toLowerCase()} ${proveedorLower} factura n: ${nrofacturaLower}`;

            const montoNeg = -Math.abs(monto);
            const montoDolaresNeg = -Math.abs(montoDolaresTransf);

            const saldoResult = await db.execute(sql`
              SELECT montodolares FROM administracion 
              WHERE tipo = 'cuentasporpagar' AND proveedor = ${proveedorLower} AND nrofactura = ${nrofacturaLower}
              ORDER BY LEFT(fecha, 10) ASC, secuencia DESC
            `);
            let saldoAcumulado = 0;
            for (const row of saldoResult.rows) {
              saldoAcumulado += parseFloat((row as any).montodolares) || 0;
            }
            saldoAcumulado += montoDolaresNeg;
            const restacancelar = parseFloat(saldoAcumulado.toFixed(2));

            const origResult = await db.execute(sql`
              SELECT fechafactura FROM administracion 
              WHERE tipo = 'cuentasporpagar' AND proveedor = ${proveedorLower} AND nrofactura = ${nrofacturaLower} AND COALESCE(montodolares, 0)::numeric > 0
              ORDER BY fecha ASC LIMIT 1
            `);
            const fechafacturaOrig = origResult.rows[0] ? (origResult.rows[0] as any).fechafactura : null;

            const esParcial = restacancelar > 0;
            const descripcionFinal = esParcial ? descripcionProv + ' pago parcial' : descripcionProv;

            const secAdmEnvR4 = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM administracion WHERE LEFT(fecha, 10) = ${(trans.fecha || '').substring(0, 10)}`);
            const secAdmEnv4 = ((secAdmEnvR4.rows[0] as any)?.max_sec || 0) + 1;
            const adminProvResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, proveedor, nrofactura, fechafactura, cancelada, restacancelar, propietario, capital, utility, relacionado, codrel, anticipo, secuencia)
              VALUES (
                ${trans.fecha}, 'cuentasporpagar', ${proveedorLower}, ${descripcionFinal}, ${montoNeg}, ${montoDolaresNeg},
                ${unidadEnviar}, ${proveedorLower}, ${nrofacturaLower}, ${fechafacturaOrig}, true, ${restacancelar},
                ${trans.propietario}, false, false, ${bancoId ? true : false}, ${bancoId}, false, ${secAdmEnv4}
              )
              RETURNING *
            `);
            const adminProvRecord = adminProvResult.rows[0] as any;
            if (adminProvRecord) {
              resultados.administracion++;
              adminCreado = true;
              broadcast("administracion:create", adminProvRecord);
              if (bancoId) {
                await db.execute(sql`UPDATE bancos SET relacionado = true WHERE id = ${bancoId}`);
              }
            }

            await recalcularRestaCancelar('cuentasporpagar', proveedorLower, nrofacturaLower, unidadEnviar || undefined);
            broadcast("administracion_updated");
          }

          // Marcar la transferencia como contabilizada y enviar broadcast
          const updatedTransResult = await db.execute(sql`UPDATE transferencias SET contabilizado = true WHERE id = ${id} RETURNING *`);
          const updatedTrans = updatedTransResult.rows[0] as any;
          if (updatedTrans) {
            broadcast("transferencias:update", updatedTrans);
          }
          
          const detalle = {
            proveedor: trans.proveedor || '',
            personal: trans.personal || '',
            monto,
            resta,
            descuento,
            banco: trans.banco || '',
            bancoCreado,
            adminCreado,
            descuentoCreado
          };
          resultados.detalles.push(detalle);
          resultados.procesados++;
          
          // Enviar progreso en tiempo real via WebSocket
          broadcast("enviar_progreso", {
            requestId: correlationId,
            tipo: "registro",
            nombre: trans.proveedor || trans.personal || `Registro`,
            detalle,
            procesados: resultados.procesados,
            total: ids.length
          });
        } catch (error) {
          resultados.errores.push(`Error en ${id}: ${(error as Error).message}`);
        }
      }
      
      // Recalcular saldos de todos los bancos afectados desde su fecha más antigua
      for (const [bancoNombre, fechaDesde] of Array.from(bancosAfectados.entries())) {
        try {
          await recalcularSaldosBanco(bancoNombre, fechaDesde);
        } catch (error) {
          // Silently continue if saldo recalculation fails
        }
      }
      
      // Enviar resumen final via WebSocket
      broadcast("enviar_progreso", {
        requestId: correlationId,
        tipo: "completado",
        resultados
      });
      
      broadcast("transferencias_updated");
      broadcast("bancos_updated");
      broadcast("administracion_updated");

      res.json(resultados);
    } catch (error) {
      console.error("Error en enviar transferencias:", error);
      res.status(500).json({ error: "Error al procesar transferencias" });
    }
  });

  app.post("/api/transferencias/batch", async (req, res) => {
    try {
      const { records, username } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron registros" });
      }

      const loc = getLocalDate();
      const fechaISO = `${loc.yyyy}-${loc.mm}-${loc.dd} ${loc.hh}:${loc.mi}:${loc.ss}`;
      const propietario = `${username || "sistema"} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;

      const maxResult = await db.execute(sql`SELECT COALESCE(MAX(CAST(comprobante AS INTEGER)), 0) as max_numero FROM transferencias WHERE comprobante IS NOT NULL AND comprobante ~ '^[0-9]+$'`);
      let nextComprobante = (parseInt((maxResult.rows[0] as any).max_numero) || 0) + 1;

      const inserted = [];
      for (const rec of records) {
        const monto = parseFloat(rec.monto) || 0;
        const deuda = parseFloat(rec.deuda) || 0;
        const resta = monto;
        const comprobante = String(nextComprobante++);
        const anticipo = deuda > 0;

        const montodolares = parseFloat(rec.montodolares) || 0;
        const tipo = (rec.tipo || '').toLowerCase();
        const nrofactura = (rec.nrofactura || '').toLowerCase();

        const secTransBatchR = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM transferencias WHERE LEFT(fecha, 10) = ${fechaISO.substring(0, 10)}`);
        const secTransBatch = ((secTransBatchR.rows[0] as any)?.max_sec || 0) + 1;
        const result = await db.execute(sql`
          INSERT INTO transferencias (id, fecha, proveedor, rifced, numcuenta, descripcion, monto, montodolares, deuda, resta, unidad, comprobante, propietario, transferido, contabilizado, ejecutada, utility, descuento, prestamo, tipo, nrofactura, anticipo, secuencia)
          VALUES (gen_random_uuid(), ${fechaISO}, ${(rec.proveedor || '').toLowerCase()}, ${(rec.rifced || '').toLowerCase()}, ${(rec.numcuenta || '').toLowerCase()}, ${(rec.descripcion || '').toLowerCase()}, ${monto}, ${montodolares}, ${deuda}, ${resta}, ${(rec.unidad || '').toLowerCase()}, ${comprobante}, ${propietario}, false, false, false, false, 0, 0, ${tipo}, ${nrofactura}, ${anticipo}, ${secTransBatch})
          RETURNING *
        `);
        if (result.rows[0]) inserted.push(result.rows[0]);
      }

      broadcast("transferencias_updated");
      res.json({ inserted: inserted.length, records: inserted });
    } catch (error) {
      console.error("Error en batch transferencias:", error);
      res.status(500).json({ error: "Error al crear transferencias" });
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
      
      if (unidad && unidad !== "all") {
        parametros = parametros.filter(p => p.unidad && p.unidad !== "" && p.unidad === unidad);
      }

      parametros.sort((a, b) => ((a as any).nombre || "").localeCompare((b as any).nombre || ""));
      
      const limit = parseInt(req.query.limit as string) || 0;
      const offset = parseInt(req.query.offset as string) || 0;
      
      if (limit > 0) {
        const total = parametros.length;
        const paginatedData = parametros.slice(offset, offset + limit);
        return res.json({
          data: paginatedData,
          total,
          hasMore: offset + limit < total
        });
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
        sql`SELECT valor FROM parametros WHERE tipo = 'dolar' AND fecha <= ${fecha}::date ORDER BY fecha DESC LIMIT 1`
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
      await logAudit("parametros", "insert", (result as any).id, null, result, extractUsername(data));
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
      const prevParamResult = await db.execute(sql`SELECT * FROM parametros WHERE id = ${id}`);
      const prevParam = prevParamResult.rows[0] || null;
      const updated = await storage.updateParametro(id, updateData);
      if (updated) {
        await logAudit("parametros", "update", id, prevParam, updated, extractUsername(updateData));
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
      const prevDelParamResult = await db.execute(sql`SELECT * FROM parametros WHERE id = ${id}`);
      const prevDelParam = prevDelParamResult.rows[0] || null;
      const deleted = await storage.deleteParametro(id);
      if (deleted) {
        await logAudit("parametros", "delete", id, prevDelParam, null, (req.query._username as string) || "sistema");
        broadcast("parametros_updated");
      }
      res.json({ success: true, deleted });
    } catch (error) {
      console.error("[DELETE /api/parametros/:id] Error:", error);
      res.status(500).json({ error: "Error al eliminar parámetro" });
    }
  });

  app.put("/api/bulk-update", async (req, res) => {
    try {
      const { table, ids, fields } = req.body;

      if (!table || !Array.isArray(ids) || ids.length === 0 || !fields || Object.keys(fields).length === 0) {
        return res.status(400).json({ error: "Se requiere tabla, IDs y campos válidos" });
      }

      const allowedTables = ["bancos", "administracion", "almacen", "cosecha", "transferencias", "arrime", "agronomia", "reparaciones", "parametros", "agrodata", "bitacora"];
      if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: `Tabla no soportada: ${table}` });
      }

      const columnsResult = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      const validColumns = new Set(columnsResult.rows.map((r: any) => r.column_name));

      const blockedFields = new Set(["id", "saldo", "saldo_conciliado", "codrel", "montodolares"]);

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      for (const [key, val] of Object.entries(fields)) {
        if (blockedFields.has(key) || !validColumns.has(key)) continue;
        setClauses.push(`"${key}" = $${paramIdx}`);
        values.push(val);
        paramIdx++;
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: "No hay campos válidos para actualizar" });
      }

      const stringIds = ids.map(String);
      values.push(stringIds);
      const query = `UPDATE "${table}" SET ${setClauses.join(", ")} WHERE id = ANY($${paramIdx}::text[])`;
      const result = await pool.query(query, values);
      const updated = (result as any).rowCount || 0;

      if (table === "bancos" && updated > 0) {
        const bancosInfo = await pool.query(
          `SELECT DISTINCT banco FROM bancos WHERE id = ANY($1::text[])`,
          [stringIds]
        );
        for (const row of bancosInfo.rows) {
          await recalcularSaldosBanco(row.banco);
        }
      }

      broadcast(`${table}_updated`);
      serverLog("INFO", `bulk-update: ${updated} registros actualizados en ${table}`);
      res.json({ ok: true, updated });
    } catch (error) {
      serverLog("ERROR", `bulk-update: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post("/api/bulk-copy", async (req, res) => {
    try {
      const { table, ids, fields, username } = req.body;

      if (!table || !Array.isArray(ids) || ids.length === 0 || !fields || Object.keys(fields).length === 0) {
        return res.status(400).json({ error: "Se requiere tabla, IDs y campos válidos" });
      }

      const allowedTables = ["bancos", "administracion", "almacen", "cosecha", "transferencias", "arrime", "agronomia", "reparaciones", "parametros", "agrodata", "bitacora"];
      if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: `Tabla no soportada: ${table}` });
      }

      const columnsResult = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      const validColumns = new Set(columnsResult.rows.map((r: any) => r.column_name));

      const blockedFields = new Set(["id", "saldo", "saldo_conciliado", "codrel", "montodolares"]);

      const validFields: Record<string, any> = {};
      for (const [key, val] of Object.entries(fields)) {
        if (!blockedFields.has(key) && validColumns.has(key)) {
          validFields[key] = val;
        }
      }

      if (Object.keys(validFields).length === 0) {
        return res.status(400).json({ error: "No hay campos válidos para copiar" });
      }

      const stringIds = ids.map(String);
      const originals = await pool.query(`SELECT * FROM "${table}" WHERE id = ANY($1::text[])`, [stringIds]);

      if (originals.rows.length === 0) {
        return res.status(400).json({ error: "No se encontraron registros originales" });
      }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const propietario = `${username || "sistema"} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const client = await pool.connect();
      let copied = 0;
      try {
        await client.query("BEGIN");
        for (const row of originals.rows) {
          const newRow = { ...row };
          delete newRow.id;
          for (const [key, val] of Object.entries(validFields)) {
            newRow[key] = val;
          }
          newRow.propietario = propietario;
          newRow.codrel = null;
          newRow.relacionado = false;
          if (newRow.saldo !== undefined) newRow.saldo = null;
          if (newRow.saldo_conciliado !== undefined) newRow.saldo_conciliado = null;

          const cols = Object.keys(newRow).filter(k => validColumns.has(k));
          const vals = cols.map(k => newRow[k]);
          const placeholders = cols.map((_, i) => `$${i + 1}`);
          await client.query(
            `INSERT INTO "${table}" (id, ${cols.map(c => `"${c}"`).join(", ")}) VALUES (gen_random_uuid(), ${placeholders.join(", ")})`,
            vals
          );
          copied++;
        }
        await client.query("COMMIT");
      } catch (txError) {
        await client.query("ROLLBACK");
        throw txError;
      } finally {
        client.release();
      }

      broadcast(`${table}_updated`);
      serverLog("INFO", `bulk-copy: ${copied} registros copiados en ${table}`);
      res.json({ ok: true, copied });
    } catch (error) {
      serverLog("ERROR", `bulk-copy: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
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

        transferencias: (id) => storage.deleteTransferencia(id),
        administracion: (id) => storage.deleteAdministracion(id),
        parametros: (id) => storage.deleteParametro(id),
        arrime: (id) => storage.deleteArrime(id),
        agrodata: (id) => storage.deleteAgrodata(id),
        agronomia: (id) => storage.deleteAgronomia(id),
      };

      const deleteHandler = tableHandlers[table];
      if (!deleteHandler) {
        return res.status(400).json({ error: `Tabla no soportada: ${table}` });
      }

      if (table === "bancos") {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const stringIds = ids.map(String);

          const infoResult = await client.query(
            `SELECT id, banco, fecha, codrel FROM bancos WHERE id = ANY($1::text[])`,
            [stringIds]
          );
          const rows = infoResult.rows;

          await client.query(
            `UPDATE administracion SET codrel = NULL, relacionado = false WHERE codrel = ANY($1::text[])`,
            [stringIds]
          );

          const adminIdsFromCodrel = [...new Set(rows.map((r: any) => r.codrel).filter(Boolean))];
          
          const deleteResult = await client.query(
            `DELETE FROM bancos WHERE id = ANY($1::text[]) RETURNING id`,
            [stringIds]
          );
          deletedCount = deleteResult.rowCount || 0;

          await client.query('COMMIT');

          for (const adminId of adminIdsFromCodrel) {
            const refs = await pool.query(
              `SELECT COUNT(*)::int as cnt FROM (
                SELECT 1 FROM administracion WHERE id = $1 AND codrel IS NOT NULL
                UNION ALL SELECT 1 FROM bancos WHERE codrel = $1
              ) t`,
              [adminId]
            );
            if ((refs.rows[0]?.cnt || 0) === 0) {
              await pool.query(`UPDATE administracion SET relacionado = false WHERE id = $1`, [adminId]);
            }
          }

          const bancosAfectados: Record<string, string> = {};
          for (const row of rows) {
            if (row.banco) {
              const existing = bancosAfectados[row.banco];
              if (!existing || row.fecha < existing) {
                bancosAfectados[row.banco] = row.fecha;
              }
            }
          }
          for (const bancoNombre of Object.keys(bancosAfectados)) {
            const fechaNorm = normalizarFechaParaSQL(bancosAfectados[bancoNombre]);
            await recalcularSaldosBanco(bancoNombre, fechaNorm || undefined);
          }
        } catch (e) {
          await client.query('ROLLBACK');
          console.error("Error en bulk-delete bancos:", e);
          return res.status(500).json({ error: "Error al eliminar registros de bancos" });
        } finally {
          client.release();
        }
        broadcast("bancos_updated");
        broadcast("administracion_updated");
        return res.json({ deleted: deletedCount, total: ids.length });
      }

      if (table === "administracion") {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const stringIds = ids.map(String);

          const infoResult = await client.query(
            `SELECT id, codrel, tipo, cliente, proveedor, nrofactura, unidad FROM administracion WHERE id = ANY($1::text[])`,
            [stringIds]
          );
          const rows = infoResult.rows;

          const bancoIdsToClean = [...new Set(rows.map((r: any) => r.codrel).filter(Boolean))];

          await client.query(
            `UPDATE bancos SET codrel = NULL, relacionado = false WHERE codrel = ANY($1::text[])`,
            [stringIds]
          );

          const cxGroups: string[] = [];
          for (const row of rows) {
            const t = (row.tipo || '').toLowerCase();
            if (t === 'cuentasporcobrar' || t === 'cuentasporpagar') {
              const p = t === 'cuentasporcobrar' ? (row.cliente || '') : (row.proveedor || '');
              const key = `${t}|${p}|${row.nrofactura || ''}|${row.unidad || ''}`;
              if (!cxGroups.includes(key)) cxGroups.push(key);
            }
          }

          const deleteResult = await client.query(
            `DELETE FROM administracion WHERE id = ANY($1::text[]) RETURNING id`,
            [stringIds]
          );
          deletedCount = deleteResult.rowCount || 0;

          await client.query('COMMIT');

          for (const bancoId of bancoIdsToClean) {
            const refs = await pool.query(
              `SELECT COUNT(*)::int as cnt FROM (
                SELECT 1 FROM administracion WHERE codrel = $1
                UNION ALL SELECT 1 FROM bancos WHERE id = $1 AND codrel IS NOT NULL
              ) t`,
              [bancoId]
            );
            if ((refs.rows[0]?.cnt || 0) === 0) {
              await pool.query(`UPDATE bancos SET relacionado = false WHERE id = $1`, [bancoId]);
            }
          }

          for (const key of cxGroups) {
            const [tipo, persona, nrofactura, unidad] = key.split('|');
            await recalcularRestaCancelar(tipo as any, persona, nrofactura, unidad);
          }
        } catch (e) {
          await client.query('ROLLBACK');
          console.error("Error en bulk-delete administracion:", e);
          return res.status(500).json({ error: "Error al eliminar registros de administración" });
        } finally {
          client.release();
        }
        broadcast("administracion_updated");
        broadcast("bancos_updated");
        return res.json({ deleted: deletedCount, total: ids.length });
      }

      if (table === "agronomia") {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const stringIds = ids.map(String);

          await client.query(
            `UPDATE almacen SET codrel = NULL, relacionado = false WHERE codrel = ANY($1::text[])`,
            [stringIds]
          );

          const deleteResult = await client.query(
            `DELETE FROM agronomia WHERE id = ANY($1::text[]) RETURNING id`,
            [stringIds]
          );
          deletedCount = deleteResult.rowCount || 0;

          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          console.error("Error en bulk-delete agronomia:", e);
          return res.status(500).json({ error: "Error al eliminar registros de agronomía" });
        } finally {
          client.release();
        }
        broadcast("agronomia_updated");
        broadcast("almacen_updated");
        return res.json({ deleted: deletedCount, total: ids.length });
      }

      if (table === "almacen") {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const stringIds = ids.map(String);

          const codrelResult = await client.query(
            `SELECT DISTINCT codrel FROM almacen WHERE codrel IS NOT NULL AND id = ANY($1::text[])`,
            [stringIds]
          );
          const agronomiaIds = codrelResult.rows.map((r: any) => r.codrel);

          const deleteResult = await client.query(
            `DELETE FROM almacen WHERE id = ANY($1::text[]) RETURNING id`,
            [stringIds]
          );
          deletedCount = deleteResult.rowCount || 0;

          if (agronomiaIds.length > 0) {
            await client.query(
              `UPDATE agronomia SET relacionado = false WHERE id = ANY($1::text[]) AND NOT EXISTS (SELECT 1 FROM almacen WHERE almacen.codrel = agronomia.id)`,
              [agronomiaIds]
            );
          }

          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          console.error("Error en bulk-delete almacen:", e);
          return res.status(500).json({ error: "Error al eliminar registros de almacén" });
        } finally {
          client.release();
        }
        broadcast("almacen_updated");
        broadcast("agronomia_updated");
        return res.json({ deleted: deletedCount, total: ids.length });
      }

      const stringIds = ids.map(String);
      try {
        const deleteResult = await pool.query(
          `DELETE FROM ${table} WHERE id = ANY($1::text[]) RETURNING id`,
          [stringIds]
        );
        deletedCount = deleteResult.rowCount || 0;
      } catch (e) {
        console.error(`Error en bulk-delete ${table}:`, e);
        return res.status(500).json({ error: `Error al eliminar registros de ${table}` });
      }

      broadcast(`${table}_updated`);
      res.json({ deleted: deletedCount, total: ids.length });
    } catch (error) {
      console.error("Error en bulk-delete:", error);
      res.status(500).json({ error: "Error al eliminar registros" });
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
    res.flushHeaders();
    
    const sendProgress = (phase: string, detail: string, progress: number) => {
      res.write(`data: ${JSON.stringify({ phase, detail, progress })}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();
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
            'unidaddepr': 'unidad',
            'capital': 'anticipo',
            'utility': 'utility',
            'producto': 'producto',
            'cantidad': 'cantidad',
            'insumo': 'insumo',
            'proveedor': 'proveedor',
            'cliente': 'cliente',
            'personalde': 'personal',
            'actividad': 'actividad',
            'prop': 'propietario',
            'unidaddeme': 'unidaddemedida',
            'relaz': 'relacionado',
            'codrel': 'codrel'
          },
          ignoreFields: ['bloqueado', 'formadepag', 'comprobant']
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
            'insumo': 'suministro',
            'unidaddeme': 'unidaddemedida',
            'monto': 'monto',
            'precio': 'precio',
            'operacion': 'movimiento',
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
        },
        'arrime': {
          table: 'arrime',
          fieldMap: {
            'codigoauto': 'id',
            'feriado': 'feriado',
            'nucleo': 'nucleocorte',
            'azucar': 'azucar',
            'finca': 'finca',
            'fecha': 'fecha',
            'chofer': 'chofer',
            'remesa': 'remesa',
            'tiket': 'boleto',
            'proveedor': 'proveedor',
            'placa': 'placa',
            'cantidad': 'neto',
            'utility': 'utility',
            'prop': 'propietario',
            'central': 'central',
            'codigofinca': 'codigofinca',
            'empresa': 'empresa',
            'horaentrada': 'horaentrada',
            'horasalida': 'horasalida',
            'nucleocorte': 'nucleocorte',
            'operador': 'operador',
            'remesero': 'remesero',
            'tractorista': 'tractorista',
            'horainiciocarga': 'horainiciocarga',
            'horafinalizacarga': 'horafinalizacarga',
            'nucleotransporte': 'nucleotransporte'
          },
          ignoreFields: ['_nullflags', 'flete', 'fletechof', 'fletechofe', 'montochofe', 'cancelado', 'descripcio', 'pagochofer', 'brix', 'pol', 'torta', 'tablon', 'grado', 'ruta', 'monto']
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

      // Always include agrodata to be cleared (will be populated from parametros tipo='red')
      tablesToClear.add('agrodata');

      // Never clear parametros - keep existing parameter data
      tablesToClear.delete('parametros');
      
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
          
          // Skip agrodata DBF files - agrodata is ONLY loaded from parametros tipo='red'
          if (baseName.includes('agrodata') || config.table === 'agrodata') {
            console.log(`Skipping agrodata DBF: ${entry.entryName} (loaded from parametros)`);
            res.write(`data: ${JSON.stringify({ phase: 'info', detail: `Ignorando ${entry.entryName} (agrodata se carga desde parametros)`, file: entry.entryName })}\n\n`);
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
            const BATCH_SIZE = 1000;
            
            const columnsResult = await pool.query(`
              SELECT column_name FROM information_schema.columns 
              WHERE table_name = $1
            `, [config.table]);
            const existingColumns = new Set(columnsResult.rows.map((r: any) => r.column_name.toLowerCase()));
            const fileRecordCount = records.length;
            let finalColumns: string[] | null = null;

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
                } else if (['monto', 'montodolares', 'saldo', 'saldo_conciliado', 'deuda', 'resta', 'prestamo', 'descuento', 
                           'cantidad', 'neto', 'cantnet', 'descporc', 'precio', 'valor', 'costo', 'torbas', 
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

              if (config.table === 'parametros') {
                const tipo = (mappedRecord.tipo || '').toLowerCase();
                if (tipo === 'dolar' || tipo === 'dólar') {
                  const fleteValue = record['FLETE'] ?? record['flete'] ?? record['Flete'];
                  if (fleteValue !== undefined && fleteValue !== null) {
                    mappedRecord.valor = toNumber(fleteValue);
                  }
                }
                if (tipo === 'equiposdered') {
                  mappedRecord.tipo = 'equiposred';
                }
                if (tipo === 'almacen') {
                  mappedRecord.tipo = 'suministro';
                }
              }

              return { mapped: mappedRecord, hasId };
            };

            const allMapped: Record<string, any>[] = [];
            let loggedOnce = false;

            for (let i = 0; i < records.length; i++) {
              const record = records[i];
              const { mapped, hasId } = mapRecord(record);

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

                const allColumns = Object.keys(mapped);
                finalColumns = allColumns.filter(c => existingColumns.has(c.toLowerCase()));
                const skippedColumns = allColumns.filter(c => !existingColumns.has(c.toLowerCase()));
                if (skippedColumns.length > 0) {
                  console.log(`[DBF Import] ${config.table}: Columnas ignoradas (no existen en tabla): ${skippedColumns.join(', ')}`);
                }
              }

              if (!hasId || !finalColumns || finalColumns.length === 0) continue;
              allMapped.push(mapped);

              if ((i + 1) % 500 === 0 || i === records.length - 1) {
                res.write(`data: ${JSON.stringify({ 
                  phase: 'record_progress', 
                  file: fileName,
                  table: config.table,
                  current: i + 1, 
                  total: fileRecordCount,
                  detail: `${config.table}: mapeando ${i + 1} de ${fileRecordCount} registros...`
                })}\n\n`);
              }
            }

            if (allMapped.length > 0 && finalColumns && finalColumns.length > 0) {
              const columnNames = finalColumns.map(c => `"${c}"`).join(', ');
              const safeBatchSize = Math.min(BATCH_SIZE, Math.floor(65000 / finalColumns.length));

              for (let batchStart = 0; batchStart < allMapped.length; batchStart += safeBatchSize) {
                const batch = allMapped.slice(batchStart, batchStart + safeBatchSize);
                const allValues: any[] = [];
                const valueClauses: string[] = [];

                batch.forEach((rec, idx) => {
                  const rowValues = finalColumns!.map(c => rec[c] ?? null);
                  allValues.push(...rowValues);
                  const startIdx = idx * finalColumns!.length + 1;
                  const placeholders = finalColumns!.map((_, colIdx) => `$${startIdx + colIdx}`).join(', ');
                  valueClauses.push(`(${placeholders})`);
                });

                try {
                  const query = `INSERT INTO "${config.table}" (${columnNames}) VALUES ${valueClauses.join(', ')} ON CONFLICT (id) DO NOTHING`;
                  await pool.query(query, allValues);
                  tableInserted += batch.length;
                } catch (err: any) {
                  console.error(`Batch insert error for ${config.table}, falling back to individual:`, err.message);
                  for (const rec of batch) {
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

                res.write(`data: ${JSON.stringify({ 
                  phase: 'record_progress', 
                  file: fileName,
                  table: config.table,
                  current: Math.min(batchStart + safeBatchSize, allMapped.length), 
                  total: allMapped.length,
                  detail: `${config.table}: insertando ${Math.min(batchStart + safeBatchSize, allMapped.length)} de ${allMapped.length} registros...`
                })}\n\n`);
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

        // Load agrodata ONLY from parametros where tipo='red' (not from DBF files)
        sendProgress('importing', 'Cargando datos de red a agrodata...', 92);
        try {
          const redParams = await db.execute(
            sql`SELECT ced_rif, nombre, direccion, unidaddemedida, telefono FROM parametros WHERE tipo = 'red'`
          );
          
          let agrodataInserted = 0;
          for (const param of redParams.rows as any[]) {
            try {
              await db.execute(sql`
                INSERT INTO agrodata (equipo, nombre, ip, mac, descripcion)
                VALUES (${param.ced_rif}, ${param.nombre}, ${param.direccion}, ${param.unidaddemedida}, ${param.telefono})
              `);
              agrodataInserted++;
            } catch (insertErr) {
              console.error('Error inserting agrodata from parametros:', insertErr);
            }
          }
          
          totalRecords += agrodataInserted;
          processedTables.push(`agrodata: ${agrodataInserted}`);
          res.write(`data: ${JSON.stringify({ phase: 'file_complete', file: 'parametros→agrodata', records: agrodataInserted, detail: `agrodata: ${agrodataInserted} registros desde parametros tipo=red` })}\n\n`);
        } catch (agrodataError: any) {
          console.error('Error loading agrodata from parametros:', agrodataError.message);
          res.write(`data: ${JSON.stringify({ phase: 'file_error', file: 'agrodata', detail: `Error cargando agrodata: ${agrodataError.message}` })}\n\n`);
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
    transferencias: {
      getAll: () => storage.getAllTransferencias(),
      create: (data) => storage.createTransferencia(data),
      update: (id, data) => storage.updateTransferencia(id, data),
      delete: (id) => storage.deleteTransferencia(id),
      hasPagination: true,
    },
    agrodata: {
      getAll: () => storage.getAllAgrodata(),
      create: (data) => storage.createAgrodata(data),
      update: (id, data) => storage.updateAgrodata(id, data),
      delete: (id) => storage.deleteAgrodata(id),
      hasPagination: true,
    },
    administracion: {
      getAll: () => storage.getAllAdministracion(),
      create: (data) => storage.createAdministracion(data),
      update: (id, data) => storage.updateAdministracion(id, data),
      delete: (id) => storage.deleteAdministracion(id),
      hasPagination: true,
    },
    agronomia: {
      getAll: () => storage.getAllAgronomia(),
      create: (data) => storage.createAgronomia(data),
      update: (id, data) => storage.updateAgronomia(id, data),
      delete: (id) => storage.deleteAgronomia(id),
      hasPagination: true,
    },
    reparaciones: {
      getAll: () => storage.getAllReparaciones(),
      create: (data) => storage.createReparaciones(data),
      update: (id, data) => storage.updateReparaciones(id, data),
      delete: (id) => storage.deleteReparaciones(id),
      hasPagination: true,
    },
    bitacora: {
      getAll: () => storage.getAllBitacora(),
      create: (data) => storage.createBitacora(data),
      update: (id, data) => storage.updateBitacora(id, data),
      delete: (id) => storage.deleteBitacora(id),
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
    arrime: {
      getAll: () => storage.getAllArrime(),
      create: (data) => storage.createArrime(data),
      update: (id, data) => storage.updateArrime(id, data),
      delete: (id) => storage.deleteArrime(id),
      hasPagination: true,
    },
    portal: {
      getAll: () => storage.getAllPortal(),
      create: (data) => storage.createPortal(data),
      update: (id, data) => storage.updatePortal(id, data),
      delete: (id) => storage.deletePortal(id),
      hasPagination: true,
    },
    defaults: {
      getAll: async () => {
        const result = await db.select().from(defaults);
        return result;
      },
      create: async (data) => {
        const [record] = await db.insert(defaults).values(data).returning();
        return record;
      },
      update: async (id, data) => {
        const [record] = await db.update(defaults).set(data).where(eq(defaults.id, id)).returning();
        return record;
      },
      delete: async (id) => {
        const result = await db.delete(defaults).where(eq(defaults.id, id));
        return true;
      },
    },
  };

  app.get("/api/agrodata/buscar-cliente", async (req, res) => {
    try {
      const nombre = (req.query.nombre as string || "").toLowerCase().trim();
      if (!nombre) return res.json(null);
      const result = await db.execute(sql`SELECT nombre, cedula FROM agrodata WHERE LOWER(TRIM(nombre)) = ${nombre} LIMIT 1`);
      const rows = (result as any).rows || [];
      res.json(rows.length > 0 ? rows[0] : null);
    } catch (error) {
      res.status(500).json({ error: "Error al buscar cliente" });
    }
  });

  app.get("/api/portal/validar-duplicado", async (req, res) => {
    try {
      const nombre = (req.query.nombre as string || "").toLowerCase().trim();
      const fecha = req.query.fecha as string || "";
      const comprobante = (req.query.comprobante as string || "").trim();
      const banco = (req.query.banco as string || "").toLowerCase().trim();

      let comprobanteDuplicado = false;
      let comprobanteDuplicadoNombre = "";
      if (comprobante && banco) {
        const compResult = await db.execute(sql`SELECT nombre FROM portal WHERE TRIM(comprobante) = ${comprobante} AND LOWER(TRIM(banco)) = ${banco} LIMIT 1`);
        const rows = (compResult as any).rows || [];
        if (rows.length > 0) {
          comprobanteDuplicado = true;
          comprobanteDuplicadoNombre = rows[0].nombre || "";
        }
      }

      let duplicado = false;
      if (nombre && fecha) {
        const parts = fecha.split("-");
        if (parts.length === 3) {
          const [yyyy, mm] = parts;
          const inicioMes = `${yyyy}-${mm}-01`;
          const finMes = `${yyyy}-${mm}-31`;
          const result = await db.execute(sql`SELECT COUNT(*) as count FROM portal WHERE LOWER(TRIM(nombre)) = ${nombre} AND fecha >= ${inicioMes} AND fecha <= ${finMes}`);
          duplicado = parseInt((result as any).rows[0]?.count || "0") >= 2;
        }
      }

      res.json({ duplicado, comprobanteDuplicado, comprobanteDuplicadoNombre });
    } catch (error) {
      res.status(500).json({ error: "Error al validar" });
    }
  });

  // [AGRODATA] Obtener nombres únicos de la tabla agrodata
  app.get("/api/agrodata/nombres", async (_req, res) => {
    try {
      const result = await db.execute(sql`SELECT DISTINCT nombre FROM agrodata WHERE nombre IS NOT NULL AND nombre != '' ORDER BY nombre`);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching agrodata nombres:", error);
      res.status(500).json({ error: "Error al obtener nombres" });
    }
  });

  // Endpoint para hacer ping a un registro de agrodata y extraer MAC
  app.post("/api/agrodata/ping/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Obtener el registro
      const result = await db.select().from(agrodata).where(eq(agrodata.id, id)).limit(1);
      if (result.length === 0) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      
      const record = result[0];
      const ip = record.ip?.trim();
      
      if (!ip) {
        return res.json({ 
          success: false, 
          id, 
          ip: null,
          latencia: "sin IP",
          mac: record.mac,
          estado: "cortado"
        });
      }
      
      // Validar que sea una IP válida para prevenir inyección de comandos
      if (!isValidIPv4(ip)) {
        return res.json({ 
          success: false, 
          id, 
          ip,
          latencia: "IP inválida",
          mac: record.mac,
          estado: "cortado"
        });
      }
      
      try {
        // Hacer ping con timeout de 2 segundos, 1 paquete
        // Usamos execFile con argumentos separados para prevenir inyección de comandos
        const pingResult = await execFileAsync("ping", ["-c", "1", "-W", "2", ip], { timeout: 5000 });
        const output = pingResult.stdout;
        
        // Extraer latencia del resultado del ping
        const timeMatch = output.match(/time[=<](\d+\.?\d*)\s*ms/i);
        const latencia = timeMatch ? `${timeMatch[1]}ms` : "ok";
        
        // Intentar obtener MAC usando arp
        let mac = record.mac;
        try {
          const arpResult = await execFileAsync("arp", ["-n", ip], { timeout: 3000 });
          const macMatch = arpResult.stdout.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/i);
          if (macMatch) {
            mac = macMatch[0].toUpperCase().replace(/-/g, ":");
          }
        } catch {
          // arp puede fallar si no está en la misma red local
        }
        
        // Actualizar el registro con la latencia y MAC
        await db.update(agrodata)
          .set({ 
            latencia, 
            mac: mac || record.mac,
            estado: "activo"
          })
          .where(eq(agrodata.id, id));
        
        res.json({ 
          success: true, 
          id, 
          ip,
          latencia, 
          mac: mac || record.mac,
          estado: "activo"
        });
      } catch (pingError: any) {
        // Ping falló - host no alcanzable
        const latencia = "timeout";
        
        await db.update(agrodata)
          .set({ 
            latencia,
            estado: "cortado"
          })
          .where(eq(agrodata.id, id));
        
        res.json({ 
          success: false, 
          id, 
          ip,
          latencia,
          mac: record.mac,
          estado: "cortado"
        });
      }
    } catch (error) {
      console.error("Error en ping:", error);
      res.status(500).json({ error: "Error al hacer ping" });
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

  (async () => {
    try {
      if (fs.existsSync(PREFERENCIAS_FILE)) {
        const data = JSON.parse(fs.readFileSync(PREFERENCIAS_FILE, "utf-8"));
        if (data.gridSettings) {
          let migrated = 0;
          for (const [key, value] of Object.entries(data.gridSettings)) {
            let tableId = "";
            let settingType = "";
            if (key.startsWith("mygrid_widths_")) {
              tableId = key.replace("mygrid_widths_", "");
              settingType = "widths";
            } else if (key.startsWith("mygrid_order_")) {
              tableId = key.replace("mygrid_order_", "");
              settingType = "order";
            }
            if (tableId && settingType) {
              await db.execute(sql`
                INSERT INTO grid_preferences (id, table_id, setting_type, value)
                VALUES (gen_random_uuid(), ${tableId}, ${settingType}, ${JSON.stringify(value)}::jsonb)
                ON CONFLICT (table_id, setting_type) DO UPDATE SET value = ${JSON.stringify(value)}::jsonb
              `);
              migrated++;
            }
          }
          if (migrated > 0) {
            console.log(`[MIGRATION] ${migrated} grid preferences upserted from preferencias.json`);
          }
        }
      }
    } catch (err) {
      console.error("[MIGRATION] Error migrating grid preferences:", err);
    }
  })();

  app.get("/api/grid-preferences", async (_req, res) => {
    try {
      const result = await db.execute(sql`SELECT table_id, setting_type, value FROM grid_preferences`);
      const prefs: Record<string, Record<string, any>> = {};
      for (const row of result.rows as any[]) {
        if (!prefs[row.table_id]) prefs[row.table_id] = {};
        prefs[row.table_id][row.setting_type] = row.value;
      }
      res.json(prefs);
    } catch (error) {
      console.error("[GET /api/grid-preferences] Error:", error);
      res.status(500).json({ error: "Error al leer preferencias de grid" });
    }
  });

  app.put("/api/grid-preferences/:tableId/:settingType", async (req, res) => {
    try {
      const { tableId, settingType } = req.params;
      const { value } = req.body;
      await db.execute(sql`
        INSERT INTO grid_preferences (id, table_id, setting_type, value)
        VALUES (gen_random_uuid(), ${tableId}, ${settingType}, ${JSON.stringify(value)}::jsonb)
        ON CONFLICT (table_id, setting_type)
        DO UPDATE SET value = ${JSON.stringify(value)}::jsonb
      `);
      res.json({ success: true });
    } catch (error) {
      console.error("[PUT /api/grid-preferences] Error:", error);
      res.status(500).json({ error: "Error al guardar preferencia de grid" });
    }
  });

  // ============= ARRIME - GET con filtrado server-side =============
  app.get("/api/arrime", async (req, res) => {
    try {
      const { unidad, central, fechaInicio, fechaFin, limit, offset } = req.query;
      
      const limitNum = limit ? parseInt(limit as string) : 100;
      const offsetNum = offset ? parseInt(offset as string) : 0;
      
      let whereClause = sql`WHERE 1=1`;
      if (unidad) {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      if (central) {
        whereClause = sql`${whereClause} AND central = ${central}`;
        if ((central as string).toLowerCase() === "portuguesa") {
          const nucleoConst = await db.execute(
            sql`SELECT descripcion FROM parametros WHERE LOWER(TRIM(tipo)) = 'constante' AND LOWER(TRIM(nombre)) = 'nucleo' LIMIT 1`
          );
          if (nucleoConst.rows.length > 0 && (nucleoConst.rows[0] as any).descripcion) {
            const nucleoVal = ((nucleoConst.rows[0] as any).descripcion || "").trim();
            whereClause = sql`${whereClause} AND nucleocorte = ${nucleoVal}`;
          }
        }
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "arrime");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM arrime ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM arrime ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);
      
      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      console.error("Error al obtener registros de arrime:", error);
      res.status(500).json({ error: "Error al obtener registros de arrime" });
    }
  });

  app.get("/api/arrime/distinct/:field", async (req, res) => {
    try {
      const { field } = req.params;
      const allowed = ["placa", "proveedor", "finca", "nucleocorte", "nucleotransporte", "central"];
      if (!allowed.includes(field)) {
        return res.status(400).json({ error: "Campo no permitido" });
      }

      const { central, nucleocorte, nucleotransporte, proveedor, finca } = req.query as Record<string, string | undefined>;
      let cascadeFilter = sql``;
      if (central) cascadeFilter = sql`${cascadeFilter} AND ${sql.raw('central')} = ${central}`;
      if (nucleocorte) cascadeFilter = sql`${cascadeFilter} AND ${sql.raw('nucleocorte')} = ${nucleocorte}`;
      if (nucleotransporte) cascadeFilter = sql`${cascadeFilter} AND ${sql.raw('nucleotransporte')} = ${nucleotransporte}`;
      if (proveedor) cascadeFilter = sql`${cascadeFilter} AND ${sql.raw('proveedor')} = ${proveedor}`;
      if (finca) cascadeFilter = sql`${cascadeFilter} AND ${sql.raw('finca')} = ${finca}`;

      if (field === "placa") {
        const result = await db.execute(
          sql`SELECT DISTINCT placa AS val, proveedor FROM arrime WHERE placa IS NOT NULL AND placa != '' ${cascadeFilter} ORDER BY placa`
        );
        res.json((result.rows as any[]).map((r: any) => ({ val: r.val, proveedor: r.proveedor || "" })));
      } else {
        const result = await db.execute(
          sql`SELECT DISTINCT ${sql.identifier(field)} AS val FROM arrime WHERE ${sql.identifier(field)} IS NOT NULL AND ${sql.identifier(field)} != '' ${cascadeFilter} ORDER BY val`
        );
        res.json((result.rows as any[]).map((r: any) => r.val));
      }
    } catch (error) {
      console.error("Error al obtener valores distintos de arrime:", error);
      res.status(500).json({ error: "Error al obtener valores distintos" });
    }
  });

  // ============= ARRIME REPORTES =============

  app.get("/api/arrime/reporte/semanal", async (req, res) => {
    try {
      const { weekStart, weekEnd, zafraStart, mode, central, finca, nucleocorte, nucleotransporte, proveedor, placa } = req.query as Record<string, string | undefined>;
      if (!zafraStart) {
        return res.status(400).json({ error: "Se requiere zafraStart" });
      }
      if (mode !== "todas" && (!weekStart || !weekEnd)) {
        return res.status(400).json({ error: "Se requieren weekStart, weekEnd y zafraStart" });
      }

      let extraFilter = sql``;
      if (central) extraFilter = sql`${extraFilter} AND ${sql.raw('central')} = ${central}`;
      if (finca) extraFilter = sql`${extraFilter} AND ${sql.raw('finca')} = ${finca}`;
      if (nucleocorte) extraFilter = sql`${extraFilter} AND ${sql.raw('nucleocorte')} = ${nucleocorte}`;
      if (nucleotransporte) extraFilter = sql`${extraFilter} AND ${sql.raw('nucleotransporte')} = ${nucleotransporte}`;
      if (proveedor) extraFilter = sql`${extraFilter} AND ${sql.raw('proveedor')} = ${proveedor}`;
      if (placa) extraFilter = sql`${extraFilter} AND ${sql.raw('placa')} = ${placa}`;

      const calcGrado = (azucar: number, neto: number) => neto > 0 ? (azucar / neto) * 100 : 0;

      const mapRow = (r: any) => {
        const neto = parseFloat(r.total_neto) || 0;
        const azucar = parseFloat(r.total_azucar) || 0;
        const propio = parseFloat(r.transporte_propio) || 0;
        return {
          central: r.central || "",
          finca: r.finca || "",
          total_neto: neto,
          total_azucar: azucar,
          grado: calcGrado(azucar, neto),
          transporte_propio: propio,
          particular: neto - propio,
        };
      };

      const buildWeekResult = (weekRows: any[], zafraRows: any[]) => {
        const weekMap: Record<string, Record<string, any>> = {};
        for (const r of weekRows) {
          if (!weekMap[r.central]) weekMap[r.central] = {};
          weekMap[r.central][r.finca] = r;
        }
        const zafraMap: Record<string, Record<string, any>> = {};
        for (const r of zafraRows) {
          if (!zafraMap[r.central]) zafraMap[r.central] = {};
          zafraMap[r.central][r.finca] = r;
        }

        const allCentrales = Array.from(new Set([...Object.keys(weekMap), ...Object.keys(zafraMap)])).sort();
        const displayRows: any[] = [];
        let grandNeto = 0, grandAzucar = 0, grandPropio = 0, grandPart = 0;
        let grandNetoZ = 0, grandAzucarZ = 0, grandPropioZ = 0, grandPartZ = 0;

        for (const central of allCentrales) {
          const wFincas = weekMap[central] || {};
          const zFincas = zafraMap[central] || {};
          const allFincas = Array.from(new Set([...Object.keys(wFincas), ...Object.keys(zFincas)])).sort();

          let ctNeto = 0, ctAzucar = 0, ctPropio = 0, ctPart = 0;
          let ctNetoZ = 0, ctAzucarZ = 0, ctPropioZ = 0, ctPartZ = 0;

          const fincaRows: any[] = [];
          for (const finca of allFincas) {
            const sem = wFincas[finca];
            const zaf = zFincas[finca];
            const row: any = {
              type: "finca", central, finca,
              sem_neto: sem?.total_neto || 0, sem_propio: sem?.transporte_propio || 0,
              sem_particular: sem?.particular || 0, sem_grado: sem?.grado || 0,
              zaf_neto: zaf?.total_neto || 0, zaf_propio: zaf?.transporte_propio || 0,
              zaf_particular: zaf?.particular || 0, zaf_grado: zaf?.grado || 0,
            };
            fincaRows.push(row);
            ctNeto += row.sem_neto; ctAzucar += (sem?.total_azucar || 0); ctPropio += row.sem_propio; ctPart += row.sem_particular;
            ctNetoZ += row.zaf_neto; ctAzucarZ += (zaf?.total_azucar || 0); ctPropioZ += row.zaf_propio; ctPartZ += row.zaf_particular;
          }

          displayRows.push({ type: "central_header", central });
          displayRows.push(...fincaRows);
          displayRows.push({
            type: "central_total", central,
            sem_neto: ctNeto, sem_propio: ctPropio, sem_particular: ctPart,
            sem_grado: ctNeto > 0 ? ((ctAzucar / ctNeto) * 100) : 0,
            zaf_neto: ctNetoZ, zaf_propio: ctPropioZ, zaf_particular: ctPartZ,
            zaf_grado: ctNetoZ > 0 ? ((ctAzucarZ / ctNetoZ) * 100) : 0,
          });

          grandNeto += ctNeto; grandAzucar += ctAzucar; grandPropio += ctPropio; grandPart += ctPart;
          grandNetoZ += ctNetoZ; grandAzucarZ += ctAzucarZ; grandPropioZ += ctPropioZ; grandPartZ += ctPartZ;
        }

        const grandTotal = {
          sem_neto: grandNeto, sem_propio: grandPropio, sem_particular: grandPart,
          sem_grado: grandNeto > 0 ? ((grandAzucar / grandNeto) * 100) : 0,
          zaf_neto: grandNetoZ, zaf_propio: grandPropioZ, zaf_particular: grandPartZ,
          zaf_grado: grandNetoZ > 0 ? ((grandAzucarZ / grandNetoZ) * 100) : 0,
        };

        return { rows: displayRows, grandTotal };
      };

      const runWeekQuery = async (wStart: string, wEnd: string) => {
        const wq = sql`
          SELECT central, finca,
            SUM(COALESCE(neto, 0)) AS total_neto,
            SUM(COALESCE(azucar, 0)) AS total_azucar,
            SUM(CASE WHEN nucleotransporte IS NOT NULL AND nucleocorte IS NOT NULL AND nucleotransporte != '' AND nucleocorte != '' AND nucleotransporte = nucleocorte
                THEN COALESCE(neto, 0) ELSE 0 END) AS transporte_propio
          FROM arrime
          WHERE fecha >= ${wStart} AND fecha <= ${wEnd}
            AND central IS NOT NULL AND central != ''
            ${extraFilter}
          GROUP BY central, finca
          ORDER BY central, finca
        `;
        const result = await db.execute(wq);
        return (result.rows as any[]).map(mapRow);
      };

      const runZafraQuery = async (zEnd: string) => {
        const zq = sql`
          SELECT central, finca,
            SUM(COALESCE(neto, 0)) AS total_neto,
            SUM(COALESCE(azucar, 0)) AS total_azucar,
            SUM(CASE WHEN nucleotransporte IS NOT NULL AND nucleocorte IS NOT NULL AND nucleotransporte != '' AND nucleocorte != '' AND nucleotransporte = nucleocorte
                THEN COALESCE(neto, 0) ELSE 0 END) AS transporte_propio
          FROM arrime
          WHERE fecha >= ${zafraStart} AND fecha <= ${zEnd}
            AND central IS NOT NULL AND central != ''
            ${extraFilter}
          GROUP BY central, finca
          ORDER BY central, finca
        `;
        const result = await db.execute(zq);
        return (result.rows as any[]).map(mapRow);
      };

      if (mode === "todas") {
        const zStart = new Date(zafraStart);
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const weeks: any[] = [];
        let ws = new Date(zStart);
        let weekNum = 1;
        while (ws <= now) {
          const we = new Date(ws);
          we.setDate(we.getDate() + 6);
          const wStartISO = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
          const wEndISO = `${we.getFullYear()}-${String(we.getMonth() + 1).padStart(2, "0")}-${String(we.getDate()).padStart(2, "0")}`;
          const startDisp = `${String(ws.getDate()).padStart(2, "0")}/${String(ws.getMonth() + 1).padStart(2, "0")}/${String(ws.getFullYear() % 100).padStart(2, "0")}`;
          const endDisp = `${String(we.getDate()).padStart(2, "0")}/${String(we.getMonth() + 1).padStart(2, "0")}/${String(we.getFullYear() % 100).padStart(2, "0")}`;
          weeks.push({ weekNum, startISO: wStartISO, endISO: wEndISO, startDisplay: startDisp, endDisplay: endDisp });
          ws = new Date(ws);
          ws.setDate(ws.getDate() + 7);
          weekNum++;
        }

        const weekResults: any[] = [];
        for (const w of weeks) {
          const weekRows = await runWeekQuery(w.startISO, w.endISO);
          if (weekRows.length === 0) continue;
          const zafraRows = await runZafraQuery(w.endISO);
          const result = buildWeekResult(weekRows, zafraRows);
          weekResults.push({
            weekNum: w.weekNum,
            startDisplay: w.startDisplay,
            endDisplay: w.endDisplay,
            ...result,
          });
        }

        return res.json({ mode: "todas", weeks: weekResults });
      }

      const zafraRows = await runZafraQuery(weekEnd!);
      const weekRows = await runWeekQuery(weekStart!, weekEnd!);
      const result = buildWeekResult(weekRows, zafraRows);

      res.json(result);
    } catch (error) {
      console.error("Error en reporte semanal arrime:", error);
      res.status(500).json({ error: "Error al generar reporte" });
    }
  });

  // ============= ARRIME EXCEL IMPORT =============
  app.post("/api/arrime/check-remesas", async (req, res) => {
    try {
      const { remesas, central } = req.body;
      if (!Array.isArray(remesas) || remesas.length === 0) {
        return res.json({ duplicates: [] });
      }
      const remesaStrs = Array.from(new Set(remesas.map((r: any) => String(r).trim()).filter((r: string) => r && r !== "0")));
      if (remesaStrs.length === 0) {
        return res.json({ duplicates: [] });
      }
      const inList = sql.join(remesaStrs.map(r => sql`${r}`), sql`, `);
      let query;
      if (central) {
        query = sql`SELECT DISTINCT remesa FROM arrime WHERE remesa IS NOT NULL AND remesa != '' AND remesa != '0' AND central = ${central} AND remesa IN (${inList})`;
      } else {
        query = sql`SELECT DISTINCT remesa FROM arrime WHERE remesa IS NOT NULL AND remesa != '' AND remesa != '0' AND remesa IN (${inList})`;
      }
      const result = await db.execute(query);
      const duplicates = (result.rows as any[]).map(r => String(r.remesa));
      res.json({ duplicates });
    } catch (error) {
      console.error("Error al verificar remesas:", error);
      res.status(500).json({ error: "Error al verificar remesas" });
    }
  });

  app.post("/api/arrime/import", async (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron registros" });
      }

      const camposExcluidosArrime = ["propietario", "id", "fecha", "secuencia"];
      const processed: { record: any; originalIndex: number; fechaKey: string }[] = [];

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        for (const key of Object.keys(r)) {
          if (typeof r[key] === "string" && !camposExcluidosArrime.includes(key) && !key.startsWith("_")) {
            r[key] = r[key].toLowerCase();
          }
        }
        if (r.central && r.central === "palmar") {
          r.nucleocorte = "1013";
          r.boleto = r.remesa;
          r.nucleotransporte = r.nucleocorte;
        }
        const fechaKey = (r.fecha || '').substring(0, 10);
        processed.push({ record: r, originalIndex: i, fechaKey });
      }

      processed.sort((a, b) => {
        if (a.fechaKey < b.fechaKey) return -1;
        if (a.fechaKey > b.fechaKey) return 1;
        return a.originalIndex - b.originalIndex;
      });

      const secByDate: Record<string, number> = {};
      for (const p of processed) {
        if (!secByDate[p.fechaKey]) {
          const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM arrime WHERE LEFT(fecha, 10) = ${p.fechaKey}`);
          secByDate[p.fechaKey] = ((sr.rows[0] as any)?.max_sec || 0);
        }
        secByDate[p.fechaKey]++;
        p.record.secuencia = secByDate[p.fechaKey];
      }

      const sortedRecords = processed.map(p => p.record);
      const imported = await storage.createArrimeBatch(sortedRecords);

      broadcast("arrime_updated");
      res.json({ imported, total: records.length });
    } catch (error) {
      console.error("Error importing arrime data:", error);
      res.status(500).json({ error: "Error al importar datos de arrime" });
    }
  });

  app.post("/api/arrime/lowercase", async (_req, res) => {
    try {
      const textCols = ["finca", "chofer", "remesa", "boleto", "proveedor", "placa", "central", "codigofinca", "empresa", "horaentrada", "horasalida", "nucleocorte", "nucleotransporte", "operador", "remesero", "tractorista", "horainiciocarga", "horafinalizacarga"];
      const setClauses = textCols.map(c => `${c} = LOWER(${c})`).join(", ");
      const whereConditions = textCols.map(c => `${c} != LOWER(${c})`).join(" OR ");
      const result = await db.execute(sql.raw(`UPDATE arrime SET ${setClauses} WHERE ${whereConditions}`));
      const updated = (result as any).rowCount || 0;
      broadcast("arrime_updated");
      res.json({ ok: true, updated });
    } catch (error) {
      console.error("Error converting arrime to lowercase:", error);
      res.status(500).json({ ok: false, error: "Error al convertir a minúsculas" });
    }
  });

  app.post("/api/herramientas/limpiar-horas-fecha", async (_req, res) => {
    try {
      const tablas = ["bancos", "administracion", "cosecha", "almacen", "transferencias", "arrime", "agronomia", "reparaciones", "bitacora"];
      let totalUpdated = 0;
      const resultados: { tabla: string; updated: number }[] = [];
      for (const tabla of tablas) {
        const result = await db.execute(sql.raw(`UPDATE ${tabla} SET fecha = LEFT(fecha, 10) WHERE LENGTH(fecha) > 10`));
        const updated = (result as any).rowCount || 0;
        totalUpdated += updated;
        resultados.push({ tabla, updated });
        if (updated > 0) broadcast(`${tabla}_updated`);
      }
      serverLog("INFO", `limpiar-horas-fecha: ${totalUpdated} registros actualizados en ${tablas.length} tablas`);
      res.json({ ok: true, tablas: resultados, totalUpdated });
    } catch (error) {
      serverLog("ERROR", `limpiar-horas-fecha: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post("/api/herramientas/arreglar-relaciones", async (_req, res) => {
    try {
      let codrelPoblados = 0;
      let inconsistenciasReparadas = 0;

      const bancosRelSinCodrel = await db.execute(sql`
        SELECT b.id FROM bancos b
        WHERE b.relacionado = true AND (b.codrel IS NULL OR b.codrel = '')
      `);
      for (const row of bancosRelSinCodrel.rows as any[]) {
        const adminMatch = await db.execute(sql`
          SELECT id FROM administracion WHERE codrel = ${row.id} LIMIT 1
        `);
        if (adminMatch.rows.length > 0) {
          await db.execute(sql`UPDATE bancos SET codrel = ${(adminMatch.rows[0] as any).id} WHERE id = ${row.id}`);
          codrelPoblados++;
        }
      }

      const bancosInvalidCodrel = await db.execute(sql`
        SELECT b.id, b.codrel FROM bancos b
        WHERE b.codrel IS NOT NULL AND b.codrel != ''
        AND NOT EXISTS (SELECT 1 FROM administracion a WHERE a.id = b.codrel)
      `);
      for (const row of bancosInvalidCodrel.rows as any[]) {
        const otherAdmins = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM administracion WHERE codrel = ${row.id}`);
        if (((otherAdmins.rows[0] as any)?.cnt || 0) === 0) {
          await db.execute(sql`UPDATE bancos SET codrel = NULL, relacionado = false WHERE id = ${row.id}`);
        } else {
          await db.execute(sql`UPDATE bancos SET codrel = NULL WHERE id = ${row.id}`);
        }
        inconsistenciasReparadas++;
      }

      const adminsInvalidCodrel = await db.execute(sql`
        SELECT a.id, a.codrel FROM administracion a
        WHERE a.codrel IS NOT NULL AND a.codrel != ''
        AND NOT EXISTS (SELECT 1 FROM bancos b WHERE b.id = a.codrel)
      `);
      for (const row of adminsInvalidCodrel.rows as any[]) {
        const otherBancos = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM bancos WHERE codrel = ${row.id}`);
        if (((otherBancos.rows[0] as any)?.cnt || 0) === 0) {
          await db.execute(sql`UPDATE administracion SET codrel = NULL, relacionado = false WHERE id = ${row.id}`);
        } else {
          await db.execute(sql`UPDATE administracion SET codrel = NULL WHERE id = ${row.id}`);
        }
        inconsistenciasReparadas++;
      }

      const bancosConCodrelNoRelacionado = await db.execute(sql`
        UPDATE bancos SET relacionado = true
        WHERE (codrel IS NOT NULL AND codrel != '') AND (relacionado IS NULL OR relacionado = false)
        RETURNING id
      `);
      inconsistenciasReparadas += (bancosConCodrelNoRelacionado as any).rowCount || 0;

      const adminsConCodrelNoRelacionado = await db.execute(sql`
        UPDATE administracion SET relacionado = true
        WHERE (codrel IS NOT NULL AND codrel != '') AND (relacionado IS NULL OR relacionado = false)
        RETURNING id
      `);
      inconsistenciasReparadas += (adminsConCodrelNoRelacionado as any).rowCount || 0;

      const bancosConAdminsApuntando = await db.execute(sql`
        UPDATE bancos SET relacionado = true
        WHERE (relacionado IS NULL OR relacionado = false)
        AND EXISTS (SELECT 1 FROM administracion WHERE codrel = bancos.id)
        RETURNING id
      `);
      inconsistenciasReparadas += (bancosConAdminsApuntando as any).rowCount || 0;

      const adminsConBancosApuntando = await db.execute(sql`
        UPDATE administracion SET relacionado = true
        WHERE (relacionado IS NULL OR relacionado = false)
        AND EXISTS (SELECT 1 FROM bancos WHERE codrel = administracion.id)
        RETURNING id
      `);
      inconsistenciasReparadas += (adminsConBancosApuntando as any).rowCount || 0;

      let agroAlmCodrelPoblados = 0;
      let agroAlmInconsistencias = 0;

      const agroRelSinCodrel = await db.execute(sql`
        SELECT a.id FROM agronomia a
        WHERE a.relacionado = true AND (a.codrel IS NULL OR a.codrel = '')
      `);
      for (const row of agroRelSinCodrel.rows as any[]) {
        const almMatch = await db.execute(sql`
          SELECT id FROM almacen WHERE codrel = ${row.id} LIMIT 1
        `);
        if (almMatch.rows.length > 0) {
          await db.execute(sql`UPDATE agronomia SET codrel = ${(almMatch.rows[0] as any).id} WHERE id = ${row.id}`);
          agroAlmCodrelPoblados++;
        }
      }

      const agroInvalidCodrel = await db.execute(sql`
        SELECT a.id, a.codrel FROM agronomia a
        WHERE a.codrel IS NOT NULL AND a.codrel != ''
        AND NOT EXISTS (SELECT 1 FROM almacen al WHERE al.id = a.codrel)
      `);
      for (const row of agroInvalidCodrel.rows as any[]) {
        const otherAlm = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM almacen WHERE codrel = ${row.id}`);
        if (((otherAlm.rows[0] as any)?.cnt || 0) === 0) {
          await db.execute(sql`UPDATE agronomia SET codrel = NULL, relacionado = false WHERE id = ${row.id}`);
        } else {
          await db.execute(sql`UPDATE agronomia SET codrel = NULL WHERE id = ${row.id}`);
        }
        agroAlmInconsistencias++;
      }

      const almInvalidCodrel = await db.execute(sql`
        SELECT al.id, al.codrel FROM almacen al
        WHERE al.codrel IS NOT NULL AND al.codrel != ''
        AND NOT EXISTS (SELECT 1 FROM agronomia a WHERE a.id = al.codrel)
      `);
      for (const row of almInvalidCodrel.rows as any[]) {
        const otherAgro = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM agronomia WHERE codrel = ${row.id}`);
        if (((otherAgro.rows[0] as any)?.cnt || 0) === 0) {
          await db.execute(sql`UPDATE almacen SET codrel = NULL, relacionado = false WHERE id = ${row.id}`);
        } else {
          await db.execute(sql`UPDATE almacen SET codrel = NULL WHERE id = ${row.id}`);
        }
        agroAlmInconsistencias++;
      }

      const agroConCodrelNoRel = await db.execute(sql`
        UPDATE agronomia SET relacionado = true
        WHERE (codrel IS NOT NULL AND codrel != '') AND (relacionado IS NULL OR relacionado = false)
        RETURNING id
      `);
      agroAlmInconsistencias += (agroConCodrelNoRel as any).rowCount || 0;

      const almConCodrelNoRel = await db.execute(sql`
        UPDATE almacen SET relacionado = true
        WHERE (codrel IS NOT NULL AND codrel != '') AND (relacionado IS NULL OR relacionado = false)
        RETURNING id
      `);
      agroAlmInconsistencias += (almConCodrelNoRel as any).rowCount || 0;

      const almConAgroApuntando = await db.execute(sql`
        UPDATE almacen SET relacionado = true
        WHERE (relacionado IS NULL OR relacionado = false)
        AND EXISTS (SELECT 1 FROM agronomia WHERE codrel = almacen.id)
        RETURNING id
      `);
      agroAlmInconsistencias += (almConAgroApuntando as any).rowCount || 0;

      const agroConAlmApuntando = await db.execute(sql`
        UPDATE agronomia SET relacionado = true
        WHERE (relacionado IS NULL OR relacionado = false)
        AND EXISTS (SELECT 1 FROM almacen WHERE codrel = agronomia.id)
        RETURNING id
      `);
      agroAlmInconsistencias += (agroConAlmApuntando as any).rowCount || 0;

      serverLog("INFO", `arreglar-relaciones: bancos-admin codrelPoblados=${codrelPoblados}, inconsistenciasReparadas=${inconsistenciasReparadas}; agro-alm codrelPoblados=${agroAlmCodrelPoblados}, inconsistencias=${agroAlmInconsistencias}`);
      broadcast("bancos_updated");
      broadcast("administracion_updated");
      broadcast("almacen_updated");
      broadcast("agronomia_updated");
      res.json({ ok: true, codrelPoblados, inconsistenciasReparadas, agroAlmCodrelPoblados, agroAlmInconsistencias });
    } catch (error) {
      serverLog("ERROR", `arreglar-relaciones: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post("/api/herramientas/corregir-mayusculas", async (_req, res) => {
    try {
      const tablesResult = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
      const tables = tablesResult.rows.map((r: any) => r.tablename);
      const skipColumns = new Set(["id", "propietario", "codrel"]);
      let tablasCorregidas = 0;
      let registrosCorregidos = 0;

      for (const table of tables) {
        const colsResult = await db.execute(sql`
          SELECT column_name FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = ${table} 
          AND data_type IN ('text', 'character varying')
        `);
        const cols = colsResult.rows
          .map((r: any) => r.column_name)
          .filter((c: string) => !skipColumns.has(c));

        if (cols.length === 0) continue;

        let tableUpdated = false;
        for (const col of cols) {
          const result = await db.execute(sql.raw(
            `UPDATE "${table}" SET "${col}" = LOWER("${col}") WHERE "${col}" IS DISTINCT FROM LOWER("${col}")`
          ));
          const count = (result as any).rowCount || 0;
          if (count > 0) {
            registrosCorregidos += count;
            tableUpdated = true;
          }
        }
        if (tableUpdated) tablasCorregidas++;
      }

      serverLog("INFO", `corregir-mayusculas: ${tablasCorregidas} tablas, ${registrosCorregidos} registros corregidos`);
      res.json({ ok: true, tablasCorregidas, registrosCorregidos });
    } catch (error) {
      serverLog("ERROR", `corregir-mayusculas: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post("/api/herramientas/importar-clientes-agrodata", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "No se proporcionó archivo" });
      }
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      let insertados = 0;
      let actualizados = 0;
      let omitidos = 0;

      for (const row of rows) {
        const nombre = ((row["Nombre"] || row["nombre"] || "").toString().trim().toLowerCase());
        if (!nombre) { omitidos++; continue; }

        const usuario = ((row["Usuario"] || row["usuario"] || "").toString().trim().toLowerCase());
        const direccion = ((row["Dirección"] || row["Direccion"] || row["direccion"] || "").toString().trim().toLowerCase());
        const ip = ((row["Ip"] || row["ip"] || row["IP"] || "").toString().trim());
        const estado = ((row["Estado"] || row["estado"] || "").toString().trim().toLowerCase());
        const plan = ((row["Plan Internet"] || row["plan internet"] || row["Plan"] || "").toString().trim().toLowerCase());
        const zona = ((row["Zona"] || row["zona"] || "").toString().trim().toLowerCase());
        const cedula = ((row["DNI/C.I./C.C./IFE"] || row["cedula"] || row["Cedula"] || "").toString().trim().toLowerCase());
        const telefono = ((row["Telefono"] || row["telefono"] || row["Teléfono"] || "").toString().trim());
        const saldo = parseFloat(row["Saldo"] || row["saldo"] || "0") || 0;
        const fechainstalacion = ((row["Fecha Instalación"] || row["Fecha Instalacion"] || row["fechainstalacion"] || "").toString().trim().toLowerCase());
        const estadofacturas = ((row["Estado Facturas"] || row["estadofacturas"] || "").toString().trim().toLowerCase());
        const diacorte = ((row["Día de Corte"] || row["Dia de Corte"] || row["diacorte"] || "").toString().trim().toLowerCase());
        const pagospendientes = ((row["Pagos Pendientes"] || row["pagospendientes"] || "").toString().trim().toLowerCase());
        const pagosrealizados = ((row["Pagos Realizados"] || row["pagosrealizados"] || "").toString().trim().toLowerCase());

        const existing = await db.execute(sql`SELECT id FROM agrodata WHERE LOWER(TRIM(nombre)) = ${nombre} LIMIT 1`);
        const existingRows = (existing as any).rows || [];

        if (existingRows.length > 0) {
          await db.execute(sql`UPDATE agrodata SET
            usuario = ${usuario}, direccion = ${direccion}, ip = ${ip}, estado = ${estado},
            plan = ${plan}, zona = ${zona}, cedula = ${cedula}, telefono = ${telefono},
            saldo = ${saldo}, fechainstalacion = ${fechainstalacion}, estadofacturas = ${estadofacturas},
            diacorte = ${diacorte}, pagospendientes = ${pagospendientes}, pagosrealizados = ${pagosrealizados}
            WHERE id = ${existingRows[0].id}`);
          actualizados++;
        } else {
          await db.execute(sql`INSERT INTO agrodata (id, nombre, usuario, direccion, ip, estado, plan, zona, cedula, telefono, saldo, fechainstalacion, estadofacturas, diacorte, pagospendientes, pagosrealizados)
            VALUES (gen_random_uuid(), ${nombre}, ${usuario}, ${direccion}, ${ip}, ${estado}, ${plan}, ${zona}, ${cedula}, ${telefono}, ${saldo}, ${fechainstalacion}, ${estadofacturas}, ${diacorte}, ${pagospendientes}, ${pagosrealizados})`);
          insertados++;
        }
      }

      broadcast("agrodata_updated");
      serverLog("INFO", `importar-clientes-agrodata: ${rows.length} filas, ${insertados} insertados, ${actualizados} actualizados, ${omitidos} omitidos`);
      res.json({ ok: true, total: rows.length, insertados, actualizados, omitidos });
    } catch (error) {
      serverLog("ERROR", `importar-clientes-agrodata: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post("/api/herramientas/migrar-proveedores-personal", async (_req, res) => {
    try {
      const r1 = await db.execute(sql`UPDATE parametros SET cuenta = descripcion WHERE tipo IN ('proveedores','personal') AND descripcion IS NOT NULL AND descripcion != '' AND (cuenta IS NULL OR cuenta = '')`);
      const r2 = await db.execute(sql`UPDATE parametros SET correo = operador WHERE tipo IN ('proveedores','personal') AND operador IS NOT NULL AND operador != '' AND (correo IS NULL OR correo = '')`);
      const r3 = await db.execute(sql`UPDATE parametros SET descripcion = NULL WHERE tipo IN ('proveedores','personal') AND cuenta IS NOT NULL AND cuenta != '' AND descripcion = cuenta`);
      const r4 = await db.execute(sql`UPDATE parametros SET operador = NULL WHERE tipo IN ('proveedores','personal') AND correo IS NOT NULL AND correo != '' AND operador = correo`);
      const cuentasMigradas = (r1 as any).rowCount || 0;
      const correosMigrados = (r2 as any).rowCount || 0;
      const descLimpiadas = (r3 as any).rowCount || 0;
      const operLimpiados = (r4 as any).rowCount || 0;
      serverLog("INFO", `migrar-proveedores-personal: cuentas=${cuentasMigradas}, correos=${correosMigrados}, desc_limpiadas=${descLimpiadas}, oper_limpiados=${operLimpiados}`);
      broadcast("parametros_updated");
      res.json({ ok: true, cuentasMigradas, correosMigrados, descLimpiadas, operLimpiados });
    } catch (error) {
      serverLog("ERROR", `migrar-proveedores-personal: ${error}`);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post("/api/herramientas/importar-direcciones-dbf", upload.single("file"), async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      if (!req.file) {
        sendSSE({ phase: "error", detail: "No se proporcionó archivo" });
        res.end();
        return;
      }

      sendSSE({ phase: "reading", detail: "Leyendo archivo DBF...", progress: 5 });

      const { DBFFile } = await import('dbffile');
      const os = await import('os');
      const tmpPath = path.join(os.tmpdir(), `direcciones-${Date.now()}.dbf`);
      fs.writeFileSync(tmpPath, req.file.buffer);
      const dbf = await DBFFile.open(tmpPath);
      const records = await dbf.readRecords();
      fs.unlinkSync(tmpPath);

      const totalLeidos = records.length;
      sendSSE({ phase: "reading", detail: `Archivo leído: ${totalLeidos} registros encontrados`, progress: 10 });

      if (totalLeidos === 0) {
        sendSSE({ phase: "complete", detail: "El archivo DBF está vacío (0 registros)", progress: 100, totalLeidos: 0, personalCount: 0, proveedoresCount: 0, actualizados: 0, noEncontrados: 0, omitidos: 0 });
        res.end();
        return;
      }

      let personalCount = 0;
      let proveedoresCount = 0;
      let actualizados = 0;
      let sinCambios = 0;
      let noEncontrados = 0;
      let omitidos = 0;

      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        const clase = ((rec as any).CLASE || (rec as any).clase || "").toString().toLowerCase().trim();
        const nombre = ((rec as any).NOMBRE || (rec as any).nombre || "").toString().toLowerCase().trim();
        const direccion = ((rec as any).DIRECCION || (rec as any).direccion || (rec as any).DIRECCIO || (rec as any).direccio || "").toString().trim();
        const cuenta = ((rec as any).DESCRIPCIO || (rec as any).descripcio || "").toString().trim();
        const cedula = ((rec as any).CEDULA || (rec as any).cedula || "").toString().trim();
        const operador = ((rec as any).OPERADOR || (rec as any).operador || "").toString().trim();
        const telefono = ((rec as any).TELEFONO || (rec as any).telefono || "").toString().trim();

        const progressPercent = 10 + ((i + 1) / totalLeidos) * 85;

        if (!nombre) {
          omitidos++;
          sendSSE({ phase: "skipped", detail: `Registro ${i + 1}/${totalLeidos}: omitido (sin nombre)`, current: i + 1, total: totalLeidos, progress: progressPercent });
          continue;
        }

        let sqlTipo = "";
        if (clase === "personal") { sqlTipo = "personal"; personalCount++; }
        else if (clase === "proveedores") { sqlTipo = "proveedores"; proveedoresCount++; }
        else {
          omitidos++;
          sendSSE({ phase: "skipped", detail: `Registro ${i + 1}/${totalLeidos}: omitido (clase "${clase}" no válida)`, current: i + 1, total: totalLeidos, progress: progressPercent });
          continue;
        }

        if (!direccion && !cuenta && !cedula && !operador && !telefono) {
          omitidos++;
          sendSSE({ phase: "skipped", detail: `Registro ${i + 1}/${totalLeidos}: [${sqlTipo}] ${nombre} → sin datos para actualizar`, current: i + 1, total: totalLeidos, progress: progressPercent });
          continue;
        }

        const existing = await db.execute(sql`SELECT descripcion, cuenta, ced_rif, correo, telefono FROM parametros WHERE tipo = ${sqlTipo} AND LOWER(TRIM(nombre)) = ${nombre} LIMIT 1`);
        const rows = (existing as any).rows || [];
        if (rows.length === 0) {
          noEncontrados++;
          sendSSE({ phase: "not_found", detail: `Registro ${i + 1}/${totalLeidos}: [${sqlTipo}] ${nombre} → no encontrado en BD`, current: i + 1, total: totalLeidos, progress: progressPercent });
          continue;
        }

        const current = rows[0];
        const norm = (v: any) => (v || "").toString().trim();
        const updates: string[] = [];

        if (direccion && norm(current.descripcion) !== direccion) {
          updates.push(`beneficiario: ${direccion}`);
        }
        if (cuenta && norm(current.cuenta) !== cuenta) {
          updates.push(`cuenta: ${cuenta}`);
        }
        if (cedula && norm(current.ced_rif) !== cedula) {
          updates.push(`ced_rif: ${cedula}`);
        }
        if (operador && norm(current.correo) !== operador) {
          updates.push(`correo: ${operador}`);
        }
        if (telefono && norm(current.telefono) !== telefono) {
          updates.push(`teléfono: ${telefono}`);
        }

        if (updates.length === 0) {
          sinCambios++;
          sendSSE({ phase: "unchanged", detail: `Registro ${i + 1}/${totalLeidos}: [${sqlTipo}] ${nombre} → sin cambios`, current: i + 1, total: totalLeidos, progress: progressPercent });
          continue;
        }

        const newDescripcion = direccion || norm(current.descripcion) || null;
        const newCuenta = cuenta || norm(current.cuenta) || null;
        const newCedRif = cedula || norm(current.ced_rif) || null;
        const newCorreo = operador || norm(current.correo) || null;
        const newTelefono = telefono || norm(current.telefono) || null;

        const result = await db.execute(sql`UPDATE parametros SET descripcion = ${newDescripcion}, cuenta = ${newCuenta}, ced_rif = ${newCedRif}, correo = ${newCorreo}, telefono = ${newTelefono} WHERE tipo = ${sqlTipo} AND LOWER(TRIM(nombre)) = ${nombre}`);
        const rowCount = (result as any).rowCount || 0;
        if (rowCount > 0) {
          actualizados += rowCount;
          sendSSE({ phase: "updated", detail: `Registro ${i + 1}/${totalLeidos}: [${sqlTipo}] ${nombre} → ${updates.join(", ")}`, current: i + 1, total: totalLeidos, progress: progressPercent });
        }
      }

      serverLog("INFO", `importar-direcciones-dbf: leidos=${totalLeidos}, personal=${personalCount}, proveedores=${proveedoresCount}, actualizados=${actualizados}, sinCambios=${sinCambios}, noEncontrados=${noEncontrados}`);
      broadcast("parametros_updated");
      sendSSE({ phase: "complete", detail: `Completado: ${totalLeidos} leídos, ${personalCount} personal, ${proveedoresCount} proveedores, ${actualizados} actualizados, ${sinCambios} sin cambios, ${noEncontrados} no encontrados`, progress: 100, totalLeidos, personalCount, proveedoresCount, actualizados, sinCambios, noEncontrados, omitidos });
      res.end();
    } catch (error) {
      serverLog("ERROR", `importar-direcciones-dbf: ${error}`);
      sendSSE({ phase: "error", detail: `Error: ${String(error)}` });
      res.end();
    }
  });

  // ============= BACKUP ENDPOINTS =============
  const BACKUP_DIR = path.join(process.cwd(), "backups");
  const BACKUP_TEMP_DIR = path.join(BACKUP_DIR, "temp");

  app.get("/api/backups", (_req, res) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        return res.json({ backups: [] });
      }
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith(".zip"))
        .map(f => {
          const stat = fs.statSync(path.join(BACKUP_DIR, f));
          return { filename: f, size: stat.size, date: stat.mtime.toISOString() };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
      res.json({ backups: files });
    } catch (error) {
      console.error("Error al listar respaldos:", error);
      res.status(500).json({ error: "Error al listar respaldos" });
    }
  });

  async function restoreFromZip(
    zip: AdmZip,
    res: import("express").Response,
    label: string,
    onlyTable?: string
  ) {
    const send = (phase: string, detail: string, progress: number, extra?: Record<string, any>) => {
      res.write(`data: ${JSON.stringify({ phase, detail, progress, ...extra })}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();
    };

    try {
      send("extracting", `Abriendo ${label}...`, 5);
      let entries = zip.getEntries().filter(e => e.entryName.endsWith(".json"));

      if (onlyTable) {
        entries = entries.filter(e => e.entryName.replace(".json", "") === onlyTable);
        if (entries.length === 0) {
          send("error", `La tabla "${onlyTable}" no se encontró en el respaldo`, 0);
          return res.end();
        }
      }

      if (entries.length === 0) {
        send("error", "El archivo ZIP no contiene archivos JSON", 0);
        return res.end();
      }

      const validTablesResult = await pool.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      );
      const validTables = new Set(validTablesResult.rows.map((r: any) => r.tablename));

      send("extracting", `Encontradas ${entries.length} tablas en el respaldo`, 10);
      let restored = 0;

      for (const entry of entries) {
        const tableName = entry.entryName.replace(".json", "");
        const progressPct = 10 + ((restored / entries.length) * 85);

        if (!validTables.has(tableName)) {
          send("table_error", `${tableName}: tabla no existe en la base de datos, omitida`, progressPct, { table: tableName });
          restored++;
          continue;
        }

        send("restoring", `Restaurando tabla: ${tableName}`, progressPct, { table: tableName });

        try {
          const jsonData = JSON.parse(entry.getData().toString("utf-8"));
          if (!Array.isArray(jsonData)) {
            send("table_error", `${tableName}: datos inválidos (no es un array)`, progressPct);
            restored++;
            continue;
          }

          await pool.query(`DELETE FROM "${tableName}"`);

          if (jsonData.length > 0) {
            const columns = Object.keys(jsonData[0]);
            const batchSize = 100;
            for (let i = 0; i < jsonData.length; i += batchSize) {
              const batch = jsonData.slice(i, i + batchSize);
              const values: any[] = [];
              const valuePlaceholders = batch.map((row: any, batchIdx: number) => {
                const rowPlaceholders = columns.map((col, colIdx) => {
                  values.push(row[col] ?? null);
                  return `$${batchIdx * columns.length + colIdx + 1}`;
                });
                return `(${rowPlaceholders.join(", ")})`;
              });

              const quotedColumns = columns.map(c => `"${c}"`).join(", ");
              await pool.query(
                `INSERT INTO "${tableName}" (${quotedColumns}) VALUES ${valuePlaceholders.join(", ")}`,
                values
              );
            }
          }

          send("table_done", `${tableName}: ${jsonData.length} registros restaurados`, progressPct, { table: tableName, records: jsonData.length });
        } catch (tableError: any) {
          send("table_error", `${tableName}: ${tableError.message}`, progressPct, { table: tableName });
        }
        restored++;
      }

      send("complete", `Restauración completada: ${restored} tablas procesadas`, 100);
      res.end();
    } catch (error: any) {
      send("error", `Error al restaurar: ${error.message}`, 0);
      res.end();
    }
  }

  app.post("/api/backup/restore/:filename", async (req, res) => {
    req.setTimeout(0);
    res.setTimeout(0);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const filename = req.params.filename;
    if (filename.includes("..") || filename.includes("/")) {
      res.write(`data: ${JSON.stringify({ phase: "error", detail: "Nombre de archivo inválido", progress: 0 })}\n\n`);
      return res.end();
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      res.write(`data: ${JSON.stringify({ phase: "error", detail: "Archivo no encontrado en el servidor", progress: 0 })}\n\n`);
      return res.end();
    }

    const onlyTable = req.query.table as string | undefined;
    const zip = new AdmZip(filePath);
    await restoreFromZip(zip, res, filename, onlyTable);
  });

  app.get("/api/backup/tables/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      if (filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({ error: "Nombre de archivo inválido" });
      }
      const filePath = path.join(BACKUP_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      const zip = new AdmZip(filePath);
      const tables = zip.getEntries()
        .filter(e => e.entryName.endsWith(".json"))
        .map(e => e.entryName.replace(".json", ""))
        .sort();
      res.json({ tables });
    } catch (error) {
      console.error("Error al listar tablas del respaldo:", error);
      res.status(500).json({ error: "Error al leer el respaldo" });
    }
  });

  app.post("/api/backup/tables-upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se recibió archivo" });
      }
      const zip = new AdmZip(req.file.buffer);
      const tables = zip.getEntries()
        .filter(e => e.entryName.endsWith(".json"))
        .map(e => e.entryName.replace(".json", ""))
        .sort();

      if (!fs.existsSync(BACKUP_TEMP_DIR)) {
        fs.mkdirSync(BACKUP_TEMP_DIR, { recursive: true });
      }
      const tempId = crypto.randomUUID();
      const tempPath = path.join(BACKUP_TEMP_DIR, `${tempId}.zip`);
      fs.writeFileSync(tempPath, req.file.buffer);
      setTimeout(() => {
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
      }, 10 * 60 * 1000);

      res.json({ tables, tempId });
    } catch (error) {
      console.error("Error al listar tablas del archivo:", error);
      res.status(500).json({ error: "Error al leer el archivo" });
    }
  });

  app.post("/api/backup/restore-upload", upload.single("file"), async (req, res) => {
    req.setTimeout(0);
    res.setTimeout(0);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (!req.file) {
      res.write(`data: ${JSON.stringify({ phase: "error", detail: "No se recibió archivo", progress: 0 })}\n\n`);
      return res.end();
    }

    const onlyTable = req.query.table as string | undefined;
    const zip = new AdmZip(req.file.buffer);
    await restoreFromZip(zip, res, req.file.originalname || "archivo subido", onlyTable);
  });

  app.post("/api/backup/restore-temp/:tempId", async (req, res) => {
    req.setTimeout(0);
    res.setTimeout(0);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const tempId = req.params.tempId;
    if (!tempId || tempId.includes("..") || tempId.includes("/") || tempId.includes("\\")) {
      res.write(`data: ${JSON.stringify({ phase: "error", detail: "ID temporal inválido", progress: 0 })}\n\n`);
      return res.end();
    }

    const tempPath = path.join(BACKUP_TEMP_DIR, `${tempId}.zip`);
    if (!fs.existsSync(tempPath)) {
      res.write(`data: ${JSON.stringify({ phase: "error", detail: "Archivo temporal no encontrado. Intente subir el archivo de nuevo.", progress: 0 })}\n\n`);
      return res.end();
    }

    try {
      const onlyTable = req.query.table as string | undefined;
      const zip = new AdmZip(tempPath);
      await restoreFromZip(zip, res, `archivo temporal`, onlyTable);
    } finally {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    }
  });

  app.post("/api/backup", async (req, res) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      const { name, username } = req.body || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "El nombre del respaldo es requerido" });
      }
      const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9áéíóúñü_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

      const tablesResult = await pool.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      );
      const tableNames: string[] = tablesResult.rows.map((r: any) => r.tablename);

      const zip = new AdmZip();

      for (const table of tableNames) {
        const dataResult = await pool.query(`SELECT * FROM "${table}"`);
        const jsonContent = JSON.stringify(dataResult.rows, null, 2);
        zip.addFile(`${table}.json`, Buffer.from(jsonContent, "utf-8"));
      }

      const loc = getLocalDate();
      const safeName = name ? sanitize(String(name)) : '';
      const safeUser = username ? sanitize(String(username)) : '';
      const parts = ['respaldo'];
      if (safeName) parts.push(safeName);
      parts.push(`${loc.dd}-${loc.mm}-${loc.aa}_${loc.hh}-${loc.mi}-${loc.ss}`);
      if (safeUser) parts.push(safeUser);
      const filename = parts.join('_') + '.zip';
      const filePath = path.join(BACKUP_DIR, filename);
      zip.writeZip(filePath);

      res.json({
        success: true,
        filename,
        tables: tableNames.length,
        downloadUrl: `/api/backup/download/${encodeURIComponent(filename)}`,
      });
    } catch (error) {
      console.error("Error al crear respaldo:", error);
      res.status(500).json({ error: "Error al crear respaldo" });
    }
  });

  app.get("/api/backup/download/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\") || !filename.endsWith(".zip")) {
        return res.status(400).json({ error: "Nombre de archivo inválido" });
      }
      const filePath = path.join(BACKUP_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/zip");
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error al descargar respaldo:", error);
      res.status(500).json({ error: "Error al descargar respaldo" });
    }
  });

  app.delete("/api/backup/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\") || !filename.endsWith(".zip")) {
        return res.status(400).json({ error: "Nombre de archivo inválido" });
      }
      const filePath = path.join(BACKUP_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      fs.unlinkSync(filePath);
      res.json({ success: true, message: `Respaldo ${filename} eliminado` });
    } catch (error) {
      console.error("Error al eliminar respaldo:", error);
      res.status(500).json({ error: "Error al eliminar respaldo" });
    }
  });

  // ===== BCV DOLAR =====
  app.get("/api/bcv-dolar", async (_req, res) => {
    try {
      const valor = await fetchTasaBcv();
      if (!valor || valor <= 0) {
        return res.status(500).json({ error: "No se pudo obtener la tasa del BCV" });
      }

      const { dd, mm, yyyy } = getLocalDate();
      const fechaIso = `${yyyy}-${mm}-${dd}`;

      const existing = await db.execute(
        sql`SELECT id FROM parametros WHERE tipo = 'dolar' AND fecha = ${fechaIso} LIMIT 1`
      );

      if (existing.rows.length === 0) {
        await db.execute(sql`
          INSERT INTO parametros (tipo, nombre, valor, fecha, unidad, propietario)
          VALUES ('dolar', 'bcv', ${String(valor)}, ${fechaIso}, 'todas', ${'sistema ' + `${dd}/${mm}/${yyyy} 00:00:00`})
        `);
        console.log(`[BCV] Tasa del dolar insertada via endpoint: ${valor} para ${dd}/${mm}/${yyyy}`);
      }

      res.json({ valor, fecha: `${dd}/${mm}/${yyyy}`, inserted: existing.rows.length === 0 });
    } catch (error: any) {
      console.error("Error al consultar BCV:", error);
      res.status(500).json({ error: "No se pudo obtener la tasa del BCV" });
    }
  });

  // ===== ENVIAR COMPROBANTES DE PAGO POR GMAIL =====
  app.post("/api/proveedores-correos", async (req, res) => {
    try {
      const { proveedores } = req.body as { proveedores: string[] };
      if (!Array.isArray(proveedores) || proveedores.length === 0) {
        return res.json({ correos: {} });
      }
      const result = await db.execute(
        sql`SELECT LOWER(nombre) as nombre, correo FROM parametros WHERE tipo = 'proveedores' AND correo IS NOT NULL AND correo != ''`
      );
      const correoMap: Record<string, string> = {};
      for (const row of result.rows as any[]) {
        correoMap[row.nombre] = row.correo;
      }
      res.json({ correos: correoMap });
    } catch (error: any) {
      console.error("Error obteniendo correos de proveedores:", error);
      res.status(500).json({ error: "Error al obtener correos" });
    }
  });

  app.post("/api/enviar-comprobantes-pago", async (req, res) => {
    try {
      const { pagos } = req.body as { pagos: PagoEmailData[] };
      if (!Array.isArray(pagos) || pagos.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron pagos" });
      }

      const pagosConCorreo = pagos.filter(p => p.correo && p.correo.trim() !== '');
      if (pagosConCorreo.length === 0) {
        return res.json({ enviados: 0, errores: 0, sinCorreo: pagos.length, detalle: [] });
      }

      let enviados = 0;
      let errores = 0;
      for (const pago of pagosConCorreo) {
        try {
          const result = await enviarComprobantePago(pago);
          if (result.success) {
            enviados++;
            try {
              await db.execute(
                sql`UPDATE transferencias SET ejecutada = true WHERE tipo = 'proveedores' AND LOWER(proveedor) = LOWER(${pago.proveedor}) AND nrofactura = ${pago.nroFactura} AND LOWER(unidad) = LOWER(${pago.unidad}) AND (ejecutada IS NULL OR ejecutada = false)`
              );
            } catch (dbErr: any) {
              console.error(`[GMAIL] Error actualizando ejecutada para ${pago.proveedor}: ${dbErr.message}`);
            }
          } else {
            errores++;
          }
        } catch (e: any) {
          errores++;
          console.error(`[GMAIL] Error enviando comprobante a ${pago.correo}: ${e.message}`);
        }
      }
      console.log(`[GMAIL] Proceso completado: ${enviados} enviados, ${errores} errores`);
      res.json({ enviados, errores, sinCorreo: pagos.length - pagosConCorreo.length });
    } catch (error: any) {
      console.error("Error en enviar comprobantes:", error);
      res.status(500).json({ error: "Error al enviar comprobantes" });
    }
  });

  app.get("/api/agronomia/related-almacen/:agronomiaId", async (req, res) => {
    try {
      const { agronomiaId } = req.params;
      const agroResult = await db.execute(sql`SELECT codrel FROM agronomia WHERE id = ${agronomiaId}`);
      const agroCodrel = (agroResult.rows[0] as any)?.codrel;
      let rows: any[] = [];
      const r1 = await db.execute(sql`SELECT * FROM almacen WHERE codrel = ${agronomiaId}`);
      rows = [...r1.rows];
      if (agroCodrel) {
        const r2 = await db.execute(sql`SELECT * FROM almacen WHERE id = ${agroCodrel}`);
        rows = [...rows, ...r2.rows];
      }
      const seen = new Set<string>();
      const unique = rows.filter((r: any) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      res.json(unique);
    } catch (error: any) {
      console.error("Error fetching related almacen:", error);
      res.status(500).json({ error: "Error al obtener registros de almacén relacionados" });
    }
  });

  app.get("/api/bancos/related-admin/:bancoId", async (req, res) => {
    try {
      const { bancoId } = req.params;
      const bancoResult = await db.execute(sql`SELECT codrel FROM bancos WHERE id = ${bancoId}`);
      const bancoCodrel = (bancoResult.rows[0] as any)?.codrel;
      let rows: any[] = [];
      const r1 = await db.execute(sql`SELECT * FROM administracion WHERE codrel = ${bancoId}`);
      rows = [...r1.rows];
      if (bancoCodrel) {
        const r2 = await db.execute(sql`SELECT * FROM administracion WHERE id = ${bancoCodrel}`);
        rows = [...rows, ...r2.rows];
      }
      const seen = new Set<string>();
      const unique = rows.filter((r: any) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      res.json({ data: unique });
    } catch (error: any) {
      console.error("Error fetching related admin:", error);
      res.status(500).json({ error: "Error al obtener registros relacionados" });
    }
  });

  app.get("/api/administracion/related-bancos/:adminId", async (req, res) => {
    try {
      const { adminId } = req.params;
      const adminResult = await db.execute(sql`SELECT codrel FROM administracion WHERE id = ${adminId}`);
      const adminCodrel = (adminResult.rows[0] as any)?.codrel;
      let rows: any[] = [];
      if (adminCodrel) {
        const r1 = await db.execute(sql`SELECT * FROM bancos WHERE id = ${adminCodrel}`);
        rows = [...r1.rows];
      }
      const r2 = await db.execute(sql`SELECT * FROM bancos WHERE codrel = ${adminId}`);
      rows = [...rows, ...r2.rows];
      const seen = new Set<string>();
      const unique = rows.filter((r: any) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      res.json({ data: unique });
    } catch (error: any) {
      console.error("Error fetching related bancos:", error);
      res.status(500).json({ error: "Error al obtener registros relacionados" });
    }
  });

  app.post("/api/romper-relacion", async (req, res) => {
    try {
      const { sourceTable, sourceId, targetTable, targetId } = req.body;
      if (!sourceTable || !sourceId || !targetTable || !targetId) {
        return res.status(400).json({ error: "Se requieren sourceTable, sourceId, targetTable, targetId" });
      }

      const allowedTables = ["bancos", "administracion", "agronomia", "almacen"];
      if (!allowedTables.includes(sourceTable) || !allowedTables.includes(targetTable)) {
        return res.status(400).json({ error: "Tabla no válida" });
      }

      const isBancosAdmin = (sourceTable === "bancos" && targetTable === "administracion") || (sourceTable === "administracion" && targetTable === "bancos");
      console.log("[romper-relacion]", { sourceTable, sourceId, targetTable, targetId, isBancosAdmin });

      if (isBancosAdmin) {
        const bancoId = sourceTable === "bancos" ? sourceId : targetId;
        const adminId = sourceTable === "administracion" ? sourceId : targetId;
        console.log("[romper-relacion] bancoId:", bancoId, "adminId:", adminId);
        await db.execute(sql`UPDATE administracion SET codrel = NULL WHERE id = ${adminId} AND codrel = ${bancoId}`);
        await db.execute(sql`UPDATE bancos SET codrel = NULL WHERE id = ${bancoId} AND codrel = ${adminId}`);
        const otherAdminsPointingToBanco = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM administracion WHERE codrel = ${bancoId}`);
        const bancoHasCodrel = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM bancos WHERE id = ${bancoId} AND codrel IS NOT NULL`);
        const bancoStillRelated = ((otherAdminsPointingToBanco.rows[0] as any)?.cnt || 0) > 0 || ((bancoHasCodrel.rows[0] as any)?.cnt || 0) > 0;
        if (!bancoStillRelated) {
          await db.execute(sql`UPDATE bancos SET relacionado = false WHERE id = ${bancoId}`);
        }
        const otherBancosPointingToAdmin = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM bancos WHERE codrel = ${adminId}`);
        const adminHasCodrel = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM administracion WHERE id = ${adminId} AND codrel IS NOT NULL`);
        const adminStillRelated = ((otherBancosPointingToAdmin.rows[0] as any)?.cnt || 0) > 0 || ((adminHasCodrel.rows[0] as any)?.cnt || 0) > 0;
        if (!adminStillRelated) {
          await db.execute(sql`UPDATE administracion SET relacionado = false WHERE id = ${adminId}`);
        }
      } else {
        const isAgroAlmacen = (sourceTable === "agronomia" && targetTable === "almacen") || (sourceTable === "almacen" && targetTable === "agronomia");
        if (isAgroAlmacen) {
          const agronomiaId = sourceTable === "agronomia" ? sourceId : targetId;
          const almacenId = sourceTable === "almacen" ? sourceId : targetId;
          await db.execute(sql`UPDATE almacen SET codrel = NULL WHERE id = ${almacenId} AND codrel = ${agronomiaId}`);
          await db.execute(sql`UPDATE agronomia SET codrel = NULL WHERE id = ${agronomiaId} AND codrel = ${almacenId}`);
          const otherAlmacenPointing = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM almacen WHERE codrel = ${agronomiaId}`);
          const agroHasCodrel = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM agronomia WHERE id = ${agronomiaId} AND codrel IS NOT NULL`);
          const agroStillRelated = ((otherAlmacenPointing.rows[0] as any)?.cnt || 0) > 0 || ((agroHasCodrel.rows[0] as any)?.cnt || 0) > 0;
          if (!agroStillRelated) {
            await db.execute(sql`UPDATE agronomia SET relacionado = false WHERE id = ${agronomiaId}`);
          }
          const otherAgroPointing = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM agronomia WHERE codrel = ${almacenId}`);
          const almHasCodrel = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM almacen WHERE id = ${almacenId} AND codrel IS NOT NULL`);
          const almStillRelated = ((otherAgroPointing.rows[0] as any)?.cnt || 0) > 0 || ((almHasCodrel.rows[0] as any)?.cnt || 0) > 0;
          if (!almStillRelated) {
            await db.execute(sql`UPDATE almacen SET relacionado = false WHERE id = ${almacenId}`);
          }
        }
      }

      const sourceResult = await db.execute(sql`SELECT relacionado FROM ${sql.raw(sourceTable)} WHERE id = ${sourceId}`);
      const targetResult = await db.execute(sql`SELECT relacionado FROM ${sql.raw(targetTable)} WHERE id = ${targetId}`);

      const broadcastMap: Record<string, string[]> = {
        "bancos-administracion": ["bancos_updated", "administracion_updated"],
        "administracion-bancos": ["bancos_updated", "administracion_updated"],
        "agronomia-almacen": ["agronomia_updated", "almacen_updated"],
        "almacen-agronomia": ["agronomia_updated", "almacen_updated"],
      };
      const key = `${sourceTable}-${targetTable}`;
      const broadcasts = broadcastMap[key] || [];
      for (const b of broadcasts) broadcast(b);

      return res.json({
        success: true,
        source: { id: sourceId, relacionado: (sourceResult.rows[0] as any)?.relacionado || false },
        target: { id: targetId, relacionado: (targetResult.rows[0] as any)?.relacionado || false },
      });
    } catch (error: any) {
      console.error("Error rompiendo relación:", error);
      res.status(500).json({ error: "Error al romper la relación" });
    }
  });

  app.get("/api/almacen/related-agronomia/:almacenId", async (req, res) => {
    try {
      const { almacenId } = req.params;
      const almResult = await db.execute(sql`SELECT codrel FROM almacen WHERE id = ${almacenId}`);
      const almCodrel = (almResult.rows[0] as any)?.codrel;
      let rows: any[] = [];
      if (almCodrel) {
        const r1 = await db.execute(sql`SELECT * FROM agronomia WHERE id = ${almCodrel}`);
        rows = [...r1.rows];
      }
      const r2 = await db.execute(sql`SELECT * FROM agronomia WHERE codrel = ${almacenId}`);
      rows = [...rows, ...r2.rows];
      const seen = new Set<string>();
      const unique = rows.filter((r: any) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      res.json(unique);
    } catch (error: any) {
      console.error("Error fetching related agronomia:", error);
      res.status(500).json({ error: "Error al obtener registros de agronomía relacionados" });
    }
  });

  // [BITACORA] Obtener entradas de bitácora con filtros opcionales
  app.get("/api/agronomia", async (req, res) => {
    try {
      const { unidad, fechaInicio, fechaFin, limit, offset } = req.query;

      const limitNum = limit ? parseInt(limit as string) : 100;
      const offsetNum = offset ? parseInt(offset as string) : 0;

      let whereClause = sql`WHERE 1=1`;
      if (unidad && unidad !== "all") {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;

      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "agronomia");
      whereClause = sql`${whereClause} ${advancedFilters}`;

      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM agronomia ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;

      const query = sql`SELECT * FROM agronomia ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);

      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      console.error("Error fetching agronomia:", error);
      res.status(500).json({ error: "Error al obtener agronomía" });
    }
  });

  app.get("/api/reparaciones", async (req, res) => {
    try {
      const { unidad, fechaInicio, fechaFin, limit, offset } = req.query;

      const limitNum = limit ? parseInt(limit as string) : 100;
      const offsetNum = offset ? parseInt(offset as string) : 0;

      let whereClause = sql`WHERE 1=1`;
      if (unidad && unidad !== "all") {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;

      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "reparaciones");
      whereClause = sql`${whereClause} ${advancedFilters}`;

      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM reparaciones ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;

      const query = sql`SELECT * FROM reparaciones ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);

      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      console.error("Error fetching reparaciones:", error);
      res.status(500).json({ error: "Error al obtener reparaciones" });
    }
  });

  app.get("/api/bitacora", async (req, res) => {
    try {
      const { unidad, fechaInicio, fechaFin, limit, offset } = req.query;

      const limitNum = limit ? parseInt(limit as string) : 100;
      const offsetNum = offset ? parseInt(offset as string) : 0;

      let whereClause = sql`WHERE 1=1`;
      if (unidad && unidad !== "all") {
        whereClause = sql`${whereClause} AND unidad = ${unidad}`;
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;

      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "bitacora");
      whereClause = sql`${whereClause} ${advancedFilters}`;

      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM bitacora ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;

      const query = sql`SELECT * FROM bitacora ${whereClause} ORDER BY LEFT(fecha, 10) DESC, secuencia DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const result = await db.execute(query);

      res.json({ data: result.rows, total, hasMore: total > offsetNum + (result.rows as any[]).length });
    } catch (error) {
      console.error("Error fetching bitacora:", error);
      res.status(500).json({ error: "Error al obtener entradas de bitácora" });
    }
  });

  // ============= GENERIC TABLE ENDPOINTS =============
  const tableOrderSQL: Record<string, string> = {
    agrodata: "ORDER BY nombre ASC",
    parametros: "ORDER BY tipo, nombre",
    almacen: "ORDER BY LEFT(fecha, 10) DESC, id DESC",
    cosecha: "ORDER BY LEFT(fecha, 10) DESC, id DESC",
    transferencias: "ORDER BY LEFT(fecha, 10) DESC, id DESC",
    administracion: "ORDER BY LEFT(fecha, 10) DESC, secuencia DESC",
    agronomia: "ORDER BY LEFT(fecha, 10) DESC, id DESC",
    reparaciones: "ORDER BY LEFT(fecha, 10) DESC, id DESC",
    bitacora: "ORDER BY LEFT(fecha, 10) DESC, id DESC",
    arrime: "ORDER BY LEFT(fecha, 10) DESC, id DESC",
    portal: "ORDER BY LEFT(fecha, 10) DESC, id DESC",
  };

  app.get("/api/:tableName", async (req, res) => {
    try {
      const { tableName } = req.params;
      const config = tableConfig[tableName];
      
      if (!config) {
        return res.status(404).json({ error: `Tabla '${tableName}' no encontrada` });
      }
      
      const hasFilters = VALID_TEXT_FILTER_FIELDS[tableName] || VALID_BOOLEAN_FILTER_FIELDS[tableName];
      
      if (config.hasPagination && hasFilters) {
        const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, tableName);
        const limitNum = parseInt(req.query.limit as string) || 100;
        const offsetNum = parseInt(req.query.offset as string) || 0;
        const orderClause = tableOrderSQL[tableName] || "ORDER BY id DESC";
        
        const whereClause = sql`WHERE 1=1 ${advancedFilters}`;
        const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.raw(tableName)} ${whereClause}`);
        const total = parseInt((countResult.rows[0] as any).count) || 0;
        
        const result = await db.execute(
          sql`SELECT * FROM ${sql.raw(tableName)} ${whereClause} ${sql.raw(orderClause)} LIMIT ${limitNum} OFFSET ${offsetNum}`
        );
        
        return res.json({
          data: result.rows,
          total,
          hasMore: offsetNum + result.rows.length < total
        });
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
      
      // Tablas que tienen campo fecha y necesitan normalización a yyyy-mm-dd
      const tablasConFecha = ["bancos", "administracion", "cosecha", "almacen", "transferencias", "arrime", "agronomia", "reparaciones", "bitacora"];
      const body = { ...req.body };
      
      // Auto-populate propietario con usuario + fecha/hora del servidor
      {
        const loc = getLocalDate();
        const username = extractUsername(body);
        body.propietario = `${username} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;
      }
      
      const tablasLowercase = ["bancos", "arrime"];
      if (tablasLowercase.includes(tableName)) {
        const camposExcluidos = ["propietario", "id", "fecha", "secuencia"];
        for (const key of Object.keys(body)) {
          if (typeof body[key] === "string" && !camposExcluidos.includes(key) && !key.startsWith("_")) {
            body[key] = body[key].toLowerCase();
          }
        }
      }
      
      if (tablasConFecha.includes(tableName)) {
        if (body.fecha) {
          const ddmmMatch = String(body.fecha).match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
          if (ddmmMatch) {
            const [, dd, mm, yy] = ddmmMatch;
            const yyyy = yy.length === 2 ? `20${yy}` : yy;
            body.fecha = `${yyyy}-${mm}-${dd}`;
          } else {
            body.fecha = body.fecha.substring(0, 10);
          }
        } else {
          const loc = getLocalDate();
          body.fecha = `${loc.yyyy}-${loc.mm}-${loc.dd}`;
        }
      }
      
      if (tablasConFecha.includes(tableName) && body.fecha) {
        const fechaDateGen = body.fecha.substring(0, 10);
        const fechaExpr = tableName === 'parametros' ? sql`fecha::text` : sql`LEFT(fecha, 10)`;
        const secGenR = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM ${sql.raw(tableName)} WHERE ${fechaExpr} = ${fechaDateGen}`);
        body.secuencia = ((secGenR.rows[0] as any)?.max_sec || 0) + 1;
      }

      // Auto-calcular resta para transferencias: resta = monto + prestamo - descuento
      if (tableName === "transferencias") {
        const monto = parseFloat(body.monto) || 0;
        const prestamo = parseFloat(body.prestamo) || 0;
        const descuento = parseFloat(body.descuento) || 0;
        body.resta = String(monto + prestamo - descuento);
      }
      
      // Auto-incrementar comprobante para transferencias
      if (tableName === "transferencias" && !body.comprobante) {
        const maxResult = await db.execute(sql`SELECT COALESCE(MAX(CAST(comprobante AS INTEGER)), 0) as max_numero FROM transferencias WHERE comprobante IS NOT NULL AND comprobante ~ '^[0-9]+$'`);
        const maxNumero = parseInt((maxResult.rows[0] as any).max_numero) || 0;
        body.comprobante = String(maxNumero + 1);
      }
      
      if (tableName === "bancos") {
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
              ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
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
        
        await logAudit("bancos", "insert", registroFinal.id || banco.id, null, registroFinal, extractUsername(body));
        broadcast("bancos_updated");
        return res.status(201).json(registroFinal);
      }
      
      // [ALMACEN] Recalcular existencia después de crear
      if (tableName === "almacen") {
        const registro = await config.create(body);
        
        if (registro.suministro) {
          const fechaNorm = normalizarFechaParaSQL(registro.fecha);
          await recalcularExistenciaAlmacen(registro.suministro, fechaNorm || undefined);
        }
        
        const registroActualizado = await db.execute(sql`SELECT * FROM almacen WHERE id = ${registro.id}`);
        const registroFinal = registroActualizado.rows[0] || registro;
        
        await logAudit("almacen", "insert", registroFinal.id || registro.id, null, registroFinal, extractUsername(body));
        broadcast("almacen_updated");
        return res.status(201).json(registroFinal);
      }
      
      const record = await config.create(body);
      await logAudit(tableName, "insert", (record as any).id, null, record, extractUsername(body));
      broadcast(`${tableName}_updated`);
      res.status(201).json(record);
    } catch (error) {
      console.error(`Error al crear en ${req.params.tableName}:`, error);
      res.status(500).json({ error: `Error al crear registro` });
    }
  });

  // ===== DEFAULTS (configuración de usuario) =====
  // IMPORTANTE: Estos endpoints deben estar ANTES del genérico /api/:tableName/:id
  
  // GET /api/defaults/:nombre - Obtener configuración del usuario
  app.get("/api/defaults/:nombre", async (req, res) => {
    try {
      const { nombre } = req.params;
      console.log("[DEFAULTS GET] Buscando:", nombre);
      const result = await db.select().from(defaults).where(eq(defaults.nombre, nombre));
      console.log("[DEFAULTS GET] Resultado:", JSON.stringify(result));
      
      // Evitar caché del navegador
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      
      if (result.length === 0) {
        console.log("[DEFAULTS GET] No encontrado, devolviendo valores vacíos");
        return res.json({ nombre, valores: {} });
      }
      console.log("[DEFAULTS GET] Devolviendo:", JSON.stringify(result[0]));
      res.json(result[0]);
    } catch (error) {
      console.error("Error al obtener defaults:", error);
      res.status(500).json({ error: "Error al obtener configuración" });
    }
  });
  
  // PUT /api/defaults/:nombre - Guardar/actualizar configuración del usuario
  app.put("/api/defaults/:nombre", async (req, res) => {
    console.log("[DEFAULTS PUT] nombre:", req.params.nombre);
    console.log("[DEFAULTS PUT] body:", JSON.stringify(req.body));
    try {
      const { nombre } = req.params;
      const { valores } = req.body;
      
      // Upsert: insertar o actualizar si ya existe
      await db.execute(sql`
        INSERT INTO defaults (nombre, valores)
        VALUES (${nombre}, ${JSON.stringify(valores)}::jsonb)
        ON CONFLICT (nombre) 
        DO UPDATE SET valores = ${JSON.stringify(valores)}::jsonb
      `);
      
      res.json({ success: true, nombre, valores });
    } catch (error) {
      console.error("Error al guardar defaults:", error);
      res.status(500).json({ error: "Error al guardar configuración" });
    }
  });

  app.put("/api/:tableName/:id", async (req, res) => {
    try {
      const { tableName, id } = req.params;
      const config = tableConfig[tableName];
      
      if (!config) {
        return res.status(404).json({ error: `Tabla '${tableName}' no encontrada` });
      }

      const auditPrevResult = await db.execute(sql`SELECT * FROM ${sql.raw(tableName)} WHERE id = ${id}`);
      const auditPrevRecord = auditPrevResult.rows[0] || null;
      
      const tablasLowercase = ["bancos", "arrime"];
      if (tablasLowercase.includes(tableName)) {
        const camposExcluidos = ["propietario", "id", "fecha", "secuencia"];
        for (const key of Object.keys(req.body)) {
          if (typeof req.body[key] === "string" && !camposExcluidos.includes(key) && !key.startsWith("_")) {
            req.body[key] = req.body[key].toLowerCase();
          }
        }
      }

      const tablasConFechaPut = ["administracion", "cosecha", "almacen", "transferencias", "arrime", "agronomia", "reparaciones", "bitacora"];
      let fechaAnteriorPut: string | null = null;
      if (tablasConFechaPut.includes(tableName) && req.body.fecha !== undefined) {
        const prevFechaR = await db.execute(sql`SELECT fecha FROM ${sql.raw(tableName)} WHERE id = ${id}`);
        fechaAnteriorPut = (prevFechaR.rows[0] as any)?.fecha || null;
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
        const cambioFecha = (fechaAnterior || '').substring(0, 10) !== (banco.fecha || '').substring(0, 10);
        if (cambioFecha) {
          const newDatePart = (banco.fecha || '').substring(0, 10);
          const secR = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM bancos WHERE LEFT(fecha, 10) = ${newDatePart} AND id != ${id}`);
          const newSec = ((secR.rows[0] as any)?.max_sec || 0) + 1;
          await db.execute(sql`UPDATE bancos SET secuencia = ${newSec} WHERE id = ${id}`);
        }
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
              ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
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
                ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
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
        if (body.codrel) {
          body.relacionado = true;
        }
        const prevResult = await db.execute(sql`SELECT tipo, cliente, proveedor, nrofactura, unidad FROM administracion WHERE id = ${id}`);
        const prev = prevResult.rows[0] as any;
        const record = await config.update(id, body);
        if (!record) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        if (body.codrel) {
          await db.execute(sql`UPDATE bancos SET relacionado = true WHERE id = ${body.codrel}`);
          broadcast("bancos_updated");
        }
        broadcast("administracion_updated");
        const rec = record as any;
        const tipoAfter = (rec.tipo || '').toLowerCase();
        if (tipoAfter === 'cuentasporcobrar' || tipoAfter === 'cuentasporpagar') {
          const persona = tipoAfter === 'cuentasporcobrar' ? (rec.cliente || '') : (rec.proveedor || '');
          await recalcularRestaCancelar(tipoAfter as any, persona || undefined, rec.nrofactura || undefined, rec.unidad || undefined);
        }
        if (prev) {
          const tipoBefore = (prev.tipo || '').toLowerCase();
          if (tipoBefore === 'cuentasporcobrar' || tipoBefore === 'cuentasporpagar') {
            const prevPersona = tipoBefore === 'cuentasporcobrar' ? (prev.cliente || '') : (prev.proveedor || '');
            const newPersona = tipoAfter === 'cuentasporcobrar' ? (rec.cliente || '') : (rec.proveedor || '');
            const groupChanged = tipoBefore !== tipoAfter || prevPersona !== newPersona || (prev.nrofactura || '') !== (rec.nrofactura || '') || (prev.unidad || '') !== (rec.unidad || '');
            if (groupChanged) {
              await recalcularRestaCancelar(tipoBefore as any, prevPersona || undefined, prev.nrofactura || undefined, prev.unidad || undefined);
            }
          }
        }
        if (fechaAnteriorPut && (rec.fecha || '').substring(0, 10) !== (fechaAnteriorPut || '').substring(0, 10)) {
          const ndp = (rec.fecha || '').substring(0, 10);
          const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM administracion WHERE LEFT(fecha, 10) = ${ndp} AND id != ${id}`);
          const ns = ((sr.rows[0] as any)?.max_sec || 0) + 1;
          await db.execute(sql`UPDATE administracion SET secuencia = ${ns} WHERE id = ${id}`);
          rec.secuencia = ns;
        }
        await logAudit("administracion", "update", id, auditPrevRecord, record, extractUsername(req.body));
        return res.json(record);
      }
      
      // [ALMACEN] Recalcular existencia después de actualizar
      if (tableName === "almacen") {
        // Obtener registro anterior para comparar suministro y fecha
        const anteriorResult = await db.execute(sql`SELECT suministro, fecha FROM almacen WHERE id = ${id}`);
        if (!anteriorResult.rows[0]) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        const anterior = anteriorResult.rows[0] as any;
        const suministroAnterior = anterior.suministro;
        const fechaAnterior = anterior.fecha;
        
        const registro = await config.update(id, req.body);
        if (!registro) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        const cambioSuministro = suministroAnterior !== registro.suministro;
        const cambioFecha = fechaAnterior !== registro.fecha;
        
        // Recalcular para el suministro actual
        if (registro.suministro) {
          const fechaDesde = getFechaMenor(fechaAnterior, registro.fecha);
          await recalcularExistenciaAlmacen(registro.suministro, fechaDesde || undefined);
        }
        
        // Si cambió de suministro, también recalcular el suministro anterior
        if (cambioSuministro && suministroAnterior) {
          const fechaAnteriorNorm = normalizarFechaParaSQL(fechaAnterior);
          await recalcularExistenciaAlmacen(suministroAnterior, fechaAnteriorNorm || undefined);
        }
        
        if (fechaAnteriorPut && (registro.fecha || '').substring(0, 10) !== (fechaAnteriorPut || '').substring(0, 10)) {
          const ndp = (registro.fecha || '').substring(0, 10);
          const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM almacen WHERE LEFT(fecha, 10) = ${ndp} AND id != ${id}`);
          const ns = ((sr.rows[0] as any)?.max_sec || 0) + 1;
          await db.execute(sql`UPDATE almacen SET secuencia = ${ns} WHERE id = ${id}`);
        }

        const registroActualizado = await db.execute(sql`SELECT * FROM almacen WHERE id = ${id}`);
        const registroFinal = registroActualizado.rows[0] || registro;
        
        await logAudit("almacen", "update", id, auditPrevRecord, registroFinal, extractUsername(req.body));
        broadcast("almacen_updated");
        return res.json(registroFinal);
      }
      
      // [TRANSFERENCIAS] Recalcular resta al actualizar: resta = monto + prestamo - descuento
      if (tableName === "transferencias") {
        const body = { ...req.body };
        // Get current record to merge with incoming changes
        const currentResult = await db.execute(sql`SELECT monto, prestamo, descuento FROM transferencias WHERE id = ${id}`);
        if (currentResult.rows[0]) {
          const current = currentResult.rows[0] as any;
          const monto = parseFloat(body.monto !== undefined ? body.monto : current.monto) || 0;
          const prestamo = parseFloat(body.prestamo !== undefined ? body.prestamo : current.prestamo) || 0;
          const descuento = parseFloat(body.descuento !== undefined ? body.descuento : current.descuento) || 0;
          body.resta = String(monto + prestamo - descuento);
        }
        const record = await config.update(id, body);
        if (!record) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        if (fechaAnteriorPut && ((record as any).fecha || '').substring(0, 10) !== (fechaAnteriorPut || '').substring(0, 10)) {
          const ndp = ((record as any).fecha || '').substring(0, 10);
          const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM transferencias WHERE LEFT(fecha, 10) = ${ndp} AND id != ${id}`);
          const ns = ((sr.rows[0] as any)?.max_sec || 0) + 1;
          await db.execute(sql`UPDATE transferencias SET secuencia = ${ns} WHERE id = ${id}`);
          (record as any).secuencia = ns;
        }
        await logAudit("transferencias", "update", id, auditPrevRecord, record, extractUsername(req.body));
        broadcast("transferencias_updated");
        return res.json(record);
      }
      
      const record = await config.update(id, req.body);
      if (!record) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      if (fechaAnteriorPut && tablasConFechaPut.includes(tableName) && tableName !== "bancos") {
        const recAny = record as any;
        if ((recAny.fecha || '').substring(0, 10) !== (fechaAnteriorPut || '').substring(0, 10)) {
          const ndp = (recAny.fecha || '').substring(0, 10);
          const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM ${sql.raw(tableName)} WHERE LEFT(fecha, 10) = ${ndp} AND id != ${id}`);
          const ns = ((sr.rows[0] as any)?.max_sec || 0) + 1;
          await db.execute(sql`UPDATE ${sql.raw(tableName)} SET secuencia = ${ns} WHERE id = ${id}`);
          recAny.secuencia = ns;
        }
      }
      await logAudit(tableName, "update", id, auditPrevRecord, record, extractUsername(req.body));
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
      
      const tablasConFechaPatch = ["bancos", "administracion", "cosecha", "almacen", "transferencias", "arrime", "agronomia", "reparaciones", "bitacora"];
      let fechaAnteriorPatch: string | null = null;
      if (tablasConFechaPatch.includes(tableName) && req.body.fecha !== undefined) {
        const prevFechaR = await db.execute(sql`SELECT fecha FROM ${sql.raw(tableName)} WHERE id = ${id}`);
        fechaAnteriorPatch = (prevFechaR.rows[0] as any)?.fecha || null;
      }

      if (tableName === "administracion") {
        const body = { ...req.body };
        console.log("[PATCH /api/administracion] Received body:", JSON.stringify(body, null, 2));
        console.log("[PATCH /api/administracion] codrel:", body.codrel);
        if (body.codrel) {
          body.relacionado = true;
        }
        const prevResult = await db.execute(sql`SELECT tipo, cliente, proveedor, nrofactura, unidad FROM administracion WHERE id = ${id}`);
        const prev = prevResult.rows[0] as any;
        const record = await config.update(id, body);
        if (!record) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        if (body.codrel) {
          await db.execute(sql`UPDATE bancos SET relacionado = true WHERE id = ${body.codrel}`);
          broadcast("bancos_updated");
        }
        broadcast("administracion_updated");
        const rec = record as any;
        const tipoAfter = (rec.tipo || '').toLowerCase();
        if (tipoAfter === 'cuentasporcobrar' || tipoAfter === 'cuentasporpagar') {
          const persona = tipoAfter === 'cuentasporcobrar' ? (rec.cliente || '') : (rec.proveedor || '');
          await recalcularRestaCancelar(tipoAfter as any, persona || undefined, rec.nrofactura || undefined, rec.unidad || undefined);
        }
        if (prev) {
          const tipoBefore = (prev.tipo || '').toLowerCase();
          if (tipoBefore === 'cuentasporcobrar' || tipoBefore === 'cuentasporpagar') {
            const prevPersona = tipoBefore === 'cuentasporcobrar' ? (prev.cliente || '') : (prev.proveedor || '');
            const newPersona = tipoAfter === 'cuentasporcobrar' ? (rec.cliente || '') : (rec.proveedor || '');
            const groupChanged = tipoBefore !== tipoAfter || prevPersona !== newPersona || (prev.nrofactura || '') !== (rec.nrofactura || '') || (prev.unidad || '') !== (rec.unidad || '');
            if (groupChanged) {
              await recalcularRestaCancelar(tipoBefore as any, prevPersona || undefined, prev.nrofactura || undefined, prev.unidad || undefined);
            }
          }
        }
        if (fechaAnteriorPatch && (rec.fecha || '').substring(0, 10) !== (fechaAnteriorPatch || '').substring(0, 10)) {
          const ndp = (rec.fecha || '').substring(0, 10);
          const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM administracion WHERE LEFT(fecha, 10) = ${ndp} AND id != ${id}`);
          const ns = ((sr.rows[0] as any)?.max_sec || 0) + 1;
          await db.execute(sql`UPDATE administracion SET secuencia = ${ns} WHERE id = ${id}`);
          rec.secuencia = ns;
        }
        return res.json(record);
      }
      
      // [ALMACEN] Recalcular existencia después de actualizar campo
      if (tableName === "almacen") {
        const body = req.body;
        const camposQueAfectanExistencia = ["cantidad", "movimiento", "suministro", "fecha"];
        const afectaExistencia = Object.keys(body).some(k => camposQueAfectanExistencia.includes(k));
        
        if (afectaExistencia) {
          // Obtener registro anterior
          const anteriorResult = await db.execute(sql`SELECT suministro, fecha FROM almacen WHERE id = ${id}`);
          if (!anteriorResult.rows[0]) {
            return res.status(404).json({ error: "Registro no encontrado" });
          }
          const anterior = anteriorResult.rows[0] as any;
          const suministroAnterior = anterior.suministro;
          const fechaAnterior = anterior.fecha;
          
          const registro = await config.update(id, body);
          if (!registro) {
            return res.status(404).json({ error: "Registro no encontrado" });
          }
          
          // Recalcular para el suministro actual
          if (registro.suministro) {
            const fechaDesde = getFechaMenor(fechaAnterior, registro.fecha);
            await recalcularExistenciaAlmacen(registro.suministro, fechaDesde || undefined);
          }
          
          // Si cambió de suministro, también recalcular el anterior
          if (suministroAnterior !== registro.suministro && suministroAnterior) {
            const fechaAnteriorNorm = normalizarFechaParaSQL(fechaAnterior);
            await recalcularExistenciaAlmacen(suministroAnterior, fechaAnteriorNorm || undefined);
          }
          
          if (fechaAnteriorPatch && (registro.fecha || '').substring(0, 10) !== (fechaAnteriorPatch || '').substring(0, 10)) {
            const ndp = (registro.fecha || '').substring(0, 10);
            const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM almacen WHERE LEFT(fecha, 10) = ${ndp} AND id != ${id}`);
            const ns = ((sr.rows[0] as any)?.max_sec || 0) + 1;
            await db.execute(sql`UPDATE almacen SET secuencia = ${ns} WHERE id = ${id}`);
          }

          const registroActualizado = await db.execute(sql`SELECT * FROM almacen WHERE id = ${id}`);
          const registroFinal = registroActualizado.rows[0] || registro;
          
          broadcast("almacen_updated");
          return res.json(registroFinal);
        }
      }
      
      // [TRANSFERENCIAS] Recalcular resta al actualizar campo: resta = monto + prestamo - descuento
      if (tableName === "transferencias") {
        const body = { ...req.body };
        const camposQueAfectanResta = ["monto", "prestamo", "descuento"];
        if (Object.keys(body).some(k => camposQueAfectanResta.includes(k))) {
          const currentResult = await db.execute(sql`SELECT monto, prestamo, descuento FROM transferencias WHERE id = ${id}`);
          if (currentResult.rows[0]) {
            const current = currentResult.rows[0] as any;
            const monto = parseFloat(body.monto !== undefined ? body.monto : current.monto) || 0;
            const prestamo = parseFloat(body.prestamo !== undefined ? body.prestamo : current.prestamo) || 0;
            const descuento = parseFloat(body.descuento !== undefined ? body.descuento : current.descuento) || 0;
            body.resta = String(monto + prestamo - descuento);
          }
        }
        const record = await config.update(id, body);
        if (!record) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        if (fechaAnteriorPatch && ((record as any).fecha || '').substring(0, 10) !== (fechaAnteriorPatch || '').substring(0, 10)) {
          const ndp = ((record as any).fecha || '').substring(0, 10);
          const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM transferencias WHERE LEFT(fecha, 10) = ${ndp} AND id != ${id}`);
          const ns = ((sr.rows[0] as any)?.max_sec || 0) + 1;
          await db.execute(sql`UPDATE transferencias SET secuencia = ${ns} WHERE id = ${id}`);
          (record as any).secuencia = ns;
        }
        broadcast("transferencias_updated");
        return res.json(record);
      }
      
      const record = await config.update(id, req.body);
      if (!record) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      if (fechaAnteriorPatch && tablasConFechaPatch.includes(tableName)) {
        const recAny = record as any;
        if ((recAny.fecha || '').substring(0, 10) !== (fechaAnteriorPatch || '').substring(0, 10)) {
          const ndp = (recAny.fecha || '').substring(0, 10);
          const sr = await db.execute(sql`SELECT COALESCE(MAX(secuencia), 0) AS max_sec FROM ${sql.raw(tableName)} WHERE LEFT(fecha, 10) = ${ndp} AND id != ${id}`);
          const ns = ((sr.rows[0] as any)?.max_sec || 0) + 1;
          await db.execute(sql`UPDATE ${sql.raw(tableName)} SET secuencia = ${ns} WHERE id = ${id}`);
          recAny.secuencia = ns;
        }
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

      const auditDelGenResult = await db.execute(sql`SELECT * FROM ${sql.raw(tableName)} WHERE id = ${id}`);
      const auditDelGenRecord = auditDelGenResult.rows[0] || null;
      
      if (tableName === "bancos") {
        const bancoResult = await db.execute(sql`SELECT banco, fecha, codrel FROM bancos WHERE id = ${id}`);
        const bancoNombre = (bancoResult.rows[0] as any)?.banco;
        const fechaRegistro = (bancoResult.rows[0] as any)?.fecha;
        const bancoCodrelGen = (bancoResult.rows[0] as any)?.codrel;
        
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
            ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
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
        
        await db.execute(sql`UPDATE administracion SET codrel = NULL, relacionado = false WHERE codrel = ${id}`);
        if (bancoCodrelGen) {
          const otherRefsGen = await db.execute(sql`
            SELECT COUNT(*)::int as cnt FROM (
              SELECT 1 FROM administracion WHERE id = ${bancoCodrelGen} AND codrel IS NOT NULL
              UNION ALL SELECT 1 FROM bancos WHERE codrel = ${bancoCodrelGen}
            ) t
          `);
          if (((otherRefsGen.rows[0] as any)?.cnt || 0) === 0) {
            await db.execute(sql`UPDATE administracion SET relacionado = false WHERE id = ${bancoCodrelGen}`);
          }
        }
        broadcast("administracion_updated");
        
        if (fechaDesdeRecalculo) {
          await recalcularSaldosBanco(bancoNombre, fechaDesdeRecalculo);
        }
        
        await logAudit("bancos", "delete", id, auditDelGenRecord, null, (req.query._username as string) || "sistema");
        broadcast("bancos_updated");
        return res.json({ success: true });
      }
      
      if (tableName === "administracion") {
        const adminResult = await db.execute(sql`SELECT codrel, tipo, cliente, proveedor, nrofactura, unidad FROM administracion WHERE id = ${id}`);
        const adminRow = adminResult.rows[0] as any;
        const bancoId = adminRow?.codrel;
        
        const deleted = await config.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        await db.execute(sql`UPDATE bancos SET codrel = NULL, relacionado = false WHERE codrel = ${id}`);
        if (bancoId) {
          const otherAdmins = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM administracion WHERE codrel = ${bancoId} AND id != ${id}`);
          const bancoCodrelStillValid = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM bancos WHERE id = ${bancoId} AND codrel IS NOT NULL AND codrel != ${id}`);
          if (((otherAdmins.rows[0] as any)?.cnt || 0) === 0 && ((bancoCodrelStillValid.rows[0] as any)?.cnt || 0) === 0) {
            await db.execute(sql`UPDATE bancos SET relacionado = false WHERE id = ${bancoId}`);
          }
        }
        broadcast("bancos_updated");
        
        await logAudit("administracion", "delete", id, auditDelGenRecord, null, (req.query._username as string) || "sistema");
        broadcast("administracion_updated");
        if (adminRow) {
          const tipoVal = (adminRow.tipo || '').toLowerCase();
          if (tipoVal === 'cuentasporcobrar' || tipoVal === 'cuentasporpagar') {
            const persona = tipoVal === 'cuentasporcobrar' ? (adminRow.cliente || '') : (adminRow.proveedor || '');
            await recalcularRestaCancelar(tipoVal as any, persona || undefined, adminRow.nrofactura || undefined, adminRow.unidad || undefined);
          }
        }
        return res.json({ success: true });
      }
      
      // [ALMACEN] Recalcular existencia después de eliminar
      if (tableName === "almacen") {
        const almacenResult = await db.execute(sql`SELECT suministro, fecha, codrel FROM almacen WHERE id = ${id}`);
        const suministro = (almacenResult.rows[0] as any)?.suministro;
        const fechaRegistro = (almacenResult.rows[0] as any)?.fecha;
        
        if (!suministro) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Buscar fecha inmediatamente anterior ANTES de borrar
        const fechaNormRegistro = normalizarFechaParaSQL(fechaRegistro);
        let fechaDesdeRecalculo: string | undefined;
        
        if (fechaNormRegistro) {
          const prevResult = await db.execute(sql`
            SELECT fecha FROM almacen 
            WHERE suministro = ${suministro} AND fecha < ${fechaNormRegistro} AND id != ${id}
            ORDER BY LEFT(fecha, 10) DESC, secuencia DESC
            LIMIT 1
          `);
          if (prevResult.rows.length > 0) {
            fechaDesdeRecalculo = normalizarFechaParaSQL((prevResult.rows[0] as any).fecha) || fechaNormRegistro;
          } else {
            fechaDesdeRecalculo = fechaNormRegistro;
          }
        }
        
        const deleted = await config.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        // Recalcular desde la fecha inmediatamente anterior
        if (fechaDesdeRecalculo) {
          await recalcularExistenciaAlmacen(suministro, fechaDesdeRecalculo);
        }
        
        const almacenCodrel = (almacenResult.rows[0] as any)?.codrel;
        if (almacenCodrel) {
          const otherAlmacen = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM almacen WHERE codrel = ${almacenCodrel} AND id != ${id}`);
          if (((otherAlmacen.rows[0] as any)?.cnt || 0) === 0) {
            await db.execute(sql`UPDATE agronomia SET relacionado = false WHERE id = ${almacenCodrel}`);
          }
          broadcast("agronomia_updated");
        }
        
        await logAudit("almacen", "delete", id, auditDelGenRecord, null, (req.query._username as string) || "sistema");
        broadcast("almacen_updated");
        return res.json({ success: true });
      }
      
      if (tableName === "agronomia") {
        await db.execute(sql`UPDATE almacen SET codrel = NULL, relacionado = false WHERE codrel = ${id}`);
        
        const deleted = await config.delete(id);
        if (!deleted) {
          return res.status(404).json({ error: "Registro no encontrado" });
        }
        
        await logAudit("agronomia", "delete", id, auditDelGenRecord, null, (req.query._username as string) || "sistema");
        broadcast("agronomia_updated");
        broadcast("almacen_updated");
        return res.json({ success: true });
      }
      
      const deleted = await config.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      await logAudit(tableName, "delete", id, auditDelGenRecord, null, (req.query._username as string) || "sistema");
      broadcast(`${tableName}_updated`);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error al eliminar en ${req.params.tableName}:`, error);
      res.status(500).json({ error: `Error al eliminar registro` });
    }
  });

  app.get("/api/herramientas/historial-crud", async (req, res) => {
    try {
      const usuario = req.query.usuario as string;
      let result;
      if (usuario) {
        result = await db.execute(sql`
          SELECT id, timestamp, tabla, operacion, registro_id, datos_anteriores, datos_nuevos, usuario, deshecho
          FROM audit_log
          WHERE usuario = ${usuario}
          ORDER BY timestamp DESC
          LIMIT 50
        `);
      } else {
        result = await db.execute(sql`
          SELECT id, timestamp, tabla, operacion, registro_id, datos_anteriores, datos_nuevos, usuario, deshecho
          FROM audit_log
          ORDER BY timestamp DESC
          LIMIT 50
        `);
      }
      res.json(result.rows);
    } catch (error) {
      console.error("[HISTORIAL] Error:", error);
      res.status(500).json({ error: "Error al obtener historial" });
    }
  });

  app.post("/api/herramientas/deshacer/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const usuario = req.body?.usuario;
      if (!usuario) {
        return res.status(400).json({ error: "Se requiere el usuario para deshacer" });
      }
      const logResult = await db.execute(sql`SELECT * FROM audit_log WHERE id = ${id} AND deshecho = false AND usuario = ${usuario}`);
      if (logResult.rows.length === 0) {
        return res.status(404).json({ error: "Operación no encontrada, ya fue deshecha, o pertenece a otro usuario" });
      }
      const entry = logResult.rows[0] as any;
      const { tabla, operacion, registro_id, datos_anteriores, datos_nuevos } = entry;

      const tableConf = tableConfig[tabla];
      if (!tableConf) {
        return res.status(400).json({ error: `Tabla '${tabla}' no soportada para deshacer` });
      }

      if (operacion === "insert") {
        await db.execute(sql`DELETE FROM ${sql.raw(tabla)} WHERE id = ${registro_id}`);
        broadcast(`${tabla}_updated`);
      } else if (operacion === "update") {
        if (!datos_anteriores) {
          return res.status(400).json({ error: "No hay datos anteriores para restaurar" });
        }
        const prev = typeof datos_anteriores === "string" ? JSON.parse(datos_anteriores) : datos_anteriores;
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;
        for (const [key, val] of Object.entries(prev)) {
          if (key === "id") continue;
          setClauses.push(`"${key}" = $${paramIdx}`);
          values.push(val);
          paramIdx++;
        }
        if (setClauses.length > 0) {
          values.push(registro_id);
          await pool.query(
            `UPDATE "${tabla}" SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`,
            values
          );
        }
        broadcast(`${tabla}_updated`);
      } else if (operacion === "delete") {
        if (!datos_anteriores) {
          return res.status(400).json({ error: "No hay datos anteriores para recrear" });
        }
        const prev = typeof datos_anteriores === "string" ? JSON.parse(datos_anteriores) : datos_anteriores;
        const columns: string[] = [];
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;
        for (const [key, val] of Object.entries(prev)) {
          columns.push(`"${key}"`);
          placeholders.push(`$${paramIdx}`);
          values.push(val);
          paramIdx++;
        }
        await pool.query(
          `INSERT INTO "${tabla}" (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
          values
        );
        broadcast(`${tabla}_updated`);
      }

      await db.execute(sql`UPDATE audit_log SET deshecho = true WHERE id = ${id}`);

      if (tabla === "bancos") {
        const recBanco = datos_anteriores || datos_nuevos;
        const bData = typeof recBanco === "string" ? JSON.parse(recBanco) : recBanco;
        if (bData?.banco) {
          const fechaNorm = normalizarFechaParaSQL(bData.fecha);
          if (fechaNorm) {
            await recalcularSaldosBanco(bData.banco, fechaNorm);
          }
        }
        broadcast("bancos_updated");
      }

      if (tabla === "almacen") {
        const recAlmacen = datos_anteriores || datos_nuevos;
        const aData = typeof recAlmacen === "string" ? JSON.parse(recAlmacen) : recAlmacen;
        if (aData?.suministro) {
          const fechaNorm = normalizarFechaParaSQL(aData.fecha);
          await recalcularExistenciaAlmacen(aData.suministro, fechaNorm || undefined);
        }
        broadcast("almacen_updated");
      }

      if (tabla === "transferencias") {
        broadcast("transferencias_updated");
      }

      res.json({ success: true, mensaje: `Operación '${operacion}' en '${tabla}' deshecha exitosamente` });
    } catch (error) {
      console.error("[DESHACER] Error:", error);
      res.status(500).json({ error: "Error al deshacer operación" });
    }
  });

  app.post("/api/herramientas/rehacer/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const usuario = req.body?.usuario;
      if (!usuario) {
        return res.status(400).json({ error: "Se requiere el usuario para rehacer" });
      }
      const logResult = await db.execute(sql`SELECT * FROM audit_log WHERE id = ${id} AND deshecho = true AND usuario = ${usuario}`);
      if (logResult.rows.length === 0) {
        return res.status(404).json({ error: "Operación no encontrada, no fue deshecha, o pertenece a otro usuario" });
      }
      const entry = logResult.rows[0] as any;
      const { tabla, operacion, registro_id, datos_anteriores, datos_nuevos } = entry;

      const tableConf = tableConfig[tabla];
      if (!tableConf) {
        return res.status(400).json({ error: `Tabla '${tabla}' no soportada para rehacer` });
      }

      if (operacion === "insert") {
        if (!datos_nuevos) {
          return res.status(400).json({ error: "No hay datos nuevos para recrear" });
        }
        const newData = typeof datos_nuevos === "string" ? JSON.parse(datos_nuevos) : datos_nuevos;
        const columns: string[] = [];
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;
        for (const [key, val] of Object.entries(newData)) {
          columns.push(`"${key}"`);
          placeholders.push(`$${paramIdx}`);
          values.push(val);
          paramIdx++;
        }
        await pool.query(
          `INSERT INTO "${tabla}" (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
          values
        );
        broadcast(`${tabla}_updated`);
      } else if (operacion === "update") {
        if (!datos_nuevos) {
          return res.status(400).json({ error: "No hay datos nuevos para restaurar" });
        }
        const newData = typeof datos_nuevos === "string" ? JSON.parse(datos_nuevos) : datos_nuevos;
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;
        for (const [key, val] of Object.entries(newData)) {
          if (key === "id") continue;
          setClauses.push(`"${key}" = $${paramIdx}`);
          values.push(val);
          paramIdx++;
        }
        if (setClauses.length > 0) {
          values.push(registro_id);
          await pool.query(
            `UPDATE "${tabla}" SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`,
            values
          );
        }
        broadcast(`${tabla}_updated`);
      } else if (operacion === "delete") {
        await db.execute(sql`DELETE FROM ${sql.raw(tabla)} WHERE id = ${registro_id}`);
        broadcast(`${tabla}_updated`);
      }

      await db.execute(sql`UPDATE audit_log SET deshecho = false WHERE id = ${id}`);

      if (tabla === "bancos") {
        const recBanco = datos_anteriores || datos_nuevos;
        const bData = typeof recBanco === "string" ? JSON.parse(recBanco) : recBanco;
        if (bData?.banco) {
          const fechaNorm = normalizarFechaParaSQL(bData.fecha);
          if (fechaNorm) {
            await recalcularSaldosBanco(bData.banco, fechaNorm);
          }
        }
        broadcast("bancos_updated");
      }

      if (tabla === "almacen") {
        const recAlmacen = datos_anteriores || datos_nuevos;
        const aData = typeof recAlmacen === "string" ? JSON.parse(recAlmacen) : recAlmacen;
        if (aData?.suministro) {
          const fechaNorm = normalizarFechaParaSQL(aData.fecha);
          await recalcularExistenciaAlmacen(aData.suministro, fechaNorm || undefined);
        }
        broadcast("almacen_updated");
      }

      if (tabla === "transferencias") {
        broadcast("transferencias_updated");
      }

      res.json({ success: true, mensaje: `Operación '${operacion}' en '${tabla}' rehecha exitosamente` });
    } catch (error) {
      console.error("[REHACER] Error:", error);
      res.status(500).json({ error: "Error al rehacer operación" });
    }
  });

  fetchBcvDolarEnSegundoPlano();

  return httpServer;
}

async function fetchTasaBcv(): Promise<number | null> {
  try {
    const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`dolarapi error: ${response.status}`);
    const data = await response.json() as { promedio: number };
    if (data.promedio && data.promedio > 0) {
      console.log(`[BCV] Tasa obtenida de dolarapi.com: ${data.promedio}`);
      return data.promedio;
    }
  } catch (e: any) {
    console.log(`[BCV] dolarapi.com falló: ${e.message}, intentando API alternativa...`);
  }

  try {
    const response = await fetch("https://bcv-api.rafnixg.dev/rates/", { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`rafnixg error: ${response.status}`);
    const data = await response.json() as { dollar: number };
    if (data.dollar && data.dollar > 0) {
      console.log(`[BCV] Tasa obtenida de rafnixg: ${data.dollar}`);
      return data.dollar;
    }
  } catch (e: any) {
    console.log(`[BCV] rafnixg también falló: ${e.message}`);
  }

  return null;
}

async function fetchBcvDolarEnSegundoPlano() {
  try {
    const valor = await fetchTasaBcv();
    if (!valor || valor <= 0) {
      console.log("[BCV] No se pudo obtener tasa de ninguna API al arrancar.");
      return;
    }

    const { dd, mm, yyyy } = getLocalDate();
    const fechaIso = `${yyyy}-${mm}-${dd}`;

    const existing = await db.execute(
      sql`SELECT id FROM parametros WHERE tipo = 'dolar' AND fecha = ${fechaIso} LIMIT 1`
    );

    if (existing.rows.length === 0) {
      await db.execute(sql`
        INSERT INTO parametros (tipo, nombre, valor, fecha, unidad, propietario)
        VALUES ('dolar', 'bcv', ${String(valor)}, ${fechaIso}, 'todas', ${'sistema ' + `${dd}/${mm}/${yyyy} 00:00:00`})
      `);
      console.log(`[BCV] Tasa del dolar insertada: ${valor} para ${dd}/${mm}/${yyyy}`);
    } else {
      console.log(`[BCV] Ya existe tasa del dolar para ${dd}/${mm}/${yyyy}, no se actualiza.`);
    }
  } catch (error: any) {
    console.log(`[BCV] No se pudo obtener tasa al arrancar (se usara la existente): ${error.message}`);
  }
}
