const PetRegistration = require("../models/petModel");
const jwt = require("jsonwebtoken");

// ---------- HELPERS ----------
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "mysecret123"
  );
};

const createSendToken = (registration, statusCode, res) => {
  const token = signToken(registration._id);

  // Hide password from response
  if (registration?.owner) registration.owner.password = undefined;

  return res.status(statusCode).json({
    success: true,
    token,
    data: { registration },
  });
};

// ==================== PUBLIC ROUTES ====================

// Register Pet with Owner - Creates entry with "pending" status
exports.registerPetWithOwner = catchAsync(async (req, res) => {
  const { owner, pet } = req.body;

  // Validate owner information
  if (!owner || !pet) {
    return res.status(400).json({ 
      success: false, 
      message: "Owner and pet information are required" 
    });
  }

  if (!owner.email || !owner.password ) {
    return res.status(400).json({ 
      success: false, 
      message: "Owner email and password are required" 
    });
  }

  // Validate pet information
  if (!pet.name || !pet.breed || !pet.age || !pet.location || !pet.description || !pet.license) {
    return res.status(400).json({ 
      success: false, 
      message: "All pet information fields are required (name, breed, age, location, description, license)" 
    });
  }

  // Check if email already exists
  const existing = await PetRegistration.findOne({ "owner.email": owner.email }).select("_id");
  if (existing) {
    return res.status(409).json({ 
      success: false, 
      message: "Email already registered. Please login." 
    });
  }

  // Create new pet registration with PENDING status
  const newRegistration = await PetRegistration.create({
    owner: {
      email: owner.email,
      password: owner.password,
      phone: owner.phone,
      role: "owner",
    },
    pet: {
      name: pet.name,
      type: pet.type || "Dog",
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender || "Male",
      location: pet.location,
      description: pet.description,
      vaccinated: pet.vaccinated || false,
      trained: pet.trained || false,
      photos: pet.photos || [],
      license: pet.license,
      adoptionStatus: "available",
    },
    status: "pending",
    isActive: true,
    adoptions: [],
  });

  return createSendToken(newRegistration, 201, res);
});

// Owner Login - Only for pet owners
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide email and password" 
    });
  }

  // Find registration by email
  const registration = await PetRegistration
    .findOne({ "owner.email": email })
    .select("+owner.password");

  if (!registration) {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid email or password" 
    });
  }

  // Only allow owners (no admin login here)
  if (registration.owner.role !== "owner") {
    return res.status(403).json({ 
      success: false, 
      message: "Invalid credentials" 
    });
  }

  // Check if account is locked
  if (registration.isLocked) {
    return res.status(423).json({
      success: false,
      message: "Account is locked due to too many failed login attempts. Try again later.",
    });
  }

  // Check if account is active
  if (!registration.isActive) {
    return res.status(403).json({
      success: false,
      message: "Your account has been deactivated. Please contact support.",
    });
  }

  // Verify password
  const ok = await registration.comparePassword(password);
  if (!ok) {
    await registration.incLoginAttempts();
    return res.status(401).json({ 
      success: false, 
      message: "Invalid email or password" 
    });
  }

  // Reset login attempts on successful login
  await registration.resetLoginAttempts();
  
  return createSendToken(registration, 200, res);
});

// Logout
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: "lax",
  });

  return res.status(200).json({ 
    success: true, 
    message: "Logged out successfully" 
  });
};

// Get Approved Pets - PUBLIC (for Pets page)
// IMPORTANT: Only shows pets with status="approved" and adoptionStatus="available"
exports.getApprovedPets = catchAsync(async (req, res) => {
  const approvedPets = await PetRegistration.find({ 
    status: "approved",
    isActive: true,
    "owner.role": "owner",
    "pet.adoptionStatus": "available" // Only show available pets
  }).select("-owner.password");

  return res.status(200).json({
    success: true,
    results: approvedPets.length,
    data: { registrations: approvedPets },
  });
});

// NEW: Submit Adoption Request - PUBLIC (anyone can request to adopt)
exports.submitAdoptionRequest = catchAsync(async (req, res) => {
  const { petId } = req.params;
  const { adopterName, adopterEmail, adopterPhone, adopterMessage } = req.body;

  // Validate adopter information
  if (!adopterName || !adopterEmail || !adopterPhone) {
    return res.status(400).json({ 
      success: false, 
      message: "All adopter information is required" 
    });
  }

  // Find the pet registration
  const registration = await PetRegistration.findById(petId);
  
  if (!registration) {
    return res.status(404).json({ 
      success: false, 
      message: "Pet not found" 
    });
  }

  // Check if pet is available for adoption
  if (registration.status !== "approved") {
    return res.status(400).json({ 
      success: false, 
      message: "This pet is not approved for adoption yet" 
    });
  }

  if (registration.pet.adoptionStatus !== "available") {
    return res.status(400).json({ 
      success: false, 
      message: "This pet is no longer available for adoption" 
    });
  }

  // Add adoption request
  registration.adoptions.push({
    adopterName,
    adopterEmail,
    adopterPhone,
    adopterMessage: adopterMessage || "",
    adoptionDate: new Date(),
    adoptionStatus: "pending",
  });

  // Update pet adoption status to pending
  registration.pet.adoptionStatus = "pending_adoption";

  await registration.save();

  return res.status(200).json({
    success: true,
    message: "Adoption request submitted successfully. The owner will contact you soon.",
    data: { registration }
  });
});

