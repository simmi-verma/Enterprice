const {validationResult}=require("express-validator");
const Organization=require("../models/Organization");
const User=require("../models/User");
const response=require("../../shared/utils/response");

let publish = null;
let EVENTS = {};
try {
  const rabbitmq = require("../../shared/utils/rabbitmq");
  publish = rabbitmq.publish;
} catch (err) {
  // RabbitMQ utility not available in this service
}
try {
  const events = require("../../shared/constants/events");
  EVENTS = events.EVENTS;
} catch (err) {
  // Event constants not available in this service
}


// post /orgs/register

// Register a new company + create the first admin user
const registerOrg=async(req, res)=>{
    
    try{
       const errors=validationResult(req);
       if(!errors.isEmpty()){
        return response.error(res, "Validation error", 200, errors.array());
       }
       const{
        //org fields
        orgName,
        industry,
        size,
        orgEmail,
        orgPhone,
        website,
        address,
        // admin user fields
        adminName,
        adminEmail,
        adminPassword,
        adminPhone
       }=req.body;
       // check org email not already registered
       const existingOrg=await Organization.findOne({email:orgEmail});
       if(existingOrg){
        return response.error(res, "An organization with this email already exists", 409);
       }

       // create organization
       const org =await Organization.create({
       name:orgName,
       email:    orgEmail,
      phone:    orgPhone || "",
      website:  website  || "",
      industry: industry || "technology",
      size:     size     || "1-10",
      address:  address  || {},
      subscription: { plan: "free", maxEmployees: 10 },
       });

       // create first admin user for this org
       const adminUser = await User.create({
             orgId:    org._id,
             name:     adminName,
             email:    adminEmail,
             password: adminPassword,
             phone:    adminPhone || "",
             role:     "admin",
             jobTitle: "HR Administrator",
           });
           // update org employee count
           org.stats.totalEmployees=1;
           await org.save();
            // Publish event->notification service send welcome email
            if (publish && EVENTS && EVENTS.ORG_REGISTERED) {
              try {
                await publish(EVENTS.ORG_REGISTERED, {
                  orgId: org._id,
                  orgName: org.name,
                  adminName: adminUser.name,
                  adminEmail: adminUser.email,
                  plan: org.subscription.plan,
                });
              } catch (publishErr) {
                console.error("Failed to publish event:", publishErr.message);
              }
            } else {
              console.log("RabbitMQ publish not configured or available");
            }
           console.log(org);
           res.status(200).json({
            success:true,
            message: "success full created",
           })
    }catch(err){

        console.log(err);
       return res.status(400).json({
        status:false,
        message:err.message,
       })
    }
}
// ── GET /orgs/me — Get own org details ───────────────────
const getMyOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    if (!org) return response.error(res, "Organization not found", 404);
    return response.success(res, org);
  } catch (err) {
    return response.error(res, "Failed to fetch organization");
  }
};
const updateMyOrg = async (req, res) => {
  try {
    const allowed = ["name", "industry", "size", "phone", "website", "logo", "address", "settings", "description"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const org = await Organization.findByIdAndUpdate(
      req.user.orgId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!org) return response.error(res, "Organization not found", 404);

    await publish(EVENTS.ORG_UPDATED, { orgId: org._id, orgName: org.name });
    return response.success(res, org, "Organization updated successfully");
  } catch (err) {
    return response.error(res, "Failed to update organization");
  }
};

// ── GET /orgs/me/stats — Dashboard stats ─────────────────
const getOrgStats = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId).select("stats settings subscription name");
    if (!org) return response.error(res, "Organization not found", 404);

    // Get user counts by role
    const roleCounts = await User.aggregate([
      { $match: { orgId: org._id, isActive: true } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const byRole = roleCounts.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});

    return response.success(res, {
      org: {
        name: org.name,
        plan: org.subscription.plan,
        maxEmployees: org.subscription.maxEmployees,
        workingHours: org.settings.workingHours,
      },
      stats: {
        ...org.stats,
        byRole,
        activeUsers: Object.values(byRole).reduce((a, b) => a + b, 0),
      },
    });
  } catch (err) {
    return response.error(res, "Failed to fetch stats");
  }
};

// ── GET /orgs — Super Admin: all orgs ────────────────────
const getAllOrgs = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, plan } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (plan)   filter["subscription.plan"] = plan;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orgs, total] = await Promise.all([
      Organization.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Organization.countDocuments(filter),
    ]);

    return response.paginated(res, orgs, {
      total, page: parseInt(page), limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    return response.error(res, "Failed to fetch organizations");
  }
};

// ── Health ────────────────────────────────────────────────
const healthCheck = (req, res) => res.json({
  success: true, service: "org-auth-service",
  status: "healthy", uptime: process.uptime(),
});


module.exports = { registerOrg, getMyOrg, updateMyOrg, getOrgStats, getAllOrgs, healthCheck };
