import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRegistroSchema, insertCentralSchema } from "@shared/schema";

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

  return httpServer;
}
