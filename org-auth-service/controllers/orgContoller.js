const {validationResult}=require("express-validator");
const Organization=require("../models/Orgainzation");
const User=require("../models/User");


// post /orgs/register

// Register a new company + create the first admin user
const registerOrg=async(req, res)=>{
    
    try{
       const errors=validationResult(req);
       if(!errors.isEmpty()){
        return res.status(400).json({
            success:false,
            message:"validation error",
             errors:errors.array(),
        })
       }
       const{
        orgName,
        industry,
        size,
        orgEmail,
        orgPhone,
        website,
        address,
        adminName,
        adminEmail,
        adminPassword,
        adminPhone
       }=req.body;
       const existingOrg=await Organization.findOne({email:orgEmail});
       if(existingOrg){
        return res.status(400).json({
            success:false,
            message:"orgainzation already registered",
        });
       }

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
       const adminUser = await User.create({
             orgId:    org._id,
             name:     adminName,
             email:    adminEmail,
             password: adminPassword,
             phone:    adminPhone || "",
             role:     "admin",
             jobTitle: "HR Administrator",
           });
           org.stats.totalEmployees=1;
           await org.save();
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
module.exports={registerOrg};