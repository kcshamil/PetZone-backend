const jwt = require("jsonwebtoken");
const User = require("../models/userModel"); // ⚠️ Adjust path to your user model

const adminAuthMiddleware = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided. Please login as admin.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

    // Find user in users collection
    const currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // ✅ Check if user is admin
    if (currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // Attach user to request
    req.user = currentUser;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
  }
};

module.exports = { adminAuthMiddleware };