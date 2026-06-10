const express=require("express");
const {body}=require("express-validator")
const {
  login, refreshToken, logout,
  getMe, updateMe, changePassword,
} = require("../controllers/authContorller.js")
const { verifyToken } = require("../../shared/middleware/auth");

const rateLimit = require("express-rate-limit");
const router=express.Router();

const loginValidation = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password required"),
];
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." },
});

router.post("/login", loginValidation, login);
router.post("/refresh", refreshToken);

router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);
router.put("/me", verifyToken, updateMe);
router.put("/change-password", verifyToken, [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password min 6 chars"),
], changePassword);


module.exports=router;