const { validationResult } = require("express-validator");
const Employee   = require("../model/Employee");
const Department = require("../model/Department");
const response   = require("../../shared/utils/response");
const logger     = require("../../shared/utils/logger");
const { publish }  = require("../../shared/utils/rabbitmq");
const { EVENTS }   = require("../../shared/constant/events");

// ── POST /employees ───────────────────────────────────────
const addEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return response.error(res, "Validation failed", 400, errors.array());

    const {
      firstName, lastName, email, phone,
      jobTitle, departmentId, role, employmentType,
      joiningDate, workLocation, reportingTo,
      salary, skills, dateOfBirth, gender, address,
    } = req.body;

    // Check email unique within org
    const existing = await Employee.findOne({ email, orgId: req.user.orgId });
    if (existing) return response.error(res, "Employee with this email already exists in your organization", 409);

    // Resolve department name
    let departmentName = "";
    if (departmentId) {
      const dept = await Department.findOne({ _id: departmentId, orgId: req.user.orgId });
      if (!dept) return response.error(res, "Department not found", 404);
      departmentName = dept.name;
    }

    // Resolve reporting manager name
    let reportingToName = "";
    if (reportingTo) {
      const manager = await Employee.findOne({ _id: reportingTo, orgId: req.user.orgId });
      if (manager) reportingToName = manager.fullName;
    }

    const employee = await Employee.create({
      orgId: req.user.orgId,
      firstName, lastName, email,
      phone:          phone          || "",
      jobTitle,
      departmentId:   departmentId   || null,
      departmentName,
      role:           role           || "employee",
      employmentType: employmentType || "full_time",
      joiningDate:    joiningDate    || new Date(),
      workLocation:   workLocation   || "office",
      reportingTo:    reportingTo    || null,
      reportingToName,
      salary:         salary         || {},
      skills:         skills         || [],
      dateOfBirth:    dateOfBirth    || null,
      gender:         gender         || "prefer_not_to_say",
      address:        address        || {},
    });

    // Update dept employee count
    if (departmentId) {
      await Department.findByIdAndUpdate(departmentId, {
        $inc: { "stats.totalEmployees": 1 },
      });
    }

    // Publish event → Notification service sends welcome email
    await publish(EVENTS.EMPLOYEE_ADDED, {
      orgId:      req.user.orgId,
      orgName:    req.user.orgName,
      employeeId: employee.employeeId,
      name:       employee.fullName,
      email:      employee.email,
      jobTitle:   employee.jobTitle,
      department: departmentName,
    });

    logger.info(`👤 Employee added: ${employee.fullName} (${employee.employeeId}) in org ${req.user.orgId}`);
    return response.created(res, employee, `Employee ${employee.fullName} added successfully`);
  } catch (err) {
    if (err.code === 11000) return response.error(res, "Employee already exists", 409);
    logger.error("addEmployee error:", { error: err.message });
    return response.error(res, "Failed to add employee");
  }
};

// ── GET /employees ────────────────────────────────────────
// Supports: search, department, role, status, employment type, pagination
const getEmployees = async (req, res) => {
  try {
    const {
      search, departmentId, role, status,
      employmentType, workLocation,
      page = 1, limit = 10,
      sort = "createdAt", order = "desc",
    } = req.query;

    // ── Always filter by orgId ────────────────────────────
    const filter = { orgId: req.user.orgId };

    if (departmentId)  filter.departmentId  = departmentId;
    if (role)          filter.role          = role;
    if (status)        filter.status        = status;
    if (employmentType)filter.employmentType= employmentType;
    if (workLocation)  filter.workLocation  = workLocation;

    let query;
    if (search) {
      // Full-text search on name + jobTitle + skills
      query = Employee.find({ ...filter, $text: { $search: search } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } });
    } else {
      const sortObj = { [sort]: order === "asc" ? 1 : -1 };
      query = Employee.find(filter).sort(sortObj);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [employees, total] = await Promise.all([
      query.skip(skip).limit(parseInt(limit))
           .select("-salary -bankDetails -documents"), // exclude sensitive
      Employee.countDocuments(filter),
    ]);

    return response.paginated(res, employees, {
      total, page: parseInt(page), limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    logger.error("getEmployees error:", { error: err.message });
    return response.error(res, "Failed to fetch employees");
  }
};

// ── GET /employees/:id ────────────────────────────────────
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      orgId: req.user.orgId,    // ← org isolation
    }).populate("departmentId", "name color")
      .populate("reportingTo",  "firstName lastName jobTitle avatar");

    if (!employee) return response.error(res, "Employee not found", 404);

    // Employees can only see their own profile; admin/manager see all
    if (
      req.user.role === "employee" &&
      employee.userId?.toString() !== req.user.userId
    ) {
      return response.error(res, "Access denied", 403);
    }

    return response.success(res, employee);
  } catch (err) {
    return response.error(res, "Failed to fetch employee");
  }
};

