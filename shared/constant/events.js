// ── All RabbitMQ Event Names ──────────────────────────────
const EVENTS = {
  // Org events
  ORG_REGISTERED:       "org.registered",
  ORG_UPDATED:          "org.updated",
  ORG_DELETED:          "org.deleted",

  // Employee events
  EMPLOYEE_ADDED:       "employee.added",
  EMPLOYEE_UPDATED:     "employee.updated",
  EMPLOYEE_REMOVED:     "employee.removed",

  // Attendance events
  EMPLOYEE_CLOCKED_IN:  "attendance.clocked_in",
  EMPLOYEE_CLOCKED_OUT: "attendance.clocked_out",
  LEAVE_REQUESTED:      "leave.requested",
  LEAVE_APPROVED:       "leave.approved",
  LEAVE_REJECTED:       "leave.rejected",

  // Project/Task events
  PROJECT_CREATED:      "project.created",
  TASK_ASSIGNED:        "task.assigned",
  TASK_COMPLETED:       "task.completed",
  TASK_OVERDUE:         "task.overdue",

  // Report events
  REPORT_REQUESTED:     "report.requested",
  REPORT_READY:         "report.ready",
};

// ── Queue Names ───────────────────────────────────────────
const QUEUES = {
  NOTIFICATION:  "enterprise.notification.queue",
  REPORT:        "enterprise.report.queue",
  ATTENDANCE:    "enterprise.attendance.queue",
};

// ── Role Hierarchy ────────────────────────────────────────
const ROLES = {
  SUPER_ADMIN: "superadmin",
  ADMIN:       "admin",       // HR / Company admin
  MANAGER:     "manager",
  EMPLOYEE:    "employee",
};

module.exports = { EVENTS, QUEUES, ROLES };
