const mongoose=require("mongoose");

const userSchema=new mongoose.Schema({
    orgId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organization",
        required:true,
        index:true,
    },
    name:{
        type:String,
        required:[true, "Name is required"],
        trim: true,
        minlength:2,
        maxlength:50,
    },
    email:{
        type:String,
        required:[true, "Email is required"],
        lowercase: true,
        trim:true,
        match:[/^\S+@\S+\.\S+$/, "Invalid email format"]
    },
    password:{
        type:String,
        required:[true, "Password is required"],
        minlength:6,
        select: false,
    },
    role:{
        type:String,
        enum:["superadmin", "admin", "manager", "employee"],
        default:"employee",
    },
    Phone:{type:String, default:""},
    avatar:{type: String, default:""},
    jobTitle:{type: String, default:""},
    department:{
        type:mongoose.Schema.Types.ObjectId,
         ref:"Department",
         default:null,
    },
    isActive: {type:Boolean, default:true},
    lastlogin:{type:Date},
    refreshToken:{type: String, select: false},
       resetToken:        { type: String, select: false },
    resetTokenExpiry:  { type: Date, select: false },
  },
  { timestamps: true }
)

// ── Compound index: email unique per org ──────────────────
// (same email can exist in different orgs)
userSchema.index({ email: 1, orgId: 1 }, { unique: true });
userSchema.index({ orgId: 1, role: 1 });
userSchema.index({ orgId: 1, isActive: 1 });

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    const salt=await bcrypt.genSalt(12);
    this.password=await bcrypt.hash(this.password, salt);
    next();
})

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
userSchema.methods.toJSON = function () {
    // convert mongoose document to plain object
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  delete obj.__v;
  return obj;
};

module.exports=mongoose.model("User", userSchema);