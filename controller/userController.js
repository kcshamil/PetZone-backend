const users = require('../models/userModel')
// jsonwebtoken
const jsw = require("jsonwebtoken")

// register api request
exports.registerController = async (req,res)=>{
    console.log("Inside registerController");
    const {username,password,email} = req.body
    console.log(username,password,email);

    try{
        // check mail in model
        const existingUser = await users.findOne({email})
        if(existingUser){
            res.status(409).json("user Already exist..please login")
        }else{
            const newUser = new users({
                username,email,password
            })
            await newUser.save()
            res.status(200).json(newUser)
        }
    }catch(error){
        console.log(error);
        res.status(500).json(error)
    }


}

// login api
exports.loginController = async (req,res)=>{
    console.log("inside loginController");
    const {email,password} = req.body
    console.log(email,password);
    try{
        // check mail in model
        const existingUser = await users.findOne({email})
        if(existingUser){
            if(password == existingUser.password){
                // generate token
                const token = jsw.sign({userMail:existingUser.email,role:existingUser.role},process.env.JWTSECRET)
                res.status(200).json({user:existingUser,token})
            }else{
                res.status(401).json("incorrect email/password")
            }
        }else{
            res.status(404).json("Account doesnot Exist!!!")
        }
    }catch(error){
        console.log(error);
        res.status(500).json(error)
    }
}

// user edit ptofile

exports.updateUserProfileController = async (req,res)=>{
    console.log("inside updateUserProfileController ");
//get id from req url
    const {id} = req.params
//get email
    const email = req.payload
//get body text content : username
    const {username,password,bio,role,picture} = req.body
//get file data
    const uploadImages = req.file?req.file.filename:picture
    console.log(id,email,username,password,bio,uploadImages,role);
    try{
        const updateUser = await users.findByIdAndUpdate({_id:id},{
            username,email,password,picture:uploadImages,bio,role
        },{new:true})
        res.status(200).json(updateUser)

    }catch(error){
        console.log(error);
        res.status(500).json(error)
    }
    
}


//get all users - admin : login user
 exports.getAllUsersContoller = async (req,res)=>{
    console.log("inside getAllUsersContoller");
    //
    try{
            //get all users  other than admin
        const allUsers = await users.find({role:{$ne:"admin"}})
        res.status(200).json(allUsers)
    }catch(error){
        console.log(error);
        res.status(500).json(error)
        
    }   
}
// admin edt profile