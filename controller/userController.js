const users = require('../models/userModel')
// jsonwebtoken
const jwt = require("jsonwebtoken")

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
                const token = jwt.sign({userMail:existingUser.email,role:existingUser.role},process.env.JWT_SECRET)
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

// google login
exports.googleLoginController = async (req,res)=>{
    console.log("inside googleLoginController");
    const {email,password,username} = req.body
    console.log(email,password,username);
    try{
        // check mail in model
        const existingUser = await users.findOne({email})
        if(existingUser){
            // generate token
                const token = jwt.sign({userMail:existingUser.email,role:existingUser.role},process.env.JWT_SECRET)
                res.status(200).json({user:existingUser,token})
        }else{
            // register
            const newUser = await users.create({
                username,email,password
            })
            const token = jwt.sign({userMail:newUser.email,role:newUser.role},process.env.JWT_SECRET)
                res.status(200).json({user:newUser,token})

        }
    }catch(error){
        console.log(error);
        res.status(500).json(error)
    }
}

//  Create Admin Account - Add admin to users collection
exports.createAdminController = async (req, res) => {
    console.log("Inside createAdminController");
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json("Username, email, and password are required");
    }

    try {
        // Check if email already exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(409).json("User already exists with this email");
        }

        // Create new admin user
        const newAdmin = new users({
            username,
            email,
            password,
            role: "admin", // Set role as admin
            bio: "System Administrator"
        });

        await newAdmin.save();
        
        // Generate token
        const token = jwt.sign(
            { userMail: newAdmin.email, role: newAdmin.role }, 
            process.env.JWT_SECRET
        );

        res.status(201).json({ 
            user: newAdmin, 
            token,
            message: "Admin account created successfully" 
        });
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
};

//  Admin Login - separate endpoint for admin login
exports.adminLoginController = async (req, res) => {
    console.log("inside adminLoginController");
    const { email, password } = req.body;
    
    try {
        const existingUser = await users.findOne({ email });
        
        if (!existingUser) {
            return res.status(404).json("Account does not exist");
        }

        // Check if user has admin role
        if (existingUser.role !== "admin") {
            return res.status(403).json("Access denied. Admin privileges required.");
        }

        if (password === existingUser.password) {
            // generate token
            const token = jwt.sign(
                { userMail: existingUser.email, role: existingUser.role }, 
                process.env.JWT_SECRET
            );
            res.status(200).json({ user: existingUser, token });
        } else {
            res.status(401).json("incorrect email/password");
        }
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
};

// user edit profile
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
exports.getAllUsersController = async (req,res)=>{
    console.log("inside getAllUsersController");
    try{
        //get all users other than admin
        const allUsers = await users.find({role:{$ne:"admin"}})
        res.status(200).json(allUsers)
    }catch(error){
        console.log(error);
        res.status(500).json(error)
    }   
}