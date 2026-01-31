// routes/petRouting.js
const express = require("express");
const router = express.Router();

const petRegController = require("../controller/petController");

// Public routes
router.post("/register", petRegController.registerPetWithOwner);
router.post("/login", petRegController.login);
router.get("/logout", petRegController.logout);

// Protected routes
router.use(petRegController.protect);

// Owner routes
router.get("/my-profile", petRegController.getMyProfile);
router.patch("/update-pet", petRegController.updatePetInfo);
router.patch("/update-owner", petRegController.updateOwnerInfo);
router.patch("/update-password", petRegController.updatePassword);

// Admin routes
router.get(
  "/all-registrations",
  petRegController.restrictTo("admin"),
  petRegController.getAllRegistrations
);

router.patch(
  "/status/:id",
  petRegController.restrictTo("admin"),
  petRegController.updateRegistrationStatus
);

module.exports = router;
