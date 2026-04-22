// Pre-bundle api/index.ts + server + shared into a single api/index.js so
// Vercel's Node runtime can execute it without hunting for relative TS imports
// across the repo.
import { build } from "esbuild";

await build({
  entryPoints: ["api/_source.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  // Keep node_modules external so Vercel's node_modules layer is reused.
  packages: "external",
  // Supabase uses `crypto` and Express uses `node:*` modules; ensure they're
  // treated as Node built-ins.
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});

console.log("[api/_build] api/index.js bundled");
