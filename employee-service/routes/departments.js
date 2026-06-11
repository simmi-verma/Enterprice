const express = require("express");
const { body } = require("express-validator");
const {
  createDepartment, getDepartments, getDepartmentById,
  updateDepartment, deleteDepartment,
} = require("../controllers/departmentController");
const { verifyToken, requireRole } = require("../../shared/middleware/auth");

const router = express.Router();

const deptValidation = [
  body("name").trim().notEmpty().withMessage("Department name required").isLength({ min: 2, max: 100 }),
  body("description").optional().isLength({ max: 300 }),
  body("color").optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage("Valid hex color required"),
  body("budget.allocated").optional().isFloat({ min: 0 }),
];

// All routes require authentication + org scope
router.get("/",    verifyToken, getDepartments);
router.get("/:id", verifyToken, getDepartmentById);
router.post("/",   verifyToken, requireRole("admin"), deptValidation, createDepartment);
router.put("/:id", verifyToken, requireRole("admin"), updateDepartment);
router.delete("/:id", verifyToken, requireRole("admin"), deleteDepartment);

module.exports = router;
