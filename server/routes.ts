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
  administracion: ["actividad", "proveedor", "insumo", "personal", "producto", "cliente", "operacion"],
  cosecha: ["cultivo", "ciclo", "chofer", "destino"],
  almacen: ["suministro", "movimiento", "categoria"],
  cheques: ["banco", "actividad"],
  transferencias: ["actividad", "tipo"],
  bancos: [],
  agrodata: ["nombre", "equipo", "plan", "ip", "estado"],
  arrime: ["proveedor", "placa", "nucleo", "tablon", "chofer", "ruta", "finca"]
};

// Campos válidos para filtros booleanos por módulo
const VALID_BOOLEAN_FILTER_FIELDS: Record<string, string[]> = {
  administracion: ["capital", "utility", "anticipo", "relacionado", "cancelada"],
  cosecha: ["utility", "cancelado"],
  almacen: ["utility"],
  cheques: ["utility", "transferido", "imprimido", "contabilizado"],
  transferencias: ["utility", "transferido", "contabilizado", "ejecutada"],
  bancos: ["conciliado", "utility", "relacionado"],
  agrodata: ["utility"],
  arrime: ["utility", "cancelado", "feriado", "pagochofer"]
};

// Construye cláusulas WHERE para filtros de texto, booleanos y descripción
function buildAdvancedFiltersSQL(
  query: Record<string, any>,
  moduleName: string
) {
  let clause = sql``;
  
  // Filtro de descripción (ILIKE para búsqueda parcial)
  // Para cheques, también busca en beneficiario
  const descripcion = query.descripcion as string | undefined;
  if (descripcion && descripcion.trim()) {
    const searchPattern = '%' + descripcion.trim() + '%';
    if (moduleName === 'cheques') {
      // Buscar en descripcion O beneficiario
      clause = sql`${clause} AND (LOWER(descripcion) LIKE LOWER(${searchPattern}) OR LOWER(beneficiario) LIKE LOWER(${searchPattern}))`;
    } else {
      clause = sql`${clause} AND LOWER(descripcion) LIKE LOWER(${searchPattern})`;
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
  
  return clause;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
          ORDER BY fecha DESC, id DESC
          LIMIT 1
        `;
        const prevResult = await client.query(prevQuery, [suministroNombre, desdeFecha]);
        if (prevResult.rows.length > 0) {
          existenciaInicial = Number(prevResult.rows[0].saldo) || 0;
        }
        
        registrosQuery = `SELECT id, cantidad, movimiento, fecha FROM almacen WHERE suministro = $1 AND fecha >= $2 ORDER BY fecha ASC, id ASC`;
        queryParams.push(desdeFecha);
      } else {
        registrosQuery = `SELECT id, cantidad, movimiento, fecha FROM almacen WHERE suministro = $1 ORDER BY fecha ASC, id ASC`;
      }

      const registrosResult = await client.query(registrosQuery, queryParams);
      const registros = registrosResult.rows;

      let existenciaAcumulada = existenciaInicial;
      
      for (const registro of registros) {
        const movimiento = (registro.movimiento || "entrada").toLowerCase();
        const cantidad = Number(registro.cantidad) || 0;
        
        if (movimiento === "entrada") {
          existenciaAcumulada += cantidad;
        } else if (movimiento === "salida") {
          existenciaAcumulada -= cantidad;
        }

        const existenciaFinal = Math.round(existenciaAcumulada * 100) / 100;

        await client.query(
          `UPDATE almacen SET saldo = $1 WHERE id = $2`,
          [existenciaFinal, registro.id]
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

  // [BANCOS] Importar registros desde extracto bancario (TXT)
  app.post("/api/bancos/import", async (req, res) => {
    try {
      const { banco, records, username } = req.body;
      
      if (!banco || !records || !Array.isArray(records)) {
        return res.status(400).json({ error: "Banco y registros son requeridos" });
      }
      
      const loc = getLocalDate();
      const propietario = `${username || "sistema"} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;
      
      let success = 0;
      let duplicates = 0;
      const duplicatedComprobantes: string[] = [];
      
      let recordIndex = 0;
      for (const record of records) {
        const existingResult = await db.execute(
          sql`SELECT id FROM bancos WHERE banco = ${banco} AND comprobante = ${record.comprobante} LIMIT 1`
        );
        
        if (existingResult.rows.length > 0) {
          duplicates++;
          duplicatedComprobantes.push(record.comprobante);
          continue;
        }
        
        const monto = Math.abs(parseFloat(record.monto) || 0);
        const saldo = Math.abs(parseFloat(record.saldo) || 0);
        const operacion = record.operacion || "suma";
        const descripcionLower = (record.descripcion || "").toLowerCase();
        
        // Transformar fecha de dd/mm/yyyy a formato interno YYYY-MM-DD HH:MM:SS.microsegundos
        let fechaTimestamp = record.fecha;
        let fechaParaTasa = "";
        const fechaParts = record.fecha.split("/");
        if (fechaParts.length === 3) {
          const [d, m, a] = fechaParts;
          const anioFecha = a.length === 2 ? (parseInt(a) > 50 ? `19${a}` : `20${a}`) : a;
          const nowTs = new Date();
          const microseconds = String((nowTs.getTime() % 1000000) + recordIndex).padStart(6, '0');
          const timestamp = `${loc.hh}:${loc.mi}:${loc.ss}.${microseconds}`;
          fechaTimestamp = `${anioFecha}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${timestamp}`;
          fechaParaTasa = `${anioFecha}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        recordIndex++;
        
        // Detectar si el banco es en moneda extranjera (dólares o euros)
        const bancoLower = banco.toLowerCase();
        const esBancoEnDolares = bancoLower.includes("dolar") || bancoLower.includes("dólar");
        const esBancoEnEuros = bancoLower.includes("euro");
        const esBancoEnMonedaExtranjera = esBancoEnDolares || esBancoEnEuros;
        
        // Solo calcular montodolares si el banco es en bolívares
        let montodolares = "0";
        if (!esBancoEnMonedaExtranjera && fechaParaTasa && monto > 0) {
          const tasaResult = await db.execute(
            sql`SELECT valor FROM parametros WHERE tipo = 'dolar' AND fecha = ${fechaParaTasa}::date LIMIT 1`
          );
          if (tasaResult.rows.length > 0) {
            const tasa = parseFloat((tasaResult.rows[0] as any).valor) || 0;
            if (tasa > 0) {
              montodolares = (monto / tasa).toFixed(2);
            }
          }
        }
        
        await db.insert(bancosTable).values({
          fecha: fechaTimestamp,
          comprobante: record.comprobante,
          descripcion: descripcionLower,
          monto: String(monto),
          saldo_conciliado: String(saldo),
          banco: banco,
          operacion: operacion,
          conciliado: true,
          utility: false,
          propietario: propietario,
          montodolares: montodolares,
        });
        
        success++;
      }
      
      if (success > 0) {
        await recalcularSaldosBanco(banco);
        broadcast("bancos_updated");
      }
      
      res.json({ success, duplicates, duplicatedComprobantes });
    } catch (error) {
      console.error("Error importando bancos:", error);
      res.status(500).json({ error: "Error al importar registros" });
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
      
      // Filtros avanzados: descripcion, booleanFilters
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "bancos");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
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
        sql`SELECT id, SUM(COALESCE(montodolares::numeric, 0)) OVER (PARTITION BY LOWER(COALESCE(NULLIF(nombre, ''), personal)) ORDER BY fecha, id) as saldo FROM administracion WHERE tipo = 'prestamos' AND LOWER(unidad) = LOWER(${unidad})`
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
      const result = await db.execute(sql`SELECT * FROM administracion ${whereClause} ORDER BY fecha ASC, id ASC`);
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
        WHERE tipo = 'cuentasporpagar' AND cancelada = true ${whereUnidad}
        ORDER BY fecha ASC, id ASC
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
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, proveedor, nrofactura, fechafactura, cancelada, restacancelar, comprobante, propietario, capital, utility, operacion, relacionado, codrel, anticipo, insumo, actividad, personal, cliente)
              VALUES (
                ${r.fecha}, 'facturas', ${r.nombre}, ${r.descripcion}, ${r.monto}, ${r.montodolares},
                ${r.unidad}, ${r.proveedor}, ${r.nrofactura}, ${r.fechafactura}, true, ${0}, ${r.comprobante},
                ${propietario}, ${r.capital || false}, ${r.utility || false}, ${r.operacion || 'transferencia a terceros'}, ${r.relacionado || false}, ${r.codrel}, false,
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

        for (const row of cancelados.rows) {
          const r = row as any;
          const key = `${(r.proveedor || '').toLowerCase()}|${(r.nrofactura || '').toLowerCase()}|${(r.unidad || '').toLowerCase()}`;
          const facturaId = facturaIdsByKey.get(key);
          if (facturaId) {
            const updateResult = await db.execute(sql`
              UPDATE bancos SET codrel = ${facturaId} WHERE codrel = ${r.id} AND relacionado = true
            `);
            bancosActualizados += (updateResult as any).rowCount || 0;
          }
        }

        await db.execute(sql`
          DELETE FROM administracion 
          WHERE tipo = 'cuentasporpagar' AND cancelada = true ${whereUnidad}
        `);

        await db.execute(sql`COMMIT`);
      } catch (txError) {
        await db.execute(sql`ROLLBACK`);
        throw txError;
      }

      broadcast("administracion_updated");
      broadcast("bancos_updated");
      res.json({ facturas: facturasCreadas, eliminados: cancelados.rows.length, bancosActualizados });
    } catch (error) {
      console.error("Error enviando a facturas:", error);
      res.status(500).json({ error: "Error al enviar a facturas" });
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
              INSERT INTO administracion (id, fecha, tipo, nombre, descripcion, monto, montodolares, unidad, capital, utility, operacion, producto, cantidad, insumo, comprobante, proveedor, cliente, personal, actividad, propietario, anticipo, unidaddemedida, codrel, relacionado, nrofactura, fechafactura, cancelada, restacancelar)
              VALUES (
                gen_random_uuid(), ${rec.fecha}, 'facturas', ${rec.nombre}, ${rec.descripcion}, ${rec.monto}, ${rec.montodolares},
                ${rec.unidad}, ${rec.capital}, ${rec.utility}, ${rec.operacion}, ${rec.producto}, ${rec.cantidad}, ${rec.insumo},
                ${rec.comprobante}, ${rec.proveedor}, ${rec.cliente}, ${rec.personal}, ${rec.actividad}, ${propietario},
                ${rec.anticipo}, ${rec.unidaddemedida}, ${rec.codrel}, ${rec.relacionado}, ${rec.nrofactura}, ${rec.fechafactura},
                true, ${0}
              )
            `);

            await db.execute(sql`DELETE FROM administracion WHERE id = ${id}`);
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
      res.json({ completados, parciales, total: completados + parciales });
    } catch (error) {
      console.error("Error procesando pagos:", error);
      res.status(500).json({ error: "Error al procesar pagos" });
    }
  });

  // [ADMIN] Obtener lista paginada de registros de administración con filtros
  app.get("/api/administracion", async (req, res) => {
    try {
      const { id, tipo, unidad, fechaInicio, fechaFin, codrel, limit = "100", offset = "0" } = req.query;
      console.log("[GET /api/administracion] Query params:", req.query);
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
      
      // Filtros avanzados: descripcion, textFilters, booleanFilters
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "administracion");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
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
      const data = { ...req.body };
      console.log("[POST /api/administracion] Received data:", JSON.stringify(data, null, 2));
      console.log("[POST /api/administracion] codrel:", data.codrel);
      const id = crypto.randomUUID();
      
      // Auto-populate propietario con usuario + fecha + hora
      {
        const loc = getLocalDate();
        const username = (data._username || "sistema").trim() || "sistema";
        data.propietario = `${username} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;
      }
      delete data._username;
      
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
        INSERT INTO administracion (id, fecha, tipo, descripcion, monto, montodolares, unidad, capital, utility, operacion, producto, cantidad, insumo, comprobante, proveedor, cliente, personal, actividad, propietario, anticipo, codrel, relacionado, nombre, unidaddemedida, nrofactura, fechafactura, cancelada, restacancelar)
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
          ${data.codrel ? true : false},
          ${data.nombre || ''},
          ${data.unidaddemedida || ''},
          ${data.nrofactura || ''},
          ${data.fechafactura || ''},
          ${data.cancelada || false},
          ${data.restacancelar || 0}
        )
      `);
      
      if (data.codrel) {
        console.log("[POST /api/administracion] Updating bancos with codrel:", id, "for codrel:", data.codrel);
        await db.execute(sql`UPDATE bancos SET relacionado = true, codrel = ${id} WHERE id = ${data.codrel}`);
        console.log("[POST /api/administracion] Bancos updated successfully");
        broadcast("bancos_updated");
      }
      
      broadcast("administracion_updated");
      
      // Fetch the saved record from DB to return accurate data
      const savedResult = await db.execute(sql`SELECT * FROM administracion WHERE id = ${id}`);
      res.status(201).json(savedResult.rows[0] || { id, ...data });
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
      
      // Filtros avanzados: descripcion, textFilters, booleanFilters
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "cosecha");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
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
      
      // Filtros avanzados: descripcion, textFilters, booleanFilters
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "cheques");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
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
      
      // Filtros avanzados: descripcion, textFilters, booleanFilters
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "transferencias");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
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

            const bancoResult = await db.execute(sql`
              INSERT INTO bancos (fecha, monto, montodolares, comprobante, operacion, descripcion, conciliado, utility, banco, relacionado, codrel)
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
                null
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
            const hashDataAdmin = `${trans.fecha}|${Math.abs(monto).toFixed(2)}|${operadorAdmin}`;
            const hashAdmin = simpleHash(hashDataAdmin);
            const comprobanteConHashAdmin = trans.comprobante ? `${trans.comprobante}-${hashAdmin}` : null;

            const adminResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, capital, utility, operacion, insumo, comprobante, proveedor, personal, actividad, relacionado, codrel)
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
                'transferencia a terceros',
                ${trans.insumo},
                ${comprobanteConHashAdmin},
                ${trans.proveedor},
                ${trans.personal},
                ${trans.actividad},
                ${bancoId ? true : false},
                ${bancoId}
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
              await db.execute(sql`UPDATE bancos SET relacionado = true, codrel = ${adminId} WHERE id = ${bancoId}`);
            }
          }

          // B2. Si prestamo != 0, crear registro en ADMINISTRACION tipo prestamos
          if (prestamo !== 0) {
            const montoDolaresPrestamo = tasaDolar > 0 ? prestamo / tasaDolar : 0;
            const operadorPrestamo = prestamo >= 0 ? "suma" : "resta";
            const hashDataPrestamo = `${trans.fecha}|${Math.abs(prestamo).toFixed(2)}|${operadorPrestamo}|p`;
            const hashPrestamo = simpleHash(hashDataPrestamo);
            const comprobanteConHashPrestamo = trans.comprobante ? `${trans.comprobante}-${hashPrestamo}` : null;

            const prestamoResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, capital, utility, operacion, insumo, comprobante, proveedor, personal, actividad, relacionado, codrel)
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
                'transferencia a terceros',
                ${trans.insumo},
                ${comprobanteConHashPrestamo},
                ${trans.proveedor},
                ${trans.personal},
                ${trans.actividad},
                false,
                null
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
            const hashDataDesc = `${trans.fecha}|${Math.abs(descuento).toFixed(2)}|resta|d`;
            const hashDesc = simpleHash(hashDataDesc);
            const comprobanteConHashDesc = trans.comprobante ? `${trans.comprobante}-${hashDesc}` : null;

            const descResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, capital, utility, operacion, insumo, comprobante, proveedor, personal, actividad, relacionado, codrel)
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
                'transferencia a terceros',
                ${trans.insumo},
                ${comprobanteConHashDesc},
                ${trans.proveedor},
                ${trans.personal},
                ${trans.actividad},
                false,
                null
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
              ORDER BY fecha ASC, id ASC
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

            const adminProvResult = await db.execute(sql`
              INSERT INTO administracion (fecha, tipo, nombre, descripcion, monto, montodolares, unidad, proveedor, nrofactura, fechafactura, cancelada, restacancelar, comprobante, propietario, capital, utility, operacion, relacionado, codrel, anticipo)
              VALUES (
                ${trans.fecha}, 'cuentasporpagar', ${proveedorLower}, ${descripcionFinal}, ${montoNeg}, ${montoDolaresNeg},
                ${unidadEnviar}, ${proveedorLower}, ${nrofacturaLower}, ${fechafacturaOrig}, ${restacancelar <= 0}, ${restacancelar}, ${trans.comprobante},
                ${trans.propietario}, false, false, 'transferencia a terceros', ${bancoId ? true : false}, ${bancoId}, false
              )
              RETURNING *
            `);
            const adminProvRecord = adminProvResult.rows[0] as any;
            if (adminProvRecord) {
              resultados.administracion++;
              adminCreado = true;
              broadcast("administracion:create", adminProvRecord);
              if (bancoId) {
                await db.execute(sql`UPDATE bancos SET relacionado = true, codrel = ${adminProvRecord.id} WHERE id = ${bancoId}`);
              }
            }

            if (restacancelar <= 0) {
              await db.execute(sql`
                UPDATE administracion SET cancelada = true
                WHERE tipo = 'cuentasporpagar' AND proveedor = ${proveedorLower} AND nrofactura = ${nrofacturaLower}
              `);
              broadcast("administracion_updated");
            }
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

        const result = await db.execute(sql`
          INSERT INTO transferencias (id, fecha, proveedor, rifced, numcuenta, descripcion, monto, montodolares, deuda, resta, unidad, comprobante, propietario, transferido, contabilizado, ejecutada, utility, descuento, prestamo, tipo, nrofactura, anticipo)
          VALUES (gen_random_uuid(), ${fechaISO}, ${(rec.proveedor || '').toLowerCase()}, ${(rec.rifced || '').toLowerCase()}, ${(rec.numcuenta || '').toLowerCase()}, ${(rec.descripcion || '').toLowerCase()}, ${monto}, ${montodolares}, ${deuda}, ${resta}, ${(rec.unidad || '').toLowerCase()}, ${comprobante}, ${propietario}, false, false, false, false, 0, 0, ${tipo}, ${nrofactura}, ${anticipo})
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
        arrime: (id) => storage.deleteArrime(id),
        agrodata: (id) => storage.deleteAgrodata(id),
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
            'nucleo': 'nucleo',
            'azucar': 'azucar',
            'finca': 'finca',
            'fecha': 'fecha',
            'ruta': 'ruta',
            'chofer': 'chofer',
            'fletechofe': 'fletechofer',
            'flete': 'flete',
            'remesa': 'remesa',
            'tiket': 'ticket',
            'montochofe': 'montochofer',
            'monto': 'monto',
            'cancelado': 'cancelado',
            'proveedor': 'proveedor',
            'placa': 'placa',
            'cantidad': 'cantidad',
            'utility': 'utility',
            'descripcio': 'descripcion',
            'pagochofer': 'pagochofer',
            'brix': 'brix',
            'pol': 'pol',
            'torta': 'torta',
            'tablon': 'tablon',
            'grado': 'grado',
            'prop': 'propietario'
          },
          ignoreFields: ['_nullflags']
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
                } else if (['monto', 'montodolares', 'saldo', 'saldo_conciliado', 'deuda', 'resta', 'prestamo', 'descuento', 
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
                // Transform equiposdered → equiposred for "Equipos de Red" tab
                if (tipo === 'equiposdered') {
                  mappedRecord.tipo = 'equiposred';
                }
                // Transform almacen → suministro for Almacén supplies
                if (tipo === 'almacen') {
                  mappedRecord.tipo = 'suministro';
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
            whereClause = sql`${whereClause} AND nucleo = ${nucleoVal}`;
          }
        }
      }
      const dateClause = buildDateComparisonSQL("fecha", fechaInicio as string | undefined, fechaFin as string | undefined);
      whereClause = sql`${whereClause} ${dateClause}`;
      
      const advancedFilters = buildAdvancedFiltersSQL(req.query as Record<string, any>, "arrime");
      whereClause = sql`${whereClause} ${advancedFilters}`;
      
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM arrime ${whereClause}`);
      const total = parseInt((countResult.rows[0] as any).count) || 0;
      
      const query = sql`SELECT * FROM arrime ${whereClause} ORDER BY fecha DESC, id DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
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
      const allowed = ["nucleo", "placa", "proveedor"];
      if (!allowed.includes(field)) {
        return res.status(400).json({ error: "Campo no permitido" });
      }
      const result = await db.execute(
        sql`SELECT DISTINCT ${sql.identifier(field)} AS val FROM arrime WHERE ${sql.identifier(field)} IS NOT NULL AND ${sql.identifier(field)} != '' ORDER BY val`
      );
      res.json((result.rows as any[]).map((r: any) => r.val));
    } catch (error) {
      console.error("Error al obtener valores distintos de arrime:", error);
      res.status(500).json({ error: "Error al obtener valores distintos" });
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

      const imported = await storage.createArrimeBatch(records);

      broadcast("arrime_updated");
      res.json({ imported, total: records.length });
    } catch (error) {
      console.error("Error importing arrime data:", error);
      res.status(500).json({ error: "Error al importar datos de arrime" });
    }
  });

  // ============= BACKUP ENDPOINTS =============
  const BACKUP_DIR = path.join(process.cwd(), "backups");

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
      res.json({ tables });
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

  app.post("/api/backup", async (_req, res) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

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
      const filename = `respaldo_${loc.dd}-${loc.mm}-${loc.aa}_${loc.hh}-${loc.mi}-${loc.ss}.zip`;
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
      const response = await fetch("https://bcv-api.rafnixg.dev/rates/");
      if (!response.ok) throw new Error(`BCV API error: ${response.status}`);
      const data = await response.json() as { dollar: number; date: string };
      res.json({ valor: data.dollar, fecha: data.date });
    } catch (error: any) {
      console.error("Error al consultar BCV:", error);
      res.status(500).json({ error: "No se pudo obtener la tasa del BCV" });
    }
  });

  // ===== ENVIAR COMPROBANTES DE PAGO POR GMAIL =====
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

      res.json({ enviados: 0, enProceso: pagosConCorreo.length, sinCorreo: pagos.length - pagosConCorreo.length });

      (async () => {
        for (const pago of pagosConCorreo) {
          try {
            await enviarComprobantePago(pago);
          } catch (e: any) {
            console.error(`[GMAIL] Error enviando comprobante a ${pago.correo}: ${e.message}`);
          }
        }
        console.log(`[GMAIL] Proceso completado: ${pagosConCorreo.length} comprobantes procesados`);
      })();
    } catch (error: any) {
      console.error("Error en enviar comprobantes:", error);
      res.status(500).json({ error: "Error al enviar comprobantes" });
    }
  });

  // ============= GENERIC TABLE ENDPOINTS =============
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
      
      // Auto-populate propietario con usuario + fecha + hora (siempre sobreescribir)
      {
        const loc = getLocalDate();
        const username = (body._username || "sistema").trim() || "sistema";
        body.propietario = `${username} ${loc.dd}/${loc.mm}/${loc.yyyy} ${loc.hh}:${loc.mi}:${loc.ss}`;
      }
      delete body._username;
      
      // Agregar timestamp a fecha si es tabla con fecha
      if (tablasConFecha.includes(tableName)) {
        const loc = getLocalDate();
        const timestamp = `${loc.hh}:${loc.mi}:${loc.ss}`;
        if (body.fecha) {
          const ddmmMatch = String(body.fecha).match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
          if (ddmmMatch) {
            const [, dd, mm, yy] = ddmmMatch;
            const yyyy = yy.length === 2 ? `20${yy}` : yy;
            body.fecha = `${yyyy}-${mm}-${dd} ${timestamp}`;
          } else if (body.fecha.length === 10 && body.fecha.includes('-')) {
            body.fecha = body.fecha + ' ' + timestamp;
          }
        } else {
          body.fecha = `${loc.yyyy}-${loc.mm}-${loc.dd} ${timestamp}`;
        }
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
      
      // [ALMACEN] Recalcular existencia después de crear
      if (tableName === "almacen") {
        const registro = await config.create(body);
        
        if (registro.suministro) {
          const fechaNorm = normalizarFechaParaSQL(registro.fecha);
          await recalcularExistenciaAlmacen(registro.suministro, fechaNorm || undefined);
        }
        
        const registroActualizado = await db.execute(sql`SELECT * FROM almacen WHERE id = ${registro.id}`);
        const registroFinal = registroActualizado.rows[0] || registro;
        
        broadcast("almacen_updated");
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
        
        const registroActualizado = await db.execute(sql`SELECT * FROM almacen WHERE id = ${id}`);
        const registroFinal = registroActualizado.rows[0] || registro;
        
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
        broadcast("transferencias_updated");
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
        broadcast("transferencias_updated");
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
      
      // [ALMACEN] Recalcular existencia después de eliminar
      if (tableName === "almacen") {
        const almacenResult = await db.execute(sql`SELECT suministro, fecha FROM almacen WHERE id = ${id}`);
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
            ORDER BY fecha DESC, id DESC
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
        
        broadcast("almacen_updated");
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

  fetchBcvDolarEnSegundoPlano();

  return httpServer;
}

async function fetchBcvDolarEnSegundoPlano() {
  try {
    const response = await fetch("https://bcv-api.rafnixg.dev/rates/");
    if (!response.ok) throw new Error(`BCV API error: ${response.status}`);
    const data = await response.json() as { dollar: number; date: string };
    const valor = data.dollar;
    if (!valor || valor <= 0) return;

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
