const crypto = require("crypto");
if (!global.crypto) {
  global.crypto = crypto.webcrypto;
}

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const orgRoutes  = require("./routes/orgRoutes");
const authRoutes = require("./routes/authRoutes");
const logger     = require("../shared/utils/logger");
const { connect: connectRabbitMQ } = require("../shared/utils/rabbitmq");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(express.json({ limit: "10kb" }));
app.use(morgan("dev"));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { success: false, message: "Too many requests" },
}));

// ── Routes ────────────────────────────────────────────────
app.use("/orgs",  orgRoutes);
app.use("/auth",  authRoutes);

app.get("/", (req, res) => res.json({
  service: "EnterpriseDesk Org & Auth Service",
  version: "1.0.0", status: "running",
}));

app.use((req, res) => res.status(404).json({
  success: false, message: `Route ${req.originalUrl} not found`,
}));

// ── Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", { error: err.message });
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false, message: "Validation error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }
  res.status(500).json({ success: false, message: "Something went wrong" });
});

// ── Start ─────────────────────────────────────────────────
const start = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/enterprisedesk_org"
    );
    logger.info(" MongoDB connected - Org Auth Service");

    try {
      await connectRabbitMQ();
    } catch (err) {
      logger.warn("RabbitMQ not available, continuing without events:", { error: err.message });
    }

    app.listen(PORT, () => logger.info(` Org Auth Service running on port ${PORT}`));
  } catch (err) {
    logger.error("Startup failed:", { error: err.message });
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  process.exit(0);
});

start();
module.exports = app;
