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