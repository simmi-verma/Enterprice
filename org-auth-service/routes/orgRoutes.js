const express = require("express");
const { body } = require("express-validator");
const {
  registerOrg, getMyOrg, updateMyOrg,
  getOrgStats, getAllOrgs, healthCheck,
} = require("../controllers/orgController");
const { verifyToken, requireRole, requireSuperAdmin } = require("../../shared/middleware/auth");

const router = express.Router();

// ── Register validation ───────────────────────────────────
const registerValidation = [
  body("orgName").trim().notEmpty().withMessage("Organization name required").isLength({ min: 2, max: 100 }),
  body("orgEmail").isEmail().withMessage("Valid org email required").normalizeEmail(),
  body("adminName").trim().notEmpty().withMessage("Admin name required").isLength({ min: 2 }),
  body("adminEmail").isEmail().withMessage("Valid admin email required").normalizeEmail(),
  body("adminPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/\d/).withMessage("Password must contain at least one number"),
  body("industry").optional().isIn(["technology","healthcare","finance","education","retail","manufacturing","other"]),
  body("size").optional().isIn(["1-10","11-50","51-200","201-500","500+"]),
];

// ── Public ────────────────────────────────────────────────
router.get("/health", healthCheck);
router.post("/register", registerValidation, registerOrg);

// ── Admin (own org) ───────────────────────────────────────
router.get("/me", verifyToken, requireRole("admin", "superadmin"), getMyOrg);
router.put("/me", verifyToken, requireRole("admin"), updateMyOrg);
router.get("/me/stats", verifyToken, requireRole("admin", "manager"), getOrgStats);

// ── Super Admin ───────────────────────────────────────────
router.get("/", verifyToken, requireSuperAdmin, getAllOrgs);

module.exports = router;
