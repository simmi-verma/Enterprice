require("dotenv").config;
const express =require("express");
const mongoose= require("mongoose");
const cors=require("cors");
const morgan=require("morgan");
const rateLimit = require("express-rate-limit");
const app=express();
const employeeRouter=require("./routes/employee");
const department=require("./routes/department");

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
app.use("*", (req, res) => res.status(404).json({
  success: false, message: `Route ${req.originalUrl} not found`,
}));

app.get("/", (req, res) => res.json({
  service: "EnterpriseDesk Employee Service",
  version: "1.0.0", status: "running",
}));


app.listen(3000, ()=>{
    console.log("running")
});