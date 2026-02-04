const express = require("express");
const adminRouter = express.Router();

// Import your PetRegistration model
const PetRegistration = require("../models/petModel");

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/admin/all-registrations
 * @desc    Get all pet registrations (pending, approved, rejected)
 * @access  Admin only
 */
adminRouter.get("/all-registrations", async (req, res) => {
  try {
    console.log("🔥 Fetching all registrations from database...");
    
    // Query database for all registrations (excluding adopted/inactive ones)
    const registrations = await PetRegistration.find({ isActive: true }).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${registrations.length} registrations in database`);
    
    res.status(200).json({
      success: true,
      registrations: registrations,
      total: registrations.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching registrations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch registrations",
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/admin/status/:id
 * @desc    Update registration status (approve/reject)
 * @access  Admin only
 */
adminRouter.patch("/status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Updating registration ${id} to status: ${status}`);
    
    // Validate status
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'pending', 'approved', or 'rejected'"
      });
    }
    
    // ✅ Update BOTH status fields to ensure consistency
    const updatedRegistration = await PetRegistration.findByIdAndUpdate(
      id,
      { 
        status: status,           // Update main status field
        "pet.status": status,     // Update pet.status field
        updatedAt: Date.now() 
      },
      { new: true }
    );
    
    if (!updatedRegistration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found"
      });
    }
    
    console.log(`✅ Registration ${id} updated successfully`);
    console.log(`✅ Status is now: ${updatedRegistration.status}`);
    console.log(`✅ Pet status is now: ${updatedRegistration.pet.status}`);
    
    // Log helpful message for approved pets
    if (status === "approved") {
      console.log(`🎉 Pet "${updatedRegistration.pet.name}" is now APPROVED and will appear on the Pets page!`);
    }
    
    res.status(200).json({
      success: true,
      message: `Registration ${status} successfully`,
      registration: updatedRegistration
    });
    
  } catch (error) {
    console.error("❌ Error updating registration status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update registration status",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin only
 */
adminRouter.get("/stats", async (req, res) => {
  try {
    console.log("📊 Calculating statistics...");
    
    // Get actual stats from database (checking both status fields, excluding inactive)
    const total = await PetRegistration.countDocuments({ isActive: true });
    const pending = await PetRegistration.countDocuments({ 
      isActive: true,
      $or: [{ status: "pending" }, { "pet.status": "pending" }]
    });
    const approved = await PetRegistration.countDocuments({ 
      isActive: true,
      $or: [{ status: "approved" }, { "pet.status": "approved" }]
    });
    const rejected = await PetRegistration.countDocuments({ 
      isActive: true,
      $or: [{ status: "rejected" }, { "pet.status": "rejected" }]
    });
    
    console.log(`✅ Stats: Total=${total}, Pending=${pending}, Approved=${approved}, Rejected=${rejected}`);
    
    res.status(200).json({
      success: true,
      stats: {
        total: total,
        pending: pending,
        approved: approved,
        rejected: rejected
      }
    });
    
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/delete-registration/:id
 * @desc    Admin delete pet registration (no two-step verification)
 * @access  Admin only
 */
adminRouter.delete("/delete-registration/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Admin deleting registration ${id}...`);
    
    // Find and delete the registration
    const deletedRegistration = await PetRegistration.findByIdAndDelete(id);
    
    if (!deletedRegistration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found"
      });
    }
    
    console.log(`✅ Pet "${deletedRegistration.pet.name}" deleted successfully by admin`);
    
    res.status(200).json({
      success: true,
      message: "Pet registration deleted successfully",
      deletedPet: deletedRegistration.pet.name
    });
    
  } catch (error) {
    console.error("❌ Error deleting registration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete registration",
      error: error.message
    });
  }
});

module.exports = adminRouter;