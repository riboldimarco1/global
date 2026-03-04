import type { Express, Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { chatStorage } from "./storage";
import { pool } from "../../db";
import multer from "multer";
import * as XLSX from "xlsx";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".csv", ".xls", ".xlsx"];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Solo se permiten archivos .csv, .xls, .xlsx"));
  },
});

const FORBIDDEN_SQL = /\b(DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|ALTER\s+TABLE|CREATE\s+TABLE|CREATE\s+INDEX|DROP\s+INDEX|GRANT|REVOKE|CREATE\s+ROLE|DROP\s+ROLE)\b/i;
const DANGEROUS_DML = /\b(DELETE\s+FROM|UPDATE)\b/i;
const HAS_WHERE = /\bWHERE\b/i;
const MULTI_STATEMENT = /;\s*\S/;

const DB_SCHEMA = `
Eres un asistente inteligente para un sistema de gestión agrícola. Tienes acceso completo a la base de datos PostgreSQL.
Responde siempre en español. Sé conciso y directo.

ESQUEMA DE TABLAS:

1. parametros - Catálogos del sistema (proveedores, choferes, unidades, bancos, etc.)
   Columnas: id (varchar PK UUID), fecha (date), tipo (varchar), nombre (varchar), unidad (varchar), unidaddemedida (varchar), direccion (varchar), telefono (varchar), ced_rif (varchar), descripcion (varchar), habilitado (boolean), cheque (boolean), transferencia (boolean), propietario (varchar), operador (text), valor (numeric), costo (numeric), precio (numeric), categoria (varchar), cuenta (varchar), correo (varchar), proveedor (varchar), chofer (varchar), hectareas (numeric), cargo (varchar), secuencia (integer)
   Nota: tipo puede ser: 'banco', 'proveedor', 'chofer', 'unidad', 'insumo', 'suministro', 'producto', 'actividad', 'personal', 'cliente', 'equipo', 'opagro', 'cultivo', 'maquinaria', 'dolar', etc.

2. bancos - Movimientos bancarios
   Columnas: id (varchar PK UUID), fecha (text, formato "YYYY-MM-DD HH:MM:SS"), monto (numeric), montodolares (numeric), saldo (numeric), saldo_conciliado (numeric), operacion (text: 'suma'|'resta'), descripcion (text), conciliado (boolean), utility (boolean), banco (text - nombre del banco), operador (text), propietario (text), comprobante (text), relacionado (boolean), secuencia (integer)

3. administracion - Gastos e ingresos administrativos
   Columnas: id (varchar PK UUID), fecha (text), tipo (varchar: 'gasto'|'ingreso'), nombre (varchar), descripcion (text), monto (numeric), montodolares (numeric), unidad (varchar), capital (boolean), utility (boolean), producto (varchar), cantidad (numeric), insumo (varchar), proveedor (varchar), cliente (varchar), personal (varchar), actividad (varchar), propietario (varchar), anticipo (boolean), unidaddemedida (varchar), codrel (text - FK a bancos.id), relacionado (boolean), nrofactura (text), fechafactura (text), cancelada (boolean), enviada (boolean), restacancelar (numeric), secuencia (integer)

4. cosecha - Registros de cosecha
   Columnas: id (varchar PK UUID), fecha (text), numero (integer), chofer (varchar), placa (varchar), ciclo (varchar), destino (varchar), torbas (numeric), tablon (varchar), cantidad (numeric), cantnet (numeric), descporc (numeric), cancelado (boolean), guiamov (integer), guiamat (integer), descripcion (varchar), utility (boolean), unidad (varchar), cultivo (varchar), central (varchar), propietario (varchar), secuencia (integer)

5. almacen - Inventario de insumos/suministros
   Columnas: id (varchar PK UUID), unidad (varchar), fecha (text), comprobante (varchar), suministro (varchar), movimiento (varchar: 'entrada'|'salida'), descripcion (text), monto (numeric), montodolares (numeric), utility (boolean), propietario (varchar), categoria (varchar), cantidad (numeric), unidaddemedida (varchar), codrel (text), relacionado (boolean), secuencia (integer)

6. agronomia - Operaciones agronómicas
   Columnas: id (varchar PK UUID), opagro (varchar), unidad (varchar), fecha (text), descripcion (text), tablon (varchar), hectareas (numeric), ciclo (varchar), codrel (text), relacionado (boolean), utility (boolean), propietario (varchar), secuencia (integer)

7. arrime - Transporte de caña
   Columnas: id (varchar PK UUID), finca (varchar), fecha (text), proveedor (varchar), placa (varchar), neto (numeric), central (varchar), nucleocorte (varchar), nucleotransporte (varchar), descripcion (text), utility (boolean), propietario (varchar), feriado (boolean), secuencia (integer)

8. transferencias - Transferencias bancarias
   Columnas: id (varchar PK UUID), banco (varchar), fecha (text), monto (numeric), montodolares (numeric), proveedor (varchar), descripcion (text), utility (boolean), propietario (varchar), transferido (boolean), contabilizado (boolean), actividad (varchar), tipo (varchar), ejecutada (boolean), secuencia (integer)

9. agrodata - Dispositivos y equipos de red
   Columnas: id (varchar PK UUID), plan (varchar), estado (varchar), equipo (varchar), ip (varchar), mac (varchar), descripcion (text), nombre (varchar), utility (boolean), propietario (varchar), secuencia (integer)

10. reparaciones - Reparaciones de maquinaria
    Columnas: id (varchar PK UUID), fecha (text), maquinarias (varchar), unidad (varchar), descripcion (text), monto (numeric), montodolares (numeric), utility (boolean), propietario (varchar), secuencia (integer)

11. bitacora - Registro de actividades/notas
    Columnas: id (varchar PK UUID), utility (boolean), fecha (text), descripcion (text), unidad (varchar), propietario (varchar), secuencia (integer)

REGLAS IMPORTANTES:
- Los IDs son UUIDs generados automáticamente. No generes IDs manualmente al insertar.
- El campo "fecha" en la mayoría de tablas es TEXT con formato "YYYY-MM-DD HH:MM:SS".
- El campo "propietario" almacena el usuario que creó el registro.
- El campo "utility" marca registros eliminados lógicamente (true = eliminado).
- El campo "unidad" se refiere a la finca/unidad productiva.
- Para montos en dólares usa "montodolares", para bolívares usa "monto".
- Relación Bancos↔Admin: administracion.codrel = bancos.id (unidireccional).
- NUNCA ejecutes DROP, TRUNCATE, ALTER TABLE, CREATE TABLE u otras operaciones DDL.
- Cuando el usuario pida modificar datos, usa UPDATE/INSERT/DELETE según corresponda.
- Para consultas de resumen, usa funciones de agregación (SUM, COUNT, AVG, etc.).
- Si el usuario pide algo ambiguo, pregunta antes de ejecutar.
- Limita los resultados a 100 filas máximo a menos que el usuario pida más.
- Formatea números grandes con separadores cuando muestres resultados.
`;