// ==================== AUTH MIDDLEWARE ====================

// Protect middleware - Verifies pet owner token
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // Extract token from Authorization header or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token || token === "loggedout") {
    return res.status(401).json({
      success: false,
      message: "You are not logged in. Please log in to access this resource.",
    });
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecret123");

  // Find current registration
  const currentRegistration = await PetRegistration.findById(decoded.id);
  if (!currentRegistration) {
    return res.status(401).json({
      success: false,
      message: "The registration belonging to this token no longer exists.",
    });
  }

  // Check if password was changed after token was issued
  if (currentRegistration.changedPasswordAfter && currentRegistration.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      success: false,
      message: "Password was recently changed. Please log in again.",
    });
  }

  // Check if account is active
  if (!currentRegistration.isActive) {
    return res.status(403).json({ 
      success: false, 
      message: "Your account has been deactivated." 
    });
  }

  // Attach registration to request
  req.registration = currentRegistration;
  return next();
});

// ==================== PROTECTED CONTROLLERS (Pet Owners Only) ====================

// Get My Profile - Owner can view their own pet registration
exports.getMyProfile = catchAsync(async (req, res) => {
  const registration = await PetRegistration.findById(req.registration.id);
  
  return res.status(200).json({ 
    success: true, 
    data: { registration } 
  });
});

// Update Pet Info - Owner can update their pet details
exports.updatePetInfo = catchAsync(async (req, res) => {
  const { pet } = req.body;
  
  if (!pet) {
    return res.status(400).json({ 
      success: false, 
      message: "pet object is required" 
    });
  }

  // Build update object
  const updates = {};
  if (pet.name) updates["pet.name"] = pet.name;
  if (pet.type) updates["pet.type"] = pet.type;
  if (pet.breed) updates["pet.breed"] = pet.breed;
  if (pet.age) updates["pet.age"] = pet.age;
  if (pet.gender) updates["pet.gender"] = pet.gender;
  if (pet.location) updates["pet.location"] = pet.location;
  if (pet.description) updates["pet.description"] = pet.description;
  if (pet.vaccinated !== undefined) updates["pet.vaccinated"] = pet.vaccinated;
  if (pet.trained !== undefined) updates["pet.trained"] = pet.trained;
  if (pet.photos) updates["pet.photos"] = pet.photos;
  if (pet.license) updates["pet.license"] = pet.license;

  // Update registration
  const registration = await PetRegistration.findByIdAndUpdate(
    req.registration.id, 
    updates, 
    {
      new: true,
      runValidators: true,
    }
  );

  return res.status(200).json({ 
    success: true, 
    data: { registration } 
  });
});

// Update Owner Info - Owner can update their phone number
exports.updateOwnerInfo = catchAsync(async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ 
      success: false, 
      message: "Phone number is required" 
    });
  }

  const registration = await PetRegistration.findByIdAndUpdate(
    req.registration.id,
    { "owner.phone": phone },
    { new: true, runValidators: true }
  );

  return res.status(200).json({ 
    success: true, 
    data: { registration } 
  });
});

// Update Password - Owner can change their password
exports.updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide all required fields" 
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: "New password and confirm password do not match" 
    });
  }

  // Get registration with password
  const registration = await PetRegistration.findById(req.registration.id).select("+owner.password");

  // Verify current password
  const ok = await registration.comparePassword(currentPassword);
  if (!ok) {
    return res.status(401).json({ 
      success: false, 
      message: "Current password is incorrect" 
    });
  }

  // Update password
  registration.owner.password = newPassword;
  registration.passwordChangedAt = Date.now();
  await registration.save();

  return createSendToken(registration, 200, res);
});

// NEW: Get My Adoption Requests - Owner can see who wants to adopt their pet
exports.getMyAdoptionRequests = catchAsync(async (req, res) => {
  const registration = await PetRegistration.findById(req.registration.id);
  
  return res.status(200).json({ 
    success: true, 
    results: registration.adoptions.length,
    data: { adoptions: registration.adoptions } 
  });
});

