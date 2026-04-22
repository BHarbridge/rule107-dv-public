// Vercel serverless entry. Wraps the Express app from server/routes.ts so the
// entire /api/* tree runs as a single Node serverless function.
//
// Local development still uses server/index.ts on port 5000. This file is
// ONLY invoked by Vercel (see vercel.json).

import "dotenv/config";
import express, { Response, NextFunction, Request } from "express";
import { createServer } from "node:http";
import { registerRoutes } from "../server/routes";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Register all /api routes. We intentionally do NOT mount the static frontend
// here — Vercel serves dist/public as static files directly (configured in
// vercel.json).
const ready = registerRoutes(httpServer, app).then(() => {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (!res.headersSent) res.status(status).json({ message });
  });
});

export default async function handler(req: any, res: any) {
  await ready;
  return (app as any)(req, res);
}