function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60) || "col";
}

function inferPgType(values: any[]): string {
  const samples = values.filter(v => v !== null && v !== undefined && String(v).trim() !== "").slice(0, 50);
  if (samples.length === 0) return "TEXT";

  let allNumeric = true;
  let allInteger = true;
  for (const v of samples) {
    const s = String(v).replace(/,/g, "").trim();
    if (isNaN(Number(s))) { allNumeric = false; allInteger = false; break; }
    if (s.includes(".")) allInteger = false;
  }
  if (allInteger && allNumeric) return "BIGINT";
  if (allNumeric) return "NUMERIC";
  return "TEXT";
}

async function getUploadedTables(conversationId: number): Promise<{ tableName: string; columns: string[] }[]> {
  try {
    const result = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE $1`,
      [`ai_upload_${conversationId}_%`]
    );
    const tables: { tableName: string; columns: string[] }[] = [];
    for (const row of result.rows) {
      const colResult = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [row.tablename]
      );
      tables.push({
        tableName: row.tablename,
        columns: colResult.rows.map((c: any) => c.column_name),
      });
    }
    return tables;
  } catch {
    return [];
  }
}

async function dropConversationTables(conversationId: number): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE $1`,
      [`ai_upload_${conversationId}_%`]
    );
    for (const row of result.rows) {
      await pool.query(`DROP TABLE IF EXISTS "${row.tablename}"`);
    }
  } catch (err) {
    console.error("Error dropping conversation tables:", err);
  }
}

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      const uploadedTables = await getUploadedTables(id);
      res.json({ ...conversation, messages, uploadedTables });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "Nueva conversación");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await dropConversationTables(id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/upload", chatUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversación no encontrada" });
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (jsonData.length < 2) {
        return res.status(400).json({ error: "El archivo no tiene suficientes datos (necesita al menos encabezados y una fila)" });
      }

      const headerRow = jsonData[0].map((h: any, i: number) => {
        const name = sanitizeColumnName(String(h || `col_${i + 1}`));
        return name;
      });

      const seen = new Set<string>();
      const uniqueHeaders = headerRow.map((h: string) => {
        let name = h;
        let suffix = 2;
        while (seen.has(name)) { name = `${h}_${suffix++}`; }
        seen.add(name);
        return name;
      });

      const dataRows = jsonData.slice(1).filter((row: any[]) => row.some((v: any) => v !== null && v !== undefined && String(v).trim() !== ""));

      if (dataRows.length === 0) {
        return res.status(400).json({ error: "El archivo no contiene datos (solo encabezados)" });
      }

      const columnTypes = uniqueHeaders.map((_: string, colIdx: number) => {
        const colValues = dataRows.map((row: any[]) => row[colIdx]);
        return inferPgType(colValues);
      });

      const baseName = file.originalname
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 30) || "archivo";

      const tableName = `ai_upload_${conversationId}_${baseName}`;

      await pool.query(`DROP TABLE IF EXISTS "${tableName}"`);

      const colDefs = uniqueHeaders.map((h: string, i: number) => `"${h}" ${columnTypes[i]}`).join(", ");
      await pool.query(`CREATE TABLE "${tableName}" (fila_id SERIAL PRIMARY KEY, ${colDefs})`);

      const BATCH = 200;
      for (let b = 0; b < dataRows.length; b += BATCH) {
        const batch = dataRows.slice(b, b + BATCH);
        const placeholders: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;

        for (const row of batch) {
          const rowPlaceholders: string[] = [];
          for (let c = 0; c < uniqueHeaders.length; c++) {
            const val = row[c];
            const strVal = val === null || val === undefined ? null : String(val).trim();
            if (strVal === null || strVal === "") {
              rowPlaceholders.push(`$${paramIdx++}`);
              values.push(null);
            } else if (columnTypes[c] === "BIGINT" || columnTypes[c] === "NUMERIC") {
              const numVal = strVal.replace(/,/g, "");
              rowPlaceholders.push(`$${paramIdx++}`);
              values.push(isNaN(Number(numVal)) ? null : numVal);
            } else {
              rowPlaceholders.push(`$${paramIdx++}`);
              values.push(strVal);
            }
          }
          placeholders.push(`(${rowPlaceholders.join(", ")})`);
        }

        const colNames = uniqueHeaders.map((h: string) => `"${h}"`).join(", ");
        await pool.query(`INSERT INTO "${tableName}" (${colNames}) VALUES ${placeholders.join(", ")}`, values);
      }

      res.json({
        tableName,
        fileName: file.originalname,
        rowCount: dataRows.length,
        columns: uniqueHeaders,
        columnTypes,
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: error.message || "Error al procesar archivo" });
    }
  });

  app.get("/api/conversations/export-query", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string;
      if (!query) {
        return res.status(400).json({ error: "Query requerida" });
      }
      const trimmed = query.trim().replace(/^--[^\n]*\n/gm, "").trim();
      const isSelect = /^\s*(SELECT|WITH\s)/i.test(trimmed) && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|CALL|DO|EXECUTE)\b/i.test(trimmed);
      if (!isSelect) {
        return res.status(403).json({ error: "Solo se permiten consultas SELECT para exportar" });
      }
      if (MULTI_STATEMENT.test(query)) {
        return res.status(403).json({ error: "No se permiten múltiples sentencias" });
      }

      const result = await pool.query(query);
      const rows = result.rows || [];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Resultados");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="resultados.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      console.error("Error exporting query:", error);
      res.status(500).json({ error: error.message || "Error al exportar" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      await chatStorage.createMessage(conversationId, "user", content);

      const allMessages = await chatStorage.getMessagesByConversation(conversationId);
      const chatHistory = allMessages.map((m) => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.content }],
      }));

      const uploadedTables = await getUploadedTables(conversationId);
      let extraContext = "";
      if (uploadedTables.length > 0) {
        extraContext = "\n\nTABLAS CARGADAS POR EL USUARIO (archivos Excel/CSV importados a esta conversación):\n";
        for (const t of uploadedTables) {
          const countResult = await pool.query(`SELECT COUNT(*) as total FROM "${t.tableName}"`);
          const total = countResult.rows[0]?.total || 0;
          extraContext += `- Tabla "${t.tableName}" (${total} filas): columnas [${t.columns.join(", ")}]\n`;
        }
        extraContext += "Puedes consultar estas tablas con SELECT y también cruzarlas con las tablas del sistema. La columna 'fila_id' es el identificador de fila auto-generado.\n";
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";
      const MAX_TOOL_ROUNDS = 8;
      let toolRound = 0;

      const executeSQL = async (query: string): Promise<{ success: boolean; data?: any[]; rowCount?: number; error?: string }> => {
        if (FORBIDDEN_SQL.test(query)) {
          return { success: false, error: "Operación no permitida (DDL prohibido)" };
        }
        if (MULTI_STATEMENT.test(query)) {
          return { success: false, error: "No se permiten múltiples sentencias SQL en una sola ejecución" };
        }
        if (DANGEROUS_DML.test(query) && !HAS_WHERE.test(query)) {
          return { success: false, error: "UPDATE y DELETE requieren cláusula WHERE para evitar modificaciones masivas accidentales" };
        }
        try {
          const result = await pool.query(query);
          return {
            success: true,
            data: result.rows?.slice(0, 100),
            rowCount: result.rowCount ?? 0,
          };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      };

      const tools = [{
        functionDeclarations: [{
          name: "ejecutar_sql",
          description: "Ejecuta una consulta SQL en la base de datos PostgreSQL. Usa SELECT para consultar, INSERT/UPDATE/DELETE para modificar datos. NUNCA uses DDL (DROP, ALTER, TRUNCATE, CREATE) en tablas del sistema.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description: "La consulta SQL a ejecutar",
              },
              description: {
                type: Type.STRING,
                description: "Breve descripción de lo que hace la consulta, en español",
              },
            },
            required: ["query", "description"],
          },
        }],
      }];

      let currentContents = [
        { role: "user" as const, parts: [{ text: DB_SCHEMA + extraContext }] },
        { role: "model" as const, parts: [{ text: "Entendido. Soy tu asistente de gestión agrícola con acceso a la base de datos. Puedo consultar, analizar y modificar datos. ¿En qué puedo ayudarte?" }] },
        ...chatHistory,
      ];

      while (toolRound < MAX_TOOL_ROUNDS) {
        toolRound++;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: currentContents,
          config: {
            tools,
            maxOutputTokens: 8192,
          },
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) break;

        const parts = candidate.content.parts;
        const functionCalls = parts.filter((p: any) => p.functionCall);
        const textParts = parts.filter((p: any) => p.text);

        if (functionCalls.length > 0) {
          for (const fc of functionCalls) {
            const call = (fc as any).functionCall;
            const sqlQuery = call.args?.query as string;
            const sqlDesc = call.args?.description as string || "";

            res.write(`data: ${JSON.stringify({ sql: { query: sqlQuery, description: sqlDesc } })}\n\n`);

            const sqlResult = await executeSQL(sqlQuery);

            res.write(`data: ${JSON.stringify({ sqlResult: { success: sqlResult.success, rowCount: sqlResult.rowCount, error: sqlResult.error, preview: sqlResult.data?.slice(0, 5) } })}\n\n`);

            currentContents.push({
              role: "model" as const,
              parts: [{ functionCall: { name: call.name, args: call.args } }] as any,
            });
            currentContents.push({
              role: "user" as const,
              parts: [{ functionResponse: { name: call.name, response: sqlResult } }] as any,
            });
          }
          continue;
        }

        if (textParts.length > 0) {
          for (const tp of textParts) {
            const text = (tp as any).text || "";
            if (text) {
              fullResponse += text;
              res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
            }
          }
          break;
        }

        break;
      }

      if (fullResponse) {
        await chatStorage.createMessage(conversationId, "assistant", fullResponse);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message || "Error al procesar mensaje" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
