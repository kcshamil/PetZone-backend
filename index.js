// Load env variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // ✅ REQUIRED for req.cookies

const router = require("./routes/userRouting");
const petRouter = require("./routes/petRouting");

require("./config/db");

const petstoreServer = express();

// ✅ CORS (allow cookies if you use jwt cookie)
petstoreServer.use(
  cors({
    origin: "http://localhost:5173", // change if your React runs on different port
    credentials: true,              // ✅ IMPORTANT when using cookies
  })
);

// ✅ Parse cookies (needed for req.cookies.jwt)
petstoreServer.use(cookieParser());

// ✅ Increase payload size limits for base64 images
petstoreServer.use(express.json({ limit: "50mb" }));
petstoreServer.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ Home route (keep before listen)
petstoreServer.get("/", (req, res) => {
  res
    .status(200)
    .send(`<h1>petstore Server Started...... And Waiting for Client Request</h1>`);
});

// ✅ Use routers
petstoreServer.use(router); // or: petstoreServer.use("/api/users", router);
petstoreServer.use("/api/pets", petRouter);

// ✅ Static files
petstoreServer.use("/uploads", express.static("./uploads"));

// ✅ Global error handler
petstoreServer.use((err, req, res, next) => {
  console.error(err.stack);

  // Payload too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large. Please reduce image sizes or compress them.",
    });
  }

  // Multer errors (even if you're not using now, safe)
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size is too large. Maximum size is 5MB per file.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files uploaded.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field.",
      });
    }
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
petstoreServer.listen(PORT, () => {
  console.log("petstore Server Started...... And Waiting for Client Request");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Max payload size: 50MB (supports base64 image uploads)");
});

module.exports = petstoreServer;
