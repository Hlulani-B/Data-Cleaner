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
  const [operationsMod, authMod, filesMod] = await Promise.all([
    import("../api/operations.js"),
    import("../api/auth.js"),
    import("../api/files.js"),
  ]);

  const operations = operationsMod.default;
  const auth = authMod.default;
  const files = filesMod.default;

  // ai.js depends on optional packages — load gracefully
  let ai = null;
  try {
    const aiMod = await import("../api/ai.js");
    ai = aiMod.default;
  } catch (err) {
    console.warn("AI module skipped — missing dependencies:", err.code || err.message);
  }

  // ─── Primary routes ───
  app.all("/api/operations", (req, res) => operations(req, res));
  app.all("/api/auth", (req, res) => auth(req, res));
  app.all("/api/files", (req, res) => files(req, res));
  if (ai) {
    app.all("/api/ai", (req, res) => ai(req, res));
  }

  // ─── Legacy routes → forward to operations (backward compat) ───
  const legacyOps = [
    "clean", "upper", "lower", "proper", "removeColumn",
    "removeEmpty", "missingValues", "dateStandard", "typeConversion",
    "duplicates", "trim", "datatype", "upload",
    "seperate", "join", "concatenate",
  ];

  for (const name of legacyOps) {
    const opName = name === "seperate" ? "separate" : name;
    app.all(`/api/${name}`, (req, res) => {
      req.body = { ...req.body, operation: opName };
      return operations(req, res);
    });
  }

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
