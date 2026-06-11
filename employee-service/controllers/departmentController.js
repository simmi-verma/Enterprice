const {validationResult}=require("express-validator");
const Department=require("../model/Department");
const Employee=require("../model/Employee");
const response=require("../../shared/utils/response");
const logger=require("../../shared/utils/logger");

const createDepartment=async(req, res)=>{
    try{
     const errors=validationResult(req);
     if(!errors.isEmpty()) response.error(res, "Validation failed", 400, errors.array());

     const {name, description, color, budget}=req.body;

     const dept=await Department.create({
        orgId: req.user.orgId,
        name, description, color, budget,
     });
     logger.info(`Dept create: ${dept.name} in org ${req.user.orgId}`);
     return response.created(res, dept, "Department created successfully");
    }catch(err){
     if(err.code===11000) return response.error(res, "Department name already exists in this organization, 409");
     logger.error("createdDepartment error:", {error:err.message});
     return response.error(res, "failed to create department");
    }
}

// ---Get / departments
const getDepartments  =async (req, res)=>{
    try{
     const depts= await Department.find({orgId: req.user.orgId, isActive: true}).sort({name:1});
      return response(res, depts);
    
    }catch(err){
      return res.error(res, "failed to fetch department");
    }
}

const getDepartmentById =async (req, res)=>{
    try{
    const dept=await Department.findOne({
        _id: req.params.id,
        orgId: req.user.orgId,
    });
    if(!dept) return response.error(res, "Department not found", 404);
    const employees=await Employee.find({
        orgId: req.user.orgId,
        departmentId:dept._id,
        status:"active",
    }).select("firstName lastName jobTitle avatar employeeId role");
   return response.success(res, {...dept.toJSON(), employees});
}catch(err){
      return response.error(res, "failed to fetch department");
    }
}
// ── PUT /departments/:id ──────────────────────────────────
const updateDepartment = async (req, res) => {
  try {
    const allowed = ["name", "description", "color", "budget", "headId", "headName"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const dept = await Department.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!dept) return response.error(res, "Department not found", 404);
    return response.success(res, dept, "Department updated successfully");
  } catch (err) {
    if (err.code === 11000) return response.error(res, "Department name already exists", 409);
    return response.error(res, "Failed to update department");
  }
};

// ── DELETE /departments/:id (soft delete) ─────────────────
const deleteDepartment = async (req, res) => {
  try {
    // Check no active employees in dept
    const empCount = await Employee.countDocuments({
      orgId: req.user.orgId,
      departmentId: req.params.id,
      status: "active",
    });
    if (empCount > 0) {
      return response.error(res,
        `Cannot delete department with ${empCount} active employee(s). Reassign them first.`,
        400
      );
    }

    const dept = await Department.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { isActive: false },
      { new: true }
    );

    if (!dept) return response.error(res, "Department not found", 404);
    return response.success(res, null, "Department deleted successfully");
  } catch (err) {
    return response.error(res, "Failed to delete department");
  }
};


module.exports = {
  createDepartment, getDepartments, getDepartmentById,
  updateDepartment, deleteDepartment,
};
