const express = require("express");
const { body } = require("express-validator");
const {verifyToken, requireRole}=require("../../shared/middleware/auth");
const getDepartments=require("../controllers/departmentController.js");

const router=express.Router();

const deptValidation = [
  body("name").trim().notEmpty().withMessage("Department name required").isLength({ min: 2, max: 100 }),
  body("description").optional().isLength({ max: 300 }),
  body("color").optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage("Valid hex color required"),
  body("budget.allocated").optional().isFloat({ min: 0 }),
];
router.get("/",    verifyToken, getDepartments);

module.exports=router;