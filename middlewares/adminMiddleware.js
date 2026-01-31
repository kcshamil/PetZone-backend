const jwt = require('jsonwebtoken')

const adminMiddleware = (req,res,next)=>{
    console.log("Inside adminMiddleware");
    // login to verify token
    // get toke - req headers
    
    const token = req.headers["authorization"].split(" ")[1]
    // console.log(token);
    // verify token
    if(token){
        try{
        const jwtResponse = jwt.verify(token,process.env.JWTSECRET)
        console.log(jwtResponse);
        req.payload = jwtResponse.userMail
        req.role = jwtResponse.role
        if(jwtResponse.role =="admin"){
        next()
    }else{
        res.status(401).json("Authorisation failed!! Invalid Token")
          }
        }catch(error){
            res.status(401).json("Authorisation failed!! Invalid Token")
        }
        }else{
            res.status(401).json("Authorisation failed!! Token missing")
        } 
}

module.exports = adminMiddleware