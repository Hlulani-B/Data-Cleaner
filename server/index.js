import express from "express";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env FIRST — before any dynamic imports that read process.env
try { process.loadEnvFile(resolve(root, ".env")); } catch {}

async function start() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // ─── Dynamically import API handlers (after env is loaded) ───
  const handlerModules = await Promise.all([
    import("../api/auth.js"),
    import("../api/clean.js"),
    import("../api/upper.js"),
    import("../api/lower.js"),
    import("../api/proper.js"),
    import("../api/removeColumn.js"),
    import("../api/removeEmpty.js"),
    import("../api/missingValues.js"),
    import("../api/dateStandard.js"),
    import("../api/typeConversion.js"),
    import("../api/duplicates.js"),
    import("../api/trim.js"),
    import("../api/datatype.js"),
    import("../api/upload.js"),
    import("../api/seperate.js"),
    import("../api/join.js"),
    import("../api/concatenate.js"),
  ]);

  const routePaths = [
    "/api/auth",
    "/api/clean",
    "/api/upper",
    "/api/lower",
    "/api/proper",
    "/api/removeColumn",
    "/api/removeEmpty",
    "/api/missingValues",
    "/api/dateStandard",
    "/api/typeConversion",
    "/api/duplicates",
    "/api/trim",
    "/api/datatype",
    "/api/upload",
    "/api/seperate",
    "/api/join",
    "/api/concatenate",
  ];

  // Mount each handler at its route
  routePaths.forEach((path, i) => {
    const handler = handlerModules[i].default;
    app.all(path, (req, res) => handler(req, res));
  });

  // ─── Vite dev middleware (serves frontend + HMR) ───
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  const port = 3000;
  app.listen(port, () => {
    console.log(`\n  Data Cleaner dev server running at http://localhost:${port}\n`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
