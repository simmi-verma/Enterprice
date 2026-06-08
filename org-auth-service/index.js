const express=require("express");
const app=express();
const orgRoutes=require("./routes/orgRoutes");
const authRoutes=require("./routes/authRoutes")
const logger     = require("../shared/utils/logger");
const mongoose=require("mongoose");
const port=process.env.PORT || 3001;

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/orgs", orgRoutes);
app.use("./auth", authRoutes);

const start= async()=>{
    try{
      await mongoose.connect(
          process.env.MONGO_URI || "mongodb://localhost:27017/enterprisedesk_org"
      )
      logger.info("mongoDb connected-org Auth Service");
      try{
        await connectRabbitMQ();
      }catch(err){
        logger.warn("RabbitMQ not available, continuing without events:", {err:err.message});
      }
      app.listen(PORT, ()=> logger.info(`org auth service running on port ${PORT}`));
    }catch(err){
      logger.error("startup failed", {error: err.message});
      process.exit(1);
    }
}
app.use("/", (req, res)=>{
    res.send("working")
})
app.listen(port, (req, res)=>{
    console.log("server is running")
})