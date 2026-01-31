const mongoose = require('mongoose')
// get connecion stirng from .env file
const connectionString = process.env.ATLASDBCONNECTION

mongoose.connect(connectionString).then(res=>{
    console.log("MongoDB Connection Successful")
}).catch(err=>{
    console.log("Database Connection Failed!!");
    console.log(err);
})