// NEW: Update Adoption Request Status - Owner can approve/reject adoption requests
exports.updateAdoptionRequestStatus = catchAsync(async (req, res) => {
  const { adoptionId } = req.params;
  const { adoptionStatus } = req.body;

  if (!["pending", "approved", "rejected"].includes(adoptionStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid adoption status. Must be pending, approved, or rejected",
    });
  }

  const registration = await PetRegistration.findById(req.registration.id);
  
  if (!registration) {
    return res.status(404).json({ 
      success: false, 
      message: "Registration not found" 
    });
  }

  // Find the adoption request
  const adoption = registration.adoptions.id(adoptionId);
  
  if (!adoption) {
    return res.status(404).json({ 
      success: false, 
      message: "Adoption request not found" 
    });
  }

  // Update adoption status
  adoption.adoptionStatus = adoptionStatus;

  // If approved, mark pet as adopted and hide from listings
  if (adoptionStatus === "approved") {
    registration.pet.adoptionStatus = "adopted";
    // registration.isActive = false; // FIXED: Removed to prevent account deactivation
    
    // Reject all other pending adoptions
    registration.adoptions.forEach(adp => {
      if (adp._id.toString() !== adoptionId && adp.adoptionStatus === "pending") {
        adp.adoptionStatus = "rejected";
      }
    });
  }

  // If rejected and no pending adoptions, mark pet as available again
  if (adoptionStatus === "rejected") {
    const hasPendingAdoptions = registration.adoptions.some(
      adp => adp.adoptionStatus === "pending" && adp._id.toString() !== adoptionId
    );
    
    if (!hasPendingAdoptions) {
      registration.pet.adoptionStatus = "available";
    }
  }

  await registration.save();

  return res.status(200).json({ 
    success: true, 
    message: `Adoption request ${adoptionStatus}`,
    data: { registration } 
  });
});

// ==================== ADMIN MANAGEMENT ENDPOINTS ====================
//  NOTE: These are called by admin (authenticated via users collection)
//  Admin authentication is handled by adminAuthMiddleware in routes

//  Get All Pet Registrations - For admin dashboard
exports.getAllRegistrations = catchAsync(async (req, res) => {
  // Get all pet registrations (all statuses: pending, approved, rejected)
  const registrations = await PetRegistration.find({ 
    "owner.role": "owner" 
  }).select("-owner.password");

  return res.status(200).json({
    success: true,
    results: registrations.length,
    data: { registrations },
  });
});

//  Update Registration Status - Admin approves/rejects pet registration
exports.updateRegistrationStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  // Validate status
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Must be pending, approved, or rejected",
    });
  }

  const registration = await PetRegistration.findByIdAndUpdate(
    id,
    { status: status },
    { new: true, runValidators: true }
  );

  if (!registration) {
    return res.status(404).json({ 
      success: false, 
      message: "Registration not found" 
    });
  }

  return res.status(200).json({ 
    success: true, 
    message: `Registration status updated to ${status}`,
    data: { registration } 
  });
});

exports.getUserAdoptionRequests = catchAsync(async (req, res) => {
  const { email } = req.query;

  // Validate email parameter
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email query parameter is required'
    });
  }

  // Find all registrations that have adoption requests from this email
  const registrations = await PetRegistration.find({
    "adoptions.adopterEmail": email
  }).select("pet.name pet.type pet.breed pet.photos adoptions owner.email owner.phone");

  // Extract and flatten all adoption requests for this user
  const userAdoptions = [];
  
  registrations.forEach(registration => {
    registration.adoptions.forEach(adoption => {
      if (adoption.adopterEmail === email) {
        userAdoptions.push({
          _id: adoption._id,
          petName: registration.pet.name,
          petType: registration.pet.type,
          petBreed: registration.pet.breed,
          petPhoto: registration.pet.photos?.[0],
          adopterName: adoption.adopterName,
          adopterEmail: adoption.adopterEmail,
          adopterPhone: adoption.adopterPhone,
          adopterMessage: adoption.adopterMessage,
          adoptionStatus: adoption.adoptionStatus,
          adoptionDate: adoption.adoptionDate,
          ownerEmail: registration.owner.email,
          ownerPhone: registration.owner.phone
        });
      }
    });
  });

  // Sort by date (newest first)
  userAdoptions.sort((a, b) => new Date(b.adoptionDate) - new Date(a.adoptionDate));

  return res.status(200).json({
    success: true,
    message: 'Adoption requests fetched successfully',
    results: userAdoptions.length,
    data: {
      adoptions: userAdoptions
    }
  });
});

// Delete Pet Registration - Owner can delete their registration
exports.deleteMyRegistration = catchAsync(async (req, res) => {
  const registrationId = req.registration.id;

  // Find the registration
  const registration = await PetRegistration.findById(registrationId);
  
  if (!registration) {
    return res.status(404).json({ 
      success: false, 
      message: "Registration not found" 
    });
  }

  // Check if there are pending adoption requests
  const hasPendingAdoptions = registration.adoptions.some(
    adp => adp.adoptionStatus === "pending"
  );
  
  if (hasPendingAdoptions) {
    return res.status(400).json({ 
      success: false, 
      message: "Cannot delete registration with pending adoption requests. Please reject them first." 
    });
  }

  // Delete the registration
  await PetRegistration.findByIdAndDelete(registrationId);

  return res.status(200).json({ 
    success: true, 
    message: "Pet registration deleted successfully" 
  });
});