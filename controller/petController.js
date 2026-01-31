// controller/petController.js
const PetRegistration = require("../models/petModel");
const jwt = require("jsonwebtoken");

// ---------- helpers ----------
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const createSendToken = (registration, statusCode, res) => {
  const token = signToken(registration._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + (Number(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };

  res.cookie("jwt", token, cookieOptions);

  // hide password
  if (registration?.owner) registration.owner.password = undefined;

  return res.status(statusCode).json({
    success: true,
    token,
    data: { registration },
  });
};

// ---------- PUBLIC ----------

// Register
exports.registerPetWithOwner = catchAsync(async (req, res) => {
  const { owner, pet } = req.body;

  if (!owner || !pet) {
    return res.status(400).json({ success: false, message: "Owner and pet information are required" });
  }

  if (!owner.email || !owner.password || !owner.phone) {
    return res.status(400).json({ success: false, message: "Owner email, password, and phone are required" });
  }

  if (!pet.name || !pet.breed || !pet.age || !pet.location || !pet.description || !pet.license) {
    return res.status(400).json({ success: false, message: "All pet information fields are required" });
  }

  if (!pet.photos || !Array.isArray(pet.photos) || pet.photos.length < 3) {
    return res.status(400).json({ success: false, message: "At least 3 pet photos are required" });
  }

  const existing = await PetRegistration.findOne({ "owner.email": owner.email }).select("_id");
  if (existing) {
    return res.status(409).json({ success: false, message: "Email already registered. Please login." });
  }

  const newRegistration = await PetRegistration.create({
    owner: {
      email: owner.email,
      password: owner.password, // ✅ plain text (not secure, only for learning)
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
      photos: pet.photos,
      license: pet.license,
    },
    status: "pending",
  });

  return createSendToken(newRegistration, 201, res);
});

// Login
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Please provide email and password" });
  }

  const registration = await PetRegistration
    .findOne({ "owner.email": email })
    .select("+owner.password");

  if (!registration) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  if (registration.isLocked) {
    return res.status(423).json({
      success: false,
      message: "Account is locked due to too many failed login attempts. Try again later.",
    });
  }

  if (!registration.isActive) {
    return res.status(403).json({
      success: false,
      message: "Account is deactivated. Please contact support.",
    });
  }

  // ✅ plain text compare using model method
  const ok = await registration.comparePassword(password);
  if (!ok) {
    await registration.incLoginAttempts();
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

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

  return res.status(200).json({ success: true, message: "Logged out successfully" });
};

// ---------- AUTH MIDDLEWARE ----------

exports.protect = catchAsync(async (req, res, next) => {
  let token;

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

  const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

  const currentRegistration = await PetRegistration.findById(decoded.id);
  if (!currentRegistration) {
    return res.status(401).json({
      success: false,
      message: "The registration belonging to this token no longer exists.",
    });
  }

  if (currentRegistration.changedPasswordAfter && currentRegistration.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      success: false,
      message: "Password was recently changed. Please log in again.",
    });
  }

  if (!currentRegistration.isActive) {
    return res.status(403).json({ success: false, message: "Your account has been deactivated." });
  }

  req.registration = currentRegistration;
  return next();
});

// ✅ FIXED: restrictTo syntax (this was broken in your file)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.registration?.owner?.role || !roles.includes(req.registration.owner.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    return next();
  };
};

// ---------- PROTECTED CONTROLLERS ----------

exports.getMyProfile = catchAsync(async (req, res) => {
  const registration = await PetRegistration.findById(req.registration.id);
  return res.status(200).json({ success: true, data: { registration } });
});

exports.updatePetInfo = catchAsync(async (req, res) => {
  const { pet } = req.body;
  if (!pet) return res.status(400).json({ success: false, message: "pet object is required" });

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

  const registration = await PetRegistration.findByIdAndUpdate(req.registration.id, updates, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json({ success: true, data: { registration } });
});

exports.updateOwnerInfo = catchAsync(async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });

  const registration = await PetRegistration.findByIdAndUpdate(
    req.registration.id,
    { "owner.phone": phone },
    { new: true, runValidators: true }
  );

  return res.status(200).json({ success: true, data: { registration } });
});

exports.updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: "Please provide all required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: "New password and confirm password do not match" });
  }

  const registration = await PetRegistration.findById(req.registration.id).select("+owner.password");

  const ok = await registration.comparePassword(currentPassword);
  if (!ok) return res.status(401).json({ success: false, message: "Current password is incorrect" });

  registration.owner.password = newPassword;
  await registration.save();

  return createSendToken(registration, 200, res);
});

// ---------- ADMIN ----------

exports.getAllRegistrations = catchAsync(async (req, res) => {
  const registrations = await PetRegistration.find();
  return res.status(200).json({
    success: true,
    results: registrations.length,
    data: { registrations },
  });
});

exports.updateRegistrationStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Must be pending, approved, or rejected",
    });
  }

  const registration = await PetRegistration.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!registration) return res.status(404).json({ success: false, message: "Registration not found" });

  return res.status(200).json({ success: true, data: { registration } });
});
