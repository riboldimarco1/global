import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRegistroSchema } from "@shared/schema";

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

  return httpServer;
}
