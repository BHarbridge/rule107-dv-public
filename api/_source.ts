// Vercel serverless entry. Wraps the Express app from server/routes.ts.
//
// This file defers importing server/routes.ts until a request actually arrives,
// wraps it in a try/catch, and returns any init error as JSON so we can
// diagnose problems rather than getting an opaque FUNCTION_INVOCATION_FAILED.

import type { IncomingMessage, ServerResponse } from "node:http";

let appPromise: Promise<any> | null = null;
let initError: Error | null = null;

async function getApp() {
  if (appPromise) return appPromise;
  appPromise = (async () => {
    const [{ default: express }, http, routesModule] = await Promise.all([
      import("express"),
      import("node:http"),
      import("../server/routes"),
    ]);

    const app = express();
    const httpServer = http.createServer(app);

    app.use(
      express.json({
        verify: (req: any, _res: any, buf: Buffer) => {
          req.rawBody = buf;
        },
      }),
    );
    app.use(express.urlencoded({ extended: false }));

    await routesModule.registerRoutes(httpServer, app);

    // Central error handler — return JSON instead of HTML so the client can
    // surface the message.
    app.use((err: any, _req: any, res: any, _next: any) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("[api] error:", err);
      if (!res.headersSent) res.status(status).json({ error: message });
    });

    return app;
  })().catch((err) => {
    console.error("[api] init failed:", err);
    initError = err instanceof Error ? err : new Error(String(err));
    throw err;
  });
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    const message = initError?.message || err?.message || "Unknown init error";
    const stack = initError?.stack || err?.stack || "";
    console.error("[api] handler crash:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Serverless init failed",
        message,
        stack: process.env.VERCEL_ENV === "production" ? undefined : stack,
      }),
    );
  }
}
