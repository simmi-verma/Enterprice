const jwt = require("jsonwebtoken");

// ── Verify Token + inject orgId into req ──────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { userId, orgId, role, name, email, iat, exp }
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired, please login again" });
    }
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

// ── Role-Based Access Control ─────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(" or ")}`,
    });
  }
  next();
};

// ── Org Isolation Middleware ───────────────────────────────
// Ensures users can only access their own org's data
// Attach to any route that touches org-specific data
const requireSameOrg = (req, res, next) => {
  const orgIdFromParam = req.params.orgId;
  if (orgIdFromParam && orgIdFromParam !== req.user.orgId) {
    return res.status(403).json({
      success: false,
      message: "Access denied: You can only access your own organization's data",
    });
  }
  next();
};

// ── Super Admin Only ──────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }
  next();
};

module.exports = { verifyToken, requireRole, requireSameOrg, requireSuperAdmin };
