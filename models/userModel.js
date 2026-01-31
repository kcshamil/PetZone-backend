const mongoose = require('mongoose')

const  userSchema = new mongoose.Schema({

    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    picture:{
        type:String,
         default:""
    },
    bio:{
        type:String,
       default:"bookstore user"
    },
    role:{
        type:String,
        default:"user"
    }

})


const users = mongoose.model("users",userSchema)


module.exports = users