import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { notificarError } from "./telegram";

const app = express();

app.use(compression());
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '500mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '500mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let responseSummary: string | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (Array.isArray(bodyJson)) {
      responseSummary = `[Array(${bodyJson.length})]`;
    } else if (bodyJson && typeof bodyJson === "object") {
      const keys = Object.keys(bodyJson);
      if (keys.length <= 5) {
        try {
          const short = JSON.stringify(bodyJson);
          responseSummary = short.length > 500 ? short.substring(0, 500) + "..." : short;
        } catch { responseSummary = `{${keys.join(",")}}`; }
      } else {
        responseSummary = `{${keys.slice(0, 5).join(",")},...(${keys.length} keys)}`;
      }
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") && path !== "/api/health") {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (responseSummary) {
        logLine += ` :: ${responseSummary}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (status >= 500) {
      const usuario = req.headers["x-username"] as string || "Desconocido";
      const ventana = req.headers["x-active-window"] as string || "No especificada";
      const accion = req.headers["x-user-action"] as string || "No especificada";
      const contexto = `${req.method} ${req.path}`;
      
      notificarError(err, contexto, usuario, ventana, accion);
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
