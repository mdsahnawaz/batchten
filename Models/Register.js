const mongoose=require("mongoose")

const RegSchema=new mongoose.Schema({
    name: {
      type: String,
      required: true,
      minlength: 1,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
  
    },
    otp: {
      type: String,
  
    },
  })
module.exports =mongoose.model("register",RegSchema)