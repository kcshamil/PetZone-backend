const express = require("express");
const router = express.Router();
const petController = require("../controller/petController");

// ==================== PUBLIC ROUTES ====================

// Pet owner registration and login
router.post("/register", petController.registerPetWithOwner);
router.post("/login", petController.login);
router.get("/logout", petController.logout);

// Get approved pets - PUBLIC (for Pets page)
// Only shows pets with status="approved" and adoptionStatus="available"
router.get("/approved-pets", petController.getApprovedPets);

// NEW: Submit adoption request - PUBLIC (anyone can request to adopt)
router.post("/adopt/:petId", petController.submitAdoptionRequest);

// NEW: Get user's adoption requests by email - PUBLIC (track adoption status)
router.get("/user-adoption-requests", petController.getUserAdoptionRequests);

// ==================== PROTECTED ROUTES (Pet Owners Only) ====================
// Apply authentication middleware to all routes below
router.use(petController.protect);

// Owner can manage their own pet registration
router.get("/my-profile", petController.getMyProfile);
router.patch("/update-pet", petController.updatePetInfo);
router.patch("/update-owner", petController.updateOwnerInfo);
router.patch("/update-password", petController.updatePassword);
router.delete("/delete-registration", petController.deleteMyRegistration);

// Adoption management routes - Owner views/manages their pet's adoption requests
router.get("/my-adoption-requests", petController.getMyAdoptionRequests);
router.patch("/adoption-request/:adoptionId", petController.updateAdoptionRequestStatus);

module.exports = router;