const mongoose = require("mongoose");

// ── Emergency Contact ─────────────────────────────────────
const emergencyContactSchema = new mongoose.Schema({
  name:         { type: String, default: "" },
  relationship: { type: String, default: "" },
  phone:        { type: String, default: "" },
}, { _id: false });

// ── Bank Details ──────────────────────────────────────────
const bankDetailsSchema = new mongoose.Schema({
  bankName:      { type: String, default: "" },
  accountNumber: { type: String, default: "", select: false }, // sensitive
  ifscCode:      { type: String, default: "" },
  accountHolder: { type: String, default: "" },
}, { _id: false });

// ── Address ───────────────────────────────────────────────
const addressSchema = new mongoose.Schema({
  street:  { type: String, default: "" },
  city:    { type: String, default: "" },
  state:   { type: String, default: "" },
  pincode: { type: String, default: "" },
  country: { type: String, default: "India" },
}, { _id: false });

// ── Document ──────────────────────────────────────────────
const documentSchema = new mongoose.Schema({
  type:      { type: String, enum: ["aadhar", "pan", "passport", "offer_letter", "contract", "other"] },
  name:      { type: String },
  url:       { type: String }, // S3/Cloudinary URL
  uploadedAt:{ type: Date, default: Date.now },
}, { _id: true });

// ── Main Employee Schema ──────────────────────────────────
const employeeSchema = new mongoose.Schema(
  {
    // ── Multi-tenancy ─────────────────────────────────────
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // ── Employee ID (auto-generated) ──────────────────────
    employeeId: {
      type: String,
      unique: true,
      // e.g. EMP-2025-0042
    },

    // ── Linked Auth User ──────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null = no system access yet
    },

    // ── Personal Info ─────────────────────────────────────
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    phone:       { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    avatar:      { type: String, default: "" },
    address:     addressSchema,
    emergencyContact: emergencyContactSchema,

    // ── Job Info ──────────────────────────────────────────
    jobTitle:    { type: String, required: true, trim: true },
    departmentId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    departmentName: { type: String, default: "" }, // denormalized

    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "employee",
    },

    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "intern"],
      default: "full_time",
    },

    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    relievingDate: { type: Date, default: null },

    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reportingToName: { type: String, default: "" }, // denormalized

    workLocation: {
      type: String,
      enum: ["office", "remote", "hybrid"],
      default: "office",
    },

    // ── Compensation ──────────────────────────────────────
    salary: {
      amount:    { type: Number, default: 0, select: false }, // sensitive
      currency:  { type: String, default: "INR" },
      frequency: { type: String, enum: ["monthly", "annual"], default: "monthly" },
    },
    bankDetails: { type: bankDetailsSchema, select: false },

    // ── Skills & Info ─────────────────────────────────────
    skills: [{ type: String, lowercase: true, trim: true }],
    bio:    { type: String, default: "", maxlength: 500 },

    // ── Documents ─────────────────────────────────────────
    documents: [documentSchema],

    // ── Leave Balance (for current year) ─────────────────
    leaveBalance: {
      casual:  { type: Number, default: 12 },
      sick:    { type: Number, default: 7 },
      earned:  { type: Number, default: 15 },
    },

    // ── Status ────────────────────────────────────────────
    status: {
      type: String,
      enum: ["active", "inactive", "on_leave", "terminated"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────
employeeSchema.index({ orgId: 1, status: 1 });
employeeSchema.index({ orgId: 1, departmentId: 1 });
employeeSchema.index({ orgId: 1, role: 1 });
employeeSchema.index({ email: 1, orgId: 1 });
employeeSchema.index({ employeeId: 1 });
// Full-text search on name + job title
employeeSchema.index({ firstName: "text", lastName: "text", jobTitle: "text", skills: "text" });

// ── Virtual: full name ────────────────────────────────────
employeeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Virtual: years of service ─────────────────────────────
employeeSchema.virtual("yearsOfService").get(function () {
  if (!this.joiningDate) return 0;
  const diff = Date.now() - new Date(this.joiningDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
});

// ── Auto-generate Employee ID ─────────────────────────────
employeeSchema.pre("save", async function (next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ orgId: this.orgId });
    this.employeeId = `EMP-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

employeeSchema.set("toJSON",   { virtuals: true });
employeeSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Employee", employeeSchema);
