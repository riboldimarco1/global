import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { insertRegistroSchema, insertCentralSchema, insertFincaSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar registro" });
    }
  });

  app.delete("/api/registros", async (req, res) => {
    try {
      await storage.deleteAllRegistros();
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
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

      if (data.length === 0) {
        return res.status(400).json({ error: "El archivo Excel está vacío" });
      }

      // Log column names for debugging
      if (data.length > 0) {
        console.log("Excel columns found:", Object.keys(data[0]));
        console.log("First row sample:", JSON.stringify(data[0]));
      }

      const groupedByDate: Record<string, { totalNeto: number; grados: number[]; finca: string }> = {};

      for (const row of data) {
        let fecha: string | null = null;
        
        const diaValue = row["día"] || row["dia"] || row["Día"] || row["Dia"] || row["DIA"];
        if (diaValue !== undefined && diaValue !== null) {
          if (typeof diaValue === "number") {
            const excelDate = XLSX.SSF.parse_date_code(diaValue);
            if (excelDate) {
              const year = excelDate.y;
              const month = String(excelDate.m).padStart(2, "0");
              const day = String(excelDate.d).padStart(2, "0");
              fecha = `${year}-${month}-${day}`;
            }
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

        const neto = parseFloat(row["Neto"] || row["neto"] || row["NETO"] || 0);
        const grado = parseFloat(row["Grado"] || row["grado"] || row["GRADO"] || 0);
        const fincaRaw = row["nombre hda"] || row["Nombre Hda"] || row["NOMBRE HDA"] || row["nombre_hda"] || "";
        const finca = String(fincaRaw).trim();

        if (isNaN(neto) || neto <= 0) continue;

        if (!groupedByDate[fecha]) {
          groupedByDate[fecha] = { totalNeto: 0, grados: [], finca: finca };
        }

        groupedByDate[fecha].totalNeto += neto;
        if (!isNaN(grado) && grado > 0) {
          groupedByDate[fecha].grados.push(grado);
        }
      }

      const dates = Object.keys(groupedByDate);
      if (dates.length === 0) {
        return res.status(400).json({ error: "No se encontraron registros válidos en el archivo" });
      }

      const deletedCount = await storage.deleteRegistrosByDatesAndCentral(dates, "Palmar");

      const createdRegistros = [];
      for (const [fecha, data] of Object.entries(groupedByDate)) {
        const avgGrado = data.grados.length > 0 
          ? data.grados.reduce((a, b) => a + b, 0) / data.grados.length 
          : undefined;

        const fincaCapitalized = data.finca 
          ? data.finca.charAt(0).toUpperCase() + data.finca.slice(1).toLowerCase()
          : undefined;

        const registro = await storage.createRegistro({
          fecha,
          central: "Palmar",
          cantidad: Math.round(data.totalNeto * 100) / 100,
          grado: avgGrado ? Math.round(avgGrado * 100) / 100 : undefined,
          finca: fincaCapitalized || undefined,
        });
        createdRegistros.push(registro);
      }

      res.json({
        message: `Se procesaron ${createdRegistros.length} registros`,
        deleted: deletedCount,
        created: createdRegistros.length,
        registros: createdRegistros,
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ error: "Error al procesar el archivo Excel" });
    }
  });

  return httpServer;
}