// ── PUT /employees/:id ────────────────────────────────────
const updateEmployee = async (req, res) => {
  try {
    // Fields that can be updated (never allow orgId, employeeId changes)
    const allowed = [
      "firstName", "lastName", "phone", "jobTitle",
      "departmentId", "role", "employmentType", "workLocation",
      "reportingTo", "skills", "bio", "avatar",
      "address", "emergencyContact", "dateOfBirth", "gender",
      "status",
    ];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Resolve department name if dept changed
    if (updates.departmentId) {
      const dept = await Department.findOne({
        _id: updates.departmentId, orgId: req.user.orgId,
      });
      if (!dept) return response.error(res, "Department not found", 404);
      updates.departmentName = dept.name;
    }

    // Resolve manager name if changed
    if (updates.reportingTo) {
      const manager = await Employee.findOne({
        _id: updates.reportingTo, orgId: req.user.orgId,
      });
      if (manager) updates.reportingToName = manager.fullName;
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!employee) return response.error(res, "Employee not found", 404);

    await publish(EVENTS.EMPLOYEE_UPDATED, {
      orgId: req.user.orgId,
      employeeId: employee.employeeId,
      name: employee.fullName,
      changes: Object.keys(updates),
    });

    return response.success(res, employee, "Employee updated successfully");
  } catch (err) {
    logger.error("updateEmployee error:", { error: err.message });
    return response.error(res, "Failed to update employee");
  }
};

// ── PUT /employees/:id/salary ─────────────────────────────
// Admin only — separate endpoint for sensitive data
const updateSalary = async (req, res) => {
  try {
    const { amount, currency, frequency } = req.body;

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { $set: { salary: { amount, currency: currency || "INR", frequency: frequency || "monthly" } } },
      { new: true }
    );

    if (!employee) return response.error(res, "Employee not found", 404);
    return response.success(res, { employeeId: employee.employeeId }, "Salary updated successfully");
  } catch (err) {
    return response.error(res, "Failed to update salary");
  }
};

// ── DELETE /employees/:id (soft delete = terminate) ───────
const terminateEmployee = async (req, res) => {
  try {
    const { reason, relievingDate } = req.body;

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      {
        $set: {
          status:        "terminated",
          relievingDate: relievingDate || new Date(),
        },
      },
      { new: true }
    );

    if (!employee) return response.error(res, "Employee not found", 404);

    // Update dept count
    if (employee.departmentId) {
      await Department.findByIdAndUpdate(employee.departmentId, {
        $inc: { "stats.totalEmployees": -1 },
      });
    }

    await publish(EVENTS.EMPLOYEE_REMOVED, {
      orgId:      req.user.orgId,
      employeeId: employee.employeeId,
      name:       employee.fullName,
      email:      employee.email,
      reason:     reason || "Not specified",
    });

    logger.info(`🚫 Employee terminated: ${employee.fullName} (${employee.employeeId})`);
    return response.success(res, null, `Employee ${employee.fullName} terminated successfully`);
  } catch (err) {
    return response.error(res, "Failed to terminate employee");
  }
};

// ── GET /employees/stats ──────────────────────────────────
const getEmployeeStats = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const [
      statusCounts,
      roleCounts,
      deptCounts,
      employmentTypeCounts,
      recentJoinees,
    ] = await Promise.all([
      // Count by status
      Employee.aggregate([
        { $match: { orgId: new (require("mongoose").Types.ObjectId)(orgId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Count by role
      Employee.aggregate([
        { $match: { orgId: new (require("mongoose").Types.ObjectId)(orgId), status: "active" } },
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),
      // Count by department
      Employee.aggregate([
        { $match: { orgId: new (require("mongoose").Types.ObjectId)(orgId), status: "active" } },
        { $group: { _id: "$departmentName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      // Count by employment type
      Employee.aggregate([
        { $match: { orgId: new (require("mongoose").Types.ObjectId)(orgId), status: "active" } },
        { $group: { _id: "$employmentType", count: { $sum: 1 } } },
      ]),
      // Recent joiners (last 30 days)
      Employee.find({
        orgId,
        joiningDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }).select("firstName lastName jobTitle departmentName joiningDate avatar")
        .sort({ joiningDate: -1 }).limit(5),
    ]);

    return response.success(res, {
      byStatus:         statusCounts.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
      byRole:           roleCounts.reduce((a, r) => ({ ...a, [r._id]: r.count }), {}),
      byDepartment:     deptCounts,
      byEmploymentType: employmentTypeCounts.reduce((a, e) => ({ ...a, [e._id]: e.count }), {}),
      recentJoinees,
      totalActive: statusCounts.find((s) => s._id === "active")?.count || 0,
    });
  } catch (err) {
    logger.error("getEmployeeStats error:", { error: err.message });
    return response.error(res, "Failed to fetch employee stats");
  }
};

// ── GET /employees/health ─────────────────────────────────
const healthCheck = (req, res) => res.json({
  success: true, service: "employee-service",
  status: "healthy", uptime: process.uptime(),
});

module.exports = {
  addEmployee, getEmployees, getEmployeeById,
  updateEmployee, updateSalary, terminateEmployee,
  getEmployeeStats, healthCheck,
};
