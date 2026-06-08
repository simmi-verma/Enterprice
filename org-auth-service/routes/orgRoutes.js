const express=require("express");
const app=express();
const{ registerOrg}=require("../controllers/orgContoller")
const { body } = require("express-validator");
const router=express.Router();
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

router.post("/register", registerValidation, registerOrg);

module.exports=router;