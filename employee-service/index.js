require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const morgan   = require("morgan");
const rateLimit = require("express-rate-limit");

const employeeRoutes   = require("./routes/employees");
const departmentRoutes = require("./routes/departments");
const logger           = require("../shared/utils/logger");
const { connect: connectRabbitMQ } = require("../shared/utils/rabbitmq");

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(express.json({ limit: "10kb" }));
app.use(morgan("dev"));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { success: false, message: "Too many requests" },
}));

app.use("/employees",  employeeRoutes);
app.use("/departments", departmentRoutes);

app.get("/", (req, res) => res.json({
  service: "EnterpriseDesk Employee Service",
  version: "1.0.0", status: "running",
}));

app.use((req, res) => res.status(404).json({
  success: false, message: `Route ${req.originalUrl} not found`,
}));

app.use((err, req, res, next) => {
  logger.error("Unhandled error:", { error: err.message });
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false, message: "Validation error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "Duplicate entry" });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  res.status(500).json({ success: false, message: "Something went wrong" });
});

const start = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/enterprisedesk_employees"
    );
    logger.info("MongoDB connected - Employee Service");

    try {
      await connectRabbitMQ();
    } catch (err) {
      logger.warn("RabbitMQ not available:", { error: err.message });
    }

    app.listen(PORT, () => logger.info(` Employee Service running on port ${PORT}`));
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
