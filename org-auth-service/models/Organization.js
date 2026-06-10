const mongoose=require("mongoose");

const subscriptionSchema=new mongoose.Schema({
    plan:{
        type:String,
        // enum restricts field values to predefined options
        enum:["free", "starter", "professional", "enterprise"],
        default: "free",
    },
    maxEmployees:{type: Number, default: 10},
    startDate: {type: Date, default: Date.now},
    endDate: {type:Date, default:null},
    isActive: {type: Boolean, default: true},
}, {_id: false}); // Prevent mongoose from creating _id for embedded subscription documents

const orgSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true, "Organization name is required"],
        trim: true,
        minlength:[2, "Name must be at least 2 character"],
        maxlength:[100, "Name cannot exceed 100 characters"],
    },
    slug:{
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      // auth-generated from name Tata Consultancy -> tata-consultancy
    },
    industry:{
        type: String,
        enum:["technology", "healthcare", "finance", "education", "retail", "manufacturing", "other"],
        default: "technology",
    },
    size:{
        type: String,
        enum:["1-10", "11-50", "51-200", "201-500", "500+"],
        default:"1-10",
    },
    description:{
        type:String,
        maxlength: 500,
        default:""
    },
    email:{
        type:String,
        required: true,
        lowercase: true,  //to avoid records caused differences
        trim: true
    },
    phone:{type: String, default:""},
    website:{type: String, default:""},
    logo:{type: String, default:""},

    address:{
        street:{type: String, default:""},
        city:{type: String, default:""},
        state: {type: String, default:""},
        country:{type: String, default: ""},
        pincode:{type:String, default:""},
    },
    subscription:subscriptionSchema,
    settings:{
        WorkingHours:{
            start:{type:String, default:"00:00"},
            end:{type:String, default:"00:00"},
            workingDays:{type:[Number], default:[1,2,3,4,5]},
        },
        timezone:{type:String, default:"Asia/kolkata"},
        leavePolicy:{
            casualLeaves:{type:Number, default:12},
            sickLeaves:{type:Number, default:7},
            earnedLeaves:{type:Number, default: 15},
        },
        currency:{type:String, default:"INR"},
    },
    isActive: {type:Boolean, default: true},
    isVerified:{type:Boolean, default: false},
  
    stats:{
        totalEmployees:{type:Number, default:0},
        totalProjects:{type:Number, default:0},
        totalDepts:{type:Number, default:0},
    },
}, 
{timestamps:true} // automatically manages creation and update timestamps
)

//--Indexes fast lookup by slug, email, isActive
orgSchema.index({slug: 1});
orgSchema.index({email:1});
orgSchema.index({isActive:1});

orgSchema.pre("save", async function(){
    if(this.isNew || this.isModified("name")){
        const base=this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const suffix =Math.floor(1000+Math.random()*9000);
    this.slug=`${base}-${suffix}`;
    }
});

module.exports=mongoose.model("Organization", orgSchema);