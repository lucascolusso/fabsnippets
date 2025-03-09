import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Note: uploads directory is served in routes.ts

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Set up Vite or static serving before 404 handling
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Add generic error handler for Express
  app.use((req, res, next) => {
    // Generic handler for non-route-matched requests
    next();
  });

  // Add a general 404 handler for any undefined routes
  app.use((req, res) => {
    log(`404 - Not Found: ${req.originalUrl}`);
    res.status(404).json({ message: "Route not found" });
  });

  // Add error handling for the server
  const PORT = 5000;
  try {
    server.listen(PORT, "0.0.0.0", () => {
      log(`serving on port ${PORT}`);
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
      log(`Port ${PORT} is already in use. Please free up the port and try again.`);
      process.exit(1);
    }
    throw error;
  }
})();