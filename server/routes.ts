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
          if (rowStr.some(c => c === "dia" || c === "día") && rowStr.some(c => c === "neto")) {
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
      const netoCol = headers.findIndex(h => h.toLowerCase() === "neto");
      const fincaCol = headers.findIndex(h => h.toLowerCase().includes("nombre") && h.toLowerCase().includes("hda"));
      const rtoCol = headers.findIndex(h => h.toLowerCase() === "rto" || h.toLowerCase() === "rto ajt" || h.toLowerCase().startsWith("rto"));
      const nucleoCol = headers.findIndex(h => h.toLowerCase() === "nucleo" || h.toLowerCase() === "núcleo");
      const remesaCol = headers.findIndex(h => h.toLowerCase() === "remesa" || h.toLowerCase() === "rem" || h.toLowerCase().includes("remesa"));

      console.log("Column indices - Dia:", diaCol, "Neto:", netoCol, "Finca:", fincaCol, "RTO:", rtoCol, "Nucleo:", nucleoCol, "Remesa:", remesaCol);

      const existingRemesas = await storage.getExistingRemesas();
      const existingRemesasSet = new Set(existingRemesas.map(r => r.trim()));

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

        // Skip if remesa already exists in database
        if (remesaCol >= 0) {
          const remesaValue = String(row[remesaCol] || "").trim();
          if (remesaValue && existingRemesasSet.has(remesaValue)) {
            continue;
          }
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
        return res.status(400).json({ error: "No se encontraron registros válidos en el archivo (pueden ser duplicados)" });
      }

      const createdRegistros = [];
      for (const [fecha, data] of Object.entries(groupedByDate)) {
        const avgGrado = data.grados.length > 0 
          ? data.grados.reduce((a, b) => a + b, 0) / data.grados.length 
          : undefined;

        const fincaCapitalized = data.finca 
          ? data.finca.charAt(0).toUpperCase() + data.finca.slice(1).toLowerCase()
          : undefined;

        const remesasArray = Array.from(data.remesas);
        const remesaStr = remesasArray.length > 0 ? remesasArray.join(", ") : undefined;

        const registro = await storage.createRegistro({
          fecha,
          central: "Palmar",
          cantidad: Math.round(data.totalNeto * 100) / 100,
          grado: avgGrado ? Math.round(avgGrado * 100) / 100 : undefined,
          finca: fincaCapitalized || undefined,
          remesa: remesaStr,
        });
        createdRegistros.push(registro);
      }

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

      console.log("Column indices - Finca:", fincaCol, "Fecha:", fechaCol, "Cantidad:", cantidadCol, "Grado:", gradoCol);

      let totalCantidad = 0;
      let totalGradoWeighted = 0;
      let firstFinca = "";
      let firstFecha = "";

      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) continue;

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

      if (totalCantidad <= 0) {
        return res.status(400).json({ error: "No se encontraron registros válidos con cantidad" });
      }

      const avgGrado = totalCantidad > 0 && totalGradoWeighted > 0 
        ? totalGradoWeighted / totalCantidad 
        : undefined;

      const fincaCapitalized = firstFinca 
        ? firstFinca.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        : undefined;

      const fechaToUse = firstFecha || new Date().toISOString().split('T')[0];

      // Delete any existing Portuguesa registro for this date to avoid duplicates
      await storage.deleteRegistrosByDatesAndCentral([fechaToUse], "Portuguesa");

      const registro = await storage.createRegistro({
        fecha: fechaToUse,
        central: "Portuguesa",
        cantidad: Math.round(totalCantidad * 100) / 100,
        grado: avgGrado ? Math.round(avgGrado * 100) / 100 : undefined,
        finca: fincaCapitalized || undefined,
      });

      res.json({
        message: "Registro creado exitosamente",
        created: 1,
        registro,
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ error: "Error al procesar el archivo Excel" });
    }
  });

  return httpServer;
}
