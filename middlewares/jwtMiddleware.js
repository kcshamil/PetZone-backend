const jwt = require('jsonwebtoken');

const jwtMiddleware = (req, res, next) => {
    console.log("Inside jwtMiddleware");
    
    // Check if authorization header exists
    if (!req.headers["authorization"]) {
        return res.status(401).json({
            success: false,
            message: "Authorization failed! Token missing"
        });
    }
    
    // Get token from headers
    const token = req.headers["authorization"].split(" ")[1];
    
    // Verify token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authorization failed! Token missing"
        });
    }
    
    try {
        // Verify token
        const jwtResponse = jwt.verify(token, process.env.JWTSECRET);
        console.log(jwtResponse);
        
        // Attach payload to request
        req.payload = jwtResponse.userMail;
        
        // Pass control to next middleware/handler
        next();
        
    } catch (error) {
        console.error("JWT verification failed:", error.message);
        return res.status(401).json({
            success: false,
            message: "Authorization failed! Invalid token"
        });
    }
};

module.exports = jwtMiddleware;