const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    // ── Multi-tenancy key ─────────────────────────────────
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    description: { type: String, default: "", maxlength: 300 },

    // Department head (employee reference)
    headId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    headName: { type: String, default: "" }, // denormalized for fast reads

    // Budget
    budget: {
      allocated: { type: Number, default: 0 },
      currency:  { type: String, default: "INR" },
    },

    // Color for UI (Kanban/dashboard)
    color: { type: String, default: "#6c63ff" },

    // Stats — updated via events
    stats: {
      totalEmployees: { type: Number, default: 0 },
      activeProjects: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Compound unique: dept name unique per org ─────────────
departmentSchema.index({ name: 1, orgId: 1 }, { unique: true });
departmentSchema.index({ orgId: 1, isActive: 1 });

module.exports = mongoose.model("Department", departmentSchema);
