const express = require("express");
const router = express.Router();
const productController = require("../controller/productController");

// Import middleware (adjust path as needed)
// const { verifyToken, isAdmin } = require("../middleware/auth");

// Public routes - Fixed paths (no double /products)
router.get("/", productController.getAllProducts);
router.get("/featured/list", productController.getFeaturedProducts);
router.get("/category/:category", productController.getProductsByCategory);
router.get("/:id", productController.getProductById);

// Admin routes (add authentication middleware as needed)
// router.post("/", verifyToken, isAdmin, productController.registerProduct);
// router.put("/:id", verifyToken, isAdmin, productController.updateProduct);
// router.delete("/:id", verifyToken, isAdmin, productController.deleteProduct);
// router.delete("/:id/permanent", verifyToken, isAdmin, productController.permanentDeleteProduct);
// router.patch("/:id/stock", verifyToken, isAdmin, productController.updateStock);

// Temporary routes without authentication (for development)
router.post("/", productController.registerProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.delete("/:id/permanent", productController.permanentDeleteProduct);
router.patch("/:id/stock", productController.updateStock);

module.exports = router;