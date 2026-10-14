const express = require("express");
const cors = require("cors");
const config = require("./config");
const routes = require("./routes");
const blockchain = require("./blockchain");

const app = express();

// Middlewares
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith("/api")) {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Root landing endpoint
app.get("/", (req, res) => {
  res.json({
    project: "ChainGuard - IoT Firmware Downgrade Protection System",
    version: "1.0.0",
    docs: "/api/status",
    endpoints: [
      "GET  /api/status",
      "GET  /api/devices",
      "POST /api/devices",
      "POST /api/devices/:id/advance-version",
      "GET  /api/firmwares",
      "POST /api/firmwares/register",
      "POST /api/firmwares/:id/approve",
      "POST /api/firmwares/:id/revoke",
      "POST /api/verify",
      "POST /api/authorize",
      "GET  /api/events",
      "GET  /api/stats",
      "GET  /api/demo/samples",
      "POST /api/demo/seed",
      "POST /api/demo/run-scenario",
    ],
  });
});

// Mount API routes
app.use("/api", routes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[ServerError]:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// Start Server
if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, "0.0.0.0", async () => {
    console.log("=================================================");
    console.log(` ChainGuard Backend Gateway running on port ${config.port}`);
    console.log(` RPC Endpoint: ${config.rpcUrl}`);
    console.log("=================================================");

    const connected = await blockchain.isBlockchainConnected();
    if (connected) {
      console.log("✓ Successfully connected to local blockchain RPC");
      const addr = blockchain.loadDeployedAddress();
      if (addr) {
        console.log(`✓ Contract loaded at: ${addr}`);
      } else {
        console.log("! Note: Contract not yet deployed. Run 'npm run deploy:local'.");
      }
    } else {
      console.log("! Notice: Local Hardhat node is not running.");
      console.log("  Start it in another terminal: npm run node");
    }
  });
}

module.exports = app;
