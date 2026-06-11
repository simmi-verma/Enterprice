const express = require("express");
const { body } = require("express-validator");
const {
  addEmployee, getEmployees, getEmployeeById,
  updateEmployee, updateSalary, terminateEmployee,
  getEmployeeStats, healthCheck,
} = require("../controllers/employeeController");
const { verifyToken, requireRole } = require("../../shared/middleware/auth");

const router = express.Router();

// ── Validation ────────────────────────────────────────────
const addEmployeeValidation = [
  body("firstName").trim().notEmpty().withMessage("First name required").isLength({ min: 2, max: 50 }),
  body("lastName").trim().notEmpty().withMessage("Last name required").isLength({ min: 1, max: 50 }),
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("jobTitle").trim().notEmpty().withMessage("Job title required"),
  body("joiningDate").optional().isISO8601().withMessage("Valid date required (YYYY-MM-DD)"),
  body("role").optional().isIn(["admin","manager","employee"]).withMessage("Invalid role"),
  body("employmentType").optional().isIn(["full_time","part_time","contract","intern"]),
  body("workLocation").optional().isIn(["office","remote","hybrid"]),
  body("salary.amount").optional().isFloat({ min: 0 }).withMessage("Valid salary required"),
];

// ── Public ────────────────────────────────────────────────
router.get("/health", healthCheck);

// ── All authenticated users ───────────────────────────────
router.get("/stats", verifyToken, requireRole("admin", "manager"), getEmployeeStats);
router.get("/", verifyToken, getEmployees);
router.get("/:id", verifyToken, getEmployeeById);

// ── Admin / Manager ───────────────────────────────────────
router.post("/", verifyToken, requireRole("admin", "manager"), addEmployeeValidation, addEmployee);
router.put("/:id", verifyToken, requireRole("admin", "manager"), updateEmployee);

// ── Admin only — sensitive operations ────────────────────
router.put("/:id/salary", verifyToken, requireRole("admin"), [
  body("amount").isFloat({ min: 0 }).withMessage("Valid salary amount required"),
], updateSalary);
router.delete("/:id", verifyToken, requireRole("admin"), terminateEmployee);

module.exports = router;